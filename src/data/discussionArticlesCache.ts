import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  noteCategoryValues,
  type NoteCategory,
} from "../config/noteCategories";
import type { DiscussionArticle } from "../domain/discussionArticle";

const defaultCacheDirectory = resolve(".cache/notes");
const indexFileName = "index.json";
const articleIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CachedDiscussionArticle = Omit<
  DiscussionArticle,
  "pubDate" | "updatedDate"
> & {
  readonly pubDate: string;
  readonly updatedDate?: string;
};

// Error messages
const createMissingCacheError = () =>
  new Error(
    "Notes のローカルキャッシュがありません。GITHUB_TOKEN を設定して npm run notes:sync を実行してください。",
  );

const createInvalidCacheError = () =>
  new Error(
    "Notes のローカルキャッシュが不正です。npm run notes:sync を実行してください。",
  );

// JSON file operations
const readJson = async (path: string) =>
  JSON.parse(await readFile(path, "utf8")) as unknown;

// 読み込み中に不完全なキャッシュが見えないよう、ファイルを原子的に置き換える。
const writeJson = async (path: string, value: unknown) => {
  const temporaryPath = path + ".tmp";
  await writeFile(temporaryPath, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(temporaryPath, path);
};

// Cache validation
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const parseString = (value: unknown) => {
  if (typeof value !== "string") throw createInvalidCacheError();
  return value;
};

const parseNonEmptyString = (value: unknown) => {
  const string = parseString(value).trim();
  if (!string) throw createInvalidCacheError();
  return string;
};

const parseDate = (value: unknown) => {
  const date = new Date(parseString(value));
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== value) {
    throw createInvalidCacheError();
  }

  return date;
};

const parseArticleIds = (value: unknown) => {
  if (!Array.isArray(value)) throw createInvalidCacheError();

  const ids = value.map(parseString);
  if (
    ids.some((id) => !articleIdPattern.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw createInvalidCacheError();
  }

  return ids;
};

const parseDiscussionCategory = (value: unknown) => {
  if (!isRecord(value)) throw createInvalidCacheError();

  return {
    id: parseNonEmptyString(value.id),
    name: parseNonEmptyString(value.name),
  };
};

const parseCategory = (value: unknown): NoteCategory => {
  const category = parseString(value);
  if (!noteCategoryValues.includes(category as NoteCategory)) {
    throw createInvalidCacheError();
  }

  return category as NoteCategory;
};

const parseArticle = (value: unknown, id: string): DiscussionArticle => {
  if (!isRecord(value) || value.id !== id) throw createInvalidCacheError();

  const article = value as CachedDiscussionArticle;
  if (
    !Number.isInteger(article.discussionNumber) ||
    article.discussionNumber < 1
  ) {
    throw createInvalidCacheError();
  }

  return {
    id,
    discussionNumber: article.discussionNumber,
    discussionCategory: parseDiscussionCategory(article.discussionCategory),
    title: parseNonEmptyString(article.title),
    description: parseNonEmptyString(article.description),
    pubDate: parseDate(article.pubDate),
    updatedDate:
      article.updatedDate === undefined
        ? undefined
        : parseDate(article.updatedDate),
    category: parseCategory(article.category),
    body: parseNonEmptyString(article.body),
  };
};

// Cache loading
const readArticleIds = async (directory: string) => {
  let value: unknown;

  try {
    value = await readJson(join(directory, indexFileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw createMissingCacheError();
    }

    throw createInvalidCacheError();
  }

  return parseArticleIds(value);
};

const readArticles = async (directory: string, ids: readonly string[]) => {
  try {
    return await Promise.all(
      ids.map(async (id) =>
        parseArticle(await readJson(join(directory, id + ".json")), id),
      ),
    );
  } catch {
    throw createInvalidCacheError();
  }
};

/** ローカル開発用の Articles キャッシュを読み込む。 */
export const getCachedDiscussionArticles = async (
  directory = defaultCacheDirectory,
) => readArticles(directory, await readArticleIds(directory));

// Cache writing
const writeArticle = (directory: string, article: DiscussionArticle) =>
  writeJson(join(directory, article.id + ".json"), article);

// index 更新後にだけ実行する。
const removeStaleArticles = async (
  directory: string,
  articleIds: readonly string[],
) => {
  const articleFiles = new Set(articleIds.map((id) => id + ".json"));
  const files = await readdir(directory);

  await Promise.all(
    files
      .filter((file) => file.endsWith(".json") && file !== indexFileName)
      .filter((file) => !articleFiles.has(file))
      .map((file) => rm(join(directory, file))),
  );
};

/** 検証済みの Articles をローカル開発用キャッシュへ保存する。保存先を省略した場合は `.cache/notes` を使う。 */
export const writeDiscussionArticlesCache = async (
  articles: readonly DiscussionArticle[],
  directory = defaultCacheDirectory,
) => {
  await mkdir(directory, { recursive: true });
  const articleIds = articles.map((article) => article.id);
  await Promise.all(
    articles.map((article) => writeArticle(directory, article)),
  );

  // 削除より先に index を更新し、同期失敗時も前回のキャッシュを読み込めるようにする。
  await writeJson(join(directory, indexFileName), articleIds);
  await removeStaleArticles(directory, articleIds);
};
