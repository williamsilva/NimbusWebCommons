import type { PeriodEnum } from '../enums/period.enum';

/**
 * Contrato mínimo que StatefulListPage/period.enum.ts precisam do I18nService de cada app
 * consumidor - o serviço em si NÃO é extraído pra esta lib (fica ligado ao ui-keys.ts, com
 * dezenas/centenas de chaves específicas de cada app), então essa interface existe só pra
 * desacoplar quem consome i18n aqui de qual app está rodando.
 *
 * `key: string` no lugar do `UiKey` de cada app de propósito - cada app tem sua própria árvore de
 * chaves de tradução, sem overlap estrutural garantido entre elas. O `I18nService` concreto de
 * cada app (com `tUi(key: UiKey, ...)`) satisfaz esta interface estruturalmente sem precisar de
 * nenhum `implements` explícito nem adaptação - TypeScript aceita porque `UiKey extends string` e
 * métodos (ao contrário de propriedades tipadas como função) são checados bivariantemente.
 *
 * Import de PeriodEnum como `type` de propósito (evita import circular de verdade em runtime -
 * period.enum.ts importa este arquivo só como type também).
 */
export interface I18nLike {
  tUi(key: string, params?: Record<string, unknown> | string, fallback?: string): string;
  tPrimeNg(key: string | null | undefined, fallback?: string): string;
  getDateFormatByPeriod(period: PeriodEnum | null | undefined): string;
  getDateLocale(): string;
  getLocale(): string;
  getCurrency(): string;
}
