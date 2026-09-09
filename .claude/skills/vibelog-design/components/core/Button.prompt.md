Button — 페이지의 행동 버튼. 화면당 primary는 하나, 나머지는 secondary/ghost.
```jsx
<Button>승인</Button>
<Button variant="secondary">수정</Button>
<Button variant="danger" size="sm">반려</Button>
<Button mono variant="secondary">$ run devlog.yml</Button>
```
Hover는 opacity .85, press는 scale(.98). 그림자·그라데이션 없음. md 높이 44px(모바일 터치 최소).
