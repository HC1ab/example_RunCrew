import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DAY,
  HOUR,
  appendHistory,
  computeReport,
  formatSummary,
  hoursBetween,
  isBotCommit,
  leadTimesFor,
  levels,
  mean,
  median,
  round,
  weeklySeries,
} from "../scripts/dora/metrics.mjs";

const NOW = Date.parse("2026-11-14T00:00:00Z");
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString();

describe("기본 통계 함수", () => {
  it("median: 홀수 개는 가운데 값", () => {
    assert.equal(median([5, 1, 3]), 3);
  });

  it("median: 짝수 개는 가운데 두 값의 평균", () => {
    assert.equal(median([4, 1, 3, 2]), 2.5);
  });

  it("median: 빈 배열은 null", () => {
    assert.equal(median([]), null);
  });

  it("median: 입력 배열을 바꾸지 않는다", () => {
    const values = [3, 1, 2];
    median(values);
    assert.deepEqual(values, [3, 1, 2]);
  });

  it("mean: 평균, 빈 배열은 null", () => {
    assert.equal(mean([1, 2, 3]), 2);
    assert.equal(mean([]), null);
  });

  it("round: 자릿수 반올림, null/undefined는 null", () => {
    assert.equal(round(1.23456), 1.23);
    assert.equal(round(0.33333, 4), 0.3333);
    assert.equal(round(null), null);
    assert.equal(round(undefined), null);
  });

  it("hoursBetween: 두 시각 사이의 시간", () => {
    assert.equal(hoursBetween(iso(0), iso(90 * 60 * 1000)), 1.5);
  });
});

describe("isBotCommit", () => {
  it("author.type이 Bot이면 봇 커밋", () => {
    assert.equal(isBotCommit({ author: { type: "Bot" }, commit: { author: { name: "x" } } }), true);
  });

  it("작성자 이름이 [bot]으로 끝나면 봇 커밋", () => {
    assert.equal(isBotCommit({ author: null, commit: { author: { name: "github-actions[bot]" } } }), true);
  });

  it("사람이 작성한 커밋은 봇이 아님", () => {
    assert.equal(isBotCommit({ author: { type: "User" }, commit: { author: { name: "Sheine hwang" } } }), false);
  });
});

describe("leadTimesFor", () => {
  it("봇 커밋을 빼고 커밋별 리드 타임을 계산한다", () => {
    const finishedAt = iso(0);
    const commits = [
      { author: { type: "User" }, commit: { author: { name: "dev", date: iso(-2 * HOUR) } } },
      { author: { type: "Bot" }, commit: { author: { name: "github-actions[bot]", date: iso(-1 * HOUR) } } },
      { author: { type: "User" }, commit: { author: { name: "dev", date: iso(-4 * HOUR) } } },
    ];
    assert.deepEqual(leadTimesFor(commits, finishedAt), [2, 4]);
  });
});

describe("levels (DORA 성과 등급)", () => {
  it("Deployment Frequency: 주당 배포 횟수 기준", () => {
    assert.equal(levels.deploymentFrequency(7), "Elite");
    assert.equal(levels.deploymentFrequency(1), "High");
    assert.equal(levels.deploymentFrequency(0.25), "Medium");
    assert.equal(levels.deploymentFrequency(0.1), "Low");
  });

  it("Lead Time: 하루 / 일주일 / 한 달 경계", () => {
    assert.equal(levels.leadTime(23.9), "Elite");
    assert.equal(levels.leadTime(24), "High");
    assert.equal(levels.leadTime(168), "Medium");
    assert.equal(levels.leadTime(720), "Low");
    assert.equal(levels.leadTime(null), null);
  });

  it("Change Failure Rate: 5% / 10% / 15% 경계", () => {
    assert.equal(levels.changeFailureRate(0.05), "Elite");
    assert.equal(levels.changeFailureRate(0.1), "High");
    assert.equal(levels.changeFailureRate(0.15), "Medium");
    assert.equal(levels.changeFailureRate(0.5), "Low");
    assert.equal(levels.changeFailureRate(null), null);
  });

  it("MTTR: 1시간 / 하루 / 일주일 경계", () => {
    assert.equal(levels.mttr(0.5), "Elite");
    assert.equal(levels.mttr(1), "High");
    assert.equal(levels.mttr(24), "Medium");
    assert.equal(levels.mttr(168), "Low");
    assert.equal(levels.mttr(null), null);
  });
});

