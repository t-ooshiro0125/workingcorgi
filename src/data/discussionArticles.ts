import {
  createMarkdownProcessor,
  rehypeHeadingIds,
} from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import { getCachedDiscussionArticles } from "./discussionArticlesCache";
import { requestGithubGraphql } from "./githubGraphql";

import {
  createDiscussionArticle,
  type DiscussionArticle,
  type DiscussionArticleSource,
} from "../domain/discussionArticle";

interface DiscussionCategory {
  readonly id: string;
  readonly slug: string;
}

interface DiscussionSourcesPage {
  readonly nodes: readonly DiscussionArticleSource[];
  readonly pageInfo: {
    readonly hasNextPage: boolean;
    readonly endCursor: string | null;
  };
}

interface DiscussionArticlesGraphqlData {
  readonly repository?: {
    readonly discussionCategories: {
      readonly nodes: readonly DiscussionCategory[];
    };
    readonly discussions?: DiscussionSourcesPage;
  };
}

interface HtmlNode {
  readonly type: string;
  readonly tagName?: string;
  readonly properties?: Record<string, unknown>;
  readonly children?: HtmlNode[];
  readonly value?: string;
}

const repository = { owner: "t-ooshiro0125", name: "workingcorgi" };
const articlesCategorySlug = "articles";

// Markdown rendering
const tableScrollProperties = {
  className: ["note__table-scroll"],
  tabIndex: 0,
  role: "region",
  ariaLabel: "\u8868\u3092\u6a2a\u306b\u30b9\u30af\u30ed\u30fc\u30eb",
};

const isElement = (node: HtmlNode, tagName: string) =>
  node.type === "element" && node.tagName === tagName;

const wrapTable = (node: HtmlNode): HtmlNode => {
  if (!isElement(node, "table")) {
    return node;
  }

  return {
    type: "element",
    tagName: "div",
    properties: tableScrollProperties,
    children: [node],
  };
};

const makeCodeBlockKeyboardScrollable = (node: HtmlNode): HtmlNode => {
  if (!isElement(node, "pre")) {
    return node;
  }

  const properties = { ...node.properties };

  delete properties.tabIndex;
  delete properties.tabindex;

  return {
    ...node,
    properties,
    children: node.children?.map((code) =>
      isElement(code, "code")
        ? {
            ...code,
            properties: { ...code.properties, tabIndex: 0 },
          }
        : code,
    ),
  };
};

interface QuoteSource {
  readonly href: string;
  readonly url: URL;
}

const isText = (node: HtmlNode) => node.type === "text";

const isWhitespaceText = (node: HtmlNode) =>
  isText(node) && !node.value?.trim();

const findLastMeaningfulChild = (children: HtmlNode[]) =>
  children.findLast((child) => !isWhitespaceText(child));

const hasOnlyHrefProperty = (properties: Record<string, unknown> | undefined) =>
  Object.keys(properties ?? {}).length === 1 &&
  typeof properties?.href === "string";

const parseQuoteSourceParagraph = (node: HtmlNode): QuoteSource | undefined => {
  if (!isElement(node, "p") || node.children?.length !== 2) {
    return;
  }

  const [prefix, link] = node.children;

  if (
    !isText(prefix) ||
    !/^引用:[ \t]*$/u.test(prefix.value ?? "") ||
    !isElement(link, "a") ||
    link.children?.length !== 1 ||
    !hasOnlyHrefProperty(link.properties)
  ) {
    return;
  }

  const [linkText] = link.children;
  const href = link.properties?.href;

  if (
    !isText(linkText) ||
    typeof href !== "string" ||
    href !== linkText.value ||
    !linkText.value.startsWith("https://")
  ) {
    return;
  }

  let url: URL;

  try {
    url = new URL(href);
  } catch {
    return;
  }

  return url.protocol === "https:" ? { href, url } : undefined;
};

const getQuoteSourceLabel = (sourceUrl: URL) => {
  if (sourceUrl.hostname !== "x.com") {
    return `${sourceUrl.hostname} のリンク`;
  }

  const [, username, resource, postId] = sourceUrl.pathname.split("/");

  return username && resource === "status" && postId
    ? `@${username} のポスト`
    : "Xのポスト";
};

const createQuoteSourceNode = (
  node: HtmlNode,
  source: QuoteSource,
): HtmlNode => ({
  ...node,
  properties: {
    ...node.properties,
    className: ["note__quote-source"],
  },
  children: [
    { type: "text", value: "—\u00a0" },
    {
      type: "element",
      tagName: "a",
      properties: { href: source.href },
      children: [{ type: "text", value: getQuoteSourceLabel(source.url) }],
    },
  ],
});

const formatQuoteSource = (node: HtmlNode): HtmlNode => {
  if (!isElement(node, "blockquote")) {
    return node;
  }

  const lastChild = findLastMeaningfulChild(node.children ?? []);
  const source = lastChild && parseQuoteSourceParagraph(lastChild);

  if (!lastChild || !source) {
    return node;
  }

  return {
    ...node,
    children: node.children?.map((child) =>
      child === lastChild ? createQuoteSourceNode(child, source) : child,
    ),
  };
};

const enhanceNoteHtmlNode = (node: HtmlNode) =>
  formatQuoteSource(makeCodeBlockKeyboardScrollable(wrapTable(node)));

const transformHtmlNodes = (
  children: HtmlNode[],
  transform: (node: HtmlNode) => HtmlNode,
) => {
  for (const [index, child] of children.entries()) {
    if (child.children) {
      transformHtmlNodes(child.children, transform);
    }

    children[index] = transform(child);
  }
};

