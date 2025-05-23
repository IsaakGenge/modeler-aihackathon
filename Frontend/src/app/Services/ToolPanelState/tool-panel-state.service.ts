import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToolsPanelStateService {
  private collapsedSubject = new BehaviorSubject<boolean>(true); // Default to collapsed
  collapsed$ = this.collapsedSubject.asObservable();

  setCollapsed(collapsed: boolean): void {
    this.collapsedSubject.next(collapsed);
  }

  getCollapsed(): boolean {
    return this.collapsedSubject.getValue();
  }
}
