import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewNodesComponent } from './view-nodes.component';

describe('ViewNodesComponent', () => {
  let component: ViewNodesComponent;
  let fixture: ComponentFixture<ViewNodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewNodesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewNodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
