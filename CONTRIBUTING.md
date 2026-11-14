# 기여 가이드 (Contributing Guide)

RunCrew에 관심을 가져 주셔서 감사합니다! 이 문서는 이슈 작성부터 PR 머지까지의 과정을 설명합니다.

모든 참여자는 [행동 강령](CODE_OF_CONDUCT.md)을 지켜 주세요.

## 목차

1. [작업 흐름 한눈에 보기](#작업-흐름-한눈에-보기)
2. [이슈 작성](#이슈-작성)
3. [브랜치 전략](#브랜치-전략)
4. [커밋 메시지 규칙](#커밋-메시지-규칙-conventional-commits)
5. [Pull Request](#pull-request)
6. [코드 리뷰](#코드-리뷰)
7. [로컬 개발 환경](#로컬-개발-환경)

## 작업 흐름 한눈에 보기

```
이슈 작성 → 브랜치 생성 → 작은 단위로 커밋 → PR 생성 → CI 통과 + 리뷰 → main 머지 → 자동 배포
```

모든 작업은 **이슈에서 시작**합니다. 코드뿐 아니라 문서 수정, 설정 변경도 이슈로 남겨 주세요.

## 이슈 작성

- 버그는 **🐛 Bug Report**, 기능 제안은 **✨ Feature Request** 템플릿을 사용합니다.
- 라벨 체계

  | 분류 | 라벨 | 용도 |
  |------|------|------|
  | Type | `type: feature` `type: bug` `type: docs` `type: chore` `type: test` | 작업 종류 |
  | Priority | `priority: high` `priority: medium` `priority: low` | 우선순위 |
  | Status | `status: blocked` `status: needs-info` | 진행 상태 |
  | Area | `area: auth` `area: running` `area: group-run` `area: point` `area: infra` | 기능 영역 |
  | 운영 | `incident` | 운영 장애 (DORA MTTR·CFR 집계 대상) |

- 작업 현황은 [칸반 보드](https://github.com/users/HC1ab/projects/1)에서 관리합니다.

## 브랜치 전략

**GitHub Flow**를 사용합니다. `main`은 항상 배포 가능한 상태로 유지하고, 모든 작업은 `main`에서 갈라진 **기능 브랜치**에서 진행합니다.

```
main ──●────────────●──────────●──▶ (항상 배포 가능)
        \          /          /
         feat/... ●──●       /
                     fix/... ●
```

### 브랜치 이름 규칙

`<타입>/<짧은-설명>` 형식, 영어 소문자와 하이픈만 사용합니다.

| 접두사 | 용도 | 예시 |
|--------|------|------|
| `feat/` | 새 기능 | `feat/group-run-session` |
| `fix/` | 버그 수정 | `fix/dora-exclude-bot-commits` |
| `docs/` | 문서 | `docs/collaboration-guides` |
| `refactor/` | 동작 변경 없는 구조 개선 | `refactor/dora-node-package` |
| `test/` | 테스트 | `test/lead-time-calculation` |
| `ci/` | CI/CD 설정 | `ci/build-test-deploy` |
| `chore/` | 기타 설정, 의존성 | `chore/add-license` |

### 규칙

- `main`에 직접 push하지 않습니다. (예외: `github-actions[bot]`의 지표 갱신 커밋)
- 브랜치는 **하나의 목적**만 가집니다. 다른 작업이 생기면 새 브랜치를 만드세요.
- 머지된 브랜치는 삭제합니다.
- 작업이 길어지면 `main`의 최신 내용을 자주 반영합니다.

  ```bash
  git fetch origin
  git rebase origin/main
  ```

## 커밋 메시지 규칙 (Conventional Commits)

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/ko/v1.0.0/)을 따릅니다.

```
<type>(<scope>): <subject>

<body>

<footer>
```

| type | 의미 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `test` | 테스트 추가/수정 |
| `ci` | CI 설정 변경 |
| `perf` | 성능 개선 |
| `chore` | 빌드, 설정, 기타 |

### 작성 규칙

- **subject**: 영어 명령형, 소문자로 시작, 마침표 없이 50자 이내 (`add`, `fix`, `update`)
- **scope** (선택): 변경 영역 (`dora`, `dashboard`, `ci` 등)
- **body** (선택): *무엇을*이 아니라 **왜** 바꿨는지 설명
- **footer** (선택): 이슈 연결 (`Refs #12`, `Fixes #21`), 호환성이 깨지면 `BREAKING CHANGE:`
- 커밋 하나에는 **하나의 논리적 변경**만 담습니다 (Atomic Commit)

### 예시

```
fix(dora): exclude bot commits from lead time

Metric update commits by github-actions[bot] were counted as changes,
skewing lead time and commit counts.

Fixes #21
```

## Pull Request

1. PR 제목도 Conventional Commits 형식으로 작성합니다. (예: `feat: 실시간 그룹 러닝 세션 추가`)
2. [PR 템플릿](.github/pull_request_template.md)의 항목을 채웁니다.
3. 관련 이슈를 연결합니다. 머지 시 닫을 이슈는 `Closes #번호`.
4. **작게 나눕니다.** 변경은 가능하면 200줄 이내로 유지합니다.
5. 올리기 전에 직접 diff를 한 번 읽어 봅니다 (Self-review).
6. CI가 모두 통과해야 머지할 수 있습니다.

### 머지 방식

- **Create a merge commit**을 사용합니다.
- 원래 커밋 시간이 남아야 DORA **Lead Time**이 정확하게 계산되기 때문입니다. Squash를 쓰면 커밋 시간이 머지 시간으로 바뀝니다.

## 코드 리뷰

리뷰 방법과 피드백 태그(`[MUST]`, `[SHOULD]`, `[NITS]`)는 [리뷰 가이드](docs/REVIEW_GUIDE.md)를 참고하세요.

- 리뷰 요청은 **24시간 안에** 응답합니다.
- `[MUST]` 피드백이 모두 해결되어야 머지합니다.
- [CODEOWNERS](.github/CODEOWNERS)에 따라 리뷰어가 자동 지정됩니다.

## 로컬 개발 환경

### 필요 도구

- Git
- Node.js 20.19 이상 (22, 24 권장)

### 설치와 검사

```bash
git clone git@github.com:HC1ab/example_RunCrew.git
cd example_RunCrew
npm ci                  # 의존성 설치 (package-lock.json 기준)
npm run lint            # ESLint
npm test                # 단위 테스트 (node:test)
npm run test:coverage   # 커버리지 리포트 (Node 22 이상)
```

PR을 올리기 전에 `npm run lint`와 `npm test`가 통과하는지 확인해 주세요. CI에서도 같은 검사를 실행합니다.

### 코드 구조

| 경로 | 역할 |
|------|------|
| `scripts/dora/metrics.mjs` | 지표 계산 (순수 함수, 테스트 대상) |
| `scripts/dora/github.mjs` | GitHub API 수집 (`fetch` 주입 가능) |
| `scripts/dora-metrics.mjs` | 진입점: 수집 → 계산 → `OUT_DIR`(기본 `metrics/`)에 저장 |
| `test/` | 단위 테스트 |

### DORA 지표 수집 스크립트 실행

```bash
REPO=HC1ab/example_RunCrew GITHUB_TOKEN=<your-token> OUT_DIR=/tmp/dora npm run collect
```

- 토큰은 **절대 커밋하지 마세요.** 환경 변수로만 넘깁니다.
- `OUT_DIR`을 지정하지 않으면 `metrics/`에 저장됩니다. 로컬 실행 결과는 커밋하지 않습니다 (`metrics/`는 `.gitignore` 대상).
- CI에서는 지표를 [`dora-metrics` 데이터 브랜치](https://github.com/HC1ab/example_RunCrew/tree/dora-metrics)에 저장합니다 ([ADR-0006](docs/adr/0006-store-metrics-on-data-branch.md)).

### 대시보드 미리보기

`dashboard/index.html`을 브라우저로 열면 `main`의 최신 지표를 불러와 표시합니다.

---

질문이 있으면 이슈에 `status: needs-info` 라벨을 붙여 남겨 주세요.
