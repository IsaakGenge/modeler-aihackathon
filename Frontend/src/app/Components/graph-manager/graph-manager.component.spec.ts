import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphManagerComponent } from './graph-manager.component';

describe('GraphManagerComponent', () => {
  let component: GraphManagerComponent;
  let fixture: ComponentFixture<GraphManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
