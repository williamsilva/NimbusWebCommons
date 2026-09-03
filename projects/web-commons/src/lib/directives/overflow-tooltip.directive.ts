import {
  Input,
  inject,
  Renderer2,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  AfterViewInit,
} from '@angular/core';

@Directive({
  selector: '[csOverflowTooltip]',
  standalone: true,
})
export class OverflowTooltipDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  @Input('csOverflowTooltip') tooltipText?: string | null;

  @HostBinding('attr.title') hostTitle: string | null = null;

  ngAfterViewInit(): void {
    this.applyBaseStyles();
    queueMicrotask(() => this.updateTitle());
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateTitle();
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.updateTitle();
  }

  private applyBaseStyles(): void {
    const element = this.el.nativeElement;

    this.renderer.setStyle(element, 'display', 'block');
    this.renderer.setStyle(element, 'width', '100%');
    this.renderer.setStyle(element, 'overflow', 'hidden');
    this.renderer.setStyle(element, 'text-overflow', 'ellipsis');
    this.renderer.setStyle(element, 'white-space', 'nowrap');
  }

  private updateTitle(): void {
    const element = this.el.nativeElement;
    const text = (this.tooltipText ?? element.textContent ?? '').trim();
    const isOverflowing = element.scrollWidth > element.clientWidth;

    this.hostTitle = isOverflowing && text ? text : null;
  }
}
