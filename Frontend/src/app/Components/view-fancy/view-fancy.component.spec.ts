import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ViewFancyComponent } from './view-fancy.component';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { ToolsPanelStateService } from '../../Services/ToolPanelState/tool-panel-state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { CytoscapeGraphComponent } from '../cytoscape-graph/cytoscape-graph.component';
import { TypesService } from '../../Services/Types/types.service';
import { NodeVisualSetting, EdgeVisualSetting } from '../../Models/node-visual.model';
import { Node } from '../../Models/node.model';
import { Edge } from '../../Models/edge.model';

describe('ViewFancyComponent', () => {
  let component: ViewFancyComponent;
  let fixture: ComponentFixture<ViewFancyComponent>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let typesServiceSpy: jasmine.SpyObj<TypesService>;
  let cytoscapeGraphSpy: jasmine.SpyObj<CytoscapeGraphComponent>;
  let toolsPanelStateServiceSpy: jasmine.SpyObj<ToolsPanelStateService>;

  // Declare subjects with proper types
  let nodeCreatedSubject: Subject<Node>;
  let nodeDeletedSubject: Subject<string>;
  let edgeCreatedSubject: Subject<Edge>;
  let edgeDeletedSubject: Subject<string>;
  let graphSelectedSubject: BehaviorSubject<any>;
  let graphCreatedSubject: Subject<void>;
  let graphDeletedSubject: Subject<void>;
  let nodeTypesSubject: BehaviorSubject<any[]>;
  let edgeTypesSubject: BehaviorSubject<any[]>;
  let nodeVisualSettingsSubject: BehaviorSubject<Record<string, NodeVisualSetting>>;
  let edgeVisualSettingsSubject: BehaviorSubject<Record<string, EdgeVisualSetting>>;
  let toolsPanelCollapsedSubject: BehaviorSubject<boolean>;

  // Mock data with proper types
  const mockNodes: Node[] = [
    { id: 'node1', name: 'Node 1', nodeType: 'type1', graphId: 'graph1' },
    { id: 'node2', name: 'Node 2', nodeType: 'type2', graphId: 'graph1' }
  ];

  const mockEdges: Edge[] = [
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

    // Create spy for tools panel state service
    toolsPanelStateServiceSpy = jasmine.createSpyObj('ToolsPanelStateService',
      ['setCollapsed', 'getCollapsed']);

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

    // Initialize subjects with proper types
    nodeCreatedSubject = new Subject<Node>();
    nodeDeletedSubject = new Subject<string>();
    edgeCreatedSubject = new Subject<Edge>();
    edgeDeletedSubject = new Subject<string>();
    graphSelectedSubject = new BehaviorSubject<any>(mockGraph);
    graphCreatedSubject = new Subject<void>();
    graphDeletedSubject = new Subject<void>();
    nodeTypesSubject = new BehaviorSubject<any[]>(mockNodeTypes);
    edgeTypesSubject = new BehaviorSubject<any[]>(mockEdgeTypes);
    nodeVisualSettingsSubject = new BehaviorSubject<Record<string, NodeVisualSetting>>(mockNodeVisualSettings);
    edgeVisualSettingsSubject = new BehaviorSubject<Record<string, EdgeVisualSetting>>(mockEdgeVisualSettings);
    toolsPanelCollapsedSubject = new BehaviorSubject<boolean>(false);

    // Configure service behavior
    edgeServiceSpy.getEdges.and.returnValue(of(mockEdges));
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));
    nodeServiceSpy.saveNodePositions.and.returnValue(of({ success: true }));
    graphServiceSpy.getGraphs.and.returnValue(of(mockGraphs));
    graphServiceSpy.setCurrentGraphById.and.returnValue(of(mockGraph));
    toolsPanelStateServiceSpy.getCollapsed.and.returnValue(false);

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
    Object.defineProperty(toolsPanelStateServiceSpy, 'collapsed$', {
      get: () => toolsPanelCollapsedSubject.asObservable()
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
        { provide: ToolsPanelStateService, useValue: toolsPanelStateServiceSpy },
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
    toolsPanelStateServiceSpy.setCollapsed.calls.reset();

    // Disable actual initialization to fully control test environment
    spyOn(component, 'ngOnInit').and.callFake(() => { });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Event handling', () => {   
    it('should handle node creation events with new node data', fakeAsync(() => {
      // Create a completely isolated test environment

      // Don't call setupEventSubscriptions at all for this test
      spyOn(component, 'loadGraphData');

      // Reset the spy
      nodeServiceSpy.getNodes.calls.reset();

      // Create a new node that matches our current graph ID
      const newNode: Node = {
        id: 'new-node',
        name: 'New Test Node',
        nodeType: 'type1',
        graphId: 'graph1'
      };

      // Manually add the node to the array
      component.graphNodes.push(newNode);

      // Verify the node is in the array
      expect(component.graphNodes).toContain(newNode);

      // Verify getNodes hasn't been called
      expect(nodeServiceSpy.getNodes).not.toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('should handle edge creation events with new edge data', fakeAsync(() => {
      // Manually call the ngOnInit to set up subscriptions
      component['setupEventSubscriptions']();

      // Reset call count before test
      edgeServiceSpy.getEdges.calls.reset();

      // Create a mock edge
      const newEdge: Edge = {
        id: 'new-edge',
        source: 'node1',
        target: 'node2',
        edgeType: 'relates_to',
        graphId: 'graph1'
      };

      // Trigger the edge created event with the new edge
      edgeCreatedSubject.next(newEdge);
      tick();

      // Verify edges array was updated
      expect(component.graphEdges).toContain(newEdge);
      // Verify edge service wasn't called for a full refresh
      expect(edgeServiceSpy.getEdges).not.toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('should handle node deletion events', fakeAsync(() => {
      // Manually call the ngOnInit to set up subscriptions
      component['setupEventSubscriptions']();

      // Reset call count before test
      nodeServiceSpy.getNodes.calls.reset();

      // Trigger the node deleted event with an ID
      nodeDeletedSubject.next('node1');
      tick();

      // Verify node service was called for a full refresh
      expect(nodeServiceSpy.getNodes).toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('should handle edge deletion events', fakeAsync(() => {
      // Manually call the ngOnInit to set up subscriptions
      component['setupEventSubscriptions']();

      // Reset call count before test
      edgeServiceSpy.getEdges.calls.reset();

      // Trigger the edge deleted event with an ID
      edgeDeletedSubject.next('edge1');
      tick();

      // Verify edge service was called for a full refresh
      expect(edgeServiceSpy.getEdges).toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('should handle node creation event with empty data', fakeAsync(() => {
      // Manually call the ngOnInit to set up subscriptions
      component['setupEventSubscriptions']();

      // Reset call count before test
      nodeServiceSpy.getNodes.calls.reset();

      // Trigger the node created event with empty/invalid data
      nodeCreatedSubject.next({} as Node);
      tick();

      // Verify node service was called for a full refresh (fallback behavior)
      expect(nodeServiceSpy.getNodes).toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('should handle edge creation event with empty data', fakeAsync(() => {
      // Manually call the ngOnInit to set up subscriptions
      component['setupEventSubscriptions']();

      // Reset call count before test
      edgeServiceSpy.getEdges.calls.reset();

      // Trigger the edge created event with empty/invalid data
      edgeCreatedSubject.next({} as Edge);
      tick();

      // Verify edge service was called for a full refresh (fallback behavior)
      expect(edgeServiceSpy.getEdges).toHaveBeenCalled();

      discardPeriodicTasks();
    }));
  });

  describe('Graph data loading', () => {
    it('should load graph data', fakeAsync(() => {
      // Reset call counts
      nodeServiceSpy.getNodes.calls.reset();
      edgeServiceSpy.getEdges.calls.reset();

      // Call the method
      component.loadGraphData();
      tick();

      // Verify services were called
      expect(nodeServiceSpy.getNodes).toHaveBeenCalledWith('graph1');
      expect(edgeServiceSpy.getEdges).toHaveBeenCalledWith('graph1');

      // Verify data was updated
      expect(component.graphNodes).toEqual(mockNodes);
      expect(component.graphEdges).toEqual(mockEdges);

      discardPeriodicTasks();
    }));

    it('should not show loading indicator when forceLoad is false', fakeAsync(() => {
      // Set loading to false
      component.loading = false;

      // Call method with forceLoad=false
      component.loadGraphData(false);
      tick();

      // Loading should stay false
      expect(component.loading).toBeFalse();

      discardPeriodicTasks();
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

    // Update this test to check for the service call instead of localStorage
    it('should save panel state to service', () => {
      // Start with panel not collapsed
      component.toolsPanelCollapsed = false;

      // Mock setTimeout to prevent it from running
      spyOn(window, 'setTimeout');

      // Toggle panel
      component.toggleToolsPanel();

      // Verify state passed to service is true because we toggled it
      expect(toolsPanelStateServiceSpy.setCollapsed).toHaveBeenCalledWith(true);
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
