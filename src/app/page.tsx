import StartForm from "@/components/StartForm";
import { PRICE_KRW_PER_HOUR } from "@/lib/billing/meter";

export default function HomePage() {
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
          AI 선생님 코코가 질문을 이어가며 아이가 계속 영어로 말하게 이끌어요. 마이크만 있으면 바로 시작할 수 있어요.
        </p>
        <StartForm />
      </section>
    </main>
  );
}
