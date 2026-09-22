import Link from "next/link";
import type { SessionView } from "@/lib/tutor/view";

const LEVEL_SIGNAL: Record<string, string> = {
  below: "조금 더 쉬운 레벨을 추천해요",
  on: "지금 레벨이 잘 맞아요",
  above: "한 단계 높은 레벨도 좋아요",
};

export default function ReportView({ session, studentTurns }: { session: SessionView; studentTurns: number }) {
  const r = session.report;
  const usedMin =
    session.startedAt && session.endedAt ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000)) : 0;

  return (
    <div className="report">
      <div className="card">
        <h1>오늘 수업 리포트</h1>
        <p className="muted">
          {session.profile.studentName} · {session.profile.durationMin}분 수업 · {session.priceKrw.toLocaleString("ko-KR")}원
        </p>
        <div className="stats">
          <div className="stat"><b>{usedMin}분</b><span>수업 시간</span></div>
          <div className="stat"><b>{studentTurns}회</b><span>아이가 말한 횟수</span></div>
          <div className="stat"><b>{session.aiCostKrw.toLocaleString("ko-KR")}원</b><span>AI 원가(내부용)</span></div>
        </div>
      </div>

      {r ? (
        <div className="card">
          <div className="praise">“{r.praise_for_student_en}”</div>
          <h2>수업 요약</h2>
          <p>{r.summary_ko}</p>
          {r.strengths_ko.length > 0 && (
            <>
              <h2>잘한 점</h2>
              <ul>{r.strengths_ko.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {r.corrections.length > 0 && (
            <>
              <h2>다시 보면 좋은 표현</h2>
              {r.corrections.map((c, i) => (
                <div className="correction" key={i}>
                  <div><span className="said">{c.student_said}</span> → <span className="better">{c.better}</span></div>
                  <div className="muted">{c.note_ko}</div>
                </div>
              ))}
            </>
          )}
          {r.new_expressions.length > 0 && (
            <>
              <h2>오늘 배운 표현</h2>
              <ul>{r.new_expressions.map((e, i) => <li key={i}><b>{e.expression}</b> — {e.meaning_ko}</li>)}</ul>
            </>
          )}
          <h2>다음 수업에서는</h2>
          <p>{r.next_lesson_focus_ko}</p>
          <p className="pill mint">{LEVEL_SIGNAL[r.level_signal] ?? r.level_signal}</p>
        </div>
      ) : (
        <div className="card">
          <p>아이가 말한 내용이 없어 리포트를 만들지 않았어요. 다음에 다시 만나요!</p>
        </div>
      )}
      <Link className="btn secondary" href="/" style={{ display: "block", textAlign: "center", marginTop: 16, textDecoration: "none" }}>
        새 수업 시작하기
      </Link>
    </div>
  );
}
