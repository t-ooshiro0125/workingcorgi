import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getCachedDiscussionArticles,
  writeDiscussionArticlesCache,
} from "./discussionArticlesCache";

const directories: string[] = [];

const cachedArticle = {
  id: "article-slug",
  discussionNumber: 1,
  discussionCategory: { id: "category-id", name: "Articles" },
  title: "記事",
  description: "概要",
  pubDate: "2026-08-26T00:00:00.000Z",
  category: "tech" as const,
  body: "本文",
};

const createCacheDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), "workingcorgi-notes-"));
  directories.push(directory);
  return directory;
};

const writeCachedArticles = async (directory: string) => {
  await writeFile(
    join(directory, "index.json"),
    JSON.stringify([cachedArticle.id]),
  );
  await writeFile(
    join(directory, cachedArticle.id + ".json"),
    JSON.stringify(cachedArticle),
  );
};

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("getCachedDiscussionArticles", () => {
  it("記事ごとのキャッシュを index の順で読み込む", async () => {
    const directory = await createCacheDirectory();
    await writeCachedArticles(directory);

    await expect(getCachedDiscussionArticles(directory)).resolves.toMatchObject(
      [{ id: cachedArticle.id, pubDate: new Date(cachedArticle.pubDate) }],
    );
  });

  it.each([
    ["キャッシュがない", undefined, undefined],
    ["壊れた index", "{", undefined],
    ["不正な記事 ID を含む", '["../package"]', undefined],
    ["重複した記事 ID を含む", '["article-slug", "article-slug"]', undefined],
    ["記事データが不正", '["article-slug"]', "{}"],
    [
      "更新日時が不正",
      '["article-slug"]',
      JSON.stringify({ ...cachedArticle, updatedDate: "invalid" }),
    ],
  ])(
    "%s場合は同期コマンドを案内して失敗する",
    async (_label, index, articleContents) => {
      const directory = await createCacheDirectory();
      if (index) await writeFile(join(directory, "index.json"), index);
      if (articleContents) {
        await writeFile(
          join(directory, cachedArticle.id + ".json"),
          articleContents,
        );
      }

      await expect(getCachedDiscussionArticles(directory)).rejects.toThrow(
        "npm run notes:sync を実行してください。",
      );
    },
  );
});

describe("writeDiscussionArticlesCache", () => {
  it("記事データと index を保存する", async () => {
    const directory = await createCacheDirectory();
    await writeDiscussionArticlesCache(
      [{ ...cachedArticle, pubDate: new Date(cachedArticle.pubDate) }],
      directory,
    );

    await expect(
      readFile(join(directory, "index.json"), "utf8").then(JSON.parse),
    ).resolves.toEqual([cachedArticle.id]);
    await expect(
      readFile(join(directory, cachedArticle.id + ".json"), "utf8").then(
        JSON.parse,
      ),
    ).resolves.toMatchObject({ id: cachedArticle.id });
  });

  it("同期対象から外れた記事データを削除する", async () => {
    const directory = await createCacheDirectory();
    await writeFile(join(directory, "old-article.json"), "{}");

    await writeDiscussionArticlesCache(
      [{ ...cachedArticle, pubDate: new Date(cachedArticle.pubDate) }],
      directory,
    );

    await expect(
      readFile(join(directory, "old-article.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
