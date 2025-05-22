import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphGenerateComponent } from './graph-generate.component';

describe('GraphGenerateComponent', () => {
  let component: GraphGenerateComponent;
  let fixture: ComponentFixture<GraphGenerateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphGenerateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphGenerateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
