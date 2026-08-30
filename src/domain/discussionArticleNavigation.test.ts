import { describe, expect, it } from "vitest";

import type { DiscussionArticle } from "./discussionArticle";

import {
  createDiscussionArticleNavigation,
  sortDiscussionArticles,
} from "./discussionArticleNavigation";

const createArticle = (
  id: string,
  pubDate: string,
  discussionNumber: number,
): DiscussionArticle => ({
  id,
  discussionNumber,
  discussionCategory: { id: "articles-category-id", name: "Articles" },
  title: id,
  plainTitle: id,
  titleParts: [{ type: "text", value: id }],
  description: "記事の概要です。",
  pubDate: new Date(`${pubDate}T00:00:00Z`),
  category: "tech",
  body: "本文です。",
});

describe("sortDiscussionArticles", () => {
  it("公開日と Discussion 番号の降順で、元の配列を変更せずに記事を返す", () => {
    const oldest = createArticle("oldest", "2026-08-25", 1);
    const lowerNumber = createArticle("lower-number", "2026-08-26", 2);
    const higherNumber = createArticle("higher-number", "2026-08-26", 3);
    const articles = [lowerNumber, oldest, higherNumber];

    expect(sortDiscussionArticles(articles)).toEqual([
      higherNumber,
      lowerNumber,
      oldest,
    ]);
    expect(articles).toEqual([lowerNumber, oldest, higherNumber]);
  });
});

describe("createDiscussionArticleNavigation", () => {
  it("先頭・中間・末尾の前後記事を返す", () => {
    const oldest = createArticle("oldest", "2026-08-25", 1);
    const middle = createArticle("middle", "2026-08-26", 2);
    const newest = createArticle("newest", "2026-08-27", 3);
    const navigationByArticleId = new Map(
      createDiscussionArticleNavigation([middle, oldest, newest]).map(
        (navigation) => [navigation.article.id, navigation],
      ),
    );

    expect(navigationByArticleId.get(newest.id)).toEqual({
      article: newest,
      nextArticle: middle,
    });
    expect(navigationByArticleId.get(middle.id)).toEqual({
      article: middle,
      previousArticle: newest,
      nextArticle: oldest,
    });
    expect(navigationByArticleId.get(oldest.id)).toEqual({
      article: oldest,
      previousArticle: middle,
    });
  });

  it("記事が1件だけの場合は前後記事を設定しない", () => {
    const article = createArticle("only", "2026-08-26", 1);

    expect(createDiscussionArticleNavigation([article])).toEqual([{ article }]);
  });
});
