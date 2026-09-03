import { Injectable, InjectionToken, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

export interface ThemeServiceConfig {
  /**
   * Usado pra derivar storageKey/eventKey/channelName - ex.: 'nimbusflow'. Cada app consumidor
   * deve prover o MESMO id que já usava antes da extração desta lib (era hardcoded como
   * "<appId>.theme"/"<appId>.theme.event"/"<appId>-theme" dentro de cada app), senão a preferência
   * de tema já salva no navegador de quem já usa o app é perdida (volta pro default 'light') - ver
   * NIMBUS_THEME_CONFIG.
   */
  appId: string;
}

export const NIMBUS_THEME_CONFIG = new InjectionToken<ThemeServiceConfig>('NIMBUS_THEME_CONFIG');

type ThemeSyncMessage = {
  type: 'theme-changed';
  mode: ThemeMode;
  origin: string;
  at: number;
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Fallback 'nimbus' só evita quebrar se algum consumidor esquecer de prover o token - todo app
  // real deve prover o próprio appId (ver javadoc de ThemeServiceConfig).
  private readonly config = inject(NIMBUS_THEME_CONFIG, { optional: true }) ?? { appId: 'nimbus' };

  private readonly storageKey = `${this.config.appId}.theme`;
  private readonly eventKey = `${this.config.appId}.theme.event`;
  private readonly channelName = `${this.config.appId}-theme`;

  private readonly tabId = this.createTabId();

  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(this.channelName) : null;

  readonly mode = signal<ThemeMode>('light');

  init(): void {
    const saved = localStorage.getItem(this.storageKey);
    this.applyMode(this.normalizeMode(saved), false);
    this.bindStorageSync();
    this.bindBroadcastChannel();
    this.bindVisibilitySync();
  }

  toggle(): void {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this.applyMode(mode, true);
  }

  private applyMode(mode: ThemeMode, syncAcrossTabs: boolean): void {
    const normalized = this.normalizeMode(mode);

    if (!syncAcrossTabs && normalized === this.mode()) {
      return;
    }

    this.mode.set(normalized);
    this.applyDom(normalized);

    if (syncAcrossTabs) {
      localStorage.setItem(this.storageKey, normalized);
      localStorage.setItem(
        this.eventKey,
        JSON.stringify({
          type: 'theme-changed',
          mode: normalized,
          origin: this.tabId,
          at: Date.now(),
        } satisfies ThemeSyncMessage),
      );

      try {
        this.channel?.postMessage({
          type: 'theme-changed',
          mode: normalized,
          origin: this.tabId,
          at: Date.now(),
        } satisfies ThemeSyncMessage);
      } catch {
        // ignora falha do canal
      }
    }
  }

  // :root.dark (não :host-context) - de propósito, pra afetar toda a árvore de componentes;
  // dentro de um componente com View Encapsulation, use :host-context(.dark) pra reagir a isso
  // (ver Bug :root.dark em componente Angular - achado real, regrediu na migração pra Angular 21).
  private applyDom(mode: ThemeMode): void {
    const root = document.documentElement;

    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
  }

  private bindStorageSync(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === this.storageKey && event.newValue) {
        this.applyMode(this.normalizeMode(event.newValue), false);
        return;
      }

      if (event.key === this.eventKey && event.newValue) {
        try {
          const msg = JSON.parse(event.newValue) as ThemeSyncMessage;
          if (msg.origin === this.tabId) return;
          if (msg.type !== 'theme-changed') return;

          this.applyMode(this.normalizeMode(msg.mode), false);
        } catch {
          // ignora payload inválido
        }
      }
    });
  }

  private bindBroadcastChannel(): void {
    if (!this.channel) return;

    this.channel.onmessage = (event: MessageEvent<ThemeSyncMessage>) => {
      const msg = event.data;
      if (!msg || msg.origin === this.tabId) return;
      if (msg.type !== 'theme-changed') return;

      this.applyMode(this.normalizeMode(msg.mode), false);
    };
  }

  private bindVisibilitySync(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;

      const sharedMode = localStorage.getItem(this.storageKey);
      if (!sharedMode) return;

      const next = this.normalizeMode(sharedMode);
      if (next !== this.mode()) {
        this.applyMode(next, false);
      }
    });
  }

  private normalizeMode(value: string | null | undefined): ThemeMode {
    return value === 'dark' || value === 'light' ? value : 'light';
  }

  private createTabId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
