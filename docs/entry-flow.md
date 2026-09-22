# 꾸그 상세페이지 → AI 선생님 진입 흐름

꾸그 상세페이지의 [시작하기] 버튼이 아이를 이 앱으로 넘기는 방법입니다. **꾸그 쪽에는 아무것도 쓰지 않습니다.** 꾸그는 서명된 링크를 만들어 주기만 하고, 그 뒤는 전부 이 앱 안에서 일어납니다.

```
[꾸그 상세페이지] --클릭--> 꾸그 서버: 토큰 서명 --302--> ai.gguge.com/start?token=...
                                                        │ 검증, 쿠키 발급, 잔액 기록
                                                        ▼
                                                   /welcome (인사·소리 확인 → 레벨 → 주제 → 길이)
                                                        ▼
                                                   /lesson/:id (수업) → 리포트
```

## 1. 꾸그가 할 일 (서버 코드 20줄)

[시작하기] 클릭 시 꾸그 서버가 아래 토큰을 만들어 `https://ai.gguge.com/start?token=<token>` 으로 리다이렉트합니다. 클라이언트에서 만들면 안 됩니다 (비밀키 노출).

```js
// Node.js 예시. 다른 언어도 HMAC-SHA256 + base64url 만 있으면 됩니다.
import { createHmac, randomBytes } from "node:crypto";

function makeStartUrl({ parentId, child, remainingMinutes }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    uid: String(parentId),                     // 꾸그 보호자 계정 ID
    child: { name: child.englishName, age: child.age, level: child.aiLevel /* 선택 */ },
    minutes: remainingMinutes,                 // 이번 진입에서 쓸 수 있는 시간(분)
    iat: now,
    exp: now + 600,                            // 10분 뒤 만료
    nonce: randomBytes(12).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", process.env.GGUGE_HANDOFF_SECRET).update(body).digest("base64url");
  return `https://ai.gguge.com/start?token=${body}.${sig}`;
}
```

토큰 필드:

| 필드 | 설명 |
|---|---|
| `uid` | 보호자 계정 ID. 이 앱 안에서 세션 소유자 식별에만 씀 |
| `child.name` | 영어 이름 (선생님이 부름), 20자 이하 |
| `child.age` | 5~15 |
| `child.level` | `starter` / `basic` / `intermediate`, 없으면 웰컴 화면에서 고름 |
| `minutes` | 쓸 수 있는 수업 시간(분). 베타에서는 "무료 체험 한도"로 쓰면 됨 |
| `exp` | 만료 (발급 후 10분 권장) |
| `nonce` | 임의 문자열. 같은 토큰 재사용 시 잔액이 중복 부여되지 않도록 함 |

## 2. 이 앱이 하는 일

1. `/start` 가 서명과 만료를 검증합니다. 실패하면 홈으로 보내며 이유를 보여줍니다.
2. 방문자 쿠키(`coco_visitor`, httpOnly, 6시간)를 발급하고, 잔액 장부에 `minutes` 를 기록합니다.
3. `/welcome` 에서 코코가 인사하고 소리를 확인한 뒤 레벨·주제·길이를 고릅니다.
4. 세션 생성 시 잔액에서 수업 길이만큼 차감합니다. 부족하면 402.
5. 세션의 모든 API 는 쿠키의 방문자와 세션 소유자를 대조합니다.

잔액 장부는 지금 인메모리입니다. 실제 수업권 차감을 꾸그가 알아야 하는 시점(5단계)에는 `BalanceStore` 인터페이스에 꾸그 결제 API 호출 구현을 붙입니다 (`src/lib/entry/balance.ts`).

## 3. 로컬에서 흐름 전체 테스트하기

```bash
# .env.local
GGUGE_HANDOFF_SECRET=any-long-random-secret-16plus
INVITE_CODES=BETA-01:60

pnpm dev
# 다른 터미널에서 꾸그 역할로 링크 생성
GGUGE_HANDOFF_SECRET=any-long-random-secret-16plus node scripts/make-handoff-token.mjs --name Mina --age 8 --minutes 60
# 출력된 http://localhost:3000/start?token=... 을 Chrome 으로 열기
```

초대 코드 방식은 홈 화면의 "초대 코드가 있어요"에 `BETA-01` 을 넣으면 됩니다. 이름과 나이는 웰컴 화면에서 받습니다.

## 4. 운영 설정

- `REQUIRE_ENTRY=1` 로 두면 홈에서 바로 시작하는 개발용 폼이 사라지고, 토큰이나 초대 코드로만 들어올 수 있습니다.
- `GGUGE_HANDOFF_SECRET` 은 꾸그 서버와 이 앱의 환경변수에만 둡니다. 교체할 때는 두 곳을 같이 바꿉니다.
- 꾸그 앱(WebView)에서 여는 경우 쿠키가 막히지 않는지 확인이 필요합니다. 막히면 `/start` 가 세션 ID 를 URL 에 실어 넘기는 방식으로 바꿀 수 있습니다.

## 5. 되돌리기

꾸그의 [시작하기] 버튼을 숨기면 끝입니다. 이 앱은 독립 배포라 꾸그에 남는 것이 없습니다.
