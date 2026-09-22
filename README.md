# 꾸그 AI 영어 선생님 (1:1 스피킹 튜터)

꾸그에 붙일 1:1 인공지능 영어 선생님의 첫 버전입니다. 선생님 "코코"가 질문을 이어가며 아이가 계속 영어로 **말하게** 이끕니다. 판매가는 **시간당 1,000원**(분 단위 비례, 10/20/30/60분 선택)입니다.

## 어떻게 동작하나

```
아이 목소리 ──(브라우저 STT, 무료)──▶ 텍스트 ──▶ /api/sessions/:id/turn ──▶ Claude
                                                                        │ 스트리밍
아이 귀 ◀──(브라우저 TTS, 무료)── 선생님 발화 ◀── HINT 분리 ◀────────────┘
```

- **음성 입출력은 브라우저 내장 API**(Web Speech API)를 씁니다. 별도 STT/TTS 비용이 0원이라 시간당 1,000원 구조가 성립합니다. Chrome/Edge에서 동작하고, 미지원 브라우저는 글로 대답할 수 있습니다.
- **선생님은 Claude**입니다. 기본 모델은 `claude-opus-5`, 낮은 effort, 프롬프트 캐시, 서버측 refusal 폴백을 씁니다. 모델은 `TUTOR_MODEL` 환경변수로 바꿉니다.
- **선생님이 수업을 끌고 갑니다.** 매 턴 한 문장 질문으로 끝내고, 아이가 막히면 두 개 중 고르게 하거나 문장 틀을 줍니다. 틀린 말은 흐름을 끊지 않고 고쳐 말해주는 방식(recast)으로 교정합니다.
- **한국어 힌트**: 아이가 막힐 때만 `HINT:` 줄로 한국어 힌트를 내려보냅니다. 화면에만 보이고 읽어주지는 않습니다.
- **시간 관리**: 서버가 시계를 갖습니다. 남은 2분부터 마무리 신호를 주고, 종료 후 유예 90초 안에 작별 인사 1턴만 허용합니다.
- **수업 리포트**: 끝나면 학부모용 리포트(요약, 잘한 점, 교정 표현, 새 표현, 다음 수업 포인트, 레벨 판단)를 구조화 출력으로 만듭니다.

## 실행

```bash
pnpm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
pnpm dev                     # http://localhost:3000
```

검사:

```bash
pnpm check    # typecheck + lint + 단위 테스트
pnpm build
```

## 구조

| 경로 | 역할 |
|---|---|
| `src/lib/tutor/prompt.ts` | 선생님 지침(고정, 캐시 공유), 레벨/주제 프로필, HINT 파싱, 시간 노트 |
| `src/lib/tutor/turn.ts` | 한 턴 실행: 메시지 조립, 캐시 브레이크포인트, 스트리밍, refusal 처리 |
| `src/lib/tutor/report.ts` | 수업 리포트 생성 (zod 스키마 구조화 출력) |
| `src/lib/tutor/claude.ts` | Anthropic 클라이언트, 모델별 요청 옵션(effort, fallbacks) |
| `src/lib/tutor/store.ts` | 세션 저장소 인터페이스 + 인메모리 구현 |
| `src/lib/billing/meter.ts` | 1,000원/시간 가격, 수업 길이, 시계·유예 규칙 |
| `src/lib/billing/cost.ts` | 토큰 사용량 → 원가(원), 1시간 원가 시나리오 |
| `src/lib/speech.ts` | 브라우저 STT/TTS 래퍼 |
| `src/app/api/sessions/**` | 세션 생성/조회, 턴(NDJSON 스트림), 리포트 |
| `src/components/LessonClient.tsx` | 수업 화면: 듣기 → 보내기 → 읽어주기 → 다시 듣기 루프 |
| `docs/cost-model.md` | 시간당 원가 분석과 모델 선택 |
| `docs/integration.md` | 꾸그 연동 포인트 (인증, 결제, 저장소, 안전) |

## 원가 요약 (자세한 건 docs/cost-model.md)

1시간 수업(아이 발화 40회 + 리포트 1회, 환율 1,400원 기준) 추정 AI 원가:

| 모델 | 원가/시간 | 판매가 대비 |
|---|---|---|
| claude-opus-5 (기본) | 약 480원 | 48% |
| claude-sonnet-5 | 약 190원 | 19% |
| claude-haiku-4-5 | 약 100원 | 10% |

아이가 말을 많이 하는 세션(60턴)에서 Opus 5는 1,000원을 넘길 수 있습니다. 1,000원 가격을 지키면서 마진을 확보하려면 `TUTOR_MODEL=claude-haiku-4-5` 또는 `claude-sonnet-5`를 권합니다. 실제 사용량은 세션마다 `aiCostKrw`로 기록되니 파일럿 후 데이터로 결정하면 됩니다.

## 지금 버전의 한계

- 세션이 서버 메모리에만 있습니다. 재시작하면 사라지고 여러 인스턴스에서 공유되지 않습니다. `SessionStore` 인터페이스에 Redis/DB 구현을 붙이면 됩니다.
- 로그인·결제가 없습니다. 세션 생성 API가 결제 확인 지점입니다 (docs/integration.md).
- 브라우저 음성 인식은 아이 발음과 한국식 억양에서 오인식이 있습니다. 선생님 프롬프트가 되묻도록 되어 있지만, 품질이 부족하면 클라우드 STT로 교체할 수 있습니다 (원가 영향은 cost-model 참고).
- Safari/iOS는 음성 인식 지원이 제한적입니다. 파일럿은 Chrome/Edge(PC, 안드로이드 태블릿) 기준으로 권합니다.
