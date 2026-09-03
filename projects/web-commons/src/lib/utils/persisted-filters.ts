export class PersistedFilters<T extends object> {
  constructor(private readonly key: string) {}

  save(state: T): void {
    localStorage.setItem(this.key, JSON.stringify(state));
  }

  load(): T | null {
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(this.key);
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
