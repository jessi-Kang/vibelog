# Vibelog (바이브 로그)

바이브 코딩 프로젝트들의 제작기·현황을 **자동 발행**하는 블로그 + 쇼츠 파이프라인. 이 레포 자체가 첫 번째 프로젝트다.

문서는 `docs/`에 있다. 작업 시작 전에 해당 단계 문서를 읽는다.
- `docs/01-concept.md` — 왜 만드는지, 전체 그림, 단계별 MVP
- `docs/02-pipeline-and-setup.md` — 데브로그 수집 파이프라인(pull 방식), 레포 구조, 1단계 스코프, 세션별 프롬프트
- `docs/03-shorts-spec.md` — 쇼츠 영상 스펙 (2단계). 자막 규칙·오디오 믹스·렌더 방식
- `docs/shorts-prototype.html` — 승인된 쇼츠 샘플의 HTML 프로토타입. Remotion 컴포넌트로 옮길 때 기준
- `docs/04-roadmap-sessions.md` — 2~4단계 세션별 프롬프트와 완료 조건. 1단계 끝나면 여기서 이어간다

## 원칙

- **커밋이 곧 콘텐츠.** 데브로그는 사람이 쓰지 않는다. 파이프라인이 커밋·PR·세션 요약에서 생성한다.
- **수집은 pull 방식.** vibelog의 GitHub Action이 GitHub API로 topic `vibelog`가 달린 내 레포를 읽는다. 프로젝트 레포에 설치하는 것은 없다. 새 프로젝트 등록 = topic 하나 달기.
- **손품 최소화.** 새 기능을 제안하기 전에 "Jessi가 할 일이 늘어나는가?"를 먼저 묻는다. 늘어나면 다른 방법을 찾는다.
- **한국어 원본, 영어는 자동 번역.** 데브로그·쇼츠 모두.
- **톤은 존댓말.** 데브로그 본문과 쇼츠 내레이션 통일.

## 스택

- Next.js (App Router) + TypeScript + Tailwind + MDX. 배포 Vercel.
- GitHub 읽기: Octokit. 글 생성: Anthropic API. 음성·음악: ElevenLabs API. 영상: Playwright(화면 녹화) + Remotion(합성) + ffmpeg(오디오 믹스).
- DB(Neon)는 2단계 승인 큐부터. 1단계는 파일 기반(`content/`).

## 레포 구조

```
app/                        Next.js 페이지 (카드 그리드 / 프로젝트 상세 / 전체 피드)
content/projects.json       Action이 생성·갱신. 레포 메타 기반
content/devlog/<repo>/<date>.md   Action이 생성. frontmatter manual: true면 덮어쓰지 않음
content/state.json          레포별 마지막 처리 커밋 SHA / 시각
scripts/collect.ts          GitHub API → 레포별 활동 수집
scripts/generate.ts         수집 결과 → Claude API → MDX (KR/EN)
scripts/run.ts              collect → generate → 파일 쓰기
.github/workflows/devlog.yml   cron '0 14 * * *' (=23:00 KST) + workflow_dispatch
.github/workflows/projects.yml cron 30분 — 새 프로젝트 인식만 (run.ts --projects-only)
video/                      (2단계) Remotion 프로젝트, 템플릿 3종
```

## 새 프로젝트 등록 체크리스트

Jessi가 새 프로젝트를 시작하면 (또는 "새 프로젝트" 얘기가 나오면) 아래를 안내한다:

1. 레포에 topic `vibelog` 달기 — 등록의 전부. 30분 안에 projects.yml이 카드로 올린다.
2. description 채우기 — 카드에 그대로 쓴다. 나중에 채워도 인식 배치가 반영한다. homepage는 자동 — 배포(Vercel 등)가 GitHub Deployments에 남긴 주소를 감지한다. About Website를 채우면 그게 우선(커스텀 도메인용).
3. **그 레포 CLAUDE.md에 커밋 규칙 블록 복붙** — 문구는 `docs/02-pipeline-and-setup.md` §3 "커밋 메시지 규약 문구". 커밋 메시지가 글·쇼츠의 원료라서 이게 품질을 결정한다.
4. (선택) 테마 고르기 — topic `vibelog-theme-<이름>` 하나 추가. (선택) `vibelog.json`.

