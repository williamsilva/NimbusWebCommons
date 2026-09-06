# NimbusWebCommons

Workspace Angular 21 (ng-packagr) que produz `@williamsilva/nimbus-web-commons` — biblioteca com o
código de frontend que era idêntico, byte-a-byte (ou trivialmente divergente por app), entre
`CardSyncWeb`, `NimbusFlowWeb` e `NimbusNovaxWeb`. Extraída em 2026-09-03 como Fase 1 (frontend) do
mesmo levantamento de duplicação que gerou o `NimbusCommonsServer` (backend).

## O que está aqui (v0.1.0)

- **`list-base/`** — `StatefulListPage`/`SelectableStatefulListPage` (a espinha dorsal de toda
  tela de listagem), `table-filter-readers`, `base-list-page` (persistência de filtros em
  localStorage), `cs-advanced-period-date-filter.component`.
- **`directives/`** — `OverflowTooltipDirective`, `DateInputMaskDirective`.
- **`theme/`** — `ThemeService`, parametrizado via `NIMBUS_THEME_CONFIG` (token `{ appId: string }`)
  em vez do literal hardcoded de antes (`storageKey`/`eventKey`/`channelName` derivados do appId) -
  cada app consumidor **precisa** prover o mesmo `appId` que já usava antes da extração, senão a
  preferência de tema já salva no navegador de quem já usa o app é perdida.
- **`enums/`** — `PeriodEnum` + `periodEnumLabel`/`normalizePeriodEnum`/`periodEnumSeverity`/
  `allPeriodEnum`/`STATUS_CODE_MAP`. É um **enum de string, nominal** - cada app consumidor precisa
  fazer de `@models/enums/period.enum.ts` um re-export puro desta lib (não uma cópia local com os
  mesmos membros), senão vira um tipo incompatível com o que `StatefulListPage` espera.
- **`ui/`** — só `tag-tone.type`/`tag-severity.type` (`CsTagTone`/`CsTagSeverity`), única dependência
  real de `period.enum.ts` dentro de `shared/ui/*` - não trouxe `cs-tag`/`cs-badge` (que
  `period.enum` não importa direto, só via barrel). Tipos estruturais, não nominais - o app
  consumidor pode manter sua própria cópia local (usada por `cs-tag.component`/`cs-badge.component`,
  que não fazem parte desta extração) sem nenhum conflito.
- **`list-query/`** — `list-query.builder`, `primeng-lazy.mapper`, `list-query.types`.
- **`filters-panel/`** — `FiltersPanelComponent` (+ `ActiveFilterItem`/`ActiveFilterGroup`).
- **`utils/`** — `PersistedFilters`.
- **`layout/footer/`** — `FooterComponent` (idêntico nos 3 apps).
- **`i18n/`** — só a interface `I18nLike` (ver abaixo), não o `I18nService` em si.

### I18nLike — por que I18nService não foi extraído

`StatefulListPage`/`period.enum.ts` dependiam de `I18nService`, que fica em cada app (ligado ao
`ui-keys.ts` próprio, com centenas de chaves específicas de cada app — sem overlap estrutural
garantido). Em vez de extrair o serviço, extraí só a interface mínima com a assinatura exata
realmente usada (achada por leitura de código, não suposição):

```ts
interface I18nLike {
  tUi(key: string, params?: Record<string, unknown> | string, fallback?: string): string;
  tPrimeNg(key: string | null | undefined, fallback?: string): string;
  getDateFormatByPeriod(period: PeriodEnum | null | undefined): string;
  getDateLocale(): string;
  getLocale(): string;
  getCurrency(): string;
}
```

O `I18nService` concreto de cada app satisfaz `I18nLike` **estruturalmente, sem nenhum
`implements`** — TypeScript aceita porque `UiKey extends string` e métodos são checados
bivariantemente (ao contrário de propriedades tipadas como função, que seriam checadas
contravariantemente). Confirmado via `ng build` completo (AOT) nos 3 apps consumidores.

