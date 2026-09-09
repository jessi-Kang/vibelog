# 바이브 로그 쇼츠 제작 스펙 (2026-09-09 샘플 승인 기준, 보이스 설정 같은 날 갱신)

샘플로 확정한 규칙. 2단계(쇼츠 파이프라인) 구현 시 Remotion 템플릿·오디오 합성의 기준 문서.
프로토타입 HTML: `docs/shorts-prototype.html` (Ship it 템플릿, 9:16, 페이지 자체가 타임라인을 재생함 — Remotion 컴포넌트로 옮길 때 참고).

## 포맷

- 1080×1920 (9:16), 30fps, H.264 yuv420p, AAC 192k
- 길이 30~45초. 구성: 훅(3~4초) → 뭘 만들었나 → 화면 데모 → 삽질 → 다음 할 것 → 엔드카드(2~3초)
- 언어: 한국어 원본 + 영어 버전 별도 렌더
- 톤: 존댓말

## 레이아웃 (Ship it 템플릿)

- 상단 eyebrow: `VIBELOG · DAY NN` (좌) / 템플릿 태그 pill `SHIP IT` (우), 모노 폰트
- 중앙: 폰 프레임(760×1250, 라운드 70) 안에 배포 사이트 녹화. 장면에 따라 훅 카드 / 삽질 카드로 교체
- 하단: 자막(2줄 이내) → 진행 바 → 푸터 `© {year} vibelog · Jessi` (좌) / 타임코드 (우)
- 워터마크 없음 (시도해봤으나 어색해서 제외). 카피라이트는 푸터 한 줄로 충분.

## 색·타이포

- 배경 #0A0E14, 패널 #141B24 / #1B2430, 라인 #26313F
- 텍스트 #F3EFE6, 보조 #8C98A8, 강조(민트) #5EE1C3, 경고(삽질 태그) #FFB454
- 본문·자막·디스플레이: Noto Sans KR (자막 900, 62px). 모노: JetBrains Mono. 
- 렌더 환경에 웹폰트가 없을 수 있으니 Noto Sans CJK KR을 로컬 폴백으로 반드시 설치

## 자막 규칙 (핵심)

1. 문장 단위 한 덩어리. 화면에 최대 두 줄. 세 줄 되면 문장을 쪼갠다. `word-break: keep-all`.
2. 단어는 흐림(opacity .3) → 또렷(1)으로 말하는 속도에 맞춰 순서대로 켜진다. 페이드 ~0.28s.
3. 문장당 강조 키워드 1~3개를 민트색으로. 키워드는 켜지는 순간 색이 들어가고 **문장이 끝날 때까지 유지**. 단어별 색 반전(현재 단어만 색) 금지 — 번쩍임의 원인.
4. 음성이 끝나도 자막은 **다음 문장 시작 직전(−0.15s)까지 잔류**. 최소 0.4초 보장. 마지막 문장은 엔드카드 위에 2초 잔류.
5. 대본 생성 시 Claude에게 키워드를 마킹하게 한다 (프로토타입은 `^단어` 표기).
6. 타이밍은 ElevenLabs 타임스탬프(단어 단위)로 잡는다. 샘플에서는 무음 구간 검출로 대체했음.

## 오디오

