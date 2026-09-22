# 꾸그 AI 영어 선생님 (1:1 스피킹 튜터)

꾸그에 붙일 1:1 인공지능 영어 선생님의 첫 버전입니다. 선생님 "코코"가 질문을 이어가며 아이가 계속 영어로 **말하게** 이끕니다. 판매가는 **시간당 1,000원**(분 단위 비례, 10/20/30/60분 선택)입니다.

## 꾸그에서 들어오는 흐름

꾸그 상세페이지 [시작하기] → 서명 토큰 → `/start` → 웰컴(인사·소리 확인 → 레벨 → 주제 → 길이) → 수업 → 리포트. 꾸그 쪽에는 아무것도 쓰지 않고, 되돌리려면 버튼만 숨기면 됩니다. 토큰 형식과 꾸그 서버 샘플 코드는 `docs/entry-flow.md`, 단계별 런칭은 `docs/launch.md`.

베타 초대 코드(`INVITE_CODES`)로도 같은 흐름을 탈 수 있어 꾸그 연동 전에 먼저 써 볼 수 있습니다.

## 어떻게 동작하나

```
아이 목소리 ──(브라우저 STT, 무료)──▶ 텍스트 ──▶ /api/sessions/:id/turn ──▶ Claude
                                                                        │ 스트리밍
아이 귀 ◀──(브라우저 TTS, 무료)── 선생님 발화 ◀── HINT 분리 ◀────────────┘
```

- **음성 입출력은 브라우저 내장 API**(Web Speech API)를 씁니다. 별도 STT/TTS 비용이 0원이라 시간당 1,000원 구조가 성립합니다. Chrome/Edge에서 동작하고, 미지원 브라우저는 글로 대답할 수 있습니다.
- **선생님은 Claude**입니다. 기본 모델은 `claude-opus-5`, 낮은 effort, 프롬프트 캐시, 서버측 refusal 폴백을 씁니다. 모델은 `TUTOR_MODEL` 환경변수로 바꿉니다.
- **주제별 수업 계획**(`lessons.ts`): 주제마다 목표, 핵심 단어 6개(이모지·뜻), 문장 틀 3개, 역할극, 게임이 정해져 있고, 경과 시간에 따라 warm-up → topic talk → role-play or game → wrap-up 단계 노트를 선생님에게 보냅니다.
- **선생님이 수업을 끌고 갑니다.** 매 턴 한 문장 질문으로 끝내고, 아이가 막히면 두 개 중 고르게 하거나 문장 틀을 줍니다. 틀린 말은 흐름을 끊지 않고 고쳐 말해주는 방식(recast)으로 교정합니다.
- **줌형 수업 화면**: 선생님이 공유하는 칠판(큰 화면) + 코코 아바타 타일 + 아이 타일. 매 턴 선생님이 말할 내용과 함께 표정(mood)과 칠판 명령을 구조화 출력으로 내려보냅니다.
- **칠판 명령 5종**: 단어 카드, 문장 틀, 그림(이모지 장면) 설명, 3지선다 퀴즈, 칭찬 스티커. 그림은 1단계에서 이모지를 쓰며 주제별 일러스트로 교체할 수 있습니다.
- **2D 아바타**: 인라인 SVG 캐릭터. TTS 에 맞춰 입이 움직이고 표정 4종(neutral/happy/curious/encouraging)과 상태(듣는 중/생각 중/말하는 중)를 표현합니다. 추가 비용 0원.
- **한국어 힌트**: 아이가 막힐 때만 `hint` 필드로 한국어 힌트를 내려보냅니다. 화면에만 보이고 읽어주지는 않습니다.
- **시간 관리**: 서버가 시계를 갖습니다. 남은 2분부터 마무리 신호를 주고, 종료 후 유예 90초 안에 작별 인사 1턴만 허용합니다.
- **수업 리포트**: 끝나면 학부모용 리포트(요약, 잘한 점, 교정 표현, 새 표현, 다음 수업 포인트, 레벨 판단)를 구조화 출력으로 만듭니다.

## 직접 테스트하기

### 1) 설치 없이 바로: 데모 페이지 (`demo/coco-demo.html`)

claude.ai Artifact 로 열면 API 키 없이 바로 수업을 해볼 수 있습니다. 실제 앱과 같은 선생님 지침으로 동작하고, Claude 호출은 페이지를 연 사람의 claude.ai 사용량으로 계산됩니다.

- 글로 대답하고, 선생님 목소리는 브라우저 TTS 로 들립니다. Artifact 는 마이크 접근이 막혀 있어 음성 입력은 실제 앱에서만 됩니다.
- 3분 수업 옵션이 있어 마무리 신호 → 작별 인사 → 리포트 흐름까지 짧게 볼 수 있습니다.
- 다시 게시하려면 이 세션에서 만든 Artifact 링크를 쓰거나, Claude 에게 `demo/coco-demo.html` 을 Artifact 로 올려 달라고 하면 됩니다.
- 선생님 지침(`prompt.ts`)을 바꾸면 `node scripts/sync-demo-prompt.mjs` 로 데모에도 반영합니다.

