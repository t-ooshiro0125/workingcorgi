import {
  noteCategoryValues,
  type NoteCategory,
} from "../config/noteCategories";
import type { DiscussionArticle } from "./discussionArticle";
import { sortDiscussionArticles } from "./discussionArticleNavigation";

export interface DiscussionArticleCategoryPage {
  readonly category: NoteCategory;
  readonly articles: readonly DiscussionArticle[];
}

/** Notes カテゴリの定義順に、公開順の記事一覧を持つカテゴリページを作成する。 */
export const createDiscussionArticleCategoryPages = (
  articles: readonly DiscussionArticle[],
): readonly DiscussionArticleCategoryPage[] =>
  noteCategoryValues.flatMap((category) => {
    const categoryArticles = sortDiscussionArticles(
      articles.filter((article) => article.category === category),
    );

    return categoryArticles.length
      ? [{ category, articles: categoryArticles }]
      : [];
  });
