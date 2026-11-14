# dora-metrics (데이터 브랜치)

[DORA Metrics 워크플로우](https://github.com/HC1ab/example_RunCrew/blob/main/.github/workflows/dora-metrics.yml)가 계산한 지표를 저장하는 **데이터 전용 브랜치**입니다.

- `dora.json`: 최근 30일 DORA 4대 지표와 배포·incident 목록
- `dora-history.json`: 날짜별 지표 스냅샷 (최근 90일)

`main`은 브랜치 보호 규칙으로 PR을 거쳐야만 바뀌므로, 봇이 자동으로 갱신하는 데이터는 이 브랜치에 따로 저장합니다. 자세한 이유는 [ADR-0006](https://github.com/HC1ab/example_RunCrew/blob/main/docs/adr/0006-store-metrics-on-data-branch.md)을 참고하세요.

이 브랜치에 직접 커밋하지 마세요.
