# vibelog

바이브 코딩으로 만드는 서비스들의 **제작기를 자동으로 발행하는 블로그**입니다.
글은 사람이 쓰지 않습니다 — 매일 밤 그날의 커밋을 읽어 데브로그 한 편과
세로 영상 한 편이 저절로 올라옵니다.

**→ [vibelog.space](https://vibelog.space)**

## 어떻게 돌아가나

```
프로젝트 레포들            vibelog (이 레포)                  발행
─────────────            ─────────────────                ─────
커밋 · PR        ──▶     ① 수집   커밋을 읽고        ──▶   블로그 글 (한국어 + 영어)
(topic: vibelog)         ② 생성   글을 쓰고                세로 영상 30~45초
                         ③ 제작   목소리·화면을 얹고        프로젝트 현황 카드
                         ④ 발행   커밋 → 자동 배포
                          매일 밤 23:00 (KST) · 놓치면 03:00까지 백업 회차
                          (시계는 Vercel Cron — GitHub 예약은 예비)
```

수집은 **pull 방식**입니다. vibelog가 GitHub API로 topic `vibelog`가 달린
레포를 찾아 읽습니다. 프로젝트 레포에 설치할 훅·워크플로·설정 파일은 없습니다.

글은 **커밋이 쌓여야** 나옵니다. 봇이 남긴 커밋과 레포를 처음 만들 때 생기는
커밋은 빼고, 본문("왜")까지 쓴 커밋이 5개 이상 모이면 그날 밤 글 한 편이 나옵니다.
5개가 안 되면 다음 날로 넘겨 새 커밋과 함께 씁니다. 이 판단은 AI를 부르기 전에
하므로 돈이 들지 않습니다.

## 새 프로젝트 등록

레포에 **topic `vibelog` 하나** 달면 끝입니다. 30분 안에 카드가 올라오고,
기획서나 코드가 처음 올라온 밤에 그것을 읽고 쓴 **소개 글**이 첫 글로 나옵니다
(기획서 한 편만 있어도 됩니다). 그다음부터는 커밋이 5개 모인 밤마다 글과 영상이 나옵니다.
서비스 이름은 기획서를 따르고, 기획서가 바뀐 밤에 다시 읽습니다. 영상은 로그인 없이 볼 수 있는
화면이 둘 이상인 사이트만 만듭니다 (첫 화면이 로그인뿐이면 글만 나갑니다).

배포 주소는 자동으로 찾아 붙고(Vercel 연동 또는 GitHub Deployments),
상태도 커밋과 릴리즈를 보고 스스로 판단합니다. **GitHub Release 발행이 "다 만들었다"는
표시**입니다.

| 상태 | 뜻 | 판정 |
|---|---|---|
| LIVE | 다 만들고 공개 | Release 있음 + 자기 도메인(`*.vercel.app`이 아닌 주소) |
| PREVIEW | 다 만들었지만 공개 전 | Release 있음 + 자기 도메인 없음 |
| BUILDING | 계속 만드는 중 | Release 없음 + 14일 안에 커밋 |
| RESTING | 만들다 멈춤 (쉬는 중) | Release 없음 + 14일 넘게 커밋 없음 |

다 만든 것(LIVE·PREVIEW)은 다시 커밋이 쌓여도 그대로이고, 레포의 `vibelog.json`에
`"status"`를 적으면 그 값이 언제나 이깁니다. 사이트 주소는 LIVE일 때만 화면에 겁니다 —
정식 공개 전 주소는 숨겨 둡니다.

공개 전까지 숨기고 싶은 프로젝트는 레포에 **topic `vibelog-hidden`**을 하나 더 답니다.
방문자에게는 이름 없는 "미공개 프로젝트 A" 카드만 보이고 글·쇼츠는 빠집니다(잔디와 커밋 수에는
들어갑니다). 만든 사람이 Google로 로그인하면 전부 보입니다. 숨긴 글은 방문자 화면에 링크가 없고,
주소를 알고 직접 들어와도 관리자가 아니면 "찾을 수 없음"(404)이 나옵니다. topic을 떼면 지난 글까지
한꺼번에 공개됩니다.
홈에서는 최근 7일 안에 커밋이 있는 프로젝트만 카드로 펼치고 나머지는 접습니다.
품질을 좌우하는 건 **커밋 메시지** 하나뿐이라, 새 레포에는 커밋 규약
([docs/02 §3](docs/02-pipeline-and-setup.md))을 붙여 두기를 권합니다.

## 댓글

글 아래에 Google 로그인으로 댓글을 남길 수 있습니다. 로그인 전에는 누가 썼는지
보이지 않고("방문자 1"), 사람마다 프로필 사진 대신 vibelog 아이콘이 붙습니다.
답글은 만든 사람만 달 수 있고, 답글을 쓸 때 AI가 그 글과 그날 커밋을 읽고
초안을 써 줍니다 — 올리기는 사람이 누릅니다. 새 댓글·답글은 머리글 알림 종과 메일로 알립니다.

## 구조

```
app/                    Next.js 페이지 (카드 그리드 · 프로젝트 상세 · 피드 · 쇼츠)
                        + PWA — 설치하면 주소창 없는 앱 창으로 열린다
components/             UI — 다크 기본, 모바일은 하단 탭바
content/                파이프라인 산출물 (projects.json · devlog/ (+ .figures.json) · shorts/
                        · state.json · commit-hours.json · run.json)
scripts/
  collect.ts            GitHub API → 레포별 활동 수집 (봇 커밋 제외, 본문 있는 커밋 5개부터 글)
  intro.ts              프로젝트 소개 글 — 기획서와 코드를 읽고 첫 글·서비스 이름·아이콘을 쓴다
  plan-name.ts          기획서가 바뀐 밤에 서비스 이름만 다시 읽는다 (안 바뀌면 AI를 부르지 않는다)
  generate.ts           수집 결과 → 데브로그 MDX (KR/EN) — 이어 가는 지난 글도 같은 호출에서 고른다
  safety.ts             발행 전 안전 검사 — 비밀 키·개인 연락처·내부 주소·AI에게 끼워 넣은 지시
  figures.ts            글 삽화 — 자유 작도 SVG를 허용 목록 파서로 검증해 트리로 저장
  script.ts             데브로그 → 쇼츠 대본
  audio.ts              내레이션 TTS(eleven_multilingual_v2) + 발음 교정 + 타이밍
                        + 문장 사이 쉼·그림을 읽을 틈 채우기
  art.ts                쇼츠 그림 (둥근 평면·강조색 한 군데·투명 배경) — 비슷한 그림은 다시 쓴다
  small-video.ts        데스크톱 팝업용 540×960 사본
  record.ts             배포 사이트 화면 녹화 (내레이션 내용과 화면을 매칭)
  render.ts · mux.ts    Remotion 렌더 + 오디오 믹스
  run.ts                전체 실행 (collect → generate → shorts → 커밋)
  usage.ts              모델 호출 토큰 합 — 홈 "지난 실행"에 편당 비용이 찍힌다
  shorts.ts · poster.ts   쇼츠 전체 / 썸네일만 재생성
video/src/              Remotion 컴포넌트 — 템플릿 3종 · 테마 5종
                        · 다이어그램 5종 · 모티프 22종 · 아이콘 장면 · 장면 효과(Enter.tsx)
                        (+ 검수용 MotifSheet · DiagramSheet — 발행에는 안 쓴다)
.github/workflows/
  devlog.yml            밤 23:00 발행 (백업 23:45 · 01:00 · 03:00)
  projects.yml          30분마다 새 프로젝트 인식
  art-try.yml           그림 API 확인·시안 (손으로만 돌린다)
  deploy-guard.yml      Vercel 웹훅 누락 자가 복구
vercel.json             crons — 위 둘을 제때 띄운다 (GitHub 예약은 예비)
auth.ts · lib/comments.ts  댓글 — Google 로그인, 댓글 규칙, 알림 메일(Resend), AI 답글 초안 (DB는 Neon)
```

## 스택

Next.js (App Router) · TypeScript · Tailwind · MDX — Vercel 배포.
GitHub 읽기 Octokit, 글 생성 Anthropic API, 음성 ElevenLabs,
영상 Playwright(녹화) + Remotion(합성) + ffmpeg(믹스).

## 개발

```bash
npm install
npm run dev                              # 블로그 로컬 실행
npx tsx scripts/run.ts --collect-only     # 수집 결과만 출력 (생성·쓰기 없음)
npx tsx scripts/run.ts                    # 전체 실행 — 글·영상 생성까지
```

파이프라인 실행에는 `ANTHROPIC_API_KEY` · `GH_PAT`가, 영상까지 만들려면
`ELEVENLABS_API_KEY` · `VERCEL_TOKEN`이 더 필요합니다. 댓글에 드는 Vercel 환경변수는
[`CLAUDE.md`](CLAUDE.md)의 댓글 항목에 비밀값/설정값과 함께 적어 두었습니다.

## 운영

**Actions → devlog → Run workflow** 하나로 다 합니다.

| 입력                          | 하는 일                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| 모두 비움                     | 일반 실행 — 그날 글과 영상을 만듭니다                         |
| `regen` = `apart/2026-09-11`  | 그 글의 **영상만** 다시 만듭니다. 저장된 대본·목소리를 그대로 써서 녹화→렌더→썸네일만 다시 합니다 (모델·TTS 비용 0). 여러 편은 띄어 씁니다 — `apart/2026-10-11 vibelog/2026-10-11` |
| `regen` + `new_script` 켬     | 대본부터 새로 씁니다 (대본·목소리 비용이 듭니다) |
| `poster` = `apart/2026-09-11` | 기존 영상에서 **썸네일 프레임만** 다시 뽑습니다 (API 비용 0)  |
| `small` = `all` 또는 `vibelog/2026-10-07` | 기존 영상에 데스크톱 팝업용 **작은 사본**만 붙입니다 (API 비용 0) |
| `figures` = `all` 또는 `vibelog/2026-09-15` | 이미 발행된 글에 **삽화만** 붙입니다 (글·영상은 그대로) |
| `intro` = `all` 또는 `vibelog,agency` | 소개 글이 없는 프로젝트에 **소개 글과 아이콘**을 씁니다 (일반 글·영상은 그대로) |
| `rewrite` = `vibelog/2026-10-11` | 재료가 빠진 **지난 글을 그날 커밋 전부로 다시 쓰고** 영상도 대본부터 다시 만듭니다 (글·대본·목소리 비용). 여러 편은 띄어 씁니다 |
| `preview` = `vibelog/2026-09-22` | 지난 글을 지금 지시문으로 다시 써서 원래 글과 **나란히 보기만** 합니다 (발행 안 함) |

글 날짜는 실행 시각이 아니라 **"그 밤"** 기준입니다 (KST 06:00 경계) — GitHub cron이
자주 밀려서, 새벽까지 늦어진 회차도 제 날짜로 들어가게 했습니다.

작업 규칙은 [`CLAUDE.md`](CLAUDE.md), 지금 돌아가는 쇼츠 스펙은
[`docs/03-shorts-spec.md`](docs/03-shorts-spec.md), 설계 기록은 [`docs/`](docs/)에 있습니다.

---

© 2026 vibelog · Jessi
