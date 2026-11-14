// GitHub REST API로 DORA 원본 데이터(배포, incident)를 수집한다
//
// - 배포: GitHub Deployments (CI/CD 워크플로우의 Deploy 단계가 github-pages 환경에 생성)
// - 장애: `incident` 라벨이 붙은 Issue

import { hoursBetween, leadTimesFor, median } from "./metrics.mjs";

const API_URL = "https://api.github.com";
const PAGE_SIZE = 100;

// fetchImpl을 주입받아 테스트에서 가짜 응답을 쓸 수 있게 한다
export function createClient({ repo, token, fetchImpl = fetch, maxPages = 10 }) {
  async function get(path) {
    const res = await fetchImpl(`${API_URL}/repos/${repo}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status} ${path}: ${await res.text()}`);
    return res.json();
  }

  async function getAll(path) {
    const sep = path.includes("?") ? "&" : "?";
    const items = [];
    for (let page = 1; page <= maxPages; page++) {
      const batch = await get(`${path}${sep}per_page=${PAGE_SIZE}&page=${page}`);
      items.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }
    return items;
  }

  return { get, getAll };
}

const FINAL_STATES = ["success", "failure", "error"];

export async function collectDeployments(client, environment) {
  const raw = await client.getAll(`/deployments?environment=${environment}`);
  const deployments = [];

  for (const d of raw) {
    // 상태는 최신순. 새 배포가 생기면 이전 배포에 inactive가 추가되므로 최종 결과 상태를 찾는다
    const statuses = await client.get(`/deployments/${d.id}/statuses?per_page=${PAGE_SIZE}`);
    const final = statuses.find((s) => FINAL_STATES.includes(s.state));
    if (!final) continue;
    deployments.push({
      id: d.id,
      sha: d.sha,
      createdAt: d.created_at,
      finishedAt: final.created_at,
      state: final.state === "success" ? "success" : "failure",
    });
  }

  deployments.sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));

  // 이전 성공 배포와 이번 배포 사이에 들어간 커밋들의 리드 타임을 계산
  let previousSha = null;
  for (const dep of deployments) {
    if (dep.state !== "success") continue;

    // 첫 배포는 이전 배포가 없으므로 첫 번째 부모 커밋을 기준으로 삼는다 (머지된 PR 커밋 전체 포함)
    const baseSha = previousSha ?? (await client.get(`/commits/${dep.sha}`)).parents[0]?.sha;

    let commits = [];
    if (!baseSha) {
      commits = [await client.get(`/commits/${dep.sha}`)];
    } else if (baseSha !== dep.sha) {
      commits = (await client.get(`/compare/${baseSha}...${dep.sha}`)).commits;
    }

    dep.leadTimesHours = leadTimesFor(commits, dep.finishedAt);
    dep.commitCount = dep.leadTimesHours.length;
    dep.leadTimeHours = median(dep.leadTimesHours);
    previousSha = dep.sha;
  }

  return deployments;
}

export async function collectIncidents(client, label = "incident") {
  const issues = await client.getAll(`/issues?labels=${encodeURIComponent(label)}&state=all`);
  return issues
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      url: i.html_url,
      createdAt: i.created_at,
      closedAt: i.closed_at,
      recoveryHours: i.closed_at ? hoursBetween(i.created_at, i.closed_at) : null,
    }));
}
