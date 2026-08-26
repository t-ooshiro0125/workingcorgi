import { fetchDiscussionArticles } from "../src/data/discussionArticles";
import { writeDiscussionArticlesCache } from "../src/data/discussionArticlesCache";

const articles = await fetchDiscussionArticles();
await writeDiscussionArticlesCache(articles);
console.log(articles.length + " 件の Notes を同期しました。");
