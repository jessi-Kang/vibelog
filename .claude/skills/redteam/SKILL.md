---
name: vibelog-redteam
description: vibelog를 공격자 눈으로 점검한다. 자동 발행 파이프라인의 공격면(커밋 메시지 → 모델 → 자동 발행, 크론 라우트, 토큰, 렌더링)을 실제로 찔러 보고 등급을 매긴다. "보안 검사", "레드팀", "취약점 봐줘", 라우트·토큰·자동 발행을 건드린 뒤에 쓴다.
user-invocable: true
---

# vibelog 레드팀

일반 웹 보안 체크리스트가 아니다. **이 레포가 실제로 가진 것**을 공격면으로 잡는다.

## 이 사이트가 남다른 점

보통의 블로그와 다른 것이 하나 있다: **사람이 읽기 전에 발행된다.**
커밋 메시지가 모델을 거쳐 글·영상이 되고, 그대로 라이브로 나간다. 그래서
"내용이 곧 코드에 닿는 자리"가 전부 공격면이다. 사람이 중간에서 걸러 준다는
가정을 어디에도 두면 안 된다.

## 자산 (무엇을 지키나)

| 자산                                       | 어디                            | 잃으면                             |
| ------------------------------------------ | ------------------------------- | ---------------------------------- |
| `GH_PAT` (Actions: write)                  | Vercel 환경변수, Actions secret | 남이 워크플로를 띄운다 — 레포 쓰기 |
| `CRON_SECRET`                              | Vercel 환경변수                 | 크론 라우트를 아무나 부른다        |
| `ANTHROPIC_API_KEY` / `ELEVENLABS_API_KEY` | Actions secret                  | 돈이 샌다 (TTS는 회당 과금)        |
| `VERCEL_TOKEN` / `BLOB_READ_WRITE_TOKEN`   | Actions secret                  | 배포·저장소 조작                   |
| 방문자 브라우저                            | vibelog.space                   | XSS — 세션이랄 게 없어도 피싱·변조 |
| 발행 파이프라인                            | Actions                         | 남의 글이 내 이름으로 나간다       |

## 훑는 순서

### 1. 내용이 코드에 닿는 자리 (이 레포의 핵심 위험)

생성된 글의 제목·요약·본문이 **문자열로 끼워지는 곳**을 전부 찾는다.

```
grep -rn "dangerouslySetInnerHTML\|innerHTML\|JSON.stringify" app components lib
grep -rn "rehype-raw\|rehypeRaw" .          # 마크다운에서 raw HTML을 켰는지
```

- `JSON.stringify`는 **`<`와 `/`를 이스케이프하지 않는다.** `<script>` 안에
  넣으면 `</script>`가 든 제목 하나로 태그가 닫히고 그 뒤가 마크업이 된다.
  JSON-LD 블록이 대표적인 자리다.
- XML/RSS도 같다 — `&<>"`만 바꾸는 이스케이프는 대부분 충분하지만, 제어문자와
  `]]>`가 들어오면 깨진다.
- 확인은 문자열 하나로 끝난다:
  `node -e 'console.log(JSON.stringify({a:"x</script><img src=x onerror=1>"}))'`
  결과에 `</script>`가 살아 있으면 그 자리는 뚫린다.

### 2. 프롬프트 주입 (커밋 메시지 → 모델 → 발행)

```
grep -rn "userPrompt\|SYSTEM\|messages.create" scripts/*.ts
```

- 원료가 어디서 오는지 본다. `collect.ts`가 읽는 범위(내 계정 + topic)가
  좁을수록 안전하다. 공개 레포라면 **외부 기여자의 커밋 메시지**가 그대로
  프롬프트에 들어온다.
- 모델 출력이 **검증 없이** 파일·프론트매터·영상 대본이 되는 경로를 본다.
  `validateLines`처럼 모양을 강제하는 관문이 있는지, 자유 문자열이 그대로
  화면에 닿는지.
- 주입이 성공해도 **피해가 제한되게** 만드는 쪽이 본선이다 — 출력이 닿는
  자리(1번)를 막는 것. 프롬프트로 "무시하라"고 적는 것은 방어가 아니다.

### 3. 호출 가능한 표면

