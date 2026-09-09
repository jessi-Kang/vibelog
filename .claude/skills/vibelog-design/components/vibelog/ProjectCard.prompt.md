ProjectCard — 홈 그리드의 프로젝트 카드. 상단 3px 상태 스트라이프, 이름/상태 행, 설명 한 줄, 모노 메타 한 줄(스택 · 이번 주 커밋 · 마지막 활동). 진행바·칩 없음 — 숫자는 글자로만.
```jsx
<ProjectCard name="vibelog" status="building" description="바이브 코딩 프로젝트 제작기를 자동으로 쓰는 블로그. 이 사이트 자체입니다." stack={['next.js','vercel']} commits={23} lastActive="오늘" />
```
paused는 opacity .8 + 회색 스트라이프, 커밋 0이면 커밋 항목 생략.
