"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { LEVELS, TOPICS, type Level } from "@/lib/tutor/prompt";
import { LESSON_DURATIONS_MIN, priceKrw, type LessonDuration } from "@/lib/billing/meter";
import { speak, speechSupport, warmVoices } from "@/lib/speech";

type Step = "hello" | "level" | "topic" | "length";

/**
 * 진입 후 맞이 화면. 4단계: 인사(소리 확인) → 레벨 → 주제 → 길이.
 * 꾸그 토큰으로 들어오면 이름·나이가 이미 채워져 있고, 초대 코드면 이름을 여기서 받는다.
 */
export default function Welcome({
  visitor,
  minutes,
}: {
  visitor: { name: string; age: number; level: Level | null; source: "gguge" | "invite" };
  minutes: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("hello");
  const [name, setName] = useState(visitor.name);
  const [age, setAge] = useState(visitor.age);
  const [level, setLevel] = useState<Level>(visitor.level ?? "starter");
  const [topicId, setTopicId] = useState("favorites");
  const [duration, setDuration] = useState<LessonDuration>(() => (LESSON_DURATIONS_MIN.filter((d) => d <= minutes).includes(20) ? 20 : 10));
  const [speaking, setSpeaking] = useState(false);
  const [mouth, setMouth] = useState(0);
  const [heard, setHeard] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [support] = useState(() => speechSupport());
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    warmVoices();
    return () => {
      if (mouthTimer.current) clearInterval(mouthTimer.current);
    };
  }, []);

  async function sayHello() {
    setSpeaking(true);
    mouthTimer.current = setInterval(() => setMouth((m) => (m > 0.3 ? 0.05 : 0.4 + Math.random() * 0.6)), 110);
    await speak(`Hello ${name || "there"}! I'm Coco. Can you hear me?`, 0.92, { onBoundary: () => setMouth(1) });
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    setMouth(0);
    setSpeaking(false);
    setHeard(true);
  }

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentName: name, age, level, topicId, durationMin: duration }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `세션을 만들지 못했어요 (${res.status})`);
      router.push(`/lesson/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 났어요");
      setPending(false);
    }
  }

  const available = LESSON_DURATIONS_MIN.filter((d) => d <= minutes);
  const steps: Step[] = ["hello", "level", "topic", "length"];
  const idx = steps.indexOf(step);

  return (
    <div className="welcome">
      <div className="topbar">
        <div className="brand">
          코코 <span>선생님</span>
        </div>
        <span className="pill mint">남은 수업 시간 {minutes}분</span>
      </div>

      <div className="progress" aria-hidden="true">
        {steps.map((s, i) => (
          <span key={s} className={`progress-dot ${i <= idx ? "on" : ""}`} />
        ))}
      </div>

      {step === "hello" && (
        <section className="card welcome-hello">
          <div className="welcome-avatar">
            <Avatar mood="happy" state={speaking ? "speaking" : "idle"} mouth={mouth} />
          </div>
          <h1>{name ? `${name}, 안녕!` : "안녕, 만나서 반가워!"}</h1>
          <p className="muted">
            나는 영어 선생님 코코야. 영어로 이야기하면서 같이 놀자. 먼저 내 목소리가 잘 들리는지 확인해 볼까?
          </p>
          {visitor.source === "invite" && (
            <div className="field">
              <label htmlFor="wname">아이 이름 (영어로 불러요)</label>
              <input id="wname" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: Mina" maxLength={20} />
              <label htmlFor="wage" style={{ marginTop: 10 }}>
                나이
              </label>
              <input id="wage" type="number" min={5} max={15} value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </div>
          )}
          {!support.tts && <p className="notice">이 브라우저는 소리 읽기를 지원하지 않아요. Chrome 이나 Edge 를 권해요.</p>}
          <div className="welcome-actions">
            <button className="btn secondary" type="button" onClick={() => void sayHello()} disabled={speaking || !name.trim()}>
              {speaking ? "말하는 중..." : "🔊 코코 목소리 듣기"}
            </button>
            <button className="btn" type="button" onClick={() => setStep("level")} disabled={!name.trim()}>
              {heard ? "잘 들려요, 다음" : "다음"}
            </button>
          </div>
          {!support.stt && (
            <p className="muted" style={{ marginTop: 10 }}>
              이 브라우저에서는 마이크 대신 글로 대답하게 돼요. 말로 대답하려면 Chrome 이나 Edge 로 열어 주세요.
            </p>
          )}
        </section>
      )}

      {step === "level" && (
        <section className="card">
          <h1>영어를 얼마나 해 봤어?</h1>
          <p className="muted">잘 모르겠으면 ‘처음이에요’로 시작해요. 수업이 끝나면 코코가 딱 맞는 레벨을 알려줘요.</p>
          <div className="choices">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" className="choice" aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
                <strong>{l.label}</strong>
                <small>{l.description}</small>
              </button>
            ))}
          </div>
          <div className="welcome-actions">
            <button className="btn secondary" type="button" onClick={() => setStep("hello")}>
              이전
            </button>
            <button className="btn" type="button" onClick={() => setStep("topic")}>
              다음
            </button>
          </div>
        </section>
      )}

      {step === "topic" && (
        <section className="card">
          <h1>오늘은 무슨 이야기를 할까?</h1>
          <div className="choices">
            {TOPICS.map((t) => (
              <button key={t.id} type="button" className="choice" aria-pressed={topicId === t.id} onClick={() => setTopicId(t.id)}>
                <strong>{t.label}</strong>
                <small>{t.en}</small>
              </button>
            ))}
          </div>
          <div className="welcome-actions">
            <button className="btn secondary" type="button" onClick={() => setStep("level")}>
              이전
            </button>
            <button className="btn" type="button" onClick={() => setStep("length")}>
              다음
            </button>
          </div>
        </section>
      )}

      {step === "length" && (
        <section className="card">
          <h1>얼마나 수업할까?</h1>
          <p className="muted">남은 시간 {minutes}분 안에서 고를 수 있어요. 처음이면 20분을 권해요.</p>
          {available.length === 0 ? (
            <p className="error">남은 수업 시간이 없어요. 꾸그에서 수업권을 충전한 뒤 다시 시작해 주세요.</p>
          ) : (
            <div className="choices">
              {available.map((d) => (
                <button key={d} type="button" className="choice" aria-pressed={duration === d} onClick={() => setDuration(d)}>
                  <strong>{d}분</strong>
                  <small>{priceKrw(d).toLocaleString("ko-KR")}원 상당</small>
                </button>
              ))}
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <div className="welcome-actions">
            <button className="btn secondary" type="button" onClick={() => setStep("topic")}>
              이전
            </button>
            <button className="btn" type="button" onClick={() => void start()} disabled={pending || available.length === 0}>
              {pending ? "선생님 부르는 중..." : "수업 시작하기 🎤"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
