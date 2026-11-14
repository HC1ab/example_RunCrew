// DORA 4대 지표 수집 진입점
//
// GitHub API에서 배포·incident를 모아 metrics/dora.json, metrics/dora-history.json을 갱신한다.
// 계산 로직은 ./dora/metrics.mjs, API 호출은 ./dora/github.mjs에 있다.
//
// 사용법: REPO=owner/name GITHUB_TOKEN=... node scripts/dora-metrics.mjs

import { appendFileSync, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { collectDeployments, collectIncidents, createClient } from "./dora/github.mjs";
import { appendHistory, computeReport, formatSummary } from "./dora/metrics.mjs";

const REPO = process.env.REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 30);
const ENVIRONMENT = process.env.DEPLOY_ENVIRONMENT ?? "github-pages";
const OUT_DIR = process.env.OUT_DIR ?? "metrics";

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  if (!REPO || !TOKEN) {
    throw new Error("REPO and GITHUB_TOKEN must be set");
  }

  const client = createClient({ repo: REPO, token: TOKEN });
  const [deployments, incidents] = await Promise.all([
    collectDeployments(client, ENVIRONMENT),
    collectIncidents(client),
  ]);

  const report = computeReport({
    repository: REPO,
    deployments,
    incidents,
    now: Date.now(),
    windowDays: WINDOW_DAYS,
  });
  const history = appendHistory(await readJson(`${OUT_DIR}/dora-history.json`, []), report);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/dora.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${OUT_DIR}/dora-history.json`, `${JSON.stringify(history, null, 2)}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatSummary(report));
  }
  console.log(JSON.stringify(report.metrics, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
