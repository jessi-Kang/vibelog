DevlogEntry — 데브로그 한 건. compact는 카드 안 리스트 행(홈), 기본은 8px 점 타임라인(상세·피드). 제목은 AI가 쓴 한 줄 요약. meta는 칩이 아니라 모노 텍스트 한 줄 — '커밋 4 · PR 1' 원료 표기를 항상 넣는다(사람이 쓴 글이 아님을 드러내는 규칙). hover 시 제목만 민트.
```jsx
<DevlogEntry compact date="09.14" repo="vibelog" title="GitHub 액션으로 데브로그 자동 생성" meta={['커밋 4 · PR 1','ko · en']} />
<DevlogEntry date="2026-09-14 · 일" title="…" summary="…" meta={['커밋 4 · PR 1', {text:'삽질 1',tone:'warn'}]} />
```
