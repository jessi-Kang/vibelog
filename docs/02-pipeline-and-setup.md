# 바이브 로그 (Vibelog) — Claude Code 개발 시작 준비

컨셉은 `docs/01-concept.md` 참고. 이 문서는 "코딩 시작 전에 뭘 갖춰둘지" 체크리스트.
(2026-09-09 개정: 데브로그 수집을 로컬 훅 푸시 → **GitHub 레포 pull 방식**으로 변경)

## 0. 동작 원리 한 장

```
[각 프로젝트 레포]  ← 별도 Claude Code 세션에서 평소처럼 코딩 + push
  ├─ 커밋 메시지 / PR 본문
  ├─ README, description, homepage(배포 URL), language
  ├─ (선택) devlog/*.md   ← 전역 Stop 훅이 세션 요약을 레포 안에 남김
  └─ (선택) vibelog.json  ← 카드 정보 덮어쓰기용

[vibelog GitHub Action]  ← 매일 밤 23:00 KST 자동 + workflow_dispatch 수동
  1. GitHub API: topic `vibelog` 달린 내 레포 전부 조회
  2. 레포별 체크포인트(state.json) 이후의 커밋·PR·devlog 파일 수집
  3. 활동 있는 레포만 Claude API → 데브로그 생성 (KR 원본 + EN)
  4. content/devlog/<repo>/<date>.md 저장, content/projects.json 갱신, state.json 갱신
  5. 커밋 → Vercel 자동 배포

[이 Cowork 채팅]  ← 기획·설계만. 파이프라인에 관여하지 않음.
```

새 프로젝트 등록 = 레포에 topic `vibelog` 하나 달기. 그 외 Jessi가 하는 일 없음.

## 1. 계정 · 키

1단계(블로그)에 당장 필요한 것:
- GitHub 레포 `vibelog` (public 추천 — 도그푸딩 콘텐츠)
- Vercel 계정 + GitHub 연동
- 레포 Secrets:
  - `ANTHROPIC_API_KEY` — 데브로그 생성
  - `GH_PAT` — fine-grained PAT (Contents: read, Metadata: read, 대상: 모든 내 레포). private 프로젝트 레포까지 읽으려면 필수. public만이면 생략 가능하나 rate limit 때문에 권장.

2단계 이후 (지금은 안 해도 됨):
- ElevenLabs: 보이스 클론 **완료** → `ELEVENLABS_VOICE_ID=pwjMkbtUbj1hBa0RkN5N` (설정값은 docs/03-shorts-spec.md)
- 텔레그램: BotFather로 봇 생성 → 토큰 + 내 chat_id
- YouTube: Google Cloud 프로젝트 → YouTube Data API v3 → OAuth 클라이언트 → refresh token 1회
- Instagram: 비즈니스/크리에이터 전환 → Facebook 페이지 연결 → Meta 개발자 앱 → 장기 토큰
- Neon: 승인 큐·게시 이력 DB (이미 연결됨)

## 2. vibelog 레포 구조

```
vibelog/
├─ CLAUDE.md
├─ app/
│   ├─ page.tsx                 # 프로젝트 카드 그리드
│   ├─ projects/[slug]/page.tsx # 프로젝트 상세 + 데브로그 타임라인
│   └─ log/page.tsx             # 전체 데브로그 피드
├─ content/
│   ├─ projects.json            # Action이 생성·갱신 (레포 메타 기반)
│   ├─ devlog/<repo>/<date>.md  # Action이 생성. frontmatter manual: true면 보호
│   └─ state.json               # 레포별 마지막 처리 커밋 SHA / 시각
├─ scripts/
│   ├─ collect.ts               # GitHub API → 레포별 활동 수집 (Octokit)
│   ├─ generate.ts              # 수집 결과 → Claude API → MDX (KR/EN)
│   └─ run.ts                   # collect → generate → 파일 쓰기
└─ .github/workflows/
    └─ devlog.yml               # cron '0 14 * * *' (=23:00 KST) + workflow_dispatch
```

## 3. 각 프로젝트 레포 쪽 규약 (최소)

