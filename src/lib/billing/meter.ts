/**
 * 과금 규칙: 시간당 1,000원, 분 단위 비례. 수업은 선불 정액(길이 선택)으로 시작한다.
 * 실제 결제·크레딧 차감은 꾸그 결제 시스템이 담당하고, 여기서는 금액 계산과 시간 제한만 다룬다.
 */
export const PRICE_KRW_PER_HOUR = 1000;
export const LESSON_DURATIONS_MIN = [10, 20, 30, 60] as const;
export type LessonDuration = (typeof LESSON_DURATIONS_MIN)[number];

/** 수업 종료 후에도 작별 인사 1턴을 허용하는 유예 시간 */
export const GRACE_SEC = 90;

export function isLessonDuration(n: number): n is LessonDuration {
  return (LESSON_DURATIONS_MIN as readonly number[]).includes(n);
}

/** 수업 길이(분) → 판매가(원). 10분 167원, 20분 333원, 30분 500원, 60분 1,000원. */
export function priceKrw(durationMin: number): number {
  return Math.round((PRICE_KRW_PER_HOUR * durationMin) / 60);
}

export interface Clock {
  startedAt: number | null; // ms epoch, 첫 턴에 설정
  durationMin: number;
}

export function expiresAt(clock: Clock): number | null {
  return clock.startedAt === null ? null : clock.startedAt + clock.durationMin * 60_000;
}

export function remainingSec(clock: Clock, now = Date.now()): number {
  const end = expiresAt(clock);
  if (end === null) return clock.durationMin * 60;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

export type TurnGate = "open" | "grace" | "closed";

/** 턴 허용 여부: 시간 내 open, 종료 후 유예 내 grace(작별 1턴), 그 뒤 closed. */
export function turnGate(clock: Clock, now = Date.now()): TurnGate {
  const end = expiresAt(clock);
  if (end === null || now < end) return "open";
  if (now < end + GRACE_SEC * 1000) return "grace";
  return "closed";
}
