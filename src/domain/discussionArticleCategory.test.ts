import { describe, expect, it } from "vitest";

import type { DiscussionArticle } from "./discussionArticle";
import { createDiscussionArticleCategoryPages } from "./discussionArticleCategory";

const createArticle = (
  id: string,
  category: DiscussionArticle["category"],
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
  category,
  body: "本文です。",
});

describe("createDiscussionArticleCategoryPages", () => {
  it("カテゴリ定義順に記事を分類する", () => {
    const tech = createArticle("tech", "tech", "2026-08-25", 1);
    const note = createArticle("note", "note", "2026-08-26", 2);
    const devlog = createArticle("devlog", "devlog", "2026-08-27", 3);

    expect(createDiscussionArticleCategoryPages([note, devlog, tech])).toEqual([
      { category: "tech", articles: [tech] },
      { category: "note", articles: [note] },
      { category: "devlog", articles: [devlog] },
    ]);
  });

  it("各カテゴリの記事を公開日と Discussion 番号の降順に並べる", () => {
    const oldest = createArticle("oldest", "tech", "2026-08-25", 1);
    const lowerNumber = createArticle("lower-number", "tech", "2026-08-26", 2);
    const higherNumber = createArticle(
      "higher-number",
      "tech",
      "2026-08-26",
      3,
    );

    expect(
      createDiscussionArticleCategoryPages([lowerNumber, oldest, higherNumber]),
    ).toEqual([
      { category: "tech", articles: [higherNumber, lowerNumber, oldest] },
    ]);
  });

  it("記事がないカテゴリを結果から除外する", () => {
    const note = createArticle("note", "note", "2026-08-26", 1);

    expect(createDiscussionArticleCategoryPages([note])).toEqual([
      { category: "note", articles: [note] },
    ]);
  });
});
