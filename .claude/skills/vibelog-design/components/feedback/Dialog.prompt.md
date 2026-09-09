Dialog — 모바일 우선 바텀 시트(하단 정렬, max 430). 오버레이 rgba(5,8,12,.72), 카드 16px 라운드. 진입 vl-rise 280ms.
```jsx
<Dialog open={o} eyebrow="approve · vibelog" title="이 데브로그를 게시할까요?" onClose={close}
  actions={<><Button variant="ghost" onClick={close}>취소</Button><Button>게시</Button></>}>블로그 배포 + 쇼츠 업로드가 함께 나갑니다.</Dialog>
```
