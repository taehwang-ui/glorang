"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEVELS, TOPICS, type Level } from "@/lib/tutor/prompt";
import { LESSON_DURATIONS_MIN, priceKrw, type LessonDuration } from "@/lib/billing/meter";

export default function StartForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState(8);
  const [level, setLevel] = useState<Level>("starter");
  const [topicId, setTopicId] = useState("favorites");
  const [duration, setDuration] = useState<LessonDuration>(20);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentName: name, age, level, topicId, durationMin: duration }),
      });
      if (!res.ok) throw new Error(`세션을 만들지 못했어요 (${res.status})`);
      const session = await res.json();
      router.push(`/lesson/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 났어요");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="name">아이 이름 (영어로 불러요)</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: Mina" required maxLength={20} />
      </div>
      <div className="field">
        <label htmlFor="age">나이</label>
        <input id="age" type="number" min={5} max={15} value={age} onChange={(e) => setAge(Number(e.target.value))} required />
      </div>
      <div className="field">
        <label>영어 레벨</label>
        <div className="choices">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" className="choice" aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
              <strong>{l.label}</strong>
              <small>{l.description}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>오늘의 주제</label>
        <div className="choices">
          {TOPICS.map((t) => (
            <button key={t.id} type="button" className="choice" aria-pressed={topicId === t.id} onClick={() => setTopicId(t.id)}>
              <strong>{t.label}</strong>
              <small>{t.en}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>수업 길이</label>
        <div className="choices">
          {LESSON_DURATIONS_MIN.map((d) => (
            <button key={d} type="button" className="choice" aria-pressed={duration === d} onClick={() => setDuration(d)}>
              <strong>{d}분</strong>
              <small>{priceKrw(d).toLocaleString("ko-KR")}원</small>
            </button>
          ))}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={pending || !name.trim()}>
        {pending ? "선생님 부르는 중..." : `${priceKrw(duration).toLocaleString("ko-KR")}원으로 수업 시작`}
      </button>
      <p className="muted" style={{ marginTop: 10 }}>
        Chrome 또는 Edge 브라우저에서 마이크 권한을 허용해 주세요. 마이크가 없으면 글로 써서 대답할 수도 있어요.
      </p>
    </form>
  );
}
