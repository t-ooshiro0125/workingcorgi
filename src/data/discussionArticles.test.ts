import { afterEach, describe, expect, it, vi } from "vitest";

import type { DiscussionArticleSource } from "../domain/discussionArticle";

const articleBody = `### 概要
記事の概要です。
### 公開日
2026-08-25
### URL スラッグ
article-slug
### カテゴリ
tech
### 本文
本文です。`;

const response = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });

const articlesCategory = {
  id: "articles-category-id",
  slug: "articles",
} as const;

const articlesCategoryResponse = () =>
  response({
    data: {
      repository: {
        discussionCategories: { nodes: [articlesCategory] },
      },
    },
  });

const discussionCategory = {
  id: articlesCategory.id,
  name: "Articles",
} as const;

interface PageInfo {
  readonly hasNextPage: boolean;
  readonly endCursor: string | null;
}

const createDiscussionSource = (
  overrides: Partial<DiscussionArticleSource> = {},
): DiscussionArticleSource => ({
  number: 1,
  title: "記事",
  body: articleBody,
  lastEditedAt: "2026-08-25T00:00:00Z",
  discussionCategory,
  ...overrides,
});

const discussionsResponse = (nodes: readonly unknown[], pageInfo: PageInfo) =>
  response({
    data: { repository: { discussions: { nodes, pageInfo } } },
  });

const importArticles = async (responses: readonly Response[]) => {
  const queue = [...responses];
  const fetchMock = vi.fn(() => Promise.resolve(queue.shift()));

  vi.stubEnv("GITHUB_TOKEN", "test-token");
  vi.stubGlobal("fetch", fetchMock);

  return { articles: await import("./discussionArticles"), fetchMock };
};

const renderArticleBody = async (body: string) => {
  const { renderDiscussionArticleBody } = await import("./discussionArticles");
  return renderDiscussionArticleBody({ body });
};

