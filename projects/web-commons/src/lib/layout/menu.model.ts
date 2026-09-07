/**
 * Contrato mínimo que SidebarComponent precisa do item de menu de cada app - `labelKey`/`icon`
 * tipados como `string` no lugar do `MenuKey`/tipo enum de cada app de propósito (mesma razão do
 * `I18nLike`: cada app tem sua própria árvore de chaves/permissões, sem overlap estrutural
 * garantido). O `AppMenuItem` concreto de cada app satisfaz isto estruturalmente sem adaptação -
 * `MenuKey extends string`/`Permission extends string` tornam os arrays covariantes aceitos pelo
 * TypeScript.
 */
export interface NimbusMenuItem {
  labelKey: string;
  icon: string;
  activeIcon?: string;
  route?: string;
  children?: NimbusMenuItem[];
  exact?: boolean;
  permissions?: string | string[];
  requireAll?: boolean;
}
