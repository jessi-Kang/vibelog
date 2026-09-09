# Shorts UI kit (1080×1920)

03-shorts-spec의 레이아웃을 React로 옮긴 키프레임. Remotion 컴포넌트로 포팅할 때 기준.

- `Stage.jsx` — 공통 프레임: Eyebrow(VIBELOG · DAY NN / 템플릿 pill) → 장면 → Caption(하단 190) → ProgressBar(8px, 110) → 푸터(© · 타임코드).
- `Phone.jsx` — 760×1250, 라운드 70, 베젤 6px. scale prop으로 Before/After 2대 배치.
- `AppScreen.jsx` — 폰 안에 들어가는 '배포 사이트 녹화' 대체 화면 (실제 파이프라인은 Playwright 녹화 mp4).
- `ShipIt.jsx` · `Sapjil.jsx` · `BeforeAfter.jsx` — 템플릿 3종. 자막 키워드는 `^단어`.

타이밍(장면 전환 450ms, 단어 280ms, 잔류 −0.15s)은 spec 문서와 docs/shorts-prototype.html 참고.
