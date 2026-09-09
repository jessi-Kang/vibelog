Tabs — 세그먼트형 탭, 항목 2~4개까지. 패널 트랙 안에 선택 항목만 raised 배경. 밑줄 탭은 쓰지 않는다. 블로그 상단 내비(프로젝트 / 데브로그 / 쇼츠)와 KO/EN이 이것. 개수가 데이터에 따라 늘어나는 필터(프로젝트별)에는 ProjectFilter를 쓴다.
```jsx
<Tabs full items={['프로젝트','데브로그','쇼츠']} value={tab} onChange={setTab} />
```
