import { InjectionToken, Signal } from '@angular/core';

import type { I18nLike } from '../i18n/i18n-like';
import type { NimbusMenuItem } from './menu.model';

/**
 * Recorte mínimo do "me" (usuário logado) que Sidebar/Topbar precisam - `name`/`username`/`email`
 * porque cada app usa uma combinação diferente como fallback de exibição (ver
 * SidebarComponent/TopbarComponent). O `BffMeResponse` de cada app satisfaz isto estruturalmente.
 */
export interface NimbusIdentity {
  name?: string | null;
  username?: string | null;
  email?: string | null;
}

/**
 * Ponte entre SidebarComponent (nesta lib) e os serviços de cada app (MeStore/PermissionService/
 * AuthService/APP_MENU) - mesmo padrão de interface mínima do `I18nLike`, só que como
 * InjectionToken em vez de "abstract property preenchida via inject() na subclasse" porque
 * SidebarComponent é consumido direto via seletor (`<app-sidebar>`), não estendido por cada app
 * como o StatefulListPage é. Cada app registra isto uma vez (`useFactory`, compondo os serviços
 * que já existiam antes da extração) em `app.config.ts` - ver README.
 */
export interface NimbusSidebarHost {
  readonly me: Signal<NimbusIdentity | null | undefined>;
  readonly menu: NimbusMenuItem[];
  readonly brandMarkUrl: string;
  canAccess(required: string[], requireAll: boolean): boolean;
  logout(): void | Promise<void>;
}

export const NIMBUS_SIDEBAR_HOST = new InjectionToken<NimbusSidebarHost>('NIMBUS_SIDEBAR_HOST');

export type NimbusLang = 'pt-BR' | 'en' | 'es';

/**
 * I18nLike + os 2 membros extras (appliedLang/setLang) que só o seletor de idioma do Topbar
 * precisa - estendido à parte em vez de inflar o I18nLike original (usado também pelo
 * StatefulListPage) pra não arriscar quebrar esse consumidor já existente.
 */
export interface NimbusTopbarI18n extends I18nLike {
  readonly appliedLang: Signal<NimbusLang>;
  setLang(lang: NimbusLang): void | Promise<void>;
}

/**
 * Ponte equivalente à NimbusSidebarHost, pro TopbarComponent. Router/ThemeService NÃO entram
 * aqui - são injetados direto dentro do componente (o primeiro é framework puro, o segundo já é
 * desta própria lib) por não terem nenhuma divergência real entre apps que justifique passar pelo
 * host. `sidebarVisible`/`toggleSidebar` vêm do LayoutStateService de cada app - que continua
 * fora desta lib de propósito (diverge de verdade a lógica de mobile-viewport entre CardSync e
 * NimbusFlow/NimbusNovax - ver README), só a forma (Signal<boolean> + método) é compartilhada
 * aqui.
 */
export interface NimbusTopbarHost {
  readonly me: Signal<NimbusIdentity | null | undefined>;
  readonly brandMarkUrl: string;
  readonly i18n: NimbusTopbarI18n;
  readonly sidebarVisible: Signal<boolean>;
  readonly remainingSeconds: Signal<number | null>;
  isSessionExpired(): boolean;
  toggleSidebar(): void;
  startLogin(): void | Promise<void>;
  logout(): void | Promise<void>;
}

export const NIMBUS_TOPBAR_HOST = new InjectionToken<NimbusTopbarHost>('NIMBUS_TOPBAR_HOST');
