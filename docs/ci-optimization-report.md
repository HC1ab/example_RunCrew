# CI 최적화 전후 비교 리포트

> 대상: [`ci.yml`](../.github/workflows/ci.yml) (CI/CD 파이프라인)
> 관련: 이슈 #32, PR #31(최적화 전) → PR #33(최적화)
> 측정일: 2026-11-14

## 요약

| 항목 | 결과 |
|------|------|
| **선택적 실행 (문서만 변경된 PR)** | 실행 job 11개 → **{{DOCS_JOBS}}개**, job 시간 합계 189초 → **{{DOCS_JOBSUM}}초 ({{DOCS_IMPROVE}})** |
| **코드 PR 전체 파이프라인** | job 시간 합계 189초 → **171초 (−9.5%)** (job은 2개 늘었지만 macOS 1개 제외 효과) |
| **의존성 캐시: npm 다운로드 캐시** | 설치 단계 합계 61.3초 → 75.0초 (**+22.3%, 오히려 느려짐**) |
| **의존성 캐시: node_modules 캐시** | 설치 단계 합계 61.3초 → **57.3초 (−6.5%)**, Windows는 job당 10.9초 → **8.4초 (−22.9%)** |
| **중복 제거** | Node 설정·설치 정의 3곳 → **Composite Action 1곳**, Matrix 정의 → **Reusable Workflow 1곳** |

**결론**: 이 프로젝트는 의존성이 80개로 작아서 **캐싱 효과가 작고**, 가장 큰 개선은 **변경 파일 감지로 불필요한 job을 아예 실행하지 않는 것**에서 나왔습니다. npm 다운로드 캐시(`setup-node`의 `cache: npm`)는 복원 비용이 설치 비용보다 커서 기본값에서 제외했습니다.

---

## 1. 측정 방법

### 1-1. 캐시 전략 비교

- 같은 브랜치(`ci/optimize-pipeline`), 같은 커밋 계열에서 `workflow_dispatch`의 `cache` 입력만 바꿔 실행
- `none` / `npm`은 **번갈아** 3회씩 실행해 시간대 영향을 줄임
- `node_modules`는 첫 실행(캐시 생성)을 **워밍업으로 제외**하고 이후 3회 측정
- 수동 실행은 변경 감지와 무관하게 **전체 파이프라인(job 11개)** 을 실행
- 시간은 GitHub Actions API(`/actions/runs/{id}/jobs`)의 step `started_at` / `completed_at`으로 계산 (1초 단위)

| 전략 | 동작 |
|------|------|
| `none` | 캐시 없음. 매번 `npm ci`로 레지스트리에서 설치 (**기준선**) |
| `npm` | `setup-node`의 `cache: npm`으로 `~/.npm` 다운로드 캐시 복원 후 `npm ci` |
| `node_modules` | `actions/cache`로 `node_modules`를 OS·Node 버전·lockfile 해시 키로 캐시. **적중하면 `npm ci` 생략** |

### 1-2. 측정 항목

| 항목 | 의미 |
|------|------|
| Wall | 실행 시작부터 끝까지 걸린 시간 (병렬 job 포함, 사용자가 기다리는 시간) |
| Job 합계 | 성공한 job들의 실행 시간 합계 (러너 사용량, 비용에 비례) |
| 설치 단계 | Composite Action 본 단계(Node 설치 + 캐시 복원 + `npm ci`) 합계 |
| Post 단계 | 캐시 저장 등 job 종료 시 정리 단계 합계 |

## 2. 결과

### 2-1. 캐시 전략별 (전체 파이프라인, 각 3회 평균)

| 전략 | Wall | Job 합계 | 설치 단계 | Post 단계 | Windows 설치/job |
|------|-----:|---------:|----------:|----------:|-----------------:|
| `none` (기준) | 75.7초 | 159.3초 | 61.3초 | 2.0초 | 10.9초 |
| `npm` | 76.7초 (+1.3%) | 169.0초 (+6.1%) | 75.0초 (**+22.3%**) | 1.3초 | 12.1초 (+11.0%) |
| `node_modules` | 73.3초 (**−3.2%**) | 162.7초 (+2.1%) | 57.3초 (**−6.5%**) | 5.7초 | 8.4초 (**−22.9%**) |

실행 기록

