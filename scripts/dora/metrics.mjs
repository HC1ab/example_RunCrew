// DORA 4대 지표 계산 로직 (순수 함수, I/O 없음)
//
// 지표 정의
// - Deployment Frequency : 기간 내 성공한 배포 수 (주당 평균)
// - Lead Time for Changes: 커밋 작성 시점 → 그 커밋이 포함된 배포 성공 시점 (중앙값)
// - Change Failure Rate  : (실패한 배포 + incident 수) / 전체 배포 수
// - MTTR                 : incident 이슈 생성 → 닫힘까지 걸린 시간 (평균)

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

const HOURS_PER_DAY = 24;
const HOURS_PER_WEEK = 7 * HOURS_PER_DAY;
const HOURS_PER_MONTH = 30 * HOURS_PER_DAY;

export const hoursBetween = (from, to) => (new Date(to) - new Date(from)) / HOUR;

export const round = (n, digits = 2) => (n == null ? null : Number(n.toFixed(digits)));

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const mean = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

// 지표 갱신용 봇 커밋(github-actions[bot] 등)은 개발 변경이 아니므로 Lead Time에서 제외한다
export const isBotCommit = (c) =>
  c.author?.type === "Bot" || (c.commit?.author?.name ?? "").endsWith("[bot]");

// DORA State of DevOps 기준 성과 등급
export const levels = {
  deploymentFrequency: (perWeek) =>
    perWeek >= 7 ? "Elite" : perWeek >= 1 ? "High" : perWeek >= 0.25 ? "Medium" : "Low",
  leadTime: (hours) =>
    hours == null
      ? null
      : hours < HOURS_PER_DAY
        ? "Elite"
        : hours < HOURS_PER_WEEK
          ? "High"
          : hours < HOURS_PER_MONTH
            ? "Medium"
            : "Low",
  changeFailureRate: (rate) =>
    rate == null ? null : rate <= 0.05 ? "Elite" : rate <= 0.1 ? "High" : rate <= 0.15 ? "Medium" : "Low",
  mttr: (hours) =>
    hours == null
      ? null
      : hours < 1
        ? "Elite"
        : hours < HOURS_PER_DAY
          ? "High"
          : hours < HOURS_PER_WEEK
            ? "Medium"
            : "Low",
};

// 배포에 포함된 커밋들의 리드 타임(시간)을 계산한다. 봇 커밋은 제외
export function leadTimesFor(commits, finishedAt) {
  return commits
    .filter((c) => !isBotCommit(c))
    .map((c) => hoursBetween(c.commit.author.date, finishedAt));
}

// 최근 weeks주를 일주일 단위로 나눠 성공/실패 배포 수를 센다 (가장 오래된 주부터)
export function weeklySeries(deployments, now, weeks = 8) {
  const series = [];
  for (let w = weeks - 1; w >= 0; w--) {
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

// 수집한 배포·incident로 dora.json 보고서를 만든다
export function computeReport({ repository, deployments, incidents, now, windowDays }) {
  const since = now - windowDays * DAY;
  const inWindow = (iso) => new Date(iso).getTime() >= since;

  const windowDeploys = deployments.filter((d) => inWindow(d.finishedAt));
  const successes = windowDeploys.filter((d) => d.state === "success");
  const failures = windowDeploys.filter((d) => d.state === "failure");
  const windowIncidents = incidents.filter((i) => inWindow(i.createdAt));
  const resolved = windowIncidents.filter((i) => i.recoveryHours != null);

  const perWeek = successes.length / (windowDays / 7);
  const leadTimeHours = median(successes.flatMap((d) => d.leadTimesHours ?? []));
  const failureRate = windowDeploys.length
    ? Math.min(1, (failures.length + windowIncidents.length) / windowDeploys.length)
    : null;
  const mttrHours = mean(resolved.map((i) => i.recoveryHours));

  return {
    repository,
    generatedAt: new Date(now).toISOString(),
    windowDays,
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
    // 커밋별 리드 타임 배열은 크기만 커지므로 저장하지 않는다
    deployments: windowDeploys.map(({ leadTimesHours, ...d }) => ({
      ...d,
      leadTimeHours: round(d.leadTimeHours),
    })),
    incidents: windowIncidents.map((i) => ({ ...i, recoveryHours: round(i.recoveryHours) })),
  };
}

// 날짜별 스냅샷을 추가한다. 같은 날짜는 덮어쓰고 최근 limit개만 남긴다
export function appendHistory(history, report, limit = 90) {
  const date = report.generatedAt.slice(0, 10);
  const snapshot = {
    date,
    deploymentsPerWeek: report.metrics.deploymentFrequency.perWeek,
    leadTimeHours: report.metrics.leadTime.medianHours,
    changeFailureRate: report.metrics.changeFailureRate.rate,
    mttrHours: report.metrics.mttr.meanHours,
  };
  return [...history.filter((h) => h.date !== date), snapshot].slice(-limit);
}

// GitHub Actions Job Summary용 마크다운
export function formatSummary(report) {
  const m = report.metrics;
  const fmt = (v, unit) => (v == null ? "-" : `${v}${unit}`);
  const cfr = m.changeFailureRate.rate == null ? "-" : `${round(m.changeFailureRate.rate * 100, 1)}%`;
  return [
    `## 📊 DORA Metrics (최근 ${report.windowDays}일)`,
    "",
    "| 지표 | 값 | 등급 |",
    "|---|---|---|",
    `| Deployment Frequency | ${m.deploymentFrequency.perWeek}회/주 (총 ${m.deploymentFrequency.total}회) | ${m.deploymentFrequency.level} |`,
    `| Lead Time for Changes | ${fmt(m.leadTime.medianHours, "시간")} | ${m.leadTime.level ?? "-"} |`,
    `| Change Failure Rate | ${cfr} | ${m.changeFailureRate.level ?? "-"} |`,
    `| MTTR | ${fmt(m.mttr.meanHours, "시간")} | ${m.mttr.level ?? "-"} |`,
    "",
  ].join("\n");
}
