"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionView } from "@/lib/tutor/view";
import type { TurnEvent, TurnInput } from "@/lib/tutor/turn";
import { cancelSpeech, listenOnce, speak, speechSupport, warmVoices, type Recognizer } from "@/lib/speech";
import ReportView from "./ReportView";

type Phase = "ready" | "thinking" | "speaking" | "listening" | "idle" | "ending" | "report";

interface Turn {
  role: "tutor" | "student";
  text: string;
  hint?: string | null;
}

const SILENCE_SECONDS = 10;
const MAX_SILENCE_PROMPTS = 2;

export default function LessonClient({ initial }: { initial: SessionView }) {
  const [session, setSession] = useState<SessionView>(initial);
  const [phase, setPhase] = useState<Phase>(initial.status === "ended" ? "report" : "ready");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [live, setLive] = useState(""); // 스트리밍 중인 튜터 발화
  const [interim, setInterim] = useState(""); // 인식 중인 학생 발화
  const [typed, setTyped] = useState("");
  const [remaining, setRemaining] = useState(initial.remainingSec);
  const [error, setError] = useState<string | null>(null);
  const [support] = useState(() => speechSupport());

  const busy = useRef(false);
  const recognizer = useRef<Recognizer | null>(null);
  const silencePrompts = useRef(0);
  const startedAt = useRef<number | null>(initial.startedAt);
  const timeUpSent = useRef(false);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  useEffect(() => {
    warmVoices();
    return () => {
      recognizer.current?.abort();
      cancelSpeech();
    };
  }, []);

  // 남은 시간 카운트다운 (서버가 진짜 기준이고, 화면 표시와 종료 트리거만 담당)
  useEffect(() => {
    const t = setInterval(() => {
      if (startedAt.current === null) return;
      const left = Math.max(0, Math.ceil((startedAt.current + session.profile.durationMin * 60_000 - Date.now()) / 1000));
      setRemaining(left);
    }, 1000);
    return () => clearInterval(t);
  }, [session.profile.durationMin]);

  const stopListening = useCallback(() => {
    recognizer.current?.abort();
    recognizer.current = null;
    setInterim("");
  }, []);

  const sendTurn = useCallback(
    async (input: TurnInput) => {
      if (busy.current || phaseRef.current === "report" || phaseRef.current === "ending") return;
      busy.current = true;
      stopListening();
      cancelSpeech();
      setError(null);
      setPhase("thinking");
      setLive("");
      if (input.kind === "speech") setTurns((t) => [...t, { role: "student", text: input.text }]);

      let done: Extract<TurnEvent, { type: "done" }> | null = null;
      try {
        const res = await fetch(`/api/sessions/${session.id}/turn`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `서버 오류 (${res.status})`);
        }
        if (startedAt.current === null) startedAt.current = Date.now();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        while (true) {
          const { value, done: eof } = await reader.read();
          if (eof) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line) as TurnEvent;
            if (ev.type === "delta") {
              text += ev.text;
              setLive(text);
            } else if (ev.type === "done") {
              done = ev;
            } else if (ev.type === "error") {
              throw new Error(ev.message);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 났어요");
        setPhase("idle");
        busy.current = false;
        return;
      }

      if (!done) {
        setError("선생님 응답이 끊겼어요. 다시 말해 주세요.");
        setPhase("idle");
        busy.current = false;
        return;
      }

      const finished = done;
      setLive("");
      setTurns((t) => [...t, { role: "tutor", text: finished.speech, hint: finished.hint }]);
      setRemaining(finished.remainingSec);
      setPhase("speaking");
      await speak(finished.speech, session.profile.level === "starter" ? 0.88 : 0.95);
      busy.current = false;

      if (finished.ended) {
        await finishLesson();
        return;
      }
      startListening();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.id, session.profile.level, stopListening],
  );

  const startListening = useCallback(() => {
    if (phaseRef.current === "report" || phaseRef.current === "ending" || busy.current) return;
    if (!support.stt) {
      setPhase("idle");
      return;
    }
    stopListening();
    setPhase("listening");
    recognizer.current = listenOnce({
      onInterim: (t) => setInterim(t),
      onFinal: (t) => {
        silencePrompts.current = 0;
        setInterim("");
        void sendTurn({ kind: "speech", text: t });
      },
      onSilence: () => {
        setInterim("");
        if (phaseRef.current !== "listening") return;
        if (silencePrompts.current < MAX_SILENCE_PROMPTS) {
          silencePrompts.current += 1;
          void sendTurn({ kind: "silence", seconds: SILENCE_SECONDS });
        } else {
          setPhase("idle");
        }
      },
      onError: (m) => {
        setError(m);
        setPhase("idle");
      },
    });
    if (!recognizer.current) setPhase("idle");
  }, [sendTurn, stopListening, support.stt]);

  // 시간 종료: 작별 인사 턴을 한 번만 보낸다.
  useEffect(() => {
    if (remaining > 0 || timeUpSent.current || startedAt.current === null) return;
    if (phaseRef.current === "report" || phaseRef.current === "ending" || phaseRef.current === "ready") return;
    timeUpSent.current = true;
    const fire = () => {
      if (busy.current) {
        setTimeout(fire, 500);
        return;
      }
      void sendTurn({ kind: "timeup" });
    };
    fire();
  }, [remaining, sendTurn]);

  async function finishLesson() {
    stopListening();
    cancelSpeech();
    setPhase("ending");
    try {
      const res = await fetch(`/api/sessions/${session.id}/report`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `리포트 오류 (${res.status})`);
      }
      setSession(await res.json());
      setPhase("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "리포트를 만들지 못했어요");
      setPhase("idle");
    }
  }

  function onMicClick() {
    if (phase === "listening") {
      recognizer.current?.stop(); // 지금까지 들은 내용으로 확정
      return;
    }
    if (phase === "speaking") cancelSpeech();
    if (phase === "idle" || phase === "speaking") {
      silencePrompts.current = 0;
      startListening();
    }
  }

  function onTypedSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    setTyped("");
    silencePrompts.current = 0;
    void sendTurn({ kind: "speech", text });
  }

  const studentTurns = turns.filter((t) => t.role === "student").length;

  if (phase === "report") {
    return <ReportView session={session} studentTurns={studentTurns} />;
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const lastTutor = [...turns].reverse().find((t) => t.role === "tutor");
  const statusText: Record<Phase, string> = {
    ready: "준비되면 아래 버튼을 눌러 인사해요",
    thinking: "선생님이 생각하는 중...",
    speaking: "선생님이 말하는 중 (누르면 바로 대답할 수 있어요)",
    listening: "듣고 있어요. 영어로 말해 보세요!",
    idle: "마이크를 누르고 말해 보세요",
    ending: "리포트를 만드는 중...",
    report: "",
  };

  return (
    <div className="lesson">
      <div className="topbar">
        <div className="brand">
          코코 <span>선생님</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`pill sky timer ${remaining <= 60 && startedAt.current ? "low" : ""}`}>
            {mm}:{ss}
          </span>
          {phase !== "ready" && (
            <button className="btn ghost" type="button" onClick={() => void finishLesson()} disabled={phase === "ending"}>
              끝내기
            </button>
          )}
        </div>
      </div>

      <div className="stage">
        {phase === "ready" ? (
          <div className="card">
            <h1>{session.profile.studentName}, 준비됐나요?</h1>
            <p className="muted">
              {session.profile.durationMin}분 동안 코코 선생님과 영어로 이야기해요. 선생님 말이 끝나면 마이크가 켜져요. 잘 모르겠으면 그냥 아는 만큼만 말해도 괜찮아요.
            </p>
            {!support.stt && (
              <p className="notice">이 브라우저는 음성 인식을 지원하지 않아요. Chrome 이나 Edge 를 쓰면 말로 대답할 수 있고, 지금은 글로 대답할 수 있어요.</p>
            )}
            <button className="btn" type="button" onClick={() => void sendTurn({ kind: "start" })}>
              선생님과 인사하기 🎤
            </button>
          </div>
        ) : (
          <>
            <div className="transcript">
              {turns.slice(0, -1).map((t, i) =>
                t.role === "tutor" ? (
                  <div className="tutor-bubble" key={i}>
                    {t.text}
                    {t.hint && <div className="hint">힌트: {t.hint}</div>}
                  </div>
                ) : (
                  <div className="student-bubble" key={i}>{t.text}</div>
                ),
              )}
            </div>
            {(live || phase === "thinking" || lastTutor) && (
              <div className="tutor-bubble">
                <div className="speaker"><span className="avatar">C</span> Coco</div>
                {live || (phase === "thinking" ? "..." : lastTutor?.text)}
                {!live && phase !== "thinking" && lastTutor?.hint && <div className="hint">힌트: {lastTutor.hint}</div>}
              </div>
            )}
            {turns.length > 0 && turns[turns.length - 1].role === "student" && (
              <div className="student-bubble">{turns[turns.length - 1].text}</div>
            )}
            {interim && <div className="student-bubble interim">{interim}</div>}
          </>
        )}
      </div>

      {phase !== "ready" && (
        <div className="controls">
          {error && <p className="error">{error}</p>}
          <button
            className={`mic ${phase === "listening" ? "listening" : ""} ${phase === "speaking" ? "speaking" : ""}`}
            type="button"
            onClick={onMicClick}
            disabled={phase === "thinking" || phase === "ending" || !support.stt}
            aria-label="마이크"
          >
            {phase === "listening" ? "👂" : "🎤"}
          </button>
          <div className="status">{statusText[phase]}</div>
          <form className="typebar" onSubmit={onTypedSubmit}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="글로 대답하기 (선택)"
              disabled={phase === "thinking" || phase === "ending"}
            />
            <button type="submit" disabled={!typed.trim() || phase === "thinking" || phase === "ending"}>보내기</button>
          </form>
          <div className="footer-meta">
            <span>{session.profile.durationMin}분 · {session.priceKrw.toLocaleString("ko-KR")}원</span>
            <span>{session.model}</span>
          </div>
        </div>
      )}
    </div>
  );
}
