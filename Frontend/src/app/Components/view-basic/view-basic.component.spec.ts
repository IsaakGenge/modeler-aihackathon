import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewBasicComponent } from './view-basic.component';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NodeService } from '../../Services/Node/node.service';
import { EdgeService } from '../../Services/Edge/edge.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { of, Subject } from 'rxjs';

// Mock child components to avoid dependency issues - make them standalone
@Component({
  selector: 'app-create-node',
  template: '<div>Mock Create Node</div>',
  standalone: true
})
class MockCreateNodeComponent { }

@Component({
  selector: 'app-view-nodes',
  template: '<div>Mock View Nodes</div>',
  standalone: true
})
class MockViewNodesComponent { }

@Component({
  selector: 'app-create-edge',
  template: '<div>Mock Create Edge</div>',
  standalone: true
})
class MockCreateEdgeComponent { }

@Component({
  selector: 'app-view-edges',
  template: '<div>Mock View Edges</div>',
  standalone: true
})
class MockViewEdgesComponent { }

describe('ViewBasicComponent', () => {
  let component: ViewBasicComponent;
  let fixture: ComponentFixture<ViewBasicComponent>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  // Event subjects for service mocks
  const nodeCreatedSubject = new Subject<void>();
  const nodeDeletedSubject = new Subject<void>();
  const edgeCreatedSubject = new Subject<void>();
  const edgeDeletedSubject = new Subject<void>();
  const darkModeSubject = new Subject<boolean>();

  beforeEach(async () => {
    // Create spy objects for services
    nodeServiceSpy = jasmine.createSpyObj('NodeService', ['getNodes', 'notifyNodeCreated', 'notifyNodeDeleted']);
    edgeServiceSpy = jasmine.createSpyObj('EdgeService', ['getEdges', 'notifyEdgeCreated', 'notifyEdgeDeleted']);
    themeServiceSpy = jasmine.createSpyObj('ThemeService', ['toggleTheme']);

    // Set up subject observables for the services
    nodeServiceSpy.nodeCreated$ = nodeCreatedSubject.asObservable();
    nodeServiceSpy.nodeDeleted$ = nodeDeletedSubject.asObservable();
    edgeServiceSpy.edgeCreated$ = edgeCreatedSubject.asObservable();
    edgeServiceSpy.edgeDeleted$ = edgeDeletedSubject.asObservable();
    themeServiceSpy.isDarkMode$ = darkModeSubject.asObservable();

    // Set up common method return values
    nodeServiceSpy.getNodes.and.returnValue(of([]));
    edgeServiceSpy.getEdges.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        ViewBasicComponent,
        HttpClientTestingModule,
        // Add mock components as imports since they're standalone
        MockCreateNodeComponent,
        MockViewNodesComponent,
        MockCreateEdgeComponent,
        MockViewEdgesComponent
      ],
      // No declarations needed for standalone components
      providers: [
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements
    })
      .compileComponents();

    fixture = TestBed.createComponent(ViewBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the create-node component', () => {
    const createNodeElement = fixture.debugElement.query(By.css('app-create-node'));
    expect(createNodeElement).toBeTruthy();
  });

  it('should render the create-edge component', () => {
    const createEdgeElement = fixture.debugElement.query(By.css('app-create-edge'));
    expect(createEdgeElement).toBeTruthy();
  });

  it('should render the view-nodes component', () => {
    const viewNodesElement = fixture.debugElement.query(By.css('app-view-nodes'));
    expect(viewNodesElement).toBeTruthy();
  });

  it('should render the view-edges component', () => {
    const viewEdgesElement = fixture.debugElement.query(By.css('app-view-edges'));
    expect(viewEdgesElement).toBeTruthy();
  });

  it('should have a container-fluid layout', () => {
    const containerElement = fixture.debugElement.query(By.css('.container-fluid'));
    expect(containerElement).toBeTruthy();
  });

  it('should organize create components in a row with two columns', () => {
    const rowElement = fixture.debugElement.query(By.css('.row'));
    const columnElements = fixture.debugElement.queryAll(By.css('.col-md-6'));

    expect(rowElement).toBeTruthy();
    expect(columnElements.length).toBe(2);
  });

  it('should place create-node in the first column', () => {
    const firstColumn = fixture.debugElement.queryAll(By.css('.col-md-6'))[0];
    const createNodeInFirstColumn = firstColumn.query(By.css('app-create-node'));

    expect(createNodeInFirstColumn).toBeTruthy();
  });

  it('should place create-edge in the second column', () => {
    const secondColumn = fixture.debugElement.queryAll(By.css('.col-md-6'))[1];
    const createEdgeInSecondColumn = secondColumn.query(By.css('app-create-edge'));

    expect(createEdgeInSecondColumn).toBeTruthy();
  });

  it('should place view components after the create components row', () => {
    // Get the container-fluid element
    const containerElement = fixture.debugElement.query(By.css('.container-fluid'));

    // Get the direct children of the container
    const containerChildren = containerElement.children;

    // The first child should be the row with create components
    expect(containerChildren[0].nativeElement.classList.contains('row')).toBeTruthy();

    // The second child should be the view-nodes component
    expect(containerChildren[1].name).toBe('app-view-nodes');

    // The third child should be the view-edges component
    expect(containerChildren[2].name).toBe('app-view-edges');
  });

  it('should add margin-bottom class to view components', () => {
    const viewNodesElement = fixture.debugElement.query(By.css('app-view-nodes'));
    const viewEdgesElement = fixture.debugElement.query(By.css('app-view-edges'));

    expect(viewNodesElement.nativeElement.classList).toContain('mb-4');
    expect(viewEdgesElement.nativeElement.classList).toContain('mb-4');
  });

  it('should display view components as block elements', () => {
    const viewNodesElement = fixture.debugElement.query(By.css('app-view-nodes'));
    const viewEdgesElement = fixture.debugElement.query(By.css('app-view-edges'));

    expect(viewNodesElement.nativeElement.classList).toContain('d-block');
    expect(viewEdgesElement.nativeElement.classList).toContain('d-block');
  });
});
