import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolsPanelComponent } from './tools-panel.component';
import { By } from '@angular/platform-browser';

describe('ToolsPanelComponent', () => {
  let component: ToolsPanelComponent;
  let fixture: ComponentFixture<ToolsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('togglePanel', () => {
    it('should toggle the collapsed state and emit collapsedChange', () => {
      const collapsedChangeSpy = spyOn(component.collapsedChange, 'emit');

      // Initial state should be false
      component.collapsed = false;
      component.togglePanel();

      expect(component.collapsed).toBeTrue();
      expect(collapsedChangeSpy).toHaveBeenCalledWith(true);

      // Toggle back to false
      component.togglePanel();
      expect(component.collapsed).toBeFalse();
      expect(collapsedChangeSpy).toHaveBeenCalledWith(false);
    });

    it('should update pointer events when toggling', () => {
      const hostElement = fixture.debugElement.nativeElement;
      const setStyleSpy = spyOn(component['renderer'], 'setStyle');

      component.collapsed = false;
      component.togglePanel();

      expect(setStyleSpy).toHaveBeenCalledWith(hostElement, 'pointer-events', 'none');
    });
  });

  describe('onTabChange', () => {
    it('should update activeTab and emit activeTabChange', () => {
      const activeTabChangeSpy = spyOn(component.activeTabChange, 'emit');

      component.onTabChange(2);

      expect(component.activeTab).toBe(2);
      expect(activeTabChangeSpy).toHaveBeenCalledWith(2);
    });

    it('should save activeTab to localStorage if available', () => {
      spyOn(localStorage, 'setItem');

      component.onTabChange(3);

      expect(localStorage.setItem).toHaveBeenCalledWith('activeTab', '3');
    });
  });

  describe('ngOnChanges', () => {
    it('should call updatePointerEvents when collapsed changes', () => {
      const updatePointerEventsSpy = spyOn<any>(component, 'updatePointerEvents');

      component.ngOnChanges({
        collapsed: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(updatePointerEventsSpy).toHaveBeenCalled();
    });
  });

  describe('updatePointerEvents', () => {
    it('should disable pointer events when collapsed', () => {
      const hostElement = fixture.debugElement.nativeElement;
      const setStyleSpy = spyOn(component['renderer'], 'setStyle');

      component.collapsed = true;
      component['updatePointerEvents']();

      expect(setStyleSpy).toHaveBeenCalledWith(hostElement, 'pointer-events', 'none');
    });

    it('should enable pointer events when not collapsed', () => {
      const hostElement = fixture.debugElement.nativeElement;
      const setStyleSpy = spyOn(component['renderer'], 'setStyle');

      component.collapsed = false;
      component['updatePointerEvents']();

      expect(setStyleSpy).toHaveBeenCalledWith(hostElement, 'pointer-events', 'auto');
    });
  });
});