describe("weeklySeries", () => {
  it("주 단위로 성공/실패 배포를 센다 (오래된 주부터)", () => {
    const deployments = [
      { finishedAt: iso(-1 * DAY), state: "success" },
      { finishedAt: iso(-2 * DAY), state: "failure" },
      { finishedAt: iso(-8 * DAY), state: "success" },
    ];
    const series = weeklySeries(deployments, NOW, 2);
    assert.equal(series.length, 2);
    assert.deepEqual(
      series.map(({ success, failure }) => ({ success, failure })),
      [
        { success: 1, failure: 0 },
        { success: 1, failure: 1 },
      ],
    );
  });

  it("기간 밖의 배포는 세지 않는다", () => {
    const series = weeklySeries([{ finishedAt: iso(-30 * DAY), state: "success" }], NOW, 2);
    assert.equal(series.reduce((sum, w) => sum + w.success, 0), 0);
  });
});

describe("computeReport", () => {
  const deployments = [
    { id: 1, sha: "a", finishedAt: iso(-10 * DAY), state: "success", leadTimesHours: [1, 3], leadTimeHours: 2 },
    { id: 2, sha: "b", finishedAt: iso(-5 * DAY), state: "failure" },
    { id: 3, sha: "c", finishedAt: iso(-1 * DAY), state: "success", leadTimesHours: [5], leadTimeHours: 5 },
    { id: 4, sha: "old", finishedAt: iso(-60 * DAY), state: "success", leadTimesHours: [100], leadTimeHours: 100 },
  ];
  const incidents = [
    { number: 10, createdAt: iso(-3 * DAY), closedAt: iso(-3 * DAY + 2 * HOUR), recoveryHours: 2 },
    { number: 11, createdAt: iso(-2 * DAY), closedAt: null, recoveryHours: null },
    { number: 12, createdAt: iso(-90 * DAY), closedAt: iso(-89 * DAY), recoveryHours: 24 },
  ];

  const report = computeReport({ repository: "owner/repo", deployments, incidents, now: NOW, windowDays: 28 });
  const m = report.metrics;

  it("기간(28일) 밖의 배포와 incident는 제외한다", () => {
    assert.equal(report.deployments.length, 3);
    assert.equal(report.incidents.length, 2);
  });

  it("Deployment Frequency: 성공 2회 / 4주 = 주 0.5회", () => {
    assert.equal(m.deploymentFrequency.total, 2);
    assert.equal(m.deploymentFrequency.perWeek, 0.5);
    assert.equal(m.deploymentFrequency.level, "Medium");
  });

  it("Lead Time: 성공 배포의 모든 커밋 리드 타임 중앙값", () => {
    // [1, 3, 5]의 중앙값
    assert.equal(m.leadTime.medianHours, 3);
    assert.equal(m.leadTime.level, "Elite");
  });

  it("Change Failure Rate: (실패 1 + incident 2) / 배포 3, 최대 100%", () => {
    assert.equal(m.changeFailureRate.failedDeployments, 1);
    assert.equal(m.changeFailureRate.incidents, 2);
    assert.equal(m.changeFailureRate.rate, 1);
  });

  it("MTTR: 해결된 incident만 평균", () => {
    assert.equal(m.mttr.resolvedIncidents, 1);
    assert.equal(m.mttr.openIncidents, 1);
    assert.equal(m.mttr.meanHours, 2);
    assert.equal(m.mttr.level, "High");
  });

  it("저장용 배포 목록에는 커밋별 리드 타임 배열을 넣지 않는다", () => {
    assert.ok(report.deployments.every((d) => !("leadTimesHours" in d)));
  });

  it("배포가 없으면 CFR은 null", () => {
    const empty = computeReport({ repository: "o/r", deployments: [], incidents: [], now: NOW, windowDays: 30 });
    assert.equal(empty.metrics.changeFailureRate.rate, null);
    assert.equal(empty.metrics.leadTime.medianHours, null);
    assert.equal(empty.metrics.deploymentFrequency.level, "Low");
  });
});

describe("appendHistory", () => {
  const report = computeReport({ repository: "o/r", deployments: [], incidents: [], now: NOW, windowDays: 30 });

  it("같은 날짜 스냅샷은 덮어쓴다", () => {
    const history = [{ date: "2026-11-14", deploymentsPerWeek: 99 }];
    const next = appendHistory(history, report);
    assert.equal(next.length, 1);
    assert.equal(next[0].deploymentsPerWeek, 0);
  });

  it("최근 limit개만 남긴다", () => {
    const history = Array.from({ length: 5 }, (_, i) => ({ date: `2026-10-0${i + 1}` }));
    const next = appendHistory(history, report, 3);
    assert.deepEqual(next.map((h) => h.date), ["2026-10-04", "2026-10-05", "2026-11-14"]);
  });
});

describe("formatSummary", () => {
  it("값이 없으면 '-'로 표시한다", () => {
    const report = computeReport({ repository: "o/r", deployments: [], incidents: [], now: NOW, windowDays: 30 });
    const summary = formatSummary(report);
    assert.match(summary, /최근 30일/);
    assert.match(summary, /\| Lead Time for Changes \| - \| - \|/);
    assert.match(summary, /\| Change Failure Rate \| - \| - \|/);
  });
});