- 내레이션: ElevenLabs TTS, **Jessi 클론 보이스 `pwjMkbtUbj1hBa0RkN5N`** ("Jessi · Calm Low and Steady", Professional Voice Clone). 영상 시작 0.5초 뒤부터.
  - 확정 설정(승인된 샘플 기준): speed 1.00 / stability 0.50 / similarity_boost 0.75 / style 0 / speaker_boost on. 모델 eleven_multilingual_v2.
  - 같은 설정이라도 테이크마다 길이가 ±1초 정도 달라진다 → 타이밍은 항상 생성된 음성의 타임스탬프로 잡는다. 텍스트를 미리 자막에 박아두고 음성을 맞추지 않는다.
  - Secrets: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID=pwjMkbtUbj1hBa0RkN5N`
- 배경음악: `video/assets/music/`의 고정 트랙 5종을 재사용한다 (API 미사용 — 크레딧·일관성).
  톤: `ship-it`(기본, 담담한 전진) / `upbeat`(배포·성공) / `tense`(큰 삽질) / `calm`(문서·정리) / `playful`(실험·장난기).
  대본(script.ts)이 그날 이야기 분위기로 `music` 톤을 고르고, 없으면 템플릿 트랙 → 아무 트랙 순 폴백.
  트랙 생성 프롬프트 계보: "minimal lo-fi electronic ~90 BPM, instrumental, 45s" 계열에서 톤별 변주 (eleven_music_v2).
- 믹스: 음악 volume 0.20, 내레이션 사이드체인 더킹(threshold .03, ratio 5, attack 40ms, release 500ms), 음악은 끝 3.5초 페이드아웃. amix normalize=0.

```
ffmpeg -i video.mp4 -i narration.mp3 -i music.mp3 -filter_complex "\
[1:a]adelay=500|500,apad=whole_dur=DUR,asplit=2[n1][n2];\
[2:a]atrim=0:DUR,volume=0.20,afade=t=out:st=DUR-3.5:d=3.5[m];\
[m][n1]sidechaincompress=threshold=0.03:ratio=5:attack=40:release=500:makeup=1[d];\
[d][n2]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k out.mp4
```

## 렌더 방식 (중요)

- 실시간 화면 녹화 금지. 헤드리스 크롬이 1080×1920을 그리다 버벅이면 영상이 ~1.25배 늘어져 자막 싱크가 밀린다 (실제로 겪음).
- 프레임 단위 결정론적 렌더: CDP `Emulation.setVirtualTimePolicy`로 가상 시간을 1/30초씩 전진시키며 프레임 캡처 → ffmpeg 합성. Remotion이 이 방식이므로 Remotion 사용 시 자동 해결.
- 검증: 문장 시작 시점마다 프레임을 뽑아 자막 상태와 타임코드가 일치하는지 확인.

## 화면 데모 (실제 파이프라인)

- Playwright로 배포 URL을 폰 뷰포트로 열어 녹화. 기본 투어: 홈 → 천천히 스크롤 → 상위 메뉴 1~2개 클릭.
- 프로젝트별 동선은 레포 루트 `vibelog.json`의 `demo` 배열로 지정 가능.
- 같은 세션에서 스크린샷도 뽑아 데브로그에 첨부. 매일 찍어두면 나중에 Before/After 템플릿 소재가 됨.

## 템플릿 3종 (Ship it 외는 미제작)

- Ship it — 배포/릴리즈. 샘플 완료.
- 오늘의 삽질 — 버그 스토리 1개. Before/After 카드 구조는 Ship it의 삽질 장면을 확장.
- Before / After — 화면 비교, 말 최소.

## 재생성 (덮어쓰기)

자막 규칙·프레임 디자인·대본 프롬프트를 고친 뒤에는 이미 발행된 글의 영상을 다시 만들어야 한다. 꽤 빈번하므로 전용 진입점이 있다.

- **GitHub → Actions → devlog → Run workflow**, `regen` 입력에 `vibelog/2026-09-10` 형식으로 쓰고 실행. 날짜를 빼고 `vibelog`만 쓰면 그 레포의 최신 글.
- 대본→음성→녹화→렌더→업로드 전 단계를 다시 돌고, 같은 Blob 키에 덮어쓴다(`allowOverwrite`). 글(md)은 건드리지 않는다.
- 로컬: `npx tsx scripts/shorts.ts vibelog/2026-09-10`.
- 대본도 다시 생성되므로 프롬프트가 바뀌었으면 문장 자체가 달라질 수 있다 — 의도된 동작.

## +알파 그래픽 (생성 일러스트)

텍스트·실제 화면 녹화 위에 얹는 보조 그래픽. 데모 화면은 여전히 실제 배포 사이트 녹화만 쓴다 (텍스트→비디오로 데모를 대체하지 않는 이유: 가짜 화면이 되기 때문).

- 대본(script.ts)이 hook·next 문장에 장면 은유 묘사(`art`, 영어 한 문장)를 쓰고, `scripts/art.ts`가 Gemini 이미지 API(`gemini-2.5-flash-image`)로 일러스트를 만든다.
- 스타일 고정: 다크 배경(#0a0e14) + 민트(#5EE1C3) 단일 강조 + 회색, 플랫 미니멀, **글자·로고 금지**, 정방형.
- 쓰임: hook 장면은 헤드라인 위 인셋(480px), next 장면은 폰 화면 대신 일러스트 카드(860px)로 전환.
- `GEMINI_API_KEY` 시크릿이 없으면 이 단계는 통째로 건너뛰고, 쇼츠는 그래픽 없이 이전과 동일하게 렌더된다. 장면 하나가 실패해도 그 장면만 그래픽 없이 간다.
- 산출물 `content/shorts/<repo>/<date>.art/<scene>.png`는 재생성 가능하므로 커밋하지 않는다.
