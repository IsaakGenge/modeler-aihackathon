import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateEdgeComponent } from './create-edge.component';

describe('CreateEdgeComponent', () => {
  let component: CreateEdgeComponent;
  let fixture: ComponentFixture<CreateEdgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEdgeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateEdgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
