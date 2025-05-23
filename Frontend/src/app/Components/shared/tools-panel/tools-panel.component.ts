import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-tools-panel',
  standalone: true,
  imports: [CommonModule, NgbNavModule],
  templateUrl: './tools-panel.component.html',
  styleUrls: ['./tools-panel.component.css']
})
export class ToolsPanelComponent {
  @Input() collapsed: boolean = false;
  @Input() position: 'right' | 'left' | 'bottom' = 'right';
  @Input() activeTab: number = 1;
  @Input() tabs: { id: number, title: string }[] = [];

  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() activeTabChange = new EventEmitter<number>();

  togglePanel(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);

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
}