const rehypeEnhanceNotesContent = () => (tree: HtmlNode) => {
  transformHtmlNodes(tree.children ?? [], enhanceNoteHtmlNode);
};

const headingAnchorOptions = {
  behavior: "append",
  content: { type: "text", value: "#" },
  properties: {
    className: ["heading-anchor"],
    ariaLabel: "この見出しへのリンク",
  },
};

const codeHighlightTheme = {
  name: "working-corgi-dark",
  type: "dark",
  colors: {
    "editor.background": "#312d29",
    "editor.foreground": "#f8f4ec",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: { foreground: "#b8afa6" },
    },
    {
      scope: ["constant", "support", "meta.property-name"],
      settings: { foreground: "#dce8de" },
    },
    {
      scope: ["entity", "entity.name"],
      settings: { foreground: "#c69a4a" },
    },
    {
      scope: ["keyword", "storage", "storage.type"],
      settings: { foreground: "#ebd0c4" },
    },
    {
      scope: ["string", "punctuation.definition.string"],
      settings: { foreground: "#dce8de" },
    },
    {
      scope: "variable",
      settings: { foreground: "#f8f4ec" },
    },
  ],
};

const markdownProcessor = createMarkdownProcessor({
  remarkRehype: { allowDangerousHtml: false },
  shikiConfig: { theme: codeHighlightTheme },
  rehypePlugins: [
    rehypeHeadingIds,
    [rehypeAutolinkHeadings, headingAnchorOptions],
    rehypeEnhanceNotesContent,
  ],
});

// GitHub Discussions queries
const articlesCategoryQuery = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussionCategories(first: 100) {
      nodes { id slug }
    }
  }
}`;

const discussionSourcesQuery = `query($owner: String!, $name: String!, $categoryId: ID!, $after: String) {
  repository(owner: $owner, name: $name) {
    discussions(first: 100, after: $after, categoryId: $categoryId, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { number title body lastEditedAt discussionCategory: category { id name } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

// GitHub Discussions retrieval
const findDiscussionCategoryId = (
  categories: readonly DiscussionCategory[],
  slug: string,
) => categories.find((category) => category.slug === slug)?.id;

const getArticlesCategoryId = async (token: string) => {
  const data = await requestGithubGraphql<DiscussionArticlesGraphqlData>(
    token,
    {
      query: articlesCategoryQuery,
      variables: repository,
    },
    "GitHub Discussions",
  );
  const categories = data?.repository?.discussionCategories;

  if (!categories) {
    throw new Error("GitHub Discussions のカテゴリを取得できませんでした。");
  }

  const categoryId = findDiscussionCategoryId(
    categories.nodes,
    articlesCategorySlug,
  );

  if (!categoryId) {
    throw new Error("GitHub Discussions に Articles カテゴリがありません。");
  }

  return categoryId;
};

const getDiscussionSourcesPage = async (
  token: string,
  categoryId: string,
  after: string | null,
) => {
  const data = await requestGithubGraphql<DiscussionArticlesGraphqlData>(
    token,
    {
      query: discussionSourcesQuery,
      variables: { ...repository, categoryId, after },
    },
    "GitHub Discussions",
  );
  const discussions = data?.repository?.discussions;

  if (!discussions) {
    throw new Error("GitHub Discussions の記事を取得できませんでした。");
  }

  return discussions;
};

const getDiscussionSources = async (token: string, categoryId: string) => {
  const sources: DiscussionArticleSource[] = [];
  let after: string | null = null;

  do {
    const discussions = await getDiscussionSourcesPage(
      token,
      categoryId,
      after,
    );

    sources.push(...discussions.nodes);

    if (discussions.pageInfo.hasNextPage && !discussions.pageInfo.endCursor) {
      throw new Error(
        "GitHub Discussions の次ページを取得するためのカーソルがありません。",
      );
    }

    after = discussions.pageInfo.hasNextPage
      ? discussions.pageInfo.endCursor
      : null;
  } while (after);

  return sources;
};

// Article loading
const getGithubToken = () => {
  const token = import.meta.env?.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "GITHUB_TOKEN を設定してください。Notes の記事を取得するために必要です。",
    );
  }

  return token;
};

const assertUniqueArticleIds = (articles: readonly DiscussionArticle[]) => {
  const articleIds = new Set<string>();

  for (const article of articles) {
    if (articleIds.has(article.id)) {
      throw new Error(
        "Discussion #" +
          article.discussionNumber +
          " の URL スラッグが重複しています: " +
          article.id,
      );
    }

    articleIds.add(article.id);
  }
};

export const fetchDiscussionArticles = async () => {
  const token = getGithubToken();
  const categoryId = await getArticlesCategoryId(token);

  const articles = (await getDiscussionSources(token, categoryId))
    .map(createDiscussionArticle)
    .toSorted((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  assertUniqueArticleIds(articles);

  return articles;
};

let discussionArticlesPromise:
  Promise<readonly DiscussionArticle[]> | undefined;

const getProductionDiscussionArticles = () => {
  discussionArticlesPromise ??= fetchDiscussionArticles();
  return discussionArticlesPromise;
};

/** 開発時はローカルキャッシュ、本番ビルド時は GitHub Discussions から Articles を取得する。 */
export const getDiscussionArticles = () =>
  import.meta.env.DEV
    ? getCachedDiscussionArticles()
    : getProductionDiscussionArticles();

/** Discussion の Markdown 本文を表示用 HTML に変換する。 */
export const renderDiscussionArticleBody = async (
  article: Pick<DiscussionArticle, "body">,
) => {
  const processor = await markdownProcessor;
  const { code } = await processor.render(article.body);
  return code;
};
