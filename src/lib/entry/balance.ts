/**
 * 방문자별 남은 수업 시간(분). 1~4단계용 인메모리 장부.
 * 5단계(꾸그 수업권 연동)에서는 같은 인터페이스로 꾸그 결제 API 를 호출하는 구현으로 바꾼다.
 */
export interface BalanceStore {
  get(uid: string): Promise<number>;
  /** 진입 시 잔액을 설정한다 (꾸그가 알려준 값 또는 초대 코드 값). 같은 nonce 는 한 번만 적용 */
  set(uid: string, minutes: number, nonce: string): Promise<void>;
  /** 수업 시작 시 차감. 잔액이 모자라면 false */
  consume(uid: string, minutes: number): Promise<boolean>;
}

class MemoryBalance implements BalanceStore {
  private balances = new Map<string, number>();
  private seen = new Set<string>();
  async get(uid: string) {
    return this.balances.get(uid) ?? 0;
  }
  async set(uid: string, minutes: number, nonce: string) {
    if (this.seen.has(nonce)) return;
    this.seen.add(nonce);
    this.balances.set(uid, minutes);
  }
  async consume(uid: string, minutes: number) {
    const cur = this.balances.get(uid) ?? 0;
    if (cur < minutes) return false;
    this.balances.set(uid, cur - minutes);
    return true;
  }
}

const g = globalThis as unknown as { __balanceStore?: BalanceStore };
export const balanceStore: BalanceStore = g.__balanceStore ?? (g.__balanceStore = new MemoryBalance());
