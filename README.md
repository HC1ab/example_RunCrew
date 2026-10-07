# 🏃 RunCrew

> 함께 달리는 러닝 동기부여 앱: GPS 트래킹, 실시간 그룹 러닝, 포인트 보상

![Flutter](https://img.shields.io/badge/Flutter-02569B?logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?logo=dart&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)

## 📌 프로젝트 소개

혼자 달리면 동기가 쉽게 떨어지고, 기존 러닝 앱은 기록 위주라 **함께 달리는 경험**이 부족합니다.
RunCrew는 크루원과 실시간으로 함께 달리고, 달린 만큼 보상을 받아 **꾸준한 러닝 습관**을 만들도록 돕습니다.

## 🎯 문제 정의

- 혼자 하는 러닝은 지속성이 낮음
- 기존 앱(Nike Run Club, Strava 등)은 실시간 그룹 러닝 기능이 제한적
- 꾸준히 달려도 실질적인 보상이 없어 동기 부여가 약함

## ✨ 핵심 기능

| 기능 | 설명 |
|------|------|
| 📍 GPS 러닝 트래킹 | 페이스, 거리, 칼로리 실시간 측정 및 백그라운드 트래킹 |
| 👥 실시간 그룹 러닝 | WebSocket 기반으로 크루원 위치와 페이스 공유 |
| 🎁 포인트 보상 | 러닝 거리에 따른 포인트 적립 및 샵에서 사용 |

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Flutter, Riverpod, Dio, ScreenUtil |
| Backend | Firebase (Auth, Realtime DB) |
| Local Storage | Hive, SharedPreferences, flutter_secure_storage |
| Background | flutter_background_service |
| Collaboration | Git, GitHub (Issues, PR, Actions) |

## 📂 프로젝트 구조

```
lib/
├── core/            # 네트워크, 스토리지, 상수, 유틸
├── common/widgets/  # 공통 위젯
└── features/
    ├── auth/        # 로그인/회원가입
    ├── running/     # GPS 러닝 트래킹
    ├── group_run/   # 실시간 그룹 러닝
    ├── point/       # 포인트 적립
    └── shop/        # 포인트 샵
```

## 🗓 마일스톤 (16주)

| 주차 | 내용 |
|------|------|
| 1–2 | 요구사항 정의, Git 환경 구축, 와이어프레임 |
| 3–4 | 프로젝트 구조 설계, 공통 모듈 구현 |
| 5–7 | GPS 트래킹, 러닝 기록 저장 |
| 8 | 🚩 중간 발표 (MVP 데모) |
| 9–11 | 실시간 그룹 러닝 |
| 12–13 | 포인트 적립, 샵 |
| 14 | 테스트 및 버그 수정 |
| 15 | 배포 준비, 문서화 |
| 16 | 🏁 최종 발표 |

## 🚀 시작하기

```bash
git clone https://github.com/HC1ab/example_RunCrew
cd runcrew
flutter pub get
flutter run
```

## 👤 팀원

| 이름 | 역할 | GitHub |
|------|------|--------|
| 황세인 | 디자인 / 개발 | [@HC1ab](https://github.com/HC1ab) |

## 📄 License

MIT License