```
find app -name "route.ts" | sort
curl -sS -o /dev/null -w "%{http_code}\n" https://vibelog.space/api/cron/devlog
curl -sSI https://vibelog.space/ | grep -iE "content-security|x-frame|x-content-type|referrer-policy|permissions-policy|strict-transport"
```

라우트마다 묻는다:

- **입력을 받는가.** 받는다면 그 값이 외부 요청(fetch)·경로·명령에 닿는가 (SSRF·경로 탈출).
- **토큰을 쓰는가.** 응답 본문·에러 메시지에 토큰이나 그 상태가 새지 않는가.
- **인증이 있는가.** 막을 때 **얼마나 말해 주는가** — 설정이 됐는지 안 됐는지를
  익명에게 알려 주면 그것도 정보다.
- **비싼가.** 한 번 호출이 Actions 45분·TTS 과금을 부르면, 인증이 곧 지갑이다.

### 4. 워크플로

```
grep -rn 'inputs\.\|github\.event' .github/workflows/*.yml
```

- `${{ ... }}`가 `run:` 안에 **직접** 들어가면 셸 주입이다. `env:`로 받아
  `"$VAR"`로 쓰는 모양이어야 한다.
- `pull_request_target`·`workflow_run`에 체크아웃 + 시크릿이 같이 있으면 위험.
- `permissions:`가 필요한 최소인지. 기본은 `contents: write`면 충분하다.
- 입력이 스크립트 인자로 넘어가면 그 스크립트 안에서 경로로 쓰이는지 본다
  (`regen`이 `../..`를 담을 수 있는지).

### 5. 비밀이 새는 자리

```
grep -rInE "(ghp_|github_pat_|sk-ant-|xoxb-|AIza|vercel_blob_rw_)[A-Za-z0-9_-]{8,}" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next .
git ls-files | grep -iE "\.env|secret|credential"
grep -n "env|\.vercel" .gitignore
```

- 로그도 본다 — `console.log(res)`가 토큰이 든 객체를 통째로 찍지 않는지.
- 클라이언트 번들: `NEXT_PUBLIC_`이 붙은 값은 **전부 공개**다.

### 6. 의존성

```
npm audit --omit=dev
```

- 프로덕션 의존성만 본다. 빌드 전용 패키지의 경고는 등급을 낮춘다.
- 고칠 수 없는 것(프레임워크가 물고 있는 이행 의존성)은 **실제로 그 경로를
  쓰는지**로 판단한다 — 쓰지 않으면 기록만 남기고 넘어간다.

### 7. 녹화기 (영상 파이프라인)

`scripts/record.ts`는 배포 사이트를 **실제 브라우저로 열고 스크립트를 주입한다**.
그 사이트가 어디서 정해지는지(레포 homepage·Vercel), 신뢰할 수 있는 값인지 본다.
남이 정할 수 있는 주소면 그건 우리 러너 안에서 도는 남의 코드다.

## 등급

실제로 무슨 일이 일어나는지로 매긴다. "이론적으로 가능"은 등급이 아니다.

- **높음** — 방문자 브라우저에서 코드가 돌거나, 남이 파이프라인을 띄우거나, 토큰이 샌다.
- **중간** — 정보가 새거나(설정 상태·내부 경로), 돈이 새거나, 방어층이 없다(CSP).
- **낮음** — 조건이 까다롭거나 피해가 작다.
- **기록만** — 지금 구조에서 닿지 않는다. 구조가 바뀌면 다시 본다.

## 보고 형식

발견마다 **① 무엇이 ② 어디서 ③ 어떻게 ④ 무슨 일이 ⑤ 어떻게 막나**.
재현 한 줄(명령이나 문자열)을 반드시 붙인다 — 못 재현하면 못 고친다.
고칠 때는 **출력이 닿는 자리**를 막는다. 입력을 걸러 막는 것은 다음 우회에서 진다.

## 하지 말 것

- 남의 서비스·계정을 찌르지 않는다. 대상은 이 레포와 우리 배포뿐이다.
- 실제로 비용이 나는 것을 반복 호출하지 않는다 (워크플로 띄우기, TTS).
- 찾은 비밀을 대화·커밋·로그에 옮겨 적지 않는다. **어디에 있는지만** 말한다.
- 고쳤다고 말하기 전에 재현 절차를 다시 돌려 막혔는지 확인한다.

---

© 2026 vibelog · Jessi
