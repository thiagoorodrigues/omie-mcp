/**
 * Small in-memory TTL set used to drop duplicate webhook deliveries and
 * cross-system echoes (e.g. Evolution re-emitting a message the bridge just
 * sent). Not durable across restarts — good enough for loop prevention.
 *
 * For multi-instance deployments, back this with Redis instead.
 */
export class TtlSet {
  private readonly entries = new Map<string, number>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  private prune(): void {
    const t = this.now();
    for (const [key, exp] of this.entries) {
      if (exp <= t) this.entries.delete(key);
    }
  }

  has(key: string): boolean {
    const exp = this.entries.get(key);
    if (exp === undefined) return false;
    if (exp <= this.now()) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  add(key: string): void {
    if (this.ttlMs <= 0) return;
    if (this.entries.size > 10_000) this.prune();
    this.entries.set(key, this.now() + this.ttlMs);
  }

  /** Returns true if the key was already seen; otherwise records it and returns false. */
  seen(key: string): boolean {
    if (this.has(key)) return true;
    this.add(key);
    return false;
  }

  get size(): number {
    return this.entries.size;
  }
}
