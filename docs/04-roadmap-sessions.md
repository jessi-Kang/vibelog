# 완성까지의 로드맵 — 단계별 세션 프롬프트

1단계 세션 1~3은 `02-pipeline-and-setup.md` 7번 항목. 이 문서는 그 다음부터 완성(4단계)까지.
각 세션은 "Claude Code 한 번 앉아서 끝낼 크기"로 쪼갰다. 세션 시작 시 CLAUDE.md와 해당 단계 문서를 읽게 한다.

"완성"의 정의: Jessi가 코딩만 하면 → 다음 날 아침 블로그 글 + 쇼츠 영상이 승인 큐에 와 있고 → 텔레그램에서 ✅ 누르면 블로그·유튜브·인스타에 올라가고 → 블로그 현황판에 조회수까지 자동으로 붙는 상태.

---

## 2단계 — 쇼츠 파이프라인 (영상은 나오지만 업로드는 수동)

### 사전 준비 (Jessi)
- ElevenLabs에서 보이스 클론 등록 → `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`를 레포 Secrets에
- (선택) 음악을 매번 생성하지 않을 거면 템플릿별 mp3 3개를 `video/assets/music/`에 넣기

### 세션 4 — 대본 생성
```
docs/03-shorts-spec.md를 읽어. scripts/script.ts를 만들자.
입력: content/devlog/<repo>/<date>.md 하나.
출력: content/shorts/<repo>/<date>.json — 
  { template: "ship-it" | "fail" | "before-after",
    lines: [{ ko: "...", en: "...", keywords: ["..."] }],   // 문장 단위, 8~12줄, 30~45초 분량
    demo: { url, steps: [...] },                            // 화면 녹화 동선
    captions: { ko: "...", en: "..." }, hashtags: [...] }
Claude API로 생성. 존댓말. 구조: 훅 → 뭘 만들었나 → 데모 → 삽질 → 다음 할 것 → 엔드.
템플릿 선택 기준: 배포/릴리즈 커밋이 있으면 ship-it, 삽질 포인트가 강하면 fail, 둘 다 아니면 ship-it.
키워드는 문장당 1~3개, 자막에서 민트색으로 강조될 단어.
```

### 세션 5 — 오디오
```
scripts/audio.ts: content/shorts/<repo>/<date>.json의 lines를 이어붙여
ElevenLabs TTS API로 ko/en 내레이션 mp3를 만들고, 단어별 타임스탬프를 같이 받아
content/shorts/<repo>/<date>.timing.json에 문장별 start/end로 저장해.
(타임스탬프 옵션이 있는 엔드포인트를 써. 없으면 무음 구간 검출로 폴백.)
음악: video/assets/music/<template>.mp3가 있으면 그걸 쓰고, 없으면 ElevenLabs Music API로
45초 인스트루멘탈을 생성해 캐시해. 스펙 문서의 프롬프트를 써.
```

### 세션 6 — 화면 녹화
```
scripts/record.ts: Playwright로 demo.url을 폰 뷰포트(390×844, deviceScaleFactor 3)로 열어
demo.steps(없으면 기본 투어: 홈 → 천천히 스크롤 → 상위 링크 1~2개 클릭)를 실행하며
webm으로 녹화하고, 각 스텝에서 스크린샷도 찍어 content/devlog 쪽에 첨부 가능하게 해.
녹화 길이는 timing.json의 데모 구간 길이에 맞춰.
```

### 세션 7 — Remotion 템플릿 (핵심)
```
video/에 Remotion 프로젝트를 만들자. docs/shorts-prototype.html을 열어보고
그 레이아웃·색·타이포·자막 동작을 React 컴포넌트로 옮겨.
Composition: ShipIt (1080×1920, 30fps). props: shorts json + timing json + 녹화 webm 경로 + 내레이션/음악 경로.
자막 규칙(docs/03-shorts-spec.md의 "자막 규칙" 6개 항목)을 그대로 구현.
장면: 훅 카드 → 폰 프레임(녹화 영상) → 삽질 카드(before/after) → 폰 프레임 → 엔드카드.
오디오 믹스는 Remotion 안에서 하지 말고, 무음 영상을 렌더한 뒤 scripts/mux.ts에서
스펙 문서의 ffmpeg 명령으로 합쳐. ko/en 두 버전 렌더.
npx remotion render로 로컬에서 한 편 뽑아 확인.
```

### 세션 8 — 파이프라인 연결
```
scripts/run.ts에 shorts 단계를 붙여: devlog 생성 후 → script → audio → record → render → mux.
결과 mp4는 Vercel Blob(또는 Neon 스토리지)에 올리고 URL을 content/shorts/<repo>/<date>.json에 기록.
devlog.yml에 ffmpeg, Chromium 설치 스텝 추가. 렌더 시간 측정해서 Action 타임아웃 여유 두기.
실패해도 데브로그 글 발행은 막지 않게 — 쇼츠 단계는 try/catch로 분리.
```

2단계 완료 조건: 매일 밤 Action이 글 + mp4(ko/en)를 만들어 놓는다. 업로드는 아직 Jessi가 손으로.

