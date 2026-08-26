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
