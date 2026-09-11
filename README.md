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
                              매일 밤 23:00 (KST)
```

수집은 **pull 방식**입니다. vibelog가 GitHub API로 topic `vibelog`가 달린
레포를 찾아 읽습니다. 프로젝트 레포에 설치할 훅·워크플로·설정 파일은 없습니다.

## 새 프로젝트 등록

레포에 **topic `vibelog` 하나** 달면 끝입니다. 30분 안에 카드가 올라오고,
그날 밤 첫 글과 영상이 나옵니다.

배포 주소는 자동으로 찾아 붙고(Vercel 연동 또는 GitHub Deployments),
상태(building · preview · live)도 커밋과 릴리즈를 보고 스스로 판단합니다.
품질을 좌우하는 건 **커밋 메시지** 하나뿐이라, 새 레포에는 커밋 규약
([docs/02 §3](docs/02-pipeline-and-setup.md))을 붙여 두기를 권합니다.

## 구조

```
app/                    Next.js 페이지 (카드 그리드 · 프로젝트 상세 · 피드 · 쇼츠)
components/             UI — 다크 기본, 모바일은 하단 탭바
content/                파이프라인 산출물 (projects.json · devlog/ · shorts/ · state.json)
scripts/
  collect.ts            GitHub API → 레포별 활동 수집
  generate.ts           수집 결과 → 데브로그 MDX (KR/EN)
  script.ts             데브로그 → 쇼츠 대본
  audio.ts              내레이션 TTS + 발음 교정 + 타이밍
  record.ts             배포 사이트 화면 녹화 (내레이션 내용과 화면을 매칭)
  render.ts · mux.ts    Remotion 렌더 + 오디오 믹스
  run.ts                전체 실행 (collect → generate → shorts → 커밋)
video/src/              Remotion 컴포넌트 — 구성 템플릿 3종 · 테마 5종
.github/workflows/
  devlog.yml            밤 23:00 발행 (+ 23:45 백업 회차)
  projects.yml          30분마다 새 프로젝트 인식
  deploy-guard.yml      배포 누락 자가 복구
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
`ELEVENLABS_API_KEY` · `VERCEL_TOKEN`이 더 필요합니다.

설계 문서는 [`docs/`](docs/)에, 작업 규칙은 [`CLAUDE.md`](CLAUDE.md)에 있습니다.

---

© 2026 Jessi
