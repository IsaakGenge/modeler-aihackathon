import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { CreateNodeComponent } from './Components/create-node/create-node.component';
import { ViewNodesComponent } from './Components/view-nodes/view-nodes.component';
import { CreateEdgeComponent } from './Components/create-edge/create-edge.component';
import { ViewEdgesComponent } from './Components/view-edges/view-edges.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        HttpClientTestingModule,
        ReactiveFormsModule
      ],
      schemas: [NO_ERRORS_SCHEMA] // Used to ignore child components
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have correct title`, () => {
    expect(component.title).toEqual('Graph Modeler');
  });

  it('should render header', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Graph Modeler');
  });

  it('should contain all child components', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // Check for presence of child component selectors
    expect(compiled.querySelector('app-create-node')).toBeTruthy();
    expect(compiled.querySelector('app-view-nodes')).toBeTruthy();
    expect(compiled.querySelector('app-create-edge')).toBeTruthy();
    expect(compiled.querySelector('app-view-edges')).toBeTruthy();
  });
});
