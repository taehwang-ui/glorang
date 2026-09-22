"use client";

import type { BoardCommand } from "@/lib/tutor/board";

/**
 * 공유 화면(칠판). 선생님의 보드 명령을 렌더링한다. 명령이 없으면 주제 표지를 보여준다.
 */
export default function Board({
  command,
  topicLabel,
  topicEn,
  onPick,
  revealAnswer,
}: {
  command: BoardCommand | null;
  topicLabel: string;
  topicEn: string;
  onPick?: (text: string) => void;
  revealAnswer?: boolean;
}) {
  if (!command) {
    return (
      <div className="board board-cover">
        <div className="board-kicker">{"Today's topic"}</div>
        <div className="board-title">{topicEn}</div>
        <div className="board-sub">{topicLabel}</div>
      </div>
    );
  }
  switch (command.type) {
    case "word_card":
      return (
        <div className="board board-word">
          <div className="board-emoji">{command.emoji}</div>
          <div className="board-word-en">{command.word}</div>
          <div className="board-word-ko">{command.meaning_ko}</div>
        </div>
      );
    case "sentence_frame": {
      const parts = command.frame.split("___");
      return (
        <div className="board board-frame">
          <div className="board-kicker">Say it like this</div>
          <div className="board-frame-text">
            {parts.map((p, i) => (
              <span key={i}>
                {p}
                {i < parts.length - 1 && <span className="blank">____</span>}
              </span>
            ))}
          </div>
          <div className="board-sub">e.g. {command.example}</div>
        </div>
      );
    }
    case "picture":
      return (
        <div className="board board-picture">
          <div className="board-scene">
            {command.emojis.map((e, i) => (
              <span key={i}>{e}</span>
            ))}
          </div>
          <div className="board-sub">{command.caption_en}</div>
        </div>
      );
    case "quiz":
      return (
        <div className="board board-quiz">
          <div className="board-kicker">Quiz</div>
          <div className="board-question">{command.question}</div>
          <div className="board-options">
            {command.options.map((o, i) => (
              <button
                key={i}
                type="button"
                className={`board-option ${revealAnswer && i === command.answer_index ? "correct" : ""}`}
                onClick={() => onPick?.(o)}
              >
                <b>{String.fromCharCode(65 + i)}</b> {o}
              </button>
            ))}
          </div>
        </div>
      );
    case "sticker":
      return (
        <div className="board board-sticker">
          <div className="sticker-emoji">{command.emoji}</div>
          <div className="sticker-label">{command.label_en}</div>
        </div>
      );
  }
}
