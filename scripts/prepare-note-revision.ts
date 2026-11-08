import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { getCachedDiscussionArticles } from "../src/data/discussionArticlesCache";

const usage = () => {
  console.error("使い方: npm run notes:revision -- <URLスラッグ>");
};

const slug = process.argv[2];

if (!slug || process.argv.length !== 3) {
  usage();
  process.exit(2);
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(
  repositoryRoot,
  "src/content/revisions",
  slug + ".md",
);

if (!outputPath.startsWith(repositoryRoot + "/")) {
  throw new Error("出力先がリポジトリ外です。");
}

try {
  await access(outputPath);
  throw new Error(
    "修正用ファイルがすでにあります: " +
      outputPath +
      "\n既存の作業内容を保護するため上書きしません。",
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const articles = await getCachedDiscussionArticles();
const article = articles.find((candidate) => candidate.id === slug);

if (!article) {
  throw new Error(
    "URL スラッグに一致する記事がありません: " +
      slug +
      "\nnpm run notes:sync を実行してから、公開済みの記事の URL スラッグを指定してください。",
  );
}

const content = `### タイトル

${article.title}

### 概要

${article.description}

### 公開日

${article.pubDate.toISOString().slice(0, 10)}

### URL スラッグ

${article.id}

### カテゴリ

${article.category}

### 本文

${article.body}
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, content, { encoding: "utf8", flag: "wx" });

console.log("修正用ファイルを作成しました: " + outputPath);
