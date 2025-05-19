import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ViewFancyComponent } from './view-fancy.component';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CreateNodeComponent } from '../create-node/create-node.component';
import { CreateEdgeComponent } from '../create-edge/create-edge.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('ViewFancyComponent', () => {
  let component: ViewFancyComponent;
  let fixture: ComponentFixture<ViewFancyComponent>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  // Test data
  const mockNodes = [
    { id: 'node1', name: 'Node 1', nodeType: 'Default' },
    { id: 'node2', name: 'Node 2', nodeType: 'Person' }
  ];

  const mockEdges = [
    { id: 'edge1', source: 'node1', target: 'node2', edgeType: 'Related' }
  ];

  // Event subjects for service mocks
  const nodeCreatedSubject = new Subject<void>();
  const nodeDeletedSubject = new Subject<void>();
  const edgeCreatedSubject = new Subject<void>();
  const edgeDeletedSubject = new Subject<void>();
  const darkModeSubject = new Subject<boolean>();

  beforeEach(async () => {
    // Create service spies
    nodeServiceSpy = jasmine.createSpyObj('NodeService', ['getNodes', 'notifyNodeCreated', 'notifyNodeDeleted']);
    edgeServiceSpy = jasmine.createSpyObj('EdgeService', ['getEdges', 'notifyEdgeCreated', 'notifyEdgeDeleted']);
    themeServiceSpy = jasmine.createSpyObj('ThemeService', ['toggleTheme']);

    // Set up observables
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));
    edgeServiceSpy.getEdges.and.returnValue(of(mockEdges));

    // Set up subject observables
    nodeServiceSpy.nodeCreated$ = nodeCreatedSubject.asObservable();
    nodeServiceSpy.nodeDeleted$ = nodeDeletedSubject.asObservable();
    edgeServiceSpy.edgeCreated$ = edgeCreatedSubject.asObservable();
    edgeServiceSpy.edgeDeleted$ = edgeDeletedSubject.asObservable();
    themeServiceSpy.isDarkMode$ = darkModeSubject.asObservable();

    await TestBed.configureTestingModule({
      imports: [
        ViewFancyComponent,
        HttpClientTestingModule,
        NgbNavModule
      ],
      providers: [
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // To ignore create-node and create-edge components in tests
    })
      .compileComponents();

    fixture = TestBed.createComponent(ViewFancyComponent);
    component = fixture.componentInstance;

    // Mock cytoscape to avoid DOM-related errors
    (component as any).cy = {
      destroy: jasmine.createSpy('destroy'),
      on: jasmine.createSpy('on')
    };

    // Provide a mock element for the cyContainer
    (component as any).cyContainer = {
      nativeElement: document.createElement('div')
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load graph data on initialization', () => {
    expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
    expect(edgeServiceSpy.getEdges).toHaveBeenCalled();
  });

  it('should render the graph editor panel', () => {
    const editorPanel = fixture.debugElement.query(By.css('.card-header h2'));
    expect(editorPanel.nativeElement.textContent).toContain('Graph Editor');
  });

  it('should render the graph visualization panel', () => {
    const visualizationPanel = fixture.debugElement.queryAll(By.css('.card-header h2'))[1];
    expect(visualizationPanel.nativeElement.textContent).toContain('Graph Visualization');
  });

  it('should include the cytoscape container', () => {
    const cyContainer = fixture.debugElement.query(By.css('.graph-container'));
    expect(cyContainer).toBeTruthy();
  });

  it('should include create-node and create-edge components', () => {
    const createNodeComponent = fixture.debugElement.query(By.css('app-create-node'));
    const createEdgeComponent = fixture.debugElement.query(By.css('app-create-edge'));
    expect(createNodeComponent).toBeTruthy();
    expect(createEdgeComponent).toBeTruthy();
  });

  it('should have the first tab (Create Node) active by default', () => {
    expect(component.activeTab).toBe(1);
  });

  it('should handle node created event and reload data', fakeAsync(() => {
    // Reset the calls to getNodes
    nodeServiceSpy.getNodes.calls.reset();

    // Simulate node created event
    nodeCreatedSubject.next();
    tick();

    // Check that getNodes was called again
    expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
  }));

  it('should handle node deleted event and reload data', fakeAsync(() => {
    // Reset the calls to getNodes
    nodeServiceSpy.getNodes.calls.reset();

    // Simulate node deleted event
    nodeDeletedSubject.next();
    tick();

    // Check that getNodes was called again
    expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
  }));

  it('should handle edge created event and reload data', fakeAsync(() => {
    // Reset the calls to getNodes
    nodeServiceSpy.getNodes.calls.reset();
    edgeServiceSpy.getEdges.calls.reset();

    // Simulate edge created event
    edgeCreatedSubject.next();
    tick();

    // Check that both services were called again
    expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
    expect(edgeServiceSpy.getEdges).toHaveBeenCalled();
  }));

  it('should handle edge deleted event and reload data', fakeAsync(() => {
    // Reset the calls to getEdges
    edgeServiceSpy.getEdges.calls.reset();

    // Simulate edge deleted event
    edgeDeletedSubject.next();
    tick();

    // Check that getEdges was called again
    expect(edgeServiceSpy.getEdges).toHaveBeenCalled();
  }));

  it('should handle 404 errors when loading nodes', fakeAsync(() => {
    // Mock a 404 response for getNodes
    const notFoundError = new HttpErrorResponse({
      error: 'Not Found',
      status: 404,
      statusText: 'Not Found'
    });
    nodeServiceSpy.getNodes.and.returnValue(throwError(() => notFoundError));

    // Call loadGraphData
    component.loadGraphData();
    tick();

    // Check warning message
    expect(component.warning).toBe('No nodes found');
    expect(component.error).toBeNull();
  }));

  it('should handle other errors when loading nodes', fakeAsync(() => {
    // Mock a server error response for getNodes
    const serverError = new HttpErrorResponse({
      error: 'Server Error',
      status: 500,
      statusText: 'Internal Server Error'
    });
    nodeServiceSpy.getNodes.and.returnValue(throwError(() => serverError));

    // Call loadGraphData
    component.loadGraphData();
    tick();

    // Check error message
    expect(component.error).toBe('Failed to load node data');
    expect(component.warning).toBeNull();
  }));

  it('should handle 404 errors when loading edges', fakeAsync(() => {
    // Mock a 404 response for getEdges
    const notFoundError = new HttpErrorResponse({
      error: 'Not Found',
      status: 404,
      statusText: 'Not Found'
    });
    edgeServiceSpy.getEdges.and.returnValue(throwError(() => notFoundError));

    // Call loadGraphData
    component.loadGraphData();
    tick();

    // Check warning message
    expect(component.warning).toBe('No connections found');
    expect(component.error).toBeNull();
  }));

  it('should handle other errors when loading edges', fakeAsync(() => {
    // Mock a server error response for getEdges
    const serverError = new HttpErrorResponse({
      error: 'Server Error',
      status: 500,
      statusText: 'Internal Server Error'
    });
    edgeServiceSpy.getEdges.and.returnValue(throwError(() => serverError));

    // Call loadGraphData
    component.loadGraphData();
    tick();

    // Check error message
    expect(component.error).toBe('Failed to load connection data');
    expect(component.warning).toBeNull();
  }));

  it('should generate edge label correctly', () => {
    const sourceId = 'source123';
    const targetId = 'target456';

    // Call the private method using type assertion
    const label = (component as any).generateEdgeLabel(sourceId, targetId);

    // Check that the label contains the first 4 characters of the IDs
    expect(label).toBe('sour→targ');
  });

  it('should generate default edge label for missing IDs', () => {
    // Call the private method with undefined IDs
    const label = (component as any).generateEdgeLabel(undefined, undefined);

    // Check that a default label is returned
    expect(label).toBe('Connection');
  });

  it('should safely handle short IDs in edge label generation', () => {
    const shortSourceId = 'a';
    const shortTargetId = 'b';

    // Call the private method with short IDs
    const label = (component as any).generateEdgeLabel(shortSourceId, shortTargetId);

    // Check that the label handles short IDs correctly
    expect(label).toBe('a→b');
  });

  it('should apply dark mode classes when theme is dark', () => {
    // Simulate dark mode
    darkModeSubject.next(true);
    fixture.detectChanges();

    // Check that dark mode classes are applied
    const cards = fixture.debugElement.queryAll(By.css('.card'));
    expect(cards[0].nativeElement.classList).toContain('bg-dark');
    expect(cards[0].nativeElement.classList).toContain('text-white');

    const tabs = fixture.debugElement.query(By.css('.nav-tabs'));
    expect(tabs.nativeElement.classList).toContain('dark-mode-tabs');
  });

  it('should apply light mode classes when theme is light', () => {
    // Simulate light mode
    darkModeSubject.next(false);
    fixture.detectChanges();

    // Check that dark mode classes are not applied
    const cards = fixture.debugElement.queryAll(By.css('.card'));
    expect(cards[0].nativeElement.classList).not.toContain('bg-dark');
    expect(cards[0].nativeElement.classList).not.toContain('text-white');

    const tabs = fixture.debugElement.query(By.css('.nav-tabs'));
    expect(tabs.nativeElement.classList).not.toContain('dark-mode-tabs');
  });

  it('should clean up subscriptions and cytoscape instance on destroy', () => {
    // Spy on the subscription unsubscribe method
    const subscriptionSpy = spyOn((component as any).subscriptions, 'unsubscribe');

    // Trigger ngOnDestroy
    component.ngOnDestroy();

    // Check that clean up was performed
    expect(subscriptionSpy).toHaveBeenCalled();
    expect((component as any).cy.destroy).toHaveBeenCalled();
  });

  // Testing cytoscape initialization would be complex due to DOM interactions
  // These tests would typically be covered by integration or e2e tests
});
