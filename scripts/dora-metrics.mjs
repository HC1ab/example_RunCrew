// DORA 4대 지표 수집 스크립트 (Node 20+, 외부 의존성 없음)
//
// 데이터 출처
// - 배포: GitHub Deployments (environment = github-pages, Deploy 워크플로우가 생성)
// - 장애: `incident` 라벨이 붙은 Issue
//
// 지표 정의
// - Deployment Frequency : 기간 내 성공한 배포 수 (주당 평균)
// - Lead Time for Changes: 커밋 작성 시점 → 그 커밋이 포함된 배포 성공 시점 (중앙값)
// - Change Failure Rate  : (실패한 배포 + incident 수) / 전체 배포 수
// - MTTR                 : incident 이슈 생성 → 닫힘까지 걸린 시간 (평균)

import { appendFileSync, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const REPO = process.env.REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 30);
const ENVIRONMENT = process.env.DEPLOY_ENVIRONMENT ?? "github-pages";
const INCIDENT_LABEL = "incident";
const OUT_DIR = "metrics";
const HISTORY_LIMIT = 90;
const WEEKS_IN_SERIES = 8;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

if (!REPO || !TOKEN) {
  console.error("REPO and GITHUB_TOKEN must be set");
  process.exit(1);
}

async function gh(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${path}: ${await res.text()}`);
  return res.json();
}

async function ghAll(path, maxPages = 10) {
  const sep = path.includes("?") ? "&" : "?";
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    const batch = await gh(`${path}${sep}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

const hoursBetween = (from, to) => (new Date(to) - new Date(from)) / HOUR;
const round = (n, digits = 2) => (n == null ? null : Number(n.toFixed(digits)));

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const isBotCommit = (c) => c.author?.type === "Bot" || c.commit.author.name.endsWith("[bot]");

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// DORA State of DevOps 기준 성과 등급
const levels = {
  deploymentFrequency: (perWeek) =>
    perWeek >= 7 ? "Elite" : perWeek >= 1 ? "High" : perWeek >= 0.25 ? "Medium" : "Low",
  leadTime: (hours) =>
    hours == null ? null : hours < 24 ? "Elite" : hours < 168 ? "High" : hours < 720 ? "Medium" : "Low",
  changeFailureRate: (rate) =>
    rate == null ? null : rate <= 0.05 ? "Elite" : rate <= 0.1 ? "High" : rate <= 0.15 ? "Medium" : "Low",
  mttr: (hours) =>
    hours == null ? null : hours < 1 ? "Elite" : hours < 24 ? "High" : hours < 168 ? "Medium" : "Low",
};

async function collectDeployments() {
  const raw = await ghAll(`/deployments?environment=${ENVIRONMENT}`);
  const deployments = [];

  for (const d of raw) {
    // 상태는 최신순. 새 배포가 생기면 이전 배포에 inactive가 추가되므로 최종 결과 상태를 찾는다.
    const statuses = await gh(`/deployments/${d.id}/statuses?per_page=100`);
    const final = statuses.find((s) => ["success", "failure", "error"].includes(s.state));
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
    const baseSha = previousSha ?? (await gh(`/commits/${dep.sha}`)).parents[0]?.sha;

    let commits = [];
    if (!baseSha) {
      commits = [await gh(`/commits/${dep.sha}`)];
    } else if (baseSha !== dep.sha) {
      commits = (await gh(`/compare/${baseSha}...${dep.sha}`)).commits;
    }
    // 지표 갱신용 봇 커밋은 개발 변경이 아니므로 제외
    commits = commits.filter((c) => !isBotCommit(c));

    dep.commitCount = commits.length;
    dep.leadTimesHours = commits.map((c) => hoursBetween(c.commit.author.date, dep.finishedAt));
    dep.leadTimeHours = median(dep.leadTimesHours);
    previousSha = dep.sha;
  }

  return deployments;
}

async function collectIncidents() {
  const issues = await ghAll(`/issues?labels=${INCIDENT_LABEL}&state=all`);
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

function weeklySeries(deployments, now) {
  const series = [];
  for (let w = WEEKS_IN_SERIES - 1; w >= 0; w--) {
    const end = now - w * WEEK;
    const start = end - WEEK;
    const inWeek = deployments.filter((d) => {
      const t = new Date(d.finishedAt).getTime();
      return t > start && t <= end;
    });
    series.push({
      weekStart: new Date(start).toISOString().slice(0, 10),
      success: inWeek.filter((d) => d.state === "success").length,
      failure: inWeek.filter((d) => d.state === "failure").length,
    });
  }
  return series;
}

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeSummary(result) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const { metrics: m } = result;
  const fmt = (v, unit) => (v == null ? "-" : `${v}${unit}`);
  const lines = [
    `## 📊 DORA Metrics (최근 ${WINDOW_DAYS}일)`,
    "",
    "| 지표 | 값 | 등급 |",
    "|---|---|---|",
    `| Deployment Frequency | ${m.deploymentFrequency.perWeek}회/주 (총 ${m.deploymentFrequency.total}회) | ${m.deploymentFrequency.level} |`,
    `| Lead Time for Changes | ${fmt(m.leadTime.medianHours, "시간")} | ${m.leadTime.level ?? "-"} |`,
    `| Change Failure Rate | ${m.changeFailureRate.rate == null ? "-" : `${round(m.changeFailureRate.rate * 100, 1)}%`} | ${m.changeFailureRate.level ?? "-"} |`,
    `| MTTR | ${fmt(m.mttr.meanHours, "시간")} | ${m.mttr.level ?? "-"} |`,
    "",
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
}

async function main() {
  const now = Date.now();
  const since = now - WINDOW_DAYS * DAY;
  const inWindow = (iso) => new Date(iso).getTime() >= since;

  const [deployments, incidents] = await Promise.all([collectDeployments(), collectIncidents()]);

  const windowDeploys = deployments.filter((d) => inWindow(d.finishedAt));
  const successes = windowDeploys.filter((d) => d.state === "success");
  const failures = windowDeploys.filter((d) => d.state === "failure");
  const windowIncidents = incidents.filter((i) => inWindow(i.createdAt));
  const resolved = windowIncidents.filter((i) => i.recoveryHours != null);

  const perWeek = successes.length / (WINDOW_DAYS / 7);
  const leadTimeHours = median(successes.flatMap((d) => d.leadTimesHours ?? []));
  const failureRate = windowDeploys.length
    ? Math.min(1, (failures.length + windowIncidents.length) / windowDeploys.length)
    : null;
  const mttrHours = mean(resolved.map((i) => i.recoveryHours));

  const result = {
    repository: REPO,
    generatedAt: new Date(now).toISOString(),
    windowDays: WINDOW_DAYS,
    metrics: {
      deploymentFrequency: {
        total: successes.length,
        perWeek: round(perWeek),
        level: levels.deploymentFrequency(perWeek),
      },
      leadTime: {
        medianHours: round(leadTimeHours),
        level: levels.leadTime(leadTimeHours),
      },
      changeFailureRate: {
        failedDeployments: failures.length,
        incidents: windowIncidents.length,
        totalDeployments: windowDeploys.length,
        rate: round(failureRate, 4),
        level: levels.changeFailureRate(failureRate),
      },
      mttr: {
        resolvedIncidents: resolved.length,
        openIncidents: windowIncidents.length - resolved.length,
        meanHours: round(mttrHours),
        level: levels.mttr(mttrHours),
      },
    },
    weekly: weeklySeries(deployments, now),
    deployments: windowDeploys.map(({ leadTimesHours, ...d }) => ({
      ...d,
      leadTimeHours: round(d.leadTimeHours),
    })),
    incidents: windowIncidents.map((i) => ({ ...i, recoveryHours: round(i.recoveryHours) })),
  };

  // 날짜별 스냅샷을 남겨 추세를 볼 수 있게 한다 (같은 날짜는 덮어씀)
  const history = await readJson(`${OUT_DIR}/dora-history.json`, []);
  const today = result.generatedAt.slice(0, 10);
  const snapshot = {
    date: today,
    deploymentsPerWeek: result.metrics.deploymentFrequency.perWeek,
    leadTimeHours: result.metrics.leadTime.medianHours,
    changeFailureRate: result.metrics.changeFailureRate.rate,
    mttrHours: result.metrics.mttr.meanHours,
  };
  const nextHistory = [...history.filter((h) => h.date !== today), snapshot].slice(-HISTORY_LIMIT);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/dora.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${OUT_DIR}/dora-history.json`, `${JSON.stringify(nextHistory, null, 2)}\n`);

  writeSummary(result);
  console.log(JSON.stringify(result.metrics, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