| 전략 | Run 1 | Run 2 | Run 3 |
|------|-------|-------|-------|
| `none` | [43591795081](https://github.com/HC1ab/example_RunCrew/actions/runs/43591795081) | [43592012088](https://github.com/HC1ab/example_RunCrew/actions/runs/43592012088) | [43592250593](https://github.com/HC1ab/example_RunCrew/actions/runs/43592250593) |
| `npm` | [43591896902](https://github.com/HC1ab/example_RunCrew/actions/runs/43591896902) | [43592125021](https://github.com/HC1ab/example_RunCrew/actions/runs/43592125021) | [43592363220](https://github.com/HC1ab/example_RunCrew/actions/runs/43592363220) |
| `node_modules` | [43592857423](https://github.com/HC1ab/example_RunCrew/actions/runs/43592857423) | [43592980799](https://github.com/HC1ab/example_RunCrew/actions/runs/43592980799) | [43593090642](https://github.com/HC1ab/example_RunCrew/actions/runs/43593090642) |

### 2-2. 최적화 전후 PR 실행 (코드 변경 PR)

| 구분 | 실행 | 실행된 job | Wall | Job 합계 |
|------|------|-----------:|-----:|---------:|
| 최적화 전 (PR #31) | [43591223780](https://github.com/HC1ab/example_RunCrew/actions/runs/43591223780) | 11 | 64초 | 189초 |
| 최적화 후 (PR #33) | [43592618016](https://github.com/HC1ab/example_RunCrew/actions/runs/43592618016) | 13 | 66초 | **171초 (−9.5%)** |

최적화 후에는 변경 감지(`Detect changes`)와 결과 집계(`CI Result`) job이 추가됐지만, Matrix에서 실행 비용이 가장 큰 **macOS + Node 20**을 빼서 전체 러너 사용량은 줄었습니다. Wall은 가장 느린 Windows job이 결정하므로 거의 같습니다.

### 2-3. 선택적 실행 (문서만 바뀐 PR)

| 구분 | 실행 | 실행된 job | Wall | Job 합계 |
|------|------|-----------:|-----:|---------:|
| 최적화 전 (모든 PR에서 전체 실행) | [43591223780](https://github.com/HC1ab/example_RunCrew/actions/runs/43591223780) | 11 | 64초 | 189초 |
| 최적화 후 (이 리포트 PR, 문서만 변경) | [{{DOCS_RUN}}](https://github.com/HC1ab/example_RunCrew/actions/runs/{{DOCS_RUN}}) | **{{DOCS_JOBS}}** | **{{DOCS_WALL}}초** | **{{DOCS_JOBSUM}}초 ({{DOCS_IMPROVE}})** |

문서만 바뀌면 `Detect changes`가 `code=false`, `site=false`를 내보내고 Lint·Test·Build·Deploy가 모두 생략됩니다. `CI Result`는 실패한 job이 없으므로 통과합니다.

## 3. 분석

### 3-1. npm 다운로드 캐시가 느려진 이유

- 의존성은 ESLint 관련 **80개 패키지**뿐이라 `npm ci`가 Ubuntu 2초, macOS 1.5초, Windows 5.5초 정도로 이미 빠릅니다.
- `cache: npm`은 `~/.npm`을 복원한 뒤에도 **`npm ci`를 그대로 실행**합니다 (`node_modules`를 지우고 다시 설치).
- 결국 "캐시 내려받기 + 압축 풀기" 비용이 "레지스트리에서 받기" 비용보다 커서 손해를 봤습니다.

### 3-2. node_modules 캐시가 Windows에서 가장 효과가 큰 이유

- 캐시가 적중하면 `npm ci`를 아예 실행하지 않습니다 (로그에서 `Cache hit occurred on the primary key` 후 설치 단계 생략 확인).
- Windows는 파일 시스템 특성상 **작은 파일을 많이 쓰는 작업이 느려서** `npm ci` 생략 효과가 가장 큽니다 (−22.9%).
- 대신 캐시 키가 처음 생기는 실행에서는 **Post 단계에서 캐시를 저장**하는 비용이 듭니다 (Post 2.0초 → 5.7초). 측정 기간 중 `Node current` 버전의 키가 새로 만들어진 영향도 포함됐습니다.

### 3-3. 측정의 한계

- 반복 횟수가 3회라 실행마다 편차가 큽니다 (Wall 68~83초). Wall 차이 3% 정도는 **러너 상태에 따른 편차 범위** 안에 있을 수 있습니다.
- step 시간은 API 제공 단위가 1초라서 2초 내외인 Ubuntu·macOS 설치 단계의 차이는 정밀하게 비교하기 어렵습니다.
- 의존성이 커지면(예: 앱 코드, 테스트 프레임워크 추가) 캐싱 효과는 지금보다 커질 것으로 예상합니다. 이때 같은 방법으로 다시 측정합니다.

## 4. 적용한 최적화 정리

| 기법 | 적용 내용 | 효과 |
|------|-----------|------|
| **변경 파일 감지** | `dorny/paths-filter`로 `code` / `site` 분류 (커밋 SHA 고정) | 문서 PR에서 job {{DOCS_SKIPPED}}개 생략 |
| **선택적 배포** | main push + 빌드 성공 + 코드/대시보드 변경일 때만 Deploy | 내용이 같은 재배포 방지 |
| **Composite Action** | Node 설치·캐시·설치를 [`setup-node-project`](../.github/actions/setup-node-project/action.yml) 하나로 | 설정 3곳 → 1곳 |
| **Reusable Workflow** | Matrix 테스트를 [`reusable-node-test.yml`](../.github/workflows/reusable-node-test.yml)로 분리 | OS·버전 목록을 입력으로 재사용 |
| **Matrix 확장** | `include`: Ubuntu + Node current (experimental) / `exclude`: macOS + Node 20 | 다음 버전 사전 확인 + macOS 비용 절감 |
| **node_modules 캐시** | 적중 시 `npm ci` 생략 (기본 전략) | 설치 단계 −6.5%, Windows −22.9% |
| **동시 실행 취소** | 같은 브랜치의 이전 실행은 `cancel-in-progress` | 연속 push 시 러너 낭비 방지 |

## 5. 재현 방법

```bash
# 캐시 전략을 바꿔 전체 파이프라인 수동 실행
gh workflow run ci.yml --ref <branch> -f cache=none
gh workflow run ci.yml --ref <branch> -f cache=npm
gh workflow run ci.yml --ref <branch> -f cache=node_modules

# 실행별 job·step 시간 조회
gh api repos/HC1ab/example_RunCrew/actions/runs/<run-id>/jobs
```
