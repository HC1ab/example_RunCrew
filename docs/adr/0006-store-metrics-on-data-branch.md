# ADR-0006: 자동 생성 지표는 `dora-metrics` 데이터 브랜치에 저장한다

- **상태**: 승인됨
- **날짜**: 2026-11-14
- **결정자**: @HC1ab
- **관련**: 이슈 #45, [ADR-0002](0002-use-github-deployments-as-dora-source.md)

## 배경

DORA Metrics 워크플로우는 지표를 계산할 때마다 `metrics/dora.json`을 **main에 직접 커밋**했습니다. 그런데 main에 브랜치 보호 규칙(PR 필수, `CI Result` 통과 필수)을 걸면 이 봇 커밋도 막힙니다.

개인 저장소의 Repository Ruleset은 GitHub Actions 봇을 예외(bypass)로 등록할 수 없었습니다.

```
422 Validation Failed: Actor GitHub Actions integration must be part of the
ruleset source or owner organization
```

## 검토한 선택지

| 선택지 | 장점 | 단점 |
|--------|------|------|
| A. 브랜치 보호를 걸지 않음 | 변경 없음 | 누구나 main에 직접 push 가능, 리뷰·CI를 건너뛸 수 있음 |
| B. 배포 키(Deploy key)로 봇에 bypass 권한 부여 | main에 계속 커밋 | 새 비밀 키를 만들고 관리해야 함, 키가 유출되면 보호 규칙 전체가 무력화 |
| C. 봇이 매번 지표 갱신 PR을 만들고 자동 머지 | 모든 변경이 PR을 거침 | 하루에도 여러 번 PR이 생겨 히스토리·알림이 지저분해짐 |
| D. **데이터 전용 브랜치에 저장** | main 보호와 충돌 없음, 추가 비밀 키 불필요 | 데이터를 읽는 쪽(빌드, 대시보드, 주간 요약)을 모두 수정해야 함 |

## 결정

> **D. 지표 JSON은 `dora-metrics` 브랜치에만 저장하고, main에는 코드와 문서만 둔다.**

- `dora-metrics`는 부모가 없는 **orphan 브랜치**로, `dora.json`, `dora-history.json`, 안내 README만 있습니다.
- DORA Metrics 워크플로우는 main에서 스크립트를 가져와 실행하고, 결과를 `git worktree`로 연 데이터 브랜치에 커밋합니다.
- 읽는 쪽
  - CI Build: `git show origin/dora-metrics:dora.json`으로 배포 사이트에 복사
  - 대시보드: `raw.githubusercontent.com/.../dora-metrics/dora.json` → 실패 시 배포 시점 사본
  - 주간 요약: 데이터 브랜치를 checkout해서 읽음
- main의 `metrics/` 폴더는 삭제하고 `.gitignore`에 추가합니다 (로컬 실행 결과가 커밋되지 않도록).

## 결과

- 👍 main에 Ruleset 적용 가능: 삭제·강제 push 금지, PR 필수, `CI Result` 필수, merge commit만 허용
- 👍 main 히스토리에서 봇 커밋(`chore(metrics)`)이 사라져 PR·기능 변경 이력만 남음
- 👍 Lead Time 계산의 비교 구간(배포 사이 커밋)에 지표 커밋이 더 이상 섞이지 않음 (ADR-0002의 제외 규칙은 과거 데이터를 위해 유지)
- 👎 지표를 보려면 데이터 브랜치를 따로 봐야 함 → README와 대시보드에 링크
- 🔁 조직 저장소로 옮기면 Ruleset에서 GitHub Actions bypass가 가능하므로 main 저장 방식을 다시 검토할 수 있음
