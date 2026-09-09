Caption — 쇼츠 자막(03-shorts-spec 자막 규칙). 문장 단위, 단어가 말하는 속도로 켜짐(.28s), 키워드는 켜지는 순간 민트가 되어 **문장 끝까지 유지** (단어별 색 반전 금지). Remotion 포팅 시 progress를 프레임에서 계산.
```jsx
<Caption text="저는 ^커밋만 ^하면, 밤 11시에 깃헙 액션이 돌아서" progress={.6} />
```
