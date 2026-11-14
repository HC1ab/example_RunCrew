import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collectDeployments, collectIncidents, createClient } from "../scripts/dora/github.mjs";

// 경로 → 응답 본문 맵으로 GitHub API를 흉내 낸다
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    const path = url.replace("https://api.github.com/repos/o/r", "");
    calls.push(path);
    if (!(path in routes)) {
      return { ok: false, status: 404, text: async () => "not found", json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => routes[path] };
  };
  return { impl, calls };
}

const commit = (sha, date, { message = "feat: change", name = "dev" } = {}) => ({
  sha,
  commit: { message, author: { name, date } },
});

const metricsCommit = (sha, date) =>
  commit(sha, date, { message: "chore(metrics): update DORA metrics", name: "github-actions[bot]" });

describe("createClient", () => {
  it("100개 단위로 다음 페이지를 요청한다", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const { impl, calls } = fakeFetch({
      "/items?per_page=100&page=1": page1,
      "/items?per_page=100&page=2": [{ id: 100 }],
    });
    const client = createClient({ repo: "o/r", token: "t", fetchImpl: impl });
    const items = await client.getAll("/items");
    assert.equal(items.length, 101);
    assert.equal(calls.length, 2);
  });

  it("API 오류는 상태 코드와 경로를 담아 던진다", async () => {
    const { impl } = fakeFetch({});
    const client = createClient({ repo: "o/r", token: "t", fetchImpl: impl });
    await assert.rejects(client.get("/missing"), /GitHub API 404 \/missing/);
  });
});

describe("collectDeployments", () => {
  const routes = {
    "/deployments?environment=github-pages&per_page=100&page=1": [
      { id: 2, sha: "s2", created_at: "2026-11-02T00:00:00Z" },
      { id: 1, sha: "s1", created_at: "2026-11-01T00:00:00Z" },
      { id: 3, sha: "s3", created_at: "2026-11-03T00:00:00Z" },
    ],
    // 최신순 상태 목록. 이전 배포는 inactive가 앞에 붙는다
    "/deployments/1/statuses?per_page=100": [
      { state: "inactive", created_at: "2026-11-02T00:10:00Z" },
      { state: "success", created_at: "2026-11-01T01:00:00Z" },
    ],
    "/deployments/2/statuses?per_page=100": [{ state: "success", created_at: "2026-11-02T02:00:00Z" }],
    "/deployments/3/statuses?per_page=100": [{ state: "in_progress", created_at: "2026-11-03T00:01:00Z" }],
    "/commits/s1": { sha: "s1", parents: [{ sha: "s0" }] },
    "/compare/s0...s1": {
      commits: [commit("c1", "2026-10-31T23:00:00Z"), commit("s1", "2026-11-01T00:30:00Z")],
    },
    "/compare/s1...s2": {
      commits: [
        metricsCommit("metrics", "2026-11-01T02:00:00Z"),
        commit("dep", "2026-11-01T22:00:00Z", { message: "chore(deps): bump eslint", name: "dependabot[bot]" }),
        commit("c2", "2026-11-02T00:00:00Z"),
      ],
    },
  };

  it("최종 상태가 없는 배포(진행 중)는 제외하고 완료 순으로 정렬한다", async () => {
    const client = createClient({ repo: "o/r", token: "t", fetchImpl: fakeFetch(routes).impl });
    const deployments = await collectDeployments(client, "github-pages");
    assert.deepEqual(deployments.map((d) => d.id), [1, 2]);
    assert.deepEqual(deployments.map((d) => d.state), ["success", "success"]);
  });

  it("첫 배포는 첫 번째 부모와 비교해 PR 커밋을 모두 포함한다", async () => {
    const client = createClient({ repo: "o/r", token: "t", fetchImpl: fakeFetch(routes).impl });
    const [first] = await collectDeployments(client, "github-pages");
    assert.equal(first.commitCount, 2);
    // 커밋 리드 타임 2h, 0.5h의 중앙값
    assert.equal(first.leadTimeHours, 1.25);
  });

  it("지표 갱신 커밋은 제외하고 Dependabot 커밋은 포함한다", async () => {
    const client = createClient({ repo: "o/r", token: "t", fetchImpl: fakeFetch(routes).impl });
    const [, second] = await collectDeployments(client, "github-pages");
    assert.equal(second.commitCount, 2);
    // Dependabot 4h, c2 2h의 중앙값
    assert.equal(second.leadTimeHours, 3);
  });

  it("실패한 배포는 리드 타임을 계산하지 않는다", async () => {
    const failing = {
      "/deployments?environment=github-pages&per_page=100&page=1": [{ id: 9, sha: "x", created_at: "2026-11-01T00:00:00Z" }],
      "/deployments/9/statuses?per_page=100": [{ state: "failure", created_at: "2026-11-01T00:05:00Z" }],
    };
    const client = createClient({ repo: "o/r", token: "t", fetchImpl: fakeFetch(failing).impl });
    const [dep] = await collectDeployments(client, "github-pages");
    assert.equal(dep.state, "failure");
    assert.equal(dep.leadTimeHours, undefined);
  });
});

describe("collectIncidents", () => {
  it("PR은 제외하고 복구 시간을 계산한다", async () => {
    const { impl } = fakeFetch({
      "/issues?labels=incident&state=all&per_page=100&page=1": [
        { number: 1, title: "장애", html_url: "u1", created_at: "2026-11-01T00:00:00Z", closed_at: "2026-11-01T03:00:00Z" },
        { number: 2, title: "진행 중", html_url: "u2", created_at: "2026-11-02T00:00:00Z", closed_at: null },
        { number: 3, title: "PR", html_url: "u3", created_at: "2026-11-02T00:00:00Z", pull_request: {} },
      ],
    });
    const client = createClient({ repo: "o/r", token: "t", fetchImpl: impl });
    const incidents = await collectIncidents(client);
    assert.deepEqual(incidents.map((i) => [i.number, i.recoveryHours]), [
      [1, 3],
      [2, null],
    ]);
  });
});
