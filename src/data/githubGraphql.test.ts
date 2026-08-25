import { afterEach, describe, expect, it, vi } from "vitest";

import { requestGithubGraphql } from "./githubGraphql";

const request = {
  query: "query { viewer { login } }",
  variables: { owner: "workingcorgi" },
};

const response = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestGithubGraphql", () => {
  it("データを返し、GraphQL リクエストを送信する", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(response({ data: { viewer: { login: "ACorgi0125" } } })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestGithubGraphql("test-token", request, "GitHub Discussions"),
    ).resolves.toEqual({ viewer: { login: "ACorgi0125" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/graphql",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify(request),
      }),
    );
  });

  it("GraphQL エラーを取得失敗として扱う", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(response({ errors: [{ message: "Denied" }] })),
      ),
    );

    await expect(
      requestGithubGraphql("test-token", request, "GitHub Discussions"),
    ).rejects.toThrow("GitHub Discussions の取得に失敗しました: Denied");
  });

  it("HTTP エラーでは statusText を使用する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          response({}, { status: 401, statusText: "Unauthorized" }),
        ),
      ),
    );

    await expect(
      requestGithubGraphql("test-token", request, "GitHub Discussions"),
    ).rejects.toThrow("GitHub Discussions の取得に失敗しました: Unauthorized");
  });
});
