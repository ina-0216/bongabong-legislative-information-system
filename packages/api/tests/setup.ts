import 'vitest';

// vitest 4 + jsdom 25 does not expose `localStorage` on the environment's
// global (verified: typeof globalThis.localStorage === 'undefined' while
// window === globalThis). Real browsers always provide it, and
// src/index.ts guards only on `typeof window !== 'undefined'` before reading
// it, so the guard passes under jsdom and the read then throws.
//
// This installs a minimal, spec-shaped Storage so the token lookup path in
// getAdminApiClient() is genuinely exercised rather than skipped. Production
// code is left unchanged.
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
