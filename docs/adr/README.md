# Architecture Decision Records (ADR)

이 프로젝트의 주요 기술 결정과 **그 이유**를 기록합니다. 형식과 규칙은 [ADR-0001](0001-record-architecture-decisions.md)을 따릅니다.

## 목록

| 번호 | 결정 | 상태 | 날짜 |
|------|------|------|------|
| [0001](0001-record-architecture-decisions.md) | 기술 결정을 ADR로 기록한다 | 승인됨 | 2026-11-14 |
| [0002](0002-use-github-deployments-as-dora-source.md) | GitHub Deployments와 incident 라벨을 DORA 데이터 출처로 쓴다 | 승인됨 | 2026-10-15 |
| [0003](0003-use-merge-commits.md) | PR은 merge commit 방식으로 머지한다 | 승인됨 | 2026-10-15 |
| [0004](0004-deploy-only-on-code-or-site-changes.md) | 코드나 대시보드가 바뀐 경우에만 배포한다 | 승인됨 | 2026-11-14 |
| [0005](0005-cache-node-modules-instead-of-npm-cache.md) | npm 다운로드 캐시 대신 node_modules를 캐시한다 | 승인됨 | 2026-11-14 |

## 새 ADR 작성하기

1. [template.md](template.md)를 복사해 `NNNN-결정-요약.md`로 저장합니다 (번호는 마지막 번호 + 1).
2. 상태를 **제안됨**으로 두고 PR을 올립니다.
3. 리뷰에서 합의되면 **승인됨**으로 바꿔 머지합니다.
4. 결정을 바꿀 때는 기존 ADR을 고치지 않고 새 ADR을 만든 뒤, 기존 ADR 상태를 **ADR-XXXX로 대체됨**으로 바꿉니다.

### 언제 ADR을 쓰나요?

- 되돌리기 어렵거나 비용이 큰 결정 (아키텍처, 데이터 출처, 배포 방식)
- 지표나 품질 기준에 영향을 주는 결정
- 리뷰에서 "왜 이렇게 했어요?"라는 질문이 나온 결정
