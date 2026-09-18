import type { MenuItem } from 'primeng/api';

import type { NimbusMenuItem } from './menu.model';

/**
 * Converte NimbusMenuItem (contrato da lib) pro MenuItem do PrimeNG, usado tanto pelo menu
 * horizontal do TopbarComponent (p-menubar) quanto pelo flyout de grupo do SidebarComponent no
 * modo Slim (p-menu popup) - `translateFn` recebe a chave de i18n e devolve o texto já traduzido
 * (cada host resolve isso do seu próprio jeito: TopbarHost tem `i18n.tUi`, SidebarComponent usa
 * `TranslateService.instant` direto).
 */
export function toPrimeMenuItem(
  item: NimbusMenuItem,
  translateFn: (key: string) => string,
): MenuItem {
  return {
    label: translateFn(item.labelKey),
    icon: item.icon,
    routerLink: item.route,
    url: item.externalUrl,
    target: item.externalUrl ? '_blank' : undefined,
    items: item.children?.length
      ? item.children.map((child) => toPrimeMenuItem(child, translateFn))
      : undefined,
  };
}
