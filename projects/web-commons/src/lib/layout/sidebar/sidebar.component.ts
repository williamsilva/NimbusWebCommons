import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { NIMBUS_SIDEBAR_HOST, NimbusSidebarHost } from '../layout-host';
import { NimbusMenuItem } from '../menu.model';
import { filterMenuByPermissions } from '../menu-filter.util';

/**
 * Extraído em 2026-09-07 (convergência de layout kit) - byte-idêntico entre CardSync/NimbusFlow/
 * NimbusNovax desde sempre, nunca extraído porque dependia de MeStore/AuthService/
 * PermissionService/APP_MENU de cada app via caminho relativo (`../../core/...`) - o mesmo tipo/
 * forma em cada app, só que inacessível de fora do próprio app. Ver NIMBUS_SIDEBAR_HOST
 * (layout-host.ts) pra como cada app compõe seus próprios serviços nesse contrato mínimo, e o
 * README desta lib pra um exemplo completo de provider.
 */
@Component({
  standalone: true,
  selector: 'app-sidebar',
  styleUrl: './sidebar.component.css',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    TooltipModule,
    TranslateModule,
    RouterLinkActive,
  ],
})
export class SidebarComponent {
  private readonly host = inject(NIMBUS_SIDEBAR_HOST);

  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  // ngx-translate direto (não o I18nService de cada app) - ConfirmationService.confirm() precisa
  // do texto já traduzido, não da chave; TranslateService é peer dependency, sem divergência
  // entre apps (mesma ideia do FooterComponent, que usa o pipe `| translate` direto no template).
  private readonly translate = inject(TranslateService);

  readonly brandMarkUrl = this.host.brandMarkUrl;
  readonly me = this.host.me;

  /**
   * Estado manual de expandir/recolher grupos.
   * Se não houver valor aqui, o grupo abre apenas quando algum filho estiver ativo.
   */
  private readonly groupState: Record<string, boolean> = {};

  readonly menu = computed(() =>
    filterMenuByPermissions(this.host.menu, (required, requireAll) =>
      this.host.canAccess(required, requireAll),
    ),
  );

  readonly mode = computed(() => this.host.layoutMode());

  readonly initials = computed(() => {
    const me = this.me();
    const base = (me?.name || me?.username || 'CS').trim();
    const parts = base.split(/[\s._-]+/).filter(Boolean);
    const a = parts[0]?.[0] ?? 'C';
    const b = parts.length > 1 ? parts[1][0] : base.length > 1 ? base[1] : 'S';
    return (a + b).toUpperCase();
  });

  toggleGroup(item: NimbusMenuItem): void {
    const key = this.itemKey(item);
    this.groupState[key] = !this.isExpanded(item);
  }

  isExpanded(item: NimbusMenuItem): boolean {
    const key = this.itemKey(item);

    if (key in this.groupState) {
      return this.groupState[key];
    }

    return this.hasActiveChild(item);
  }

  hasActiveChild(item: NimbusMenuItem): boolean {
    return item.children?.some((child) => this.isActiveOrChildActive(child)) ?? false;
  }

  isActiveOrChildActive(item: NimbusMenuItem): boolean {
    if (this.isActive(item)) return true;
    return item.children?.some((child) => this.isActiveOrChildActive(child)) ?? false;
  }

  isActive(item: NimbusMenuItem): boolean {
    if (!item.route) return false;

    return this.router.isActive(item.route, {
      paths: item.exact ? 'exact' : 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  activeIcon(item: NimbusMenuItem): string {
    return item.activeIcon ?? 'pi pi-map-marker nav-icon-active-bounce text-blue-500';
  }

  /** Fecha a sidebar ao clicar no backdrop ou navegar, só faz sentido no modo Drawer (nos demais
   *  modos a sidebar não é um overlay, então isso ficaria inerte de qualquer forma). */
  closeIfDrawer(): void {
    if (this.mode() === 'drawer') {
      this.host.toggleSidebar();
    }
  }

  private itemKey(item: NimbusMenuItem): string {
    return item.route ?? item.labelKey;
  }

  logout(): void {
    this.confirm.confirm({
      header: this.translate.instant('confirm.logoutTitle'),
      message: this.translate.instant('confirm.logoutMessage'),
      acceptLabel: this.translate.instant('common.logout'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger cs-confirm-accept',
      rejectButtonStyleClass: 'p-button-text cs-confirm-reject',
      accept: async () => {
        await this.host.logout();
      },
    });
  }

  trackByLabelKey(_: number, item: NimbusMenuItem): string {
    return item.labelKey;
  }
}
