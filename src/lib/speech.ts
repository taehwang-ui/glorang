/**
 * 브라우저 내장 음성 인식(STT)·합성(TTS) 래퍼. 별도 비용이 들지 않아 시간당 1,000원 구조의 핵심이다.
 * Chrome/Edge 에서 동작하며, 미지원 브라우저에서는 null 을 돌려 텍스트 입력으로 대체한다.
 */

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupport() {
  return {
    stt: recognitionCtor() !== null,
    tts: typeof window !== "undefined" && "speechSynthesis" in window,
  };
}

export interface Recognizer {
  stop(): void;
  abort(): void;
}

/**
 * 한 번의 발화를 듣는다. 말이 끝나면 onFinal, 아무 말도 없으면 onSilence 가 호출된다.
 */
export function listenOnce(handlers: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onSilence: () => void;
  onError: (message: string) => void;
}): Recognizer | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = "";
  let aborted = false;
  let errored = false;

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onInterim(finalText + interim);
  };
  rec.onerror = (e) => {
    // no-speech / aborted 는 정상 흐름. 그 외(권한 거부 등)만 오류로 알린다.
    if (e.error === "no-speech" || e.error === "aborted") return;
    errored = true;
    handlers.onError(
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "마이크 권한이 필요해요. 브라우저 주소창에서 마이크를 허용해 주세요."
        : `음성 인식 오류: ${e.error}`,
    );
  };
  rec.onend = () => {
    if (aborted || errored) return;
    const text = finalText.trim();
    if (text) handlers.onFinal(text);
    else handlers.onSilence();
  };

  try {
    rec.start();
  } catch {
    return null;
  }
  return {
    stop: () => rec.stop(),
    abort: () => {
      aborted = true;
      rec.abort();
    },
  };
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // 아직 로드 전이면 캐시하지 않는다
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const preferred = ["Google US English", "Samantha", "Microsoft Aria", "Microsoft Jenny", "Karen", "Moira"];
  cachedVoice =
    en.find((v) => preferred.some((p) => v.name.includes(p))) ??
    en.find((v) => v.lang.toLowerCase() === "en-us") ??
    en[0] ??
    null;
  return cachedVoice;
}

export interface SpeakHandlers {
  onStart?: () => void;
  /** 단어 경계마다 호출 (Chrome). 아바타 입 움직임에 쓴다. */
  onBoundary?: () => void;
  onEnd?: () => void;
}

/** 텍스트를 읽어주고 끝나면 resolve. TTS 미지원이면 즉시 resolve. */
export function speak(text: string, rate = 0.95, handlers: SpeakHandlers = {}): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return Promise.resolve();
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    u.pitch = 1.05;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      handlers.onEnd?.();
      resolve();
    };
    u.onstart = () => handlers.onStart?.();
    u.onboundary = () => handlers.onBoundary?.();
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
    // 일부 브라우저는 이벤트를 주지 않는다. 말이 시작되지도 않으면 멈춤 방지용으로 끝낸다.
    setTimeout(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) finish();
    }, 800);
  });
}

export function cancelSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** 음성 목록은 비동기로 로드되므로 미리 워밍업한다. */
export function warmVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
    pickVoice();
  };
}