첫 글·쇼츠는 등록 후 첫 밤 23:00 일반 실행에서 나온다 (첫 수집은 최근 7일 커밋).

## 컨벤션

- 숫자 표기: 1,000 이상은 천 단위 콤마. UI의 카운트·통계는 `lib/format.ts`의 `fmtNum`을 쓴다 (로케일 고정 — 서버·클라이언트가 갈리면 hydration이 깨진다).
- 커밋 메시지는 데브로그 원료다. 한 줄 요약 + 본문에 **"왜"**를 반드시 쓴다. 각 단계가 끝날 때마다 커밋한다.
- `content/` 밑 파일은 파이프라인이 덮어쓴다. 손수정은 frontmatter `manual: true`로 보호.
- 프로젝트 상태값: `idea | building | live | paused`. 자동 판정: homepage 있으면 live, 없고 30일 내 커밋이면 building, 넘으면 paused. 레포의 `vibelog.json`이 있으면 그게 우선.
- 데브로그 형식: 뭘 했다 / 왜 / 삽질 포인트 / 다음 할 것. (스크린샷 섹션은 삭제했다 — 글에선 정보가 얇았고, 실제 화면은 쇼츠 데모가 보여준다. 캡처는 쇼츠 소재로만 쓴다.)
- 하루 단위로 묶어 레포당 글 하나. 활동 없는 레포는 건너뛴다.
- **재실행이 기록을 지우면 안 된다.** 같은 날 재실행은 그날 수집 창 전체(state.json의 `daySince`)로 글을 다시 생성한다 — 마지막 조각만으로 덮어쓰기 금지. 지난 날짜 글·쇼츠는 파이프라인이 절대 다시 만들지 않는다. 품질이 나쁠 때만 Run workflow의 `regen` 입력으로 명시 재생성한다.

## 쇼츠 (2단계) — 요약. 상세는 docs/03-shorts-spec.md

- 1080×1920, 30fps, 30~45초. **구성 템플릿 3종**(ship-it/fail/before-after) — 서사 순서·콜드오픈 문법이 다르고, 대본 생성이 직전 편과 다른 것을 골라 자동 로테이션한다 (docs/03-shorts-spec.md 표).
- **테마 5종**(terminal 기본/blueprint/signal/paper/highlighter) — 레포가 topic `vibelog-theme-<이름>` 하나로 고른다 (`vibelog.json`의 `"theme"`이 있으면 그게 우선). 채널 문법은 공유, 팔레트·키워드 강조·카드 형태만 바뀐다 (`video/src/theme.ts`).
- 자막: 문장 단위, 최대 두 줄. 단어가 말하는 속도에 맞춰 흐림→또렷. 문장당 키워드 1~3개 민트색, **켜지면 유지**(단어별 색 반전 금지). 음성 끝나도 다음 문장 직전까지 잔류.
- 워터마크 없음. 푸터에 `© {year} vibelog · Jessi`만.
- 렌더는 프레임 단위 결정론적으로(Remotion). 실시간 화면 녹화로 최종 영상을 만들지 않는다 — 싱크가 밀린다.
- 오디오: 내레이션은 Jessi 클론 보이스(`ELEVENLABS_VOICE_ID=pwjMkbtUbj1hBa0RkN5N`, 설정은 스펙 문서) 0.5초 뒤 시작, 음악 volume 0.20 + 사이드체인 더킹, 끝 3.5초 페이드아웃.

## 하지 말 것

- 데브로그를 손으로 쓰는 UI를 만들지 않는다.
- 프로젝트 레포에 훅·워크플로·설정 파일을 요구하지 않는다 (`vibelog.json`, `devlog/`는 선택).
- 쇼츠의 데모 화면 소재는 항상 실제 배포 사이트 녹화 (텍스트→비디오로 데모를 대체하지 않는다 — 가짜 화면이 된다). 생성 그래픽(`scripts/art.ts`)은 **보류 중** — Jessi가 스타일 레퍼런스를 주기 전까지 쓰지 않는다 (shorts.ts에서 호출 꺼둠). 그 전까지 영상은 타이포 + 실제 녹화만.
