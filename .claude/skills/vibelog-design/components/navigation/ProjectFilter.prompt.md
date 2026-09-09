ProjectFilter — 피드의 프로젝트 필터. Tabs는 3~4개까지만 버티므로 여기서는 쓰지 않는다. 프로젝트 ≤8: 가로 스크롤 모노 pill 행(스크롤바 숨김, '전체'가 항상 첫 칩, 글 수는 회색 숫자). >8: 같은 옵션을 Select로. 정렬은 최근 활동순 — 자주 보는 프로젝트가 앞에 온다.
```jsx
<ProjectFilter projects={PROJECTS} value={f} onChange={setF} counts={{ all: 12, vibelog: 9 }} />
```
