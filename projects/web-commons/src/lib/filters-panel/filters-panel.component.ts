import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Tooltip } from 'primeng/tooltip';
import { Popover } from 'primeng/popover';
import { ChipModule } from 'primeng/chip';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

export interface ActiveFilterItem {
  label: string;
  value: string;
}

export interface ActiveFilterGroup {
  title: string;
  filters: ActiveFilterItem[];
}

@Component({
  standalone: true,
  selector: 'cs-filters-panel',
  styleUrl: './filters-panel.component.scss',
  templateUrl: './filters-panel.component.html',
  imports: [PanelModule, Tooltip, TranslateModule, ButtonModule, Popover, ChipModule],
})
export class FiltersPanelComponent {
  @Input() title = 'Filtrar';
  @Input() activeCount = 0;
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  @Input() activeFilters: ActiveFilterItem[] = [];
  @Input() activeFilterGroups: ActiveFilterGroup[] = [];
  @Input() actionsAlign: 'start' | 'center' | 'end' = 'end';

  @Output() clear = new EventEmitter<void>();
  @Output() search = new EventEmitter<void>();

  private hideTimer: any = null;

  onInfoEnter(op: any, event: MouseEvent) {
    this.cancelHide();
    op.show(event);
  }

  onInfoLeave(op: any) {
    // pequeno delay pra permitir mover o mouse até o popover
    this.hideTimer = setTimeout(() => op.hide(), 150);
  }

  onPopoverEnter() {
    this.cancelHide();
  }

  onPopoverLeave(op: any) {
    op.hide();
  }

  toggle() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  private cancelHide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
