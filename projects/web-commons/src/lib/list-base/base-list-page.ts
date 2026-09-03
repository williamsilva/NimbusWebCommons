import { PersistedFilters } from '../utils/persisted-filters';

/**
 * Base reutilizável para páginas de lista (CRUD/list):
 * - Persistência de filtros (localStorage)
 * - Fluxo padrão: load no init; salvar apenas em Buscar/Limpar
 *
 * Você implementa apenas o "contrato" abaixo:
 * - filtersKey(): string
 * - refresh(): void
 * - resetFilters(): void
 * - toFiltersState(): TState
 * - applyFiltersState(state: TState): void
 */
export abstract class BaseListPage<TState extends object> {
  /** liga/desliga persistência (por padrão ligado) */
  protected persistEnabled = true;

  private persisted: PersistedFilters<TState> | null = null;

  /** chave de storage por tela (ex: nimbusflow.users.filters.v1) */
  protected abstract filtersKey(): string;

  /** chama a carga da lista (facade.loadAll / server search etc.) */
  protected abstract refresh(): void;

  /** reseta os filtros (signals) para estado vazio */
  protected abstract resetFilters(): void;

  /** mapeia sinais -> objeto persistível (evite Date, use ISO string) */
  protected abstract toFiltersState(): TState;

  /** aplica objeto persistido -> sinais (convertendo ISO -> Date, etc.) */
  protected abstract applyFiltersState(state: TState): void;

  /** use no ngOnInit do componente */
  protected loadOnInit(): void {
    this.applyPersistedFilters();
    this.refresh();
  }

  /** aplica filtros do storage (não chama refresh) */
  protected applyPersistedFilters(): void {
    if (!this.persistEnabled) return;
    const p = this.getPersisted();
    const state = p.load();
    if (state) this.applyFiltersState(state);
  }

  /** persiste filtros atuais */
  protected persistFilters(): void {
    if (!this.persistEnabled) return;
    this.getPersisted().save(this.toFiltersState());
  }

  /** limpa filtros + persiste o estado "limpo" */
  protected clearAndPersist(): void {
    this.resetFilters();
    this.persistFilters();
  }

  /** remove apenas o storage dessa tela */
  protected clearPersisted(): void {
    if (!this.persistEnabled) return;
    this.getPersisted().clear();
  }

  private getPersisted(): PersistedFilters<TState> {
    if (!this.persisted) this.persisted = new PersistedFilters<TState>(this.filtersKey());
    return this.persisted;
  }
}
