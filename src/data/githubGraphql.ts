// GraphQL request and response types
export interface GithubGraphqlRequest {
  readonly query: string;
  readonly variables: Record<string, string | null>;
}

interface GithubGraphqlResponse<T> {
  readonly data?: T;
  readonly errors?: readonly { readonly message: string }[];
}

// HTTP request
const fetchGithubGraphql = (
  token: string,
  { query, variables }: GithubGraphqlRequest,
) =>
  fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

// Response handling
const getErrorMessage = <T>(
  response: Response,
  { errors }: GithubGraphqlResponse<T>,
) => errors?.map(({ message }) => message).join(", ") ?? response.statusText;

/**
 * GitHub GraphQL API へリクエストを送り、レスポンスの data を返す。
 * GraphQL または HTTP のエラー時は、指定した対象名を含む例外を送出する。
 */
export const requestGithubGraphql = async <T>(
  token: string,
  request: GithubGraphqlRequest,
  errorSubject: string,
) => {
  const response = await fetchGithubGraphql(token, request);
  const result = (await response.json()) as GithubGraphqlResponse<T>;

  if (!response.ok || result.errors?.length) {
    throw new Error(
      `${errorSubject} の取得に失敗しました: ${getErrorMessage(response, result)}`,
    );
  }

  return result.data;
};
