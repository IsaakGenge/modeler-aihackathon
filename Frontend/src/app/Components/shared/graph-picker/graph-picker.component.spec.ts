import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphPickerComponent } from './graph-picker.component';

describe('GraphPickerComponent', () => {
  let component: GraphPickerComponent;
  let fixture: ComponentFixture<GraphPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
