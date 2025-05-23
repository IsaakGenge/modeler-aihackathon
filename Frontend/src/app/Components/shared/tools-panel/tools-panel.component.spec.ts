import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolsPanelComponent } from './tools-panel.component';

describe('ToolsPanelComponent', () => {
  let component: ToolsPanelComponent;
  let fixture: ComponentFixture<ToolsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
