import StartForm from "@/components/StartForm";
import { PRICE_KRW_PER_HOUR } from "@/lib/billing/meter";
import { requireEntry } from "@/lib/entry/handoff";

const ENTRY_MESSAGES: Record<string, string> = {
  missing: "꾸그에서 [시작하기]를 눌러 들어와 주세요.",
  expired: "링크가 만료됐어요. 꾸그에서 다시 [시작하기]를 눌러 주세요.",
  bad_signature: "링크가 올바르지 않아요. 꾸그에서 다시 [시작하기]를 눌러 주세요.",
  malformed: "링크가 올바르지 않아요. 꾸그에서 다시 [시작하기]를 눌러 주세요.",
  invalid: "링크 정보가 맞지 않아요. 꾸그에서 다시 [시작하기]를 눌러 주세요.",
  not_configured: "아직 꾸그 연결이 설정되지 않았어요 (GGUGE_HANDOFF_SECRET).",
  bad_code: "초대 코드가 맞지 않아요.",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ entry?: string }> }) {
  const { entry } = await searchParams;
  const message = entry ? (ENTRY_MESSAGES[entry] ?? "들어오지 못했어요. 다시 시도해 주세요.") : null;
  const gated = requireEntry();

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          꾸그 <span>AI 영어 선생님</span>
        </div>
        <span className="pill">시간당 {PRICE_KRW_PER_HOUR.toLocaleString("ko-KR")}원</span>
      </div>
      <section className="card">
        <h1>말하기로 배우는 1:1 영어 수업</h1>
        <p className="muted">
          AI 선생님 코코가 화면에 카드와 그림을 보여주면서 질문을 이어가고, 아이가 계속 영어로 말하게 이끌어요.
        </p>
        {message && <p className="error">{message}</p>}
        {gated ? (
          <p className="notice">꾸그 상세페이지에서 [시작하기]를 누르면 수업이 시작돼요.</p>
        ) : (
          <StartForm />
        )}
        <div className="entry-box">
          <p className="muted">초대 코드가 있어요</p>
          <form action="/start" method="get">
            <input name="code" placeholder="초대 코드" aria-label="초대 코드" required />
            <button type="submit">입장</button>
          </form>
        </div>
      </section>
    </main>
  );
}
