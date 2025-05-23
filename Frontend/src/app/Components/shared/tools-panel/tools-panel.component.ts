import { Component, Input, Output, EventEmitter, ElementRef, Renderer2, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-tools-panel',
  standalone: true,
  imports: [CommonModule, NgbNavModule],
  templateUrl: './tools-panel.component.html',
  styleUrls: ['./tools-panel.component.css']
})
export class ToolsPanelComponent implements OnInit, OnChanges {
  @Input() collapsed: boolean = false;
  @Input() position: 'right' | 'left' | 'bottom' = 'right';
  @Input() activeTab: number = 1;
  @Input() tabs: { id: number, title: string }[] = [];

  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() activeTabChange = new EventEmitter<number>();

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnInit(): void {
    this.updatePointerEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collapsed']) {
      this.updatePointerEvents();
    }
  }

  togglePanel(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);

    // Update pointer events immediately
    this.updatePointerEvents();

    // Trigger window resize after animation completes to help other components adjust
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  onTabChange(activeTabId: number): void {
    this.activeTab = activeTabId;
    this.activeTabChange.emit(activeTabId);

    // If there's browser storage available, save the state
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('activeTab', activeTabId.toString());
    }
  }

  private updatePointerEvents(): void {
    const hostElement = this.el.nativeElement;

    if (this.collapsed) {
      this.renderer.setStyle(hostElement, 'pointer-events', 'none');

      // Find the toggle button and enable pointer events just for it
      const toggleButton = hostElement.querySelector('.tools-panel-toggle');
      if (toggleButton) {
        this.renderer.setStyle(toggleButton, 'pointer-events', 'auto');
      }
    } else {
      this.renderer.setStyle(hostElement, 'pointer-events', 'auto');
    }
  }
}
