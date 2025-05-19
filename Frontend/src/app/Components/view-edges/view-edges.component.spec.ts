import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewEdgesComponent } from './view-edges.component';

describe('ViewEdgesComponent', () => {
  let component: ViewEdgesComponent;
  let fixture: ComponentFixture<ViewEdgesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewEdgesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewEdgesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
