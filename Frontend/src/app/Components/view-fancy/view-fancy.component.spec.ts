import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ViewFancyComponent } from './view-fancy.component';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { CytoscapeGraphComponent } from '../cytoscape-graph/cytoscape-graph.component';
import { TypesService } from '../../Services/Types/types.service';
import { NodeVisualSetting, EdgeVisualSetting } from '../../Models/node-visual.model';

describe('ViewFancyComponent', () => {
  let component: ViewFancyComponent;
  let fixture: ComponentFixture<ViewFancyComponent>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let typesServiceSpy: jasmine.SpyObj<TypesService>;
  let cytoscapeGraphSpy: jasmine.SpyObj<CytoscapeGraphComponent>;

  // Create subjects for the observables
  let nodeCreatedSubject: BehaviorSubject<void>;
  let nodeDeletedSubject: BehaviorSubject<void>;
  let edgeCreatedSubject: BehaviorSubject<void>;
  let edgeDeletedSubject: BehaviorSubject<void>;
  let graphSelectedSubject: BehaviorSubject<any>;
  let graphCreatedSubject: Subject<void>;
  let graphDeletedSubject: Subject<void>;
  let nodeTypesSubject: BehaviorSubject<any[]>;
  let edgeTypesSubject: BehaviorSubject<any[]>;
  let nodeVisualSettingsSubject: BehaviorSubject<Record<string, NodeVisualSetting>>;
  let edgeVisualSettingsSubject: BehaviorSubject<Record<string, EdgeVisualSetting>>;

  // Mock data
  const mockNodes = [
    { id: 'node1', name: 'Node 1', nodeType: 'type1', graphId: 'graph1' },
    { id: 'node2', name: 'Node 2', nodeType: 'type2', graphId: 'graph1' }
  ];

  const mockEdges = [
    { id: 'edge1', source: 'node1', target: 'node2', edgeType: 'relates_to', graphId: 'graph1' }
  ];

  const mockGraph = { id: 'graph1', name: 'Test Graph' };

  const mockGraphs = [
    { id: 'graph1', name: 'Test Graph 1' },
    { id: 'graph2', name: 'Test Graph 2' }
  ];

  const mockNodeTypes = [
    { id: 'type1', name: 'Type 1', description: 'First type', category: 'default' },
    { id: 'type2', name: 'Type 2', description: 'Second type', category: 'default' }
  ];

  const mockEdgeTypes = [
    { id: 'relates_to', name: 'Relates To', description: 'General relation', category: 'default', isDirected: true }
  ];

  // Add index signature to visual settings objects
  const mockNodeVisualSettings: Record<string, NodeVisualSetting> = {
    'type1': { shape: 'ellipse', color: '#FF0000' },
    'type2': { shape: 'rectangle', color: '#00FF00' }
  };

  const mockEdgeVisualSettings: Record<string, EdgeVisualSetting> = {
    'relates_to': {
      lineColor: '#0000FF',
      lineStyle: 'solid',
      width: '2',
      targetArrowShape: 'triangle',
      curveStyle: 'bezier',
      lineOpacity: '1'
    }
  };

  // Mock localStorage
  let localStorageMock: { [key: string]: string } = {};

  beforeEach(async () => {
    // Mock localStorage
    localStorageMock = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageMock[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    // Create a variable to control the currentGraphId mock
    let currentMockGraphId: string | null = 'graph1';

    // Create spies for services
    edgeServiceSpy = jasmine.createSpyObj('EdgeService', ['getEdges']);
    nodeServiceSpy = jasmine.createSpyObj('NodeService', ['getNodes', 'saveNodePositions']);
    graphServiceSpy = jasmine.createSpyObj('GraphService',
      ['getGraphs', 'setCurrentGraph', 'setCurrentGraphById']);

    // Handle currentGraphId as a dynamic property
    Object.defineProperty(graphServiceSpy, 'currentGraphId', {
      get: () => currentMockGraphId
    });

    // Create a method to safely update the currentGraphId value
    (graphServiceSpy as any).setMockCurrentGraphId = (id: string | null) => {
      currentMockGraphId = id;
    };

    themeServiceSpy = jasmine.createSpyObj('ThemeService', [], {
      isDarkMode$: new BehaviorSubject<boolean>(false)
    });
    typesServiceSpy = jasmine.createSpyObj('TypesService',
      ['loadNodeTypes', 'loadEdgeTypes', 'getNodeVisualSetting', 'getEdgeVisualSetting']);
    cytoscapeGraphSpy = jasmine.createSpyObj('CytoscapeGraphComponent',
      ['updateGraph', 'fitGraph']);

    // Initialize subjects
    nodeCreatedSubject = new BehaviorSubject<void>(undefined);
    nodeDeletedSubject = new BehaviorSubject<void>(undefined);
    edgeCreatedSubject = new BehaviorSubject<void>(undefined);
    edgeDeletedSubject = new BehaviorSubject<void>(undefined);
    graphSelectedSubject = new BehaviorSubject<any>(mockGraph);
    graphCreatedSubject = new Subject<void>();
    graphDeletedSubject = new Subject<void>();
    nodeTypesSubject = new BehaviorSubject<any[]>(mockNodeTypes);
    edgeTypesSubject = new BehaviorSubject<any[]>(mockEdgeTypes);
    nodeVisualSettingsSubject = new BehaviorSubject<Record<string, NodeVisualSetting>>(mockNodeVisualSettings);
    edgeVisualSettingsSubject = new BehaviorSubject<Record<string, EdgeVisualSetting>>(mockEdgeVisualSettings);

    // Configure service behavior
    edgeServiceSpy.getEdges.and.returnValue(of(mockEdges));
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));
    nodeServiceSpy.saveNodePositions.and.returnValue(of({ success: true }));
    graphServiceSpy.getGraphs.and.returnValue(of(mockGraphs));
    graphServiceSpy.setCurrentGraphById.and.returnValue(of(mockGraph));

    // Fix the TypeScript error by using Record<string, NodeVisualSetting> for type checking
    typesServiceSpy.getNodeVisualSetting.and.callFake((type: string) => {
      return mockNodeVisualSettings[type] || ({ shape: 'ellipse', color: '#CCC' } as NodeVisualSetting);
    });

    typesServiceSpy.getEdgeVisualSetting.and.callFake((type: string) => {
      return mockEdgeVisualSettings[type] || ({
        lineColor: '#999',
        lineStyle: 'solid',
        width: '1',
        targetArrowShape: 'none'
      } as EdgeVisualSetting);
    });

    // Set up service properties with observables
    Object.defineProperty(nodeServiceSpy, 'nodeCreated$', {
      get: () => nodeCreatedSubject.asObservable()
    });
    Object.defineProperty(nodeServiceSpy, 'nodeDeleted$', {
      get: () => nodeDeletedSubject.asObservable()
    });
    Object.defineProperty(edgeServiceSpy, 'edgeCreated$', {
      get: () => edgeCreatedSubject.asObservable()
    });
    Object.defineProperty(edgeServiceSpy, 'edgeDeleted$', {
      get: () => edgeDeletedSubject.asObservable()
    });
    Object.defineProperty(graphServiceSpy, 'currentGraph$', {
      get: () => graphSelectedSubject.asObservable()
    });
    Object.defineProperty(graphServiceSpy, 'graphCreated$', {
      get: () => graphCreatedSubject.asObservable()
    });
    Object.defineProperty(graphServiceSpy, 'graphDeleted$', {
      get: () => graphDeletedSubject.asObservable()
    });
    Object.defineProperty(typesServiceSpy, 'nodeTypes$', {
      get: () => nodeTypesSubject.asObservable()
    });
    Object.defineProperty(typesServiceSpy, 'edgeTypes$', {
      get: () => edgeTypesSubject.asObservable()
    });
    Object.defineProperty(typesServiceSpy, 'nodeVisualSettings$', {
      get: () => nodeVisualSettingsSubject.asObservable()
    });
    Object.defineProperty(typesServiceSpy, 'edgeVisualSettings$', {
      get: () => edgeVisualSettingsSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [
        ViewFancyComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: GraphService, useValue: graphServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: TypesService, useValue: typesServiceSpy },
        { provide: PLATFORM_ID, useValue: 'browser' } // Simulate browser environment
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    // Create the component and trigger initial data binding
    fixture = TestBed.createComponent(ViewFancyComponent);
    component = fixture.componentInstance;

    // Set the private property using TypeScript type casting
    (component as any).cytoscapeGraph = cytoscapeGraphSpy;

    // Reset spies before each test to track only calls made during the test
    edgeServiceSpy.getEdges.calls.reset();
    nodeServiceSpy.getNodes.calls.reset();

    // Disable actual initialization to fully control test environment
    spyOn(component, 'ngOnInit').and.callFake(() => { });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component initialization', () => {
    it('should load graph data when a graph is selected', fakeAsync(() => {
      // First, we need to restore the original implementation of ngOnInit
      (component.ngOnInit as jasmine.Spy).and.callThrough();

      // Set the mock graph ID to 'graph2'
      (graphServiceSpy as any).setMockCurrentGraphId('graph2');

      // Trigger ngOnInit to set up subscriptions
      component.ngOnInit();

      // Reset calls to track new ones
      edgeServiceSpy.getEdges.calls.reset();
      nodeServiceSpy.getNodes.calls.reset();

      // Simulate graph selected event with a new graph
      graphSelectedSubject.next({ id: 'graph2', name: 'Another Graph' });

      // Tick for the setTimeout in the component
      tick(10);

      // Now the calls should be with graph2 since we changed currentGraphId
      expect(edgeServiceSpy.getEdges).toHaveBeenCalledWith('graph2');
      expect(nodeServiceSpy.getNodes).toHaveBeenCalledWith('graph2');

      discardPeriodicTasks(); // Clean up any remaining timers
    }));

    it('should clear data when no graph is selected', fakeAsync(() => {
      // Start with data
      component.graphNodes = [...mockNodes];
      component.graphEdges = [...mockEdges];

      // Restore the original implementation
      (component.ngOnInit as jasmine.Spy).and.callThrough();

      // Trigger ngOnInit to set up subscriptions
      component.ngOnInit();

      // Simulate no graph selected
      graphSelectedSubject.next(null);

      // No need for tick() here as there's no setTimeout

      expect(component.graphNodes).toEqual([]);
      expect(component.graphEdges).toEqual([]);
      expect(component.warning).toContain('Please select a graph');

      discardPeriodicTasks(); // Clean up any remaining timers
    }));

    it('should set up event subscriptions correctly', fakeAsync(() => {
      // Call the real implementation manually to avoid ngOnInit complexities
      component['setupEventSubscriptions']();

      // Reset the service spy calls
      edgeServiceSpy.getEdges.calls.reset();

      // Spy on loadGraphData to ensure it's called
      spyOn(component, 'loadGraphData');

      // Trigger one of the subscribed events
      edgeCreatedSubject.next();

      // The loadGraphData method should be called
      expect(component.loadGraphData).toHaveBeenCalled();

      // Clean up any timers
      discardPeriodicTasks();
    }));
  });

  describe('Data loading', () => {
    it('should load graph data successfully', fakeAsync(() => {
      component.loadGraphData();
      tick();

      expect(component.graphNodes).toEqual(mockNodes);
      expect(component.graphEdges).toEqual(mockEdges);
      expect(component.loading).toBeFalse();
      expect(component.error).toBeNull();
      expect(component.warning).toBeNull();
    }));

    it('should handle 404 errors from node service gracefully', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Not Found',
        status: 404,
        statusText: 'Not Found'
      });

      nodeServiceSpy.getNodes.and.returnValue(throwError(() => errorResponse));

      component.loadGraphData();
      tick();

      expect(component.warning).toContain('No nodes found');
      expect(component.loading).toBeFalse();
    }));

    it('should handle 404 errors from edge service gracefully', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Not Found',
        status: 404,
        statusText: 'Not Found'
      });

      edgeServiceSpy.getEdges.and.returnValue(throwError(() => errorResponse));

      component.loadGraphData();
      tick();

      expect(component.warning).toContain('No connections found');
      expect(component.loading).toBeFalse();
    }));

    it('should handle other errors from services', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Internal Server Error'
      });

      edgeServiceSpy.getEdges.and.returnValue(throwError(() => errorResponse));

      component.loadGraphData();
      tick();

      expect(component.error).toContain('Failed to load');
      expect(component.loading).toBeFalse();
    }));

    it('should not attempt to load data if no graph is selected', () => {
      // Set the mock graph ID to null
      (graphServiceSpy as any).setMockCurrentGraphId(null);

      // Reset spy counters
      edgeServiceSpy.getEdges.calls.reset();
      nodeServiceSpy.getNodes.calls.reset();

      component.loadGraphData();

      expect(edgeServiceSpy.getEdges).not.toHaveBeenCalled();
      expect(nodeServiceSpy.getNodes).not.toHaveBeenCalled();
      expect(component.warning).toContain('Please select a graph');
    });

    it('should show warning when graph is empty', fakeAsync(() => {
      nodeServiceSpy.getNodes.and.returnValue(of([]));
      edgeServiceSpy.getEdges.and.returnValue(of([]));

      component.loadGraphData();
      tick();

      expect(component.warning).toContain('No data to display');
    }));
  });

  describe('UI interactions', () => {
    it('should toggle tools panel', fakeAsync(() => {
      // Define a more thorough replacement for the toggleToolsPanel method
      // that ensures proper context is maintained
      const originalToggleToolsPanel = component.toggleToolsPanel;

      // Create spies for the important functions
      const dispatchEventSpy = spyOn(window, 'dispatchEvent');

      // Start with panel not collapsed
      component.toolsPanelCollapsed = false;

      // Call the actual method
      component.toggleToolsPanel();

      // Verify the immediate state change
      expect(component.toolsPanelCollapsed).toBeTrue();

      // Tick to trigger the setTimeout
      tick(300);

      // Verify the window.dispatchEvent was called
      expect(dispatchEventSpy).toHaveBeenCalled();      

      // Clean up any remaining tasks
      discardPeriodicTasks();
    }));


    it('should save panel state to localStorage', () => {
      // Start with panel not collapsed
      component.toolsPanelCollapsed = false;

      // Mock setTimeout to prevent it from running
      spyOn(window, 'setTimeout');

      // Toggle panel
      component.toggleToolsPanel();

      // Verify state set to true because we toggled it
      expect(localStorage.setItem).toHaveBeenCalledWith('toolsPanelCollapsed', 'true');
    });

    it('should handle node positions saved event', () => {
      // Spy on console.log
      spyOn(console, 'log');

      const mockPositions = { node1: { x: 100, y: 200 } };
      component.onPositionsSaved(mockPositions);

      expect(console.log).toHaveBeenCalledWith('Node positions saved:', mockPositions);
    });
  });

  describe('Event callbacks', () => {
    it('should handle node click events', () => {
      // Spy on console.log
      spyOn(console, 'log');

      const mockNode = { id: 'node1', name: 'Test Node' };
      component.onNodeClicked(mockNode);

      expect(console.log).toHaveBeenCalledWith('Node clicked in parent component:', mockNode);
    });

    it('should handle edge click events', () => {
      // Spy on console.log
      spyOn(console, 'log');

      const mockEdge = { id: 'edge1', source: 'node1', target: 'node2' };
      component.onEdgeClicked(mockEdge);

      expect(console.log).toHaveBeenCalledWith('Edge clicked in parent component:', mockEdge);
    });

    it('should handle layout change events', () => {
      // Spy on console.log
      spyOn(console, 'log');

      component.onLayoutChanged('circle');

      expect(console.log).toHaveBeenCalledWith('Layout changed to:', 'circle');
    });

    it('should clear warning state', () => {
      component.warning = 'Some warning message';
      component.clearWarningState();
      expect(component.warning).toBeNull();
    });
  });

  describe('Lifecycle hooks', () => {
    it('should clean up subscriptions on destroy', () => {
      // Add a spy on the Subject's next and complete methods
      const destroy$ = (component as any).destroy$;
      spyOn(destroy$, 'next');
      spyOn(destroy$, 'complete');

      // Also spy on the Subscription's unsubscribe method
      spyOn(component['subscriptions'], 'unsubscribe');

      // Call ngOnDestroy
      component.ngOnDestroy();

      // Verify that cleanup methods were called
      expect(destroy$.next).toHaveBeenCalled();
      expect(destroy$.complete).toHaveBeenCalled();
      expect(component['subscriptions'].unsubscribe).toHaveBeenCalled();
    });
  });
});
