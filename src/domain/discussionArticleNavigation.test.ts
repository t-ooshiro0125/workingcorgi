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
      relatedArticles: [middle, oldest],
    });
    expect(navigationByArticleId.get(middle.id)).toEqual({
      article: middle,
      previousArticle: newest,
      nextArticle: oldest,
      relatedArticles: [newest, oldest],
    });
    expect(navigationByArticleId.get(oldest.id)).toEqual({
      article: oldest,
      previousArticle: middle,
      relatedArticles: [newest, middle],
    });
  });

  it("記事が1件だけの場合は前後記事を設定しない", () => {
    const article = createArticle("only", "2026-08-26", 1);

    expect(createDiscussionArticleNavigation([article])).toEqual([
      { article, relatedArticles: [] },
    ]);
  });

  it("現在の記事と異なる Notes カテゴリの記事を関連記事から除外する", () => {
    const current = createArticle("current", "2026-08-26", 1);
    const sameCategory = createArticle("same-category", "2026-08-27", 2);
    const otherCategory = {
      ...createArticle("other-category", "2026-08-28", 3),
      category: "note" as const,
    };

    const navigation = createDiscussionArticleNavigation([
      current,
      sameCategory,
      otherCategory,
    ]).find(({ article }) => article.id === current.id);

    expect(navigation?.relatedArticles).toEqual([sameCategory]);
  });

  it("同じカテゴリの候補は公開順で最大3件返す", () => {
    const current = createArticle("current", "2026-08-20", 1);
    const oldest = createArticle("oldest", "2026-08-21", 2);
    const lowerNumber = createArticle("lower-number", "2026-08-23", 3);
    const higherNumber = createArticle("higher-number", "2026-08-23", 4);
    const newest = createArticle("newest", "2026-08-24", 5);

    const navigation = createDiscussionArticleNavigation([
      current,
      oldest,
      lowerNumber,
      higherNumber,
      newest,
    ]).find(({ article }) => article.id === current.id);

    expect(navigation?.relatedArticles).toEqual([
      newest,
      higherNumber,
      lowerNumber,
    ]);
  });

  it("同じカテゴリの候補が1件または2件の場合は存在する記事だけ返す", () => {
    const current = createArticle("current", "2026-08-20", 1);
    const one = createArticle("one", "2026-08-21", 2);
    const two = createArticle("two", "2026-08-22", 3);

    expect(
      createDiscussionArticleNavigation([current, one]).find(
        ({ article }) => article.id === current.id,
      )?.relatedArticles,
    ).toEqual([one]);
    expect(
      createDiscussionArticleNavigation([current, one, two]).find(
        ({ article }) => article.id === current.id,
      )?.relatedArticles,
    ).toEqual([two, one]);
  });

  it("同じカテゴリの候補がない場合は空配列を返す", () => {
    const current = createArticle("current", "2026-08-26", 1);
    const otherCategory = {
      ...createArticle("other-category", "2026-08-27", 2),
      category: "devlog" as const,
    };

    expect(
      createDiscussionArticleNavigation([current, otherCategory]).find(
        ({ article }) => article.id === current.id,
      )?.relatedArticles,
    ).toEqual([]);
  });
});