---

## 3단계 — 승인 큐 + 자동 게시

### 사전 준비 (Jessi)
- 텔레그램 봇 토큰 + 내 chat_id → Secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- YouTube Data API OAuth → refresh token → Secrets `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`
- Instagram 비즈니스 계정 + Meta 앱 → 장기 토큰 → Secrets `IG_USER_ID`, `IG_ACCESS_TOKEN`
- Neon 프로젝트 → `DATABASE_URL`

### 세션 9 — 승인 큐 (DB)
```
Neon에 테이블 posts(id, repo, date, kind: 'devlog'|'short_ko'|'short_en', status: 'pending'|'approved'|'rejected'|'published',
preview_url, media_url, caption, created_at, decided_at, published_at, platform_ids jsonb)를 만들어.
scripts/run.ts 끝에서 생성물마다 pending row를 넣어. content/ 커밋은 계속 하되,
블로그는 status='published'인 것만 보여주도록 app/ 쪽 로더를 바꿔.
```

### 세션 10 — 텔레그램 봇
```
Vercel 서버리스 함수 api/telegram/webhook으로 봇을 만들자.
run.ts가 pending row를 만들 때마다 봇이 Jessi에게 메시지: 글 요약 + 영상 파일 + 인라인 버튼 [✅ 게시] [✏️ 수정] [❌ 버림].
✅ → status=approved. ❌ → rejected. ✏️ → 답장 텍스트를 받아 Claude API로 글/대본을 수정하고 다시 미리보기.
setWebhook은 스크립트로. 봇 토큰은 환경변수.
```

### 세션 11 — 게시 워커
```
Vercel Cron(10분마다) 또는 텔레그램 ✅ 직후에 도는 api/publish:
- devlog approved → 이미 content/에 있으니 status만 published로 (블로그는 즉시 반영)
- short_ko/short_en approved → YouTube Data API videos.insert (shorts: 세로 + #Shorts 태그), 
  Instagram Graph API: media(REELS, video_url=공개 mp4 URL) → media_publish. 처리 상태 폴링.
- 성공 시 platform_ids에 video id 저장, 실패 시 텔레그램으로 에러 알림 + status 유지(재시도 가능).
```

3단계 완료 조건: 아침에 텔레그램 열어서 ✅ 누르면 끝. Jessi가 브라우저 열 일 없음.

---

## 4단계 — 현황판 (완성)

### 세션 12 — 지표 수집
```
scripts/metrics.ts: YouTube Analytics/Data API로 영상별 조회수·좋아요, Instagram Insights로 릴스 재생수,
Vercel Web Analytics로 블로그 페이지뷰를 하루 한 번 가져와 Neon의 metrics(post_id, date, views, likes, ...)에 적재.
devlog.yml에 스텝 추가.
```

### 세션 13 — 블로그 현황판
```
메인 페이지 상단에 현황판: 프로젝트 수(상태별), 누적 데브로그 수, 이번 주 쇼츠 조회수, 가장 반응 좋은 영상.
프로젝트 상세에는 그 프로젝트 쇼츠들의 조회수 추이(작은 스파크라인).
읽기 전용. 손볼 것 없이 자동 갱신.
```

### 세션 14 — 마무리
```
- 영어 버전 블로그 라우트(/en) — devlog의 en 본문으로 렌더
- OG 이미지 자동 생성(@vercel/og)로 공유 카드
- 텔레그램 봇에 "전부 자동 게시" 토글 추가 — 품질 안정되면 승인 단계 생략 가능
- README를 데브로그 형식으로 정리 (이 레포도 vibelog topic이 달려 있으므로 자기 자신을 소개하는 글이 됨)
```

---

## 전체 체크리스트

- [ ] 1단계: 블로그 + 데브로그 자동 생성 (세션 1~3)
- [ ] 2단계: 쇼츠 자동 렌더 (세션 4~8)
- [ ] 3단계: 텔레그램 승인 + 유튜브/인스타 자동 게시 (세션 9~11)
- [ ] 4단계: 지표 수집 + 현황판 + 영어 라우트 (세션 12~14)

## 미리 알아둘 리스크

- Instagram Graph API는 릴스 게시에 공개 접근 가능한 mp4 URL이 필요하고, 계정이 비즈니스/크리에이터여야 한다. 개인 계정으로는 불가.
- YouTube Data API 기본 쿼터(10,000/일)에서 업로드 1건 = 1,600. 하루 몇 편은 문제없다.
- ElevenLabs Music API 제공 여부는 구현 시점에 문서로 확인. 없으면 고정 트랙 3개로 간다 (스펙 문서 참고).
- GitHub Actions에서 Remotion 렌더는 45초 영상 기준 수 분. ubuntu-latest 6시간 제한 안에서 충분하나, 프로젝트가 많아지면 병렬화 고려.
- Claude API 비용: 데브로그 + 대본 + 번역 합쳐 프로젝트당 하루 몇 센트 수준. 무시 가능.
