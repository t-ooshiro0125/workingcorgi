import type { DiscussionArticle } from "./discussionArticle";

export interface DiscussionArticleNavigation {
  readonly article: DiscussionArticle;
  readonly previousArticle?: DiscussionArticle;
  readonly nextArticle?: DiscussionArticle;
  readonly relatedArticles: readonly DiscussionArticle[];
}

/** 公開日、同日の場合は Discussion 番号の降順で記事を並べ替える。 */
export const sortDiscussionArticles = (
  articles: readonly DiscussionArticle[],
): readonly DiscussionArticle[] =>
  articles.toSorted(
    (a, b) =>
      b.pubDate.valueOf() - a.pubDate.valueOf() ||
      b.discussionNumber - a.discussionNumber,
  );

/** 公開順の記事と前後関係を返す。 */
export const createDiscussionArticleNavigation = (
  articles: readonly DiscussionArticle[],
): readonly DiscussionArticleNavigation[] => {
  const orderedArticles = sortDiscussionArticles(articles);

  return orderedArticles.map((article, index) => ({
    article,
    previousArticle: orderedArticles[index - 1],
    nextArticle: orderedArticles[index + 1],
    relatedArticles: orderedArticles
      .filter(
        (candidate) =>
          candidate.discussionNumber !== article.discussionNumber &&
          candidate.category === article.category,
      )
      .slice(0, 3),
  }));
};