- topic `vibelog` (필수)
- description 채우기 (카드에 그대로 씀)
- homepage(About Website)는 **안 채워도 된다** — 자동 감지 순서:
  ① About Website (채우면 언제나 우선 — 커스텀 도메인 의도용)
  ② Vercel API — 시크릿 `VERCEL_TOKEN`(+`VERCEL_TEAM_ID`)이 있으면, GitHub 연결이
     걸린 Vercel 프로젝트의 고정 production 도메인을 읽는다. **CLI로 올린 배포까지
     잡히는 유일한 경로**라 이게 기본. 토큰 발급: vercel.com/account/settings/tokens
  ③ GitHub Deployments 기록 — Vercel git 연동 배포가 남기는 기록의 environment_url
     (배포별 해시 주소라 배포마다 바뀌는 게 흠, 토큰 없을 때의 폴백)
- (선택) `vibelog.json` — `{ "name": "...", "status": "live", "stack": ["Next.js"], "hide": false }`
- (선택) `devlog/YYYY-MM-DD.md` — Stop 훅이 남기는 세션 요약

상태 자동 판정 기본값: 배포 주소가 있으면 **preview**(가배포), GitHub **Release를
1개 이상 발행**하면 **live** — "정식 공개" 선언은 Release 발행 하나뿐이다.
About Website는 주소 지정용일 뿐 상태와 무관 (주소만 채워도 live가 되던 사고의 교훈).
배포가 없으면 30일 내 커밋 building, 넘으면 paused. `vibelog.json`의 status가
있으면 언제나 그게 우선 — 예외적 강제 지정용 (vibelog 자신이 이걸로 live 고정).

### 커밋 메시지 규약 문구 (프로젝트 레포 CLAUDE.md에 복붙)

없어도 파이프라인은 돌지만, 글·쇼츠 품질이 커밋 메시지 품질을 그대로 따라간다.
새 프로젝트 레포의 CLAUDE.md에 아래 블록을 그대로 붙인다:

```markdown
## 커밋 규칙

이 레포의 커밋 메시지는 vibelog가 매일 밤 읽어 데브로그 글과 쇼츠 영상을
자동 생성하는 원료다. 커밋 메시지가 얇으면 글도 얇아진다.

- 한국어로 쓴다. 형식: `타입: 한 줄 요약` + 빈 줄 + 본문.
- 타입은 feat / fix / docs / chore / design / asset 중 하나. fix는 실제로
  깨졌던 것을 고쳤을 때만 쓴다 — 영상의 커밋 그래프가 타입별로 색을 입히고,
  fix 커밋은 글의 "삽질 포인트" 재료가 된다.
- 본문에 **"왜"**를 반드시 한 문장 이상 쓴다. 뭘 바꿨는지는 diff가 말해주니,
  왜 그렇게 했는지·뭘 시도하다 왜 버렸는지를 남긴다.
- 버그를 고친 커밋은 증상 → 원인 → 해결을 본문에 남긴다.
- 작업 단계가 끝날 때마다 커밋한다. 하루치를 한 커밋에 뭉치지 않는다.
- 커밋 메시지는 공개 블로그에 그대로 노출된다. 비밀 키·내부 URL·개인정보를
  쓰지 않는다.
```

## 4. 전역 Stop 훅 (`~/.claude/settings.json`)

한 번만 설치. 모든 Claude Code 세션 종료 시 실행되어 **현재 레포의** `devlog/YYYY-MM-DD.md`에 세션 요약을 append. 형식: 뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것.
- 현재 폴더가 git 레포가 아니거나 topic이 없어도 그냥 파일만 남김 (해가 없음)
- 커밋은 안 함. 다음 push 때 코드와 같이 올라감.
- 첫 vibelog 세션에서 Claude Code에게 이 훅 스크립트를 만들게 하면 됨.

## 5. CLAUDE.md 초안 (vibelog 레포)