afterEach(() => {
  vi.doUnmock("./discussionArticlesCache");
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("fetchDiscussionArticles", () => {
  it("GITHUB_TOKEN がない場合は記事を取得せず失敗させる", async () => {
    const fetchMock = vi.fn();

    vi.stubEnv("GITHUB_TOKEN", "");
    vi.stubGlobal("fetch", fetchMock);

    const articles = await import("./discussionArticles");

    await expect(articles.fetchDiscussionArticles()).rejects.toThrow(
      "GITHUB_TOKEN を設定してください。Notes の記事を取得するために必要です。",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Articles カテゴリがない場合は取得を失敗させる", async () => {
    const { articles } = await importArticles([
      response({
        data: { repository: { discussionCategories: { nodes: [] } } },
      }),
    ]);

    await expect(articles.fetchDiscussionArticles()).rejects.toThrow(
      "GitHub Discussions に Articles カテゴリがありません。",
    );
  });

  it("複数ページの記事を取得して公開日順に並べる", async () => {
    const { articles, fetchMock } = await importArticles([
      articlesCategoryResponse(),
      discussionsResponse(
        [
          createDiscussionSource({
            title: "古い記事",
            body: articleBody.replace("article-slug", "older-article"),
          }),
        ],
        { hasNextPage: true, endCursor: "next-page" },
      ),
      discussionsResponse(
        [
          createDiscussionSource({
            number: 2,
            title: "新しい記事",
            body: articleBody.replace("2026-08-25", "2026-08-26"),
            lastEditedAt: "2026-08-26T00:00:00Z",
          }),
        ],
        { hasNextPage: false, endCursor: null },
      ),
    ]);

    await expect(articles.fetchDiscussionArticles()).resolves.toMatchObject([
      {
        id: "article-slug",
        title: "新しい記事",
        discussionCategory,
      },
      {
        id: "older-article",
        title: "古い記事",
        discussionCategory,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1].body).toContain("lastEditedAt");
    expect(fetchMock.mock.calls[1][1].body).toContain(
      "discussionCategory: category",
    );
    expect(JSON.parse(fetchMock.mock.calls[2][1].body as string)).toMatchObject(
      {
        variables: { after: "next-page" },
      },
    );
  });

  it("URL スラッグが重複する記事を取得すると失敗させる", async () => {
    const { articles } = await importArticles([
      articlesCategoryResponse(),
      discussionsResponse(
        [
          createDiscussionSource({ title: "最初の記事" }),
          createDiscussionSource({
            number: 2,
            title: "重複した記事",
            lastEditedAt: "2026-08-26T00:00:00Z",
          }),
        ],
        { hasNextPage: false, endCursor: null },
      ),
    ]);

    await expect(articles.fetchDiscussionArticles()).rejects.toThrow(
      "Discussion #2 の URL スラッグが重複しています: article-slug",
    );
  });

  it("GraphQL エラーをそのまま取得失敗として扱う", async () => {
    const { articles } = await importArticles([
      response({ errors: [{ message: "Bad credentials" }] }),
    ]);

    await expect(articles.fetchDiscussionArticles()).rejects.toThrow(
      "GitHub Discussions の取得に失敗しました: Bad credentials",
    );
  });

  it.each([
    [
      "記事の取得結果がない",
      response({ data: { repository: {} } }),
      "GitHub Discussions の記事を取得できませんでした。",
    ],
    [
      "次ページのカーソルがない",
      discussionsResponse([], { hasNextPage: true, endCursor: null }),
      "GitHub Discussions の次ページを取得するためのカーソルがありません。",
    ],
  ])(
    "%s場合は取得を失敗させる",
    async (_label, discussionResponse, message) => {
      const { articles } = await importArticles([
        articlesCategoryResponse(),
        discussionResponse,
      ]);

      await expect(articles.fetchDiscussionArticles()).rejects.toThrow(message);
    },
  );
});

describe("getDiscussionArticles", () => {
  it("開発時は呼び出すたびにローカルキャッシュを読み込む", async () => {
    const getCachedDiscussionArticles = vi.fn().mockResolvedValue([]);

    vi.stubEnv("DEV", "true");
    vi.doMock("./discussionArticlesCache", () => ({
      getCachedDiscussionArticles,
    }));

    const { getDiscussionArticles } = await import("./discussionArticles");

    await getDiscussionArticles();
    await getDiscussionArticles();

    expect(getCachedDiscussionArticles).toHaveBeenCalledTimes(2);
  });
});

describe("renderDiscussionArticleBody", () => {
  it("wraps Markdown tables in a scrollable region", async () => {
    const html = await renderArticleBody(
      "| Name | Value |\n| --- | --- |\n| Long name | Content |",
    );

    expect(html).toMatch(/<div class="note__table-scroll"[^>]*>\s*<table>/);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region"');
    expect(html).toContain(
      'aria-label="\u8868\u3092\u6a2a\u306b\u30b9\u30af\u30ed\u30fc\u30eb"',
    );
  });

  it("makes the code block scroll region keyboard focusable", async () => {
    const html = await renderArticleBody(
      "```ts\nconst longLine = 'Content';\n```",
    );

    expect(html).toMatch(/<pre(?![^>]*tabindex)[^>]*>\s*<code tabindex="0">/);
  });

  it("formats an X post quote source", async () => {
    const html = await renderArticleBody(
      "> 引用本文\n>\n> 引用: https://x.com/working_corgi/status/1234567890",
    );

    expect(html).toContain("<p>引用本文</p>");
    expect(html).toContain(
      '<p class="note__quote-source">—\u00a0<a href="https://x.com/working_corgi/status/1234567890">@working_corgi のポスト</a></p>',
    );
  });

  it("formats a non-X HTTPS quote source with its hostname", async () => {
    const html = await renderArticleBody(
      "> 引用本文\n>\n> 引用: https://example.com/articles/1",
    );

    expect(html).toContain(
      '<p class="note__quote-source">—\u00a0<a href="https://example.com/articles/1">example.com のリンク</a></p>',
    );
  });

  it("leaves quote sources outside the target format unchanged", async () => {
    const html = await renderArticleBody(
      "> 引用: http://example.com\n\n> 通常の引用 https://example.com",
    );

    expect(html).not.toContain("note__quote-source");
    expect(html).toContain(
      '<a href="http://example.com">http://example.com</a>',
    );
    expect(html).toContain(
      '<a href="https://example.com">https://example.com</a>',
    );
  });

  it("uses a generic label when an X post URL has no username", async () => {
    const html = await renderArticleBody(
      "> 引用本文\n>\n> 引用: https://x.com/status/1234567890",
    );

    expect(html).toContain(
      '<p class="note__quote-source">—\u00a0<a href="https://x.com/status/1234567890">Xのポスト</a></p>',
    );
  });

  it.each([
    ["URL側がインラインコード", "> 引用: `https://example.com`"],
    ["URL側が強調", "> 引用: **https://example.com**"],
    [
      "表示 URL と href が異なるリンク",
      "> 引用: [https://example.com](https://different.example.com)",
    ],
  ])("%s の出典候補は変換しない", async (_label, body) => {
    const html = await renderArticleBody(body);

    expect(html).not.toContain("note__quote-source");
  });

  it("タイトル付き Markdown リンクは元のリンク情報を保持する", async () => {
    const html = await renderArticleBody(
      '> 引用: [https://example.com](https://example.com "出典")',
    );

    expect(html).not.toContain("note__quote-source");
    expect(html).toContain(
      '<a href="https://example.com" title="出典">https://example.com</a>',
    );
  });

  it("引用: と URL が別行の場合は変換しない", async () => {
    const html = await renderArticleBody("> 引用:\n> https://example.com");

    expect(html).not.toContain("note__quote-source");
  });

  it("https:// で始まらないリンク文字列は変換しない", async () => {
    const html = await renderArticleBody(
      "> 引用: [https:example.com](https:example.com)",
    );

    expect(html).not.toContain("note__quote-source");
  });

  it.each([
    ["水平線", "> 引用: https://example.com\n>\n> ---"],
    ["空のコードブロック", "> 引用: https://example.com\n>\n> ```\n> ```"],
  ])("出典段落の後ろに %s がある場合は変換しない", async (_label, body) => {
    const html = await renderArticleBody(body);

    expect(html).not.toContain("note__quote-source");
  });

  it("X ポスト URL のクエリ、フラグメント、後続パスを許容する", async () => {
    const html = await renderArticleBody(
      "> 引用: https://x.com/working_corgi/status/id/extra?source=note#quote",
    );

    expect(html).toContain(
      '<a href="https://x.com/working_corgi/status/id/extra?source=note#quote">@working_corgi のポスト</a>',
    );
  });

  it.each([
    ["www.x.com", "https://www.x.com/working_corgi/status/123"],
    ["twitter.com", "https://twitter.com/working_corgi/status/123"],
  ])("%s は通常の HTTPS リンクとして扱う", async (hostname, url) => {
    const html = await renderArticleBody(`> 引用: ${url}`);

    expect(html).toContain(`<a href="${url}">${hostname} のリンク</a>`);
  });
});
