import {
  noteCategoryValues,
  type NoteCategory,
} from "../config/noteCategories";

// GitHub Discussions input and article data
export interface DiscussionArticleSource {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly lastEditedAt: string | null;
  readonly discussionCategory: {
    readonly id: string;
    readonly name: string;
  };
}

export interface DiscussionArticle {
  readonly id: string;
  readonly discussionNumber: number;
  readonly discussionCategory: DiscussionArticleSource["discussionCategory"];
  readonly title: string;
  readonly description: string;
  readonly pubDate: Date;
  readonly updatedDate?: Date;
  readonly category: NoteCategory;
  readonly body: string;
}

interface ArticleSections {
  readonly description: string;
  readonly pubDate: string;
  readonly slug: string;
  readonly category: string;
  readonly body: string;
}

// Validation rules
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const articleSectionPattern =
  /^[\s\S]*?^### 概要\s*\n(?<description>[\s\S]*?)\n\s*### 公開日\s*\n(?<pubDate>[^\n]+)\n\s*### URL スラッグ\s*\n(?<slug>[^\n]+)\n\s*### カテゴリ\s*\n(?<category>[^\n]+)\n\s*### 本文\s*\n(?<body>[\s\S]*)$/m;

// Value parsing
const parseDate = (date: string, number: number) => {
  if (date.length !== 10 || !datePattern.test(date)) {
    throw new Error(
      `Discussion #${number} の公開日は YYYY-MM-DD 形式で設定してください。`,
    );
  }

  const parsedDate = new Date(`${date}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Discussion #${number} の公開日が不正です: ${date}`);
  }

  return parsedDate;
};

const parseDateTime = (dateTime: string, field: string, number: number) => {
  const parsedDate = new Date(dateTime);

  if (Number.isNaN(parsedDate.valueOf())) {
    throw new Error(`Discussion #${number} の ${field} が不正です。`);
  }

  return parsedDate;
};

const parseArticleSections = (
  sourceBody: string,
  number: number,
): ArticleSections => {
  const sections = sourceBody.match(articleSectionPattern)?.groups;

  if (!sections) {
    throw new Error(
      `Discussion #${number} は Articles テンプレートの形式に従ってください。`,
    );
  }

  return {
    description: sections.description.trim(),
    pubDate: sections.pubDate.trim(),
    slug: sections.slug.trim(),
    category: sections.category.trim(),
    body: sections.body.trim(),
  };
};

const parseTitle = (title: string, number: number) => {
  const parsedTitle = title.trim();

  if (!parsedTitle) {
    throw new Error(`Discussion #${number} のタイトルは空にできません。`);
  }

  return parsedTitle;
};

const parseDescription = (description: string, number: number) => {
  if (!description) {
    throw new Error(`Discussion #${number} の概要は空にできません。`);
  }

  return description;
};

const parseSlug = (slug: string, number: number) => {
  if (!slugPattern.test(slug)) {
    throw new Error(
      `Discussion #${number} の URL スラッグは英小文字・数字・ハイフンだけで設定してください。`,
    );
  }

  return slug;
};

const parseCategory = (category: string, number: number): NoteCategory => {
  if (!noteCategoryValues.includes(category as NoteCategory)) {
    throw new Error(
      `Discussion #${number} のカテゴリは ${noteCategoryValues.join(", ")} のいずれかにしてください。`,
    );
  }

  return category as NoteCategory;
};

const parseBody = (body: string, number: number) => {
  if (!body) {
    throw new Error(`Discussion #${number} の本文は空にできません。`);
  }

  return body;
};

/** Articles テンプレートの Discussion を公開用の記事データへ変換する。 */
export const createDiscussionArticle = ({
  number,
  discussionCategory,
  title,
  body: sourceBody,
  lastEditedAt,
}: DiscussionArticleSource): DiscussionArticle => {
  const sections = parseArticleSections(sourceBody, number);
  const parsedTitle = parseTitle(title, number);
  const description = parseDescription(sections.description, number);
  const slug = parseSlug(sections.slug, number);
  const category = parseCategory(sections.category, number);
  const body = parseBody(sections.body, number);
  const pubDate = parseDate(sections.pubDate, number);
  const updatedDate = lastEditedAt
    ? parseDateTime(lastEditedAt, "最終編集日時", number)
    : undefined;

  return {
    id: slug,
    discussionNumber: number,
    discussionCategory,
    title: parsedTitle,
    description,
    pubDate,
    updatedDate,
    category,
    body,
  };
};
