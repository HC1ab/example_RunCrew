# 오픈소스 라이선스 비교 분석과 선택 기준

> 관련: 이슈 #43 · 이 저장소의 라이선스: [MIT](../../LICENSE)
> 작성일: 2026-11-14

## 1. 라이선스 유형

| 유형 | 핵심 조건 | 수정본 공개 의무 | 대표 라이선스 |
|------|-----------|------------------|---------------|
| **Permissive** (허용형) | 저작권·라이선스 고지만 유지하면 상용·비공개 사용 자유 | 없음 | MIT, BSD, Apache-2.0, ISC |
| **Weak Copyleft** (약한 카피레프트) | **수정한 파일**은 같은 라이선스로 공개 | 파일 단위 | MPL-2.0, LGPL |
| **Strong Copyleft** (강한 카피레프트) | 이 코드를 포함한 **전체 결과물**을 같은 라이선스로 공개 | 배포물 전체 | GPL-2.0, GPL-3.0 |
| **Network Copyleft** | 네트워크로 **서비스만 제공해도** 소스 공개 | 서비스 포함 | AGPL-3.0 |
| **Source-available** (OSI 비승인) | 소스는 볼 수 있지만 특정 사용(경쟁 클라우드 서비스 등)을 제한 | 조건부 | SSPL, BSL 1.1, Elastic License |

## 2. 주요 오픈소스 프로젝트 비교

| 프로젝트 | 분야 | 라이선스 | 유형 | 선택 이유와 배경 |
|----------|------|----------|------|------------------|
| **React** | 웹 UI | MIT | Permissive | 2017년 BSD + 특허 조항에서 MIT로 변경. 특허 조항 때문에 Apache 재단 등 커뮤니티가 사용을 꺼리자 **생태계 확산**을 위해 가장 단순한 라이선스로 전환 |
| **Flutter** | 모바일 UI | BSD-3-Clause | Permissive | Google 제품명을 홍보에 쓰지 못하게 하는 조항(3번째 조항)이 있는 허용형. 앱 개발사가 부담 없이 쓰게 해 **플랫폼 채택률**을 높임 |
| **Kubernetes** | 인프라 | Apache-2.0 | Permissive | **특허 사용권을 명시적으로 부여**하고 특허 소송 시 권리를 회수. 여러 기업이 함께 기여하는 프로젝트라 특허 분쟁 방지가 중요 |
| **TensorFlow** | AI | Apache-2.0 | Permissive | 기업 사용자가 많아 특허 보호가 있는 허용형 선택. 상용 AI 서비스에 바로 쓸 수 있음 |
| **Firefox** | 브라우저 | MPL-2.0 | Weak Copyleft | 수정한 **파일만** 공개 의무. 브라우저 엔진 개선은 커뮤니티로 돌아오게 하면서, 함께 묶인 다른 코드는 자유롭게 둠 |
| **Linux 커널** | OS | GPL-2.0-only | Strong Copyleft | 커널을 수정해 배포하면 수정본도 공개해야 함. 기업들의 개선 사항이 **커뮤니티로 환원**되는 구조가 Linux 성장의 핵심 |
| **MongoDB** | DB | SSPL | Source-available | 2018년 AGPL에서 변경. 클라우드 업체가 MongoDB를 **서비스로 팔면서 기여는 하지 않는 문제**에 대응. OSI는 SSPL을 오픈소스로 인정하지 않음 |
| **Terraform** | 인프라 | BSL 1.1 | Source-available | 2023년 MPL-2.0에서 변경. 경쟁 상용 제품 사용을 제한. 이에 반발한 커뮤니티가 MPL 시점 코드를 포크해 **OpenTofu**(Linux Foundation)를 만듦 |

### 사례에서 얻은 교훈

1. **확산이 목표면 허용형**: React, Flutter처럼 생태계를 키우려는 프로젝트는 MIT·BSD를 고릅니다.
2. **여러 기업이 기여하면 Apache-2.0**: 특허 조항이 기여자와 사용자 모두를 보호합니다.
3. **개선이 돌아오길 원하면 카피레프트**: Linux(GPL), Firefox(MPL)는 수정본 공개로 커뮤니티를 유지합니다.
4. **라이선스 변경은 커뮤니티 신뢰를 시험합니다**: MongoDB, Terraform처럼 상업적 이유로 제한을 강화하면 포크(OpenTofu)가 생길 수 있습니다. 처음 선택이 중요합니다.

## 3. 라이선스 선택 기준

| 질문 | 예 → | 아니오 → |
|------|------|----------|
| ① 다른 사람이 상용·비공개 제품에 자유롭게 쓰길 원하는가? | Permissive | ②로 |
| ② 수정본이 반드시 공개되길 원하는가? | ③으로 | Permissive |
| ③ 파일 단위 공개면 충분한가? | MPL-2.0 | GPL / AGPL |
| ④ (Permissive일 때) 특허 보호가 필요한가? 여러 기업이 기여하는가? | Apache-2.0 | MIT |
| ⑤ 사용 중인 의존성 라이선스와 호환되는가? | 선택 확정 | 라이선스 재검토 |

## 4. 이 프로젝트의 선택: MIT

| 기준 | 판단 |
|------|------|
| 목적 | 학기 프로젝트 결과물을 **외부 공모전·포트폴리오**로 공유하고, 다른 학생이 DORA 수집 도구를 자유롭게 가져다 쓰길 원함 → Permissive |
| 특허 | 특허가 걸린 기술이나 여러 기업 기여자가 없음 → Apache-2.0의 특허 조항까지는 불필요 |
| 단순성 | 짧고 이해하기 쉬워 기여자가 부담 없이 참여 가능 |
| 생태계 | 주요 기술 스택(Flutter: BSD-3, Riverpod: MIT, Chart.js: MIT)과 같은 허용형 계열 |

> **결론: MIT**. 나중에 여러 기업·기관이 기여하게 되면 Apache-2.0 전환을 검토합니다 (모든 기여자 동의 필요).

### 의존성 라이선스 점검 (실측)

`package-lock.json`의 개발 의존성 80개를 확인한 결과입니다.

| 라이선스 | 개수 | MIT 프로젝트와 호환 |
|----------|-----:|:-------------------:|
| MIT | 55 | ✅ |
| Apache-2.0 | 12 | ✅ (NOTICE 파일이 있으면 고지 유지) |
| BSD-2-Clause | 6 | ✅ |
| ISC | 4 | ✅ |
| BlueOak-1.0.0 | 2 | ✅ (허용형, `minimatch` 등) |
| BSD-3-Clause | 1 | ✅ |

- **카피레프트(GPL/AGPL) 의존성: 0개** → MIT로 배포해도 라이선스 충돌 없음
- 모두 개발 도구(ESLint)라서 배포되는 대시보드에는 포함되지 않음
- 대시보드가 CDN으로 불러오는 Chart.js는 MIT

### 점검 방법

```bash
node -e "const l=require('./package-lock.json').packages;const c={};for(const[p,v]of Object.entries(l))if(p)c[v.license]=(c[v.license]||0)+1;console.log(c)"
```

## 참고

- [choosealicense.com](https://choosealicense.com/): 목적별 라이선스 선택 가이드 (GitHub 운영)
- [tldrlegal.com](https://www.tldrlegal.com/): 라이선스별 허용·금지·의무 요약
- [OSI 승인 라이선스 목록](https://opensource.org/licenses)
- [SPDX License List](https://spdx.org/licenses/): 라이선스 식별자 표준
