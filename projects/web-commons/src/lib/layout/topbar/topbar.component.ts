import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Component, ChangeDetectionStrategy, Input, computed, inject } from '@angular/core';

import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { ThemeService } from '../../theme/theme.service';
import { NIMBUS_TOPBAR_HOST, NimbusLang } from '../layout-host';

/**
 * Extraído em 2026-09-07 (convergência de layout kit) - byte-idêntico entre CardSync/NimbusFlow/
 * NimbusNovax, mesma razão/mesmo padrão do SidebarComponent (ver NIMBUS_TOPBAR_HOST em
 * layout-host.ts). 2 divergências reais entre apps, resolvidas sem forçar unificação:
 * - texto/rota da marca ("CardSync"/`/dashboard` vs "NimbusFlow"/`/security`) - agora usa a mesma
 *   chave `app.name` que o SidebarComponent já usa (nunca era hardcoded lá) + `@Input() homeRoute`
 *   pra rota.
 * - CSS que esconde o botão de colapsar sidebar no mobile só quando existe bottom-nav (NimbusFlow/
 *   NimbusNovax) - agora é `@Input() bottomNavPresent`, CardSync (sem bottom-nav) simplesmente não
 *   passa esse input (default false).
 */
@Component({
  standalone: true,
  selector: 'app-topbar',
  styleUrl: './topbar.component.css',
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MenuModule, ButtonModule, TooltipModule, TranslateModule],
})
export class TopbarComponent {
  private readonly host = inject(NIMBUS_TOPBAR_HOST);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);

  /** Rota do link da marca no topbar - diverge de verdade por app (ver javadoc da classe). */
  @Input() homeRoute = '/dashboard';
  /** Ver javadoc da classe - default false (CardSync, sem bottom-nav). */
  @Input() bottomNavPresent = false;

  readonly me = this.host.me;
  readonly brandMarkUrl = this.host.brandMarkUrl;
  readonly i18n = this.host.i18n;
  readonly mode = this.theme.mode;
  readonly sidebarVisible = this.host.sidebarVisible;
  readonly remainingSeconds = this.host.remainingSeconds;
  readonly sessionExpired = computed(() => this.host.isSessionExpired());

  readonly lang = this.i18n.appliedLang;

  readonly langMenuItems = computed<MenuItem[]>(() => {
    const current = this.lang();
    return [
      {
        label: 'Português',
        disabled: current === 'pt-BR',
        command: () => this.onLangChange('pt-BR'),
      },
      {
        label: 'English',
        disabled: current === 'en',
        command: () => this.onLangChange('en'),
      },
      {
        label: 'Español',
        disabled: current === 'es',
        command: () => this.onLangChange('es'),
      },
    ];
  });

  readonly currentLangLabel = computed(() => {
    const lang = this.lang();

    switch (lang) {
      case 'pt-BR':
        return 'PT';
      case 'en':
        return 'EN';
      case 'es':
        return 'ES';
      default:
        return 'PT';
    }
  });

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleSidebar(): void {
    this.host.toggleSidebar();
  }

  startLogin(): void {
    void this.host.startLogin();
  }

  onLangChange(v: NimbusLang): void {
    void this.i18n.setLang(v);
  }

  readonly initials = computed(() => {
    const me = this.me();
    const base = (me?.name || me?.username || 'CS').trim();
    const parts = base.split(/[\s._-]+/).filter(Boolean);
    const a = parts[0]?.[0] ?? 'C';
    const b = parts.length > 1 ? parts[1][0] : base.length > 1 ? base[1] : 'S';
    return (a + b).toUpperCase();
  });

  readonly mmss = computed(() => {
    const s = this.remainingSeconds();
    if (s == null) return null;

    const hh = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const mm = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
  });

  readonly sessionState = computed(() => {
    const s = this.remainingSeconds();

    if (s == null) return 'normal';
    if (s <= 120) return 'danger';
    if (s <= 300) return 'warning';

    return 'normal';
  });

  readonly statusLabel = computed(() =>
    this.sessionExpired() ? this.i18n.tUi('topbar.sessionExpired') : this.i18n.tUi('topbar.online'),
  );

  readonly statusTooltip = computed(() =>
    this.sessionExpired()
      ? this.i18n.tUi('topbar.sessionExpiredTooltip')
      : this.i18n.tUi('topbar.sessionExpireTooltip'),
  );

  readonly accountMenuItems = computed<MenuItem[]>(() => {
    this.lang();
    return [
      {
        label: this.i18n.tUi('menu.me'),
        icon: 'pi pi-user',
        command: () => this.router.navigateByUrl('/security/account/profile'),
      },
      {
        label: this.i18n.tUi('menu.security.changePassword'),
        icon: 'pi pi-key',
        command: () => this.router.navigateByUrl('/security/account/password'),
      },
      {
        separator: true,
      },
      {
        label: this.i18n.tUi('common.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.host.logout(),
      },
    ];
  });
}
