import type { NimbusMenuItem } from './menu.model';

/**
 * Extraído de SidebarComponent (era método privado) em 2026-09-18, quando TopbarComponent passou
 * a precisar da mesma lógica pro menu horizontal (modo "horizontal") - evita duplicar a regra em
 * 2 componentes. Item folha (route/externalUrl) exige permissão própria; grupo exige permissão
 * própria E pelo menos 1 filho visível após o filtro recursivo.
 */
export function filterMenuByPermissions(
  items: NimbusMenuItem[],
  canAccess: (required: string[], requireAll: boolean) => boolean,
): NimbusMenuItem[] {
  const out: NimbusMenuItem[] = [];

  for (const item of items) {
    const required = resolvePermissions(item);
    const allowedSelf = canAccess(required, item.requireAll ?? false);

    const filteredChildren = item.children?.length
      ? filterMenuByPermissions(item.children, canAccess)
      : undefined;

    const isLeaf = !!item.route || !!item.externalUrl;
    const childrenVisible = (filteredChildren?.length ?? 0) > 0;

    const visible = isLeaf ? allowedSelf : allowedSelf && childrenVisible;
    if (!visible) continue;

    out.push(filteredChildren ? { ...item, children: filteredChildren } : item);
  }

  return out;
}

function resolvePermissions(item: NimbusMenuItem): string[] {
  if (Array.isArray(item.permissions)) {
    return item.permissions;
  }

  if (item.permissions) {
    return [item.permissions];
  }

  return [];
}