### 1-b) 마이크까지: GitHub Pages 주소로 열기 (`docs/index.html`)

Artifact 프레임은 마이크를 막지만, 같은 데모를 일반 웹 주소로 열면 마이크·음성이 동작합니다. 이때는 보시는 분의 Anthropic API 키로 브라우저가 Claude 를 직접 호출합니다.

1. GitHub 저장소 Settings → Pages → Source "Deploy from a branch" → Branch `claude/ai-english-tutor-7f9zrr`, 폴더 `/docs` → Save.
2. 1~2분 뒤 `https://taehwang-ui.github.io/glorang/` 을 Chrome 으로 엽니다.
3. 상세페이지 목업의 "테스트 설정"에 API 키를 넣고 저장한 뒤 [시작하기].

키는 그 브라우저에만 저장됩니다. 지출 한도를 건 테스트 전용 키를 쓰고 끝나면 "키 지우기"를 누르세요. 운영 서비스에는 이 방식이 없고 서버(Next.js 앱)가 키를 갖습니다.

### 2) 실제 앱: 로컬 실행 (음성 입력 포함)

```bash
git clone https://github.com/taehwang-ui/glorang.git && cd glorang
git checkout claude/ai-english-tutor-7f9zrr
pnpm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
pnpm dev                     # http://localhost:3000 을 Chrome/Edge 로 열기
```

꾸그에서 들어오는 흐름까지 보려면 `docs/entry-flow.md` 의 "로컬에서 흐름 전체 테스트하기"를 따라 토큰 링크를 만들어 여세요. 마이크 권한을 허용하면 아이가 말한 내용이 자동 인식됩니다. 20분 수업 하나에 Opus 5 기준 약 150~200원의 API 비용이 듭니다.

### 3) 실제 앱: Vercel 배포

저장소를 Vercel 에 연결하고 환경변수 `ANTHROPIC_API_KEY` 만 넣으면 됩니다. 세션이 서버 메모리에 있으므로 배포 환경에서는 인스턴스가 하나일 때만 정상 동작합니다 (docs/integration.md 의 저장소 교체 참고).

검사:

```bash
pnpm check    # typecheck + lint + 단위 테스트
pnpm build
```

## 구조

| 경로 | 역할 |
|---|---|
| `src/lib/tutor/prompt.ts` | 선생님 지침(고정, 캐시 공유), 레벨/주제 프로필, HINT 파싱, 시간 노트 |
| `src/lib/tutor/lessons.ts` | 주제별 수업 계획(어휘·문장 틀·역할극·게임)과 단계 페이싱 |
| `src/lib/entry/*` | 꾸그 핸드오프 토큰 검증, 방문자 쿠키, 초대 코드, 잔액 장부 |
| `src/app/start`, `src/app/welcome` | 진입 라우트와 아이 맞이 화면 |
| `scripts/make-handoff-token.mjs` | 꾸그 [시작하기] 링크를 흉내내는 테스트 토큰 생성 |
| `docs/entry-flow.md` | 진입 흐름, 토큰 형식, 꾸그 서버 샘플 코드 |
| `src/lib/tutor/board.ts` | 턴 출력 스키마: say / hint / mood / board(칠판 명령 5종) |
| `src/lib/tutor/turn.ts` | 한 턴 실행: 메시지 조립, 캐시 브레이크포인트, 구조화 출력, refusal 처리 |
| `src/lib/tutor/report.ts` | 수업 리포트 생성 (zod 스키마 구조화 출력) |
| `src/lib/tutor/claude.ts` | Anthropic 클라이언트, 모델별 요청 옵션(effort, fallbacks) |
| `src/lib/tutor/store.ts` | 세션 저장소 인터페이스 + 인메모리 구현 |
| `src/lib/billing/meter.ts` | 1,000원/시간 가격, 수업 길이, 시계·유예 규칙 |
| `src/lib/billing/cost.ts` | 토큰 사용량 → 원가(원), 1시간 원가 시나리오 |
| `src/lib/speech.ts` | 브라우저 STT/TTS 래퍼 |
| `src/app/api/sessions/**` | 세션 생성/조회, 턴(NDJSON 스트림), 리포트 |
| `src/components/LessonClient.tsx` | 줌형 수업 화면: 듣기 → 보내기 → 읽어주기 → 다시 듣기 루프 |
| `src/components/Avatar.tsx`, `Board.tsx` | 2D 코코 아바타(SVG), 칠판 렌더러 |
| `scripts/sync-demo-prompt.mjs` | 앱의 선생님 지침을 데모 페이지에 복사 |
| `docs/launch.md` | 꾸그 연동과 실제 런칭 절차, 체크리스트 |
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
