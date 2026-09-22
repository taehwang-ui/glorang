"use client";

import type { Mood } from "@/lib/tutor/board";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

/**
 * 2D 코코 아바타 (인라인 SVG). 비용 0.
 * - mood: 모델이 고른 표정 (neutral / happy / curious / encouraging)
 * - state: 앱 상태 (듣는 중 / 생각 중 / 말하는 중)
 * - mouth: 0~1, TTS 에 맞춰 입 벌림 정도
 */
export default function Avatar({ mood, state, mouth }: { mood: Mood; state: AvatarState; mouth: number }) {
  const open = Math.max(0, Math.min(1, mouth));
  // 입: 닫힘(미소) ↔ 열림(타원)
  const mouthH = 4 + open * 22;
  const mouthW = 30 + open * 6;
  const browLift = mood === "curious" ? -6 : mood === "happy" ? -3 : 0;
  const browTilt = mood === "encouraging" ? 6 : mood === "curious" ? -4 : 0;
  const eyeScale = state === "listening" ? 1.15 : 1;
  const lookX = state === "thinking" ? 6 : 0;
  const lookY = state === "thinking" ? -5 : 0;
  const smile = mood === "happy" || mood === "encouraging";

  return (
    <div className={`avatar-wrap state-${state} mood-${mood}`} aria-label={`코코 선생님, ${state}`} role="img">
      <svg viewBox="0 0 200 200" className="avatar-svg">
        {/* 귀 */}
        <ellipse cx="46" cy="70" rx="18" ry="24" fill="var(--av-fur-dark)" transform="rotate(-18 46 70)" />
        <ellipse cx="154" cy="70" rx="18" ry="24" fill="var(--av-fur-dark)" transform="rotate(18 154 70)" />
        <ellipse cx="48" cy="72" rx="10" ry="15" fill="var(--av-ear)" transform="rotate(-18 48 72)" />
        <ellipse cx="152" cy="72" rx="10" ry="15" fill="var(--av-ear)" transform="rotate(18 152 72)" />
        {/* 몸/얼굴 */}
        <g className="av-body">
          <ellipse cx="100" cy="112" rx="72" ry="66" fill="var(--av-fur)" />
          <ellipse cx="100" cy="132" rx="46" ry="34" fill="var(--av-belly)" />
          {/* 볼 */}
          <circle cx="60" cy="118" r="9" fill="var(--av-blush)" opacity="0.8" />
          <circle cx="140" cy="118" r="9" fill="var(--av-blush)" opacity="0.8" />
          {/* 눈썹 */}
          <path d={`M62 ${78 + browLift} q14 ${-8 + browTilt} 28 0`} stroke="var(--av-line)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d={`M110 ${78 + browLift} q14 ${-8 - browTilt} 28 0`} stroke="var(--av-line)" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* 눈 */}
          <g className="av-eyes" transform={`translate(${lookX} ${lookY})`}>
            <g transform={`translate(76 98) scale(${eyeScale})`}>
              <ellipse cx="0" cy="0" rx="9" ry="11" fill="var(--av-line)" />
              <circle cx="3" cy="-4" r="3" fill="#fff" />
            </g>
            <g transform={`translate(124 98) scale(${eyeScale})`}>
              <ellipse cx="0" cy="0" rx="9" ry="11" fill="var(--av-line)" />
              <circle cx="3" cy="-4" r="3" fill="#fff" />
            </g>
          </g>
          {/* 코 */}
          <ellipse cx="100" cy="116" rx="7" ry="5" fill="var(--av-line)" />
          {/* 입 */}
          {open > 0.08 ? (
            <ellipse cx="100" cy={126 + mouthH / 2} rx={mouthW / 2} ry={mouthH / 2} fill="var(--av-mouth)" />
          ) : (
            <path d={smile ? "M82 128 q18 16 36 0" : "M86 129 q14 9 28 0"} stroke="var(--av-line)" strokeWidth="4" fill="none" strokeLinecap="round" />
          )}
          {open > 0.4 && <ellipse cx="100" cy={126 + mouthH - 4} rx={mouthW / 3} ry={mouthH / 5} fill="var(--av-tongue)" />}
        </g>
        {state === "thinking" && (
          <g className="av-think">
            <circle cx="158" cy="48" r="5" fill="var(--av-line)" opacity="0.5" />
            <circle cx="170" cy="36" r="7" fill="var(--av-line)" opacity="0.6" />
            <circle cx="185" cy="22" r="9" fill="var(--av-line)" opacity="0.7" />
          </g>
        )}
      </svg>
    </div>
  );
}
