import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CytoscapeGraphComponent } from './cytoscape-graph.component';
import { PLATFORM_ID, NO_ERRORS_SCHEMA } from '@angular/core';
import { NodeService } from '../../Services/Node/node.service';
import { EdgeService } from '../../Services/Edge/edge.service';
import { TypesService } from '../../Services/Types/types.service';
import { CytoscapeLayoutService } from './services/cytoscape-layout.service';
import { CytoscapeStylesService } from './services/cytoscape-styles.service';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NodeVisualSetting, EdgeVisualSetting } from '../../Models/node-visual.model';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { GraphNodeData, GraphEdgeData, NodePositionsMap } from './models/graph-models';
import { Node } from '../../Models/node.model';
import { Edge } from '../../Models/edge.model';

describe('CytoscapeGraphComponent', () => {
  let component: CytoscapeGraphComponent;
  let fixture: ComponentFixture<CytoscapeGraphComponent>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let typesServiceSpy: jasmine.SpyObj<TypesService>;
  let layoutServiceSpy: jasmine.SpyObj<CytoscapeLayoutService>;
  let stylesServiceSpy: jasmine.SpyObj<CytoscapeStylesService>;

  // Mock data with required graphId property
  const mockNodes: Node[] = [
    {
      id: '1',
      name: 'Node 1',
      nodeType: 'type1',
      positionX: 100,
      positionY: 200,
      graphId: 'graph1'
    },
    {
      id: '2',
      name: 'Node 2',
      nodeType: 'type2',
      positionX: 300,
      positionY: 400,
      graphId: 'graph1'
    }
  ];

  const mockEdges: Edge[] = [
    {
      id: '1',
      source: '1',
      target: '2',
      edgeType: 'relates_to',
      graphId: 'graph1'
    }
  ];

  const mockNodePositions: NodePositionsMap = {
    '1': { x: 100, y: 200 },
    '2': { x: 300, y: 400 }
  };

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

  const mockLayoutOptions = {
    name: 'cose',
    fit: true,
    directed: false,
    padding: 50,
    spacingFactor: 1.5,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
    animate: true,
    animationDuration: 500,
    nodeRepulsion: 5000,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 1.2,
    gravity: 80,
    numIter: 1000,
    coolingFactor: 0.99,
    minTemp: 1.0
  };

  // Mock cytoscape layout
  const mockLayoutRun = jasmine.createSpy('run');
  const mockLayoutOne = jasmine.createSpy('one');

  // Define interfaces for Cytoscape mocks
  interface MockCytoscapeNode {
    id(): string;
    position(): { x: number, y: number };
    data(key?: string): any;
    style: jasmine.Spy;
    remove: jasmine.Spy;
    selected: jasmine.Spy;
  }

  interface MockCytoscapeCollection {
    forEach(callback: (item: any) => void): void;
    boundingBox(): { x1: number, y1: number, w: number, h: number };
    length: number;
  }

  interface MockCytoscapeEdge {
    id(): string;
    data(key?: string): any;
    removeData(key: string): void;
    style: jasmine.Spy;
    remove: jasmine.Spy;
  }

  // Create mock node factory
  const createMockNode = (id: string, nodeType: string): MockCytoscapeNode => {
    const mockNode = {
      id: () => id,
      position: () => ({ x: 100, y: 200 }),
      data: (key?: string) => key === 'nodeType' ? nodeType : null,
      style: jasmine.createSpy('style').and.callFake(() => mockNode), // Return itself for chaining
      remove: jasmine.createSpy('remove'),
      selected: jasmine.createSpy('selected').and.returnValue(false)
    };
    return mockNode;
  };

  // Create mock edge factory
  const createMockEdge = (id: string, edgeType: string): MockCytoscapeEdge => {
    const mockEdge = {
      id: () => id,
      data: (key?: string) => key === 'edgeType' ? edgeType : null,
      removeData: jasmine.createSpy('removeData'),
      style: jasmine.createSpy('style'),
      remove: jasmine.createSpy('remove')
    };
    return mockEdge;
  };

  beforeEach(async () => {
    // Create service spies
    nodeServiceSpy = jasmine.createSpyObj('NodeService', ['getNodes', 'getNodePositions', 'saveNodePositions']);
    edgeServiceSpy = jasmine.createSpyObj('EdgeService', ['getEdges']);
    typesServiceSpy = jasmine.createSpyObj('TypesService', [
      'loadNodeTypes',
      'loadEdgeTypes',
      'getNodeVisualSetting',
      'getEdgeVisualSetting',
      'getAllNodeVisualSettings',
      'getAllEdgeVisualSettings'
    ]);
    layoutServiceSpy = jasmine.createSpyObj('CytoscapeLayoutService', ['getLayoutIcon', 'getLayoutOptions', 'getOptimalZoom']);
    stylesServiceSpy = jasmine.createSpyObj('CytoscapeStylesService', ['getGraphStyles', 'getNodeTypeStyle']);

    // Configure service behaviors
    nodeServiceSpy.getNodePositions.and.returnValue(of({ positions: mockNodePositions }));
    nodeServiceSpy.saveNodePositions.and.returnValue(of({ success: true }));
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));

    edgeServiceSpy.getEdges.and.returnValue(of(mockEdges));

    // Set up observables
    Object.defineProperty(nodeServiceSpy, 'nodeCreated$', {
      get: () => new BehaviorSubject<void>(undefined)
    });
    Object.defineProperty(edgeServiceSpy, 'edgeCreated$', {
      get: () => new BehaviorSubject<void>(undefined)
    });

    typesServiceSpy.getAllNodeVisualSettings.and.returnValue(mockNodeVisualSettings);
    typesServiceSpy.getAllEdgeVisualSettings.and.returnValue(mockEdgeVisualSettings);

    // Create observables for component subscription
    Object.defineProperty(typesServiceSpy, 'nodeVisualSettings$', {
      get: () => new BehaviorSubject<Record<string, NodeVisualSetting>>(mockNodeVisualSettings)
    });
    Object.defineProperty(typesServiceSpy, 'edgeVisualSettings$', {
      get: () => new BehaviorSubject<Record<string, EdgeVisualSetting>>(mockEdgeVisualSettings)
    });
    Object.defineProperty(typesServiceSpy, 'nodeTypes$', {
      get: () => new BehaviorSubject<any[]>([
        { id: 'type1', name: 'type1', description: 'Type 1', category: 'default', styleProperties: {} },
        { id: 'type2', name: 'type2', description: 'Type 2', category: 'default', styleProperties: {} }
      ])
    });
    Object.defineProperty(typesServiceSpy, 'edgeTypes$', {
      get: () => new BehaviorSubject<any[]>([
        { id: 'relates_to', name: 'relates_to', description: 'Relates To', category: 'default', isDirected: true, styleProperties: {} }
      ])
    });

    // Configure layout service
    layoutServiceSpy.getLayoutIcon.and.returnValue('bi-diagram-3');
    layoutServiceSpy.getLayoutOptions.and.returnValue(mockLayoutOptions);
    layoutServiceSpy.getOptimalZoom.and.returnValue(1.5);

    // Configure styles service
    stylesServiceSpy.getGraphStyles.and.returnValue([]);
    stylesServiceSpy.getNodeTypeStyle.and.returnValue({
      'background-color': '#FF0000',
      'text-outline-color': '#FF0000',
      'shape': 'ellipse'
    });

    // Configure testing module
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CytoscapeGraphComponent
      ],
      providers: [
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: TypesService, useValue: typesServiceSpy },
        { provide: CytoscapeLayoutService, useValue: layoutServiceSpy },
        { provide: CytoscapeStylesService, useValue: stylesServiceSpy },
        { provide: PLATFORM_ID, useValue: 'browser' } // Simulate browser environment
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore errors from child components
    }).compileComponents();

    // Create component fixture
    fixture = TestBed.createComponent(CytoscapeGraphComponent);
    component = fixture.componentInstance;

    // Initialize component properties
    component.nodes = mockNodes.map(node => ({
      id: node.id!,
      name: node.name,
      nodeType: node.nodeType,
      positionX: node.positionX,
      positionY: node.positionY
    }));

    component.edges = mockEdges.map(edge => ({
      id: edge.id!,
      source: edge.source,
      target: edge.target,
      edgeType: edge.edgeType
    }));

    component.graphId = 'graph1';
    component.isDarkMode$ = new BehaviorSubject<boolean>(false);

    // Set up event emitter spies
    spyOn(component.layoutChanged, 'emit');
    spyOn(component.positionsSaved, 'emit');
    spyOn(component.nodeClicked, 'emit');
    spyOn(component.edgeClicked, 'emit');

    // Create mock Cytoscape elements
    const mockCytoscapeNodes: MockCytoscapeNode[] = [
      createMockNode('1', 'type1'),
      createMockNode('2', 'type2')
    ];

    const mockCytoscapeEdges: MockCytoscapeEdge[] = [
      createMockEdge('1', 'relates_to')
    ];

    // Mock collection for nodes
    const mockNodesCollection: MockCytoscapeCollection = {
      forEach: (callback) => mockCytoscapeNodes.forEach(callback),
      boundingBox: () => ({ x1: 0, y1: 0, w: 200, h: 200 }),
      length: mockCytoscapeNodes.length
    };

    // Create comprehensive Cytoscape mock
    const cySpyObj = jasmine.createSpyObj('cy', [
      'fit', 'zoom', 'center', 'layout', 'style', 'nodes', 'edges',
      'getElementById', 'on', 'destroy', '$', 'container', 'elements',
      'pan', 'width', 'height', 'add', 'batch'
    ]);

    // Configure mock methods
    cySpyObj.layout.and.returnValue({
      run: mockLayoutRun,
      one: mockLayoutOne
    });

    cySpyObj.nodes.and.returnValue(mockNodesCollection);
    cySpyObj.edges.and.returnValue(mockCytoscapeEdges);
    cySpyObj.elements.and.returnValue({ length: mockCytoscapeNodes.length + mockCytoscapeEdges.length });
    cySpyObj.pan.and.returnValue({ x: 0, y: 0 });
    cySpyObj.width.and.returnValue(1000);
    cySpyObj.height.and.returnValue(800);
    cySpyObj.center.and.returnValue({ x: 0, y: 0 });

    // Configure container mock
    cySpyObj.container.and.returnValue({
      clientWidth: 1000,
      clientHeight: 800
    });

    // Configure getElementById to return existing nodes or create a new mock
    cySpyObj.getElementById.and.callFake((id: string) => {
      const existingNode = mockCytoscapeNodes.find(node => node.id() === id);
      if (existingNode) return existingNode;

      // For unknown IDs, create a new mock node
      const newMockNode = {
        id: () => id,
        position: () => ({ x: 0, y: 0 }),
        data: (key?: string) => null,
        style: jasmine.createSpy('style').and.returnValue({}),
        selected: jasmine.createSpy('selected').and.returnValue(false),
        remove: jasmine.createSpy('remove')
      };
      return newMockNode;
    });

    // Configure $ method
    cySpyObj.$.and.returnValue({ unselect: jasmine.createSpy('unselect') });

    // Configure style method
    const styleSpyObj = jasmine.createSpyObj('style', ['clear']);
    cySpyObj.style.and.returnValue(styleSpyObj);

    // Configure add method to create and return appropriate mock elements
    cySpyObj.add.and.callFake((element: any) => {
      if (element && element.group === 'nodes') {
        // Create a mock node with all required methods
        const mockNode = {
          id: () => element.data.id,
          position: () => element.position || { x: 0, y: 0 },
          data: (key?: string) => {
            if (key === undefined) return element.data;
            return element.data ? element.data[key] : null;
          },
          style: jasmine.createSpy('style').and.returnValue({}),
          selected: jasmine.createSpy('selected').and.returnValue(false),
          remove: jasmine.createSpy('remove')
        };
        return mockNode;
      } else if (element && element.group === 'edges') {
        // Create a mock edge with all required methods
        const mockEdge = {
          id: () => element.data.id,
          data: (key?: string) => {
            if (key === undefined) return element.data;
            return element.data ? element.data[key] : null;
          },
          removeData: jasmine.createSpy('removeData'),
          style: jasmine.createSpy('style'),
          remove: jasmine.createSpy('remove')
        };
        return mockEdge;
      }
      return {}; // Default empty return
    });

    // Assign Cytoscape mock to the component
    (component as any).cy = cySpyObj;

    // Disable problematic methods during testing
    spyOn<any>(component, 'initializeCytoscape').and.returnValue(Promise.resolve());
    spyOn<any>(component, 'updateCytoscapeStyles').and.stub();
    spyOn<any>(component, 'smartFitGraph').and.callThrough();
    spyOn<any>(component, 'subscribeToVisualSettings').and.stub();
    spyOn<any>(component, 'subscribeToNodeUpdates').and.stub();
    spyOn<any>(component, 'subscribeToEdgeUpdates').and.stub();

    // Set the layout service
    (component as any).layoutService = layoutServiceSpy;

    // Trigger change detection
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Lifecycle hooks', () => {
    it('should initialize component and subscribe to services on init', () => {
      component.ngOnInit();
      expect(typesServiceSpy.loadNodeTypes).toHaveBeenCalled();
    });

    it('should clean up on destroy', () => {
      component.ngOnDestroy();
      expect((component as any).cy.destroy).toHaveBeenCalled();
    });
  });

  describe('Layout functionality', () => {
    it('should get icon for a layout type', () => {
      const icon = component.getLayoutIcon('breadthfirst');
      expect(layoutServiceSpy.getLayoutIcon).toHaveBeenCalledWith('breadthfirst');
      expect(icon).toBe('bi-diagram-3');
    });

    it('should change layout type', () => {
      component.changeLayoutType('grid');
      expect(layoutServiceSpy.getLayoutOptions).toHaveBeenCalledWith('grid', 2, 1000, 800);
      expect((component as any).cy.layout).toHaveBeenCalled();
      expect(component.layoutChanged.emit).toHaveBeenCalledWith('grid');
    });

    it('should apply layout with options', () => {
      const layoutOptions = {
        name: 'circle',
        fit: true,
        directed: false,
        padding: 50,
        spacingFactor: 1.5,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        animate: false,
        animationDuration: 500
      };
      component.applyLayout(layoutOptions);
      expect((component as any).cy.layout).toHaveBeenCalledWith(jasmine.objectContaining({
        name: 'circle',
        fit: true,
        animate: true
      }));
    });
  });

  describe('Node and edge handling', () => {
    it('should close details panel', () => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1' } };
      component.closeDetailsPanel();
      expect(component.selectedElement).toBeNull();      
    });

    it('should get node positions', () => {
      const positions = component.getNodePositions();
      expect((component as any).cy.nodes).toHaveBeenCalled();
      expect(positions).toEqual({
        '1': { x: 100, y: 200 },
        '2': { x: 100, y: 200 }
      });
    });

    it('should save node positions', fakeAsync(() => {
      spyOn(component, 'getNodePositions').and.returnValue(mockNodePositions);
      spyOn(component, 'applySavedLayout');

      component.saveNodePositions();
      tick();

      expect(nodeServiceSpy.saveNodePositions).toHaveBeenCalledWith('graph1', mockNodePositions);
      expect(component.isSaving).toBeFalse();
      expect(component.positionsChanged).toBeFalse();
      expect(component.positionsSaved.emit).toHaveBeenCalledWith(mockNodePositions);
      expect(component.applySavedLayout).toHaveBeenCalledWith(true);
    }));

    it('should apply saved layout', fakeAsync(() => {
      component.applySavedLayout();
      tick();

      expect(nodeServiceSpy.getNodePositions).toHaveBeenCalledWith('graph1', false);
      expect(component.isApplyingSaved).toBeFalse();
      expect(component.positionsChanged).toBeFalse();
    }));

    it('should handle error when applying saved layout', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      nodeServiceSpy.getNodePositions.and.returnValue(throwError(() => errorResponse));

      component.applySavedLayout();
      tick();

      expect(component.isApplyingSaved).toBeFalse();
    }));

    it('should update graph with new data', async () => {
      // Create the spy before calling updateGraph
      const closeDetailsPanelSpy = spyOn(component, 'closeDetailsPanel').and.callThrough();

      const newNodes: GraphNodeData[] = [{ id: '3', name: 'Node 3', nodeType: 'type3' }];
      const newEdges: GraphEdgeData[] = [{ id: '2', source: '3', target: '1', edgeType: 'relates_to' }];

      // Don't spy on initializeCytoscape again since it's already been spied on in beforeEach
      // spyOn(component as any, 'initializeCytoscape').and.returnValue(Promise.resolve());

      // Call updateGraph with preservePositions = false to force closeDetailsPanel to be called
      await component.updateGraph(newNodes, newEdges, false);

      // Verify closeDetailsPanel was called
      expect(closeDetailsPanelSpy).toHaveBeenCalled();

      // Verify the component's data was updated
      expect(component.nodes.length).toBe(1);
      expect(component.nodes[0].id).toBe('3');
      expect(component.edges.length).toBe(1);
      expect(component.edges[0].id).toBe('2');
    });
  });

  describe('View manipulation', () => {
    it('should fit graph', () => {
      component.fitGraph();
      expect(component.smartFitGraph).toHaveBeenCalled();
    });

    it('should apply zoom', () => {
      component.applyZoom(1.5);
      expect((component as any).cy.zoom).toHaveBeenCalledWith({
        level: 1.5,
        position: { x: 100, y: 100 }
      });
    });

    it('should handle layout change event', () => {
      const event = { target: { value: 'grid' } } as unknown as Event;
      spyOn(component, 'changeLayoutType');

      component.onLayoutChange(event);

      expect(component.changeLayoutType).toHaveBeenCalledWith('grid');
    });
  });
});
