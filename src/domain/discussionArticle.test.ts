import { describe, expect, it } from "vitest";

import {
  createDiscussionArticle,
  type DiscussionArticleSource,
} from "./discussionArticle";

interface ArticleBodySections {
  readonly description: string;
  readonly pubDate: string;
  readonly slug: string;
  readonly category: string;
  readonly body: string;
}

const createArticleBody = (overrides: Partial<ArticleBodySections> = {}) => {
  const sections: ArticleBodySections = {
    description: "記事の概要です。",
    pubDate: "2026-08-25",
    slug: "github-pages-specs-and-limits",
    category: "tech",
    body: "## 見出し\n\n本文です。",
    ...overrides,
  };

  return `投稿フォームの案内です。

### 概要

${sections.description}

### 公開日

${sections.pubDate}

### URL スラッグ

${sections.slug}

### カテゴリ

${sections.category}

### 本文

${sections.body}`;
};

const createSource = (
  overrides: Partial<DiscussionArticleSource> = {},
): DiscussionArticleSource => ({
  number: 100,
  title: "Discussion の記事",
  body: createArticleBody(),
  discussionCategory: { id: "articles-category-id", name: "Articles" },
  lastEditedAt: "2026-08-25T01:00:00Z",
  ...overrides,
});

describe("createDiscussionArticle", () => {
  it("Discussion Form の空行を含む Articles 本文を記事データに変換する", () => {
    expect(createDiscussionArticle(createSource())).toEqual({
      id: "github-pages-specs-and-limits",
      discussionNumber: 100,
      discussionCategory: {
        id: "articles-category-id",
        name: "Articles",
      },
      title: "Discussion の記事",
      description: "記事の概要です。",
      pubDate: new Date("2026-08-25T00:00:00Z"),
      updatedDate: new Date("2026-08-25T01:00:00Z"),
      category: "tech",
      body: "## 見出し\n\n本文です。",
    });
  });

  it("未編集の記事には更新日時を設定しない", () => {
    expect(
      createDiscussionArticle(createSource({ lastEditedAt: null })),
    ).toMatchObject({ updatedDate: undefined });
  });

  it.each([
    [
      "テンプレートの見出しが不足している",
      { body: "本文だけです。" },
      "Discussion #100 は Articles テンプレートの形式に従ってください。",
    ],
    [
      "タイトルが空",
      { title: " " },
      "Discussion #100 のタイトルは空にできません。",
    ],
    [
      "概要が空",
      { body: createArticleBody({ description: "" }) },
      "Discussion #100 の概要は空にできません。",
    ],
    [
      "公開日の形式が不正",
      { body: createArticleBody({ pubDate: "2026-8-25" }) },
      "Discussion #100 の公開日は YYYY-MM-DD 形式で設定してください。",
    ],
    [
      "不正な公開日",
      { body: createArticleBody({ pubDate: "2026-02-29" }) },
      "Discussion #100 の公開日が不正です: 2026-02-29",
    ],
    [
      "不正な URL スラッグ",
      { body: createArticleBody({ slug: "Invalid slug" }) },
      "Discussion #100 の URL スラッグは英小文字・数字・ハイフンだけで設定してください。",
    ],
    [
      "不正なカテゴリ",
      { body: createArticleBody({ category: "other" }) },
      "Discussion #100 のカテゴリは tech, note, devlog のいずれかにしてください。",
    ],
    [
      "本文が空",
      { body: createArticleBody({ body: "" }) },
      "Discussion #100 の本文は空にできません。",
    ],
    [
      "最終編集日時が不正",
      { lastEditedAt: "invalid" },
      "Discussion #100 の 最終編集日時 が不正です。",
    ],
  ])("%s を拒否する", (_label, overrides, message) => {
    expect(() => createDiscussionArticle(createSource(overrides))).toThrow(
      message,
    );
  });
});
