# 꾸그 연동 포인트

이 프로젝트는 독립 실행되는 Next.js 앱입니다. 꾸그에 붙일 때 손대야 할 지점을 정리합니다.

## 1. 인증

- 현재: 로그인 없음. 시작 화면에서 이름/나이/레벨을 입력.
- 연동: 꾸그 로그인 세션(쿠키 또는 JWT)을 `/api/sessions` POST 와 `/lesson/[id]` 에서 검증하고, 아이 프로필(이름, 나이, 이전 레벨 판정)을 꾸그 계정에서 가져와 `SessionProfile` 을 채웁니다.
- 세션 소유권: `TutorSession` 에 `userId` 를 추가하고 GET/turn/report 에서 소유자만 접근하도록 확인합니다.

## 2. 결제 / 크레딧

- 가격 규칙은 `src/lib/billing/meter.ts` 한 곳에 있습니다 (`PRICE_KRW_PER_HOUR`, `LESSON_DURATIONS_MIN`, `priceKrw`).
- `/api/sessions` POST 가 결제 확인 지점입니다. 세션을 만들기 전에 꾸그 결제/크레딧에서 `priceKrw(durationMin)` 만큼 차감(또는 홀드)하고, 실패하면 402 로 응답합니다.
- 첫 턴이 실패하면 시계가 되돌아가므로(`startedAt = null`) 이 시점에는 환불 없이 재시도할 수 있습니다. 세션이 `active` 가 된 뒤 아이가 나가도 시간은 소비된 것으로 봅니다(선불 정액).
- 원가 추적: 세션의 `usage` 와 `aiCostKrw` 를 결제 기록과 함께 저장하면 모델별 마진을 실측할 수 있습니다.

## 3. 세션 저장소

- `src/lib/tutor/store.ts` 의 `SessionStore` 인터페이스(`create/get/save`)를 Redis 나 DB 로 구현해 `sessionStore` 를 교체합니다.
- 저장 내용: 프로필, 모델, 상태, 시계, 대화 이력(`messages`), 사용량, 리포트. 대화 이력은 20분 수업 기준 수 KB 입니다.
- `busy` 락은 같은 세션의 동시 턴을 막기 위한 것입니다. 분산 환경에서는 Redis `SET NX` 같은 락으로 바꿉니다.

## 4. 수업 기록과 학부모 화면

- 리포트는 `LessonReportSchema` (zod) 로 구조화되어 있어 그대로 DB 에 저장하고 꾸그 학부모 페이지에서 렌더링할 수 있습니다.
- `level_signal` 을 누적하면 다음 수업 레벨을 자동 추천할 수 있습니다.
- 대화 이력 전체를 학부모에게 보여줄지는 정책 결정 사항입니다. 보여준다면 `[대괄호]` 시스템 노트는 제외합니다 (`transcriptText` 참고).

## 5. 아동 안전

- 선생님 지침에 아동 안전 규칙(개인정보 요청 금지, 부적절 주제 회피, 걱정되는 발화 시 보호자 안내)이 들어 있습니다.
- Opus 5 계열에서는 안전 분류기가 거부한 요청을 서버측 폴백으로 다른 모델이 이어갑니다. 폴백까지 거부하면 안전한 고정 문장으로 대체해 수업이 끊기지 않게 합니다 (`turn.ts` 의 `FALLBACK_LINE`).
- 운영에서는 걱정되는 발화(괴롭힘, 다침 등)를 리포트나 별도 플래그로 보호자에게 알리는 흐름을 추가하는 것을 권합니다.

## 6. 임베드 방식

- 꾸그 웹/앱 안에서 iframe 으로 `/lesson/[id]` 를 띄우면 마이크 권한을 위해 `allow="microphone"` 이 필요합니다.
- 꾸그 앱(WebView)에서는 Web Speech API 지원 여부를 확인해야 합니다. 안드로이드 WebView 는 음성 인식이 막혀 있는 경우가 있어, 앱에서는 네이티브 STT 결과를 텍스트로 넘기는 브리지가 필요할 수 있습니다. 서버 API 는 텍스트만 받으므로 그대로 재사용됩니다.

## 7. 환경변수

| 이름 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | 필수 |
| `TUTOR_MODEL` | 기본 `claude-opus-5`. 원가를 낮추려면 `claude-haiku-4-5` 또는 `claude-sonnet-5` |
| `KRW_PER_USD` | 원가 표시 환율, 기본 1400 |