## Fora de escopo (motivo documentado, candidato a uma próxima rodada)

**Layout kit** (`sidebar`/`topbar`/`layout.component`/`bottom-nav`) — decisão explícita do usuário
de não mexer nesta rodada. Achado na investigação: o código de `layout.component`/
`layout-state.service`/`bottom-nav` é idêntico entre `NimbusFlowWeb`/`NimbusNovaxWeb` e ausente no
`CardSyncWeb` — **mas isso é acidente de histórico, não sinal de 2 produtos com a mesma
necessidade**: o NimbusFlow é a única aplicação com "versão de aplicativo" (PWA/mobile) de verdade
como decisão de produto (ver `project_geolocation_pwa_push_mobile_done`); o NimbusNovax herdou esse
código ao ser clonado a partir do NimbusFlow, não por ter esse mesmo requisito de mobile. Ou seja: a
divergência real de produto é **NimbusFlow (1 app) vs CardSync + NimbusNovax (2 apps sem versão de
aplicativo)** — o oposto de "CardSync é o único diferente". Isso muda o cálculo de uma extração
futura: extrair a variante "com bottom-nav" só faria sentido se mais apps ganharem uma versão de
aplicativo de verdade; enquanto só o NimbusFlow tiver esse requisito, generalizar a lib pra
suportá-lo é esforço sem ganho real (só ele usa). Caminho, se/quando isso mudar:
- `footer.component` já saiu (não dependia de nada específico de app nem de mobile).
- `sidebar`/`topbar` são idênticos nos 3 apps, mas consomem `BRAND` (`core/brand/brand.ts`, nomes/
  logos por app) e `APP_MENU` (`core/menu/menu.data.ts`, árvore de menu de negócio, 430-503 linhas
  de diff entre apps) - virariam `@Input()`/`InjectionToken` consumidos pela lib, independente da
  parte de mobile/bottom-nav.
  `topbar.component.html` também tem um pequeno ajuste pendente: `routerLink`/`aria-label`/`alt` do
  link de marca estão hardcoded por app, precisam vir de `BRAND` (`homeRoute` novo campo).
- `layout.component`/`layout-state.service`/`bottom-nav` (a parte "versão de aplicativo") só valem
  a extração no dia em que outro app além do NimbusFlow precisar de fato de PWA/mobile - até lá,
  ficam como estão (NimbusFlow com o próprio código, NimbusNovax carregando uma cópia vestigial que
  não corresponde a nenhum requisito de produto seu, CardSync sem nada disso).

Também fora de escopo (não investigado ainda): módulo de autenticação BFF (`auth.service.ts`,
`auth.guard.ts`, `csrf.*`), `core/auth/*` em geral - suspeita forte (mesmo padrão do `ThemeService`)
de que os únicos diffs reais são literais de cookie/storage-key por app, mas não confirmado.

## Como consumir

`.npmrc` do app consumidor:

```
@williamsilva:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
NODE_AUTH_TOKEN=<PAT com escopo read:packages> npm install @williamsilva/nimbus-web-commons
```

`app.config.ts` do app consumidor precisa prover `NIMBUS_THEME_CONFIG`:

```ts
{ provide: NIMBUS_THEME_CONFIG, useValue: { appId: 'nimbusflow' } }, // o appId que o app já usava
```

E `@models/enums/period.enum.ts` (ou onde quer que o app importe `PeriodEnum` hoje) precisa virar
um re-export puro (não uma cópia):

```ts
export {
  PeriodEnum, STATUS_CODE_MAP, normalizePeriodEnum, periodEnumSeverity, periodEnumLabel, allPeriodEnum,
} from '@williamsilva/nimbus-web-commons';
export type { PeriodInput } from '@williamsilva/nimbus-web-commons';
```

## Publicar uma nova versão

```bash
NODE_AUTH_TOKEN=<PAT com escopo write:packages> npm run publish:lib
```
