import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewFancyComponent } from './view-fancy.component';

describe('ViewFancyComponent', () => {
  let component: ViewFancyComponent;
  let fixture: ComponentFixture<ViewFancyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewFancyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewFancyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