```md
# Vibelog
바이브 코딩 프로젝트들의 제작기·현황을 자동 발행하는 블로그. 이 레포 자체가 첫 프로젝트.

## 원칙
- 커밋이 곧 콘텐츠. 데브로그는 사람이 쓰지 않고 파이프라인이 생성한다.
- 수집은 pull 방식: vibelog가 GitHub API로 topic `vibelog` 레포를 읽는다. 프로젝트 레포에 설치할 것은 없다.
- 손품 최소화: 새 기능은 "Jessi가 할 일이 늘어나는가?"를 먼저 묻는다.
- 한국어 원본, 영어는 자동 번역.

## 스택
Next.js (App Router) + TypeScript + Tailwind + MDX. 배포 Vercel. Octokit으로 GitHub 읽기. DB는 2단계부터 Neon.

## 컨벤션
- 커밋 메시지는 데브로그 원료다. 한 줄 요약 + 본문에 "왜"를 쓴다.
- content/ 밑 파일은 파이프라인이 덮어쓴다. 손수정은 frontmatter `manual: true`로 보호.
- 프로젝트 상태값: idea | building | preview | live | paused
- 데브로그 톤: 존댓말 (쇼츠 내레이션과 통일)
```

## 6. 1단계 스코프 (첫 주말)

- [ ] Next.js 블로그가 Vercel에 배포됨
- [ ] `scripts/collect.ts`가 topic `vibelog` 레포들의 커밋·PR·devlog를 가져옴
- [ ] `scripts/generate.ts`가 Claude API로 데브로그 MDX 생성 (KR/EN)
- [ ] `devlog.yml`이 매일 밤 + 수동 실행되며 content/ 를 커밋
- [ ] 프로젝트 카드 그리드 + 프로젝트 상세 타임라인 렌더
- [ ] 전역 Stop 훅 설치
- [ ] vibelog 레포 자체에 topic `vibelog` 달고, 첫 데브로그가 자동 생성되어 블로그에 뜸

일부러 뺀 것: 쇼츠, 승인 봇, DB, 조회수. 전부 2단계 이후.

## 7. 첫 세션 프롬프트 (복붙용)

세션 1 — 블로그 뼈대:
```
vibelog 레포를 초기화하자. CLAUDE.md를 먼저 읽어.
1. Next.js App Router + TS + Tailwind + MDX 셋업
2. content/projects.json → 메인 프로젝트 카드 그리드
3. content/devlog/<repo>/<date>.md → 프로젝트 상세 타임라인 + 전체 피드
4. 샘플 데이터(vibelog 프로젝트 + 데브로그 2개)로 화면 확인
디자인은 심플, 다크 기본, 모바일 우선. 단계마다 커밋. 커밋 본문에 "왜" 포함.
```

세션 2 — 수집·생성 파이프라인:
```
scripts/collect.ts: Octokit으로 내 계정에서 topic "vibelog" 레포를 모두 찾고,
content/state.json의 체크포인트 이후 커밋(메시지·변경 파일), 머지된 PR, devlog/*.md,
README, description, homepage, language, 루트의 vibelog.json을 수집해.
scripts/generate.ts: 수집 결과를 Claude API에 넘겨 레포별로 하루치 데브로그를
존댓말 한국어로 쓰고 영어 번역도 붙여 content/devlog/<repo>/<date>.md로 저장.
활동 없는 레포는 건너뛰어. projects.json과 state.json 갱신.
.github/workflows/devlog.yml: cron 0 14 * * * + workflow_dispatch, 실행 후 변경분 커밋.
Secrets: ANTHROPIC_API_KEY, GH_PAT.
```

세션 3 — 전역 Stop 훅:
```
~/.claude/settings.json에 Stop 훅을 추가해. 세션 종료 시 현재 폴더가 git 레포면
devlog/YYYY-MM-DD.md에 "뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것" 요약을 append.
커밋은 하지 마. 레포가 아니면 아무것도 하지 마.
```

## 8. 시작 전 소소한 결정

- 도메인: 처음엔 vibelog.vercel.app으로 충분. 나중에 vibelog.* 가용 확인.
- 데브로그 톤: 존댓말 (확정)
- 하루 단위 묶음 vs push 단위: 하루 단위로 시작 (글 수가 적당하고 cron 하나로 끝남)
