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

  // Mock cytoscape layout
  const mockLayoutRun = jasmine.createSpy('run');
  const mockLayoutOne = jasmine.createSpy('one');

  // Define interfaces for Cytoscape mocks
  interface MockCytoscapeNode {
    id: () => string;
    position: () => { x: number, y: number };
    data: (key?: string) => any;
    style: jasmine.Spy;
  }

  interface MockCytoscapeEdge {
    id: () => string;
    data: (key?: string) => any;
    removeData: (key: string) => void;
    style: jasmine.Spy;
  }

  // Mock cytoscape node
  const createMockNode = (id: string, nodeType: string): MockCytoscapeNode => {
    return {
      id: () => id,
      position: () => ({ x: 100, y: 200 }),
      data: (key?: string) => key === 'nodeType' ? nodeType : null,
      style: jasmine.createSpy('style')
    };
  };

  // Mock cytoscape edge
  const createMockEdge = (id: string, edgeType: string): MockCytoscapeEdge => {
    return {
      id: () => id,
      data: (key?: string) => key === 'edgeType' ? edgeType : null,
      removeData: jasmine.createSpy('removeData'),
      style: jasmine.createSpy('style')
    };
  };

  beforeEach(async () => {
    // Create spies for services
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
    layoutServiceSpy = jasmine.createSpyObj('CytoscapeLayoutService', ['getLayoutIcon', 'getLayoutOptions']);
    stylesServiceSpy = jasmine.createSpyObj('CytoscapeStylesService', ['getGraphStyles', 'getNodeTypeStyle']);

    // Configure mock behavior
    nodeServiceSpy.getNodePositions.and.returnValue(of({ positions: mockNodePositions }));
    nodeServiceSpy.saveNodePositions.and.returnValue(of({ success: true }));
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));
    // Set up nodeCreated$ as a property (not a spy)
    Object.defineProperty(nodeServiceSpy, 'nodeCreated$', {
      value: new BehaviorSubject<void>(undefined)
    });

    edgeServiceSpy.getEdges.and.returnValue(of(mockEdges));
    // Set up edgeCreated$ as a property (not a spy)
    Object.defineProperty(edgeServiceSpy, 'edgeCreated$', {
      value: new BehaviorSubject<void>(undefined)
    });

    // Fix 1: Instead of assigning to read-only properties, mock the getter methods
    typesServiceSpy.getAllNodeVisualSettings.and.returnValue(mockNodeVisualSettings);
    typesServiceSpy.getAllEdgeVisualSettings.and.returnValue(mockEdgeVisualSettings);

    // Create observables for the component to subscribe to
    Object.defineProperty(typesServiceSpy, 'nodeVisualSettings$', {
      get: () => new BehaviorSubject<Record<string, NodeVisualSetting>>(mockNodeVisualSettings)
    });
    Object.defineProperty(typesServiceSpy, 'edgeVisualSettings$', {
      get: () => new BehaviorSubject<Record<string, EdgeVisualSetting>>(mockEdgeVisualSettings)
    });

    // Add mock implementations for nodeTypes$ and edgeTypes$ used by DetailsPanelComponent
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

    layoutServiceSpy.getLayoutIcon.and.returnValue('bi-diagram-3');
    layoutServiceSpy.getLayoutOptions.and.returnValue({ name: 'cose', fit: true });

    stylesServiceSpy.getGraphStyles.and.returnValue([]);
    stylesServiceSpy.getNodeTypeStyle.and.returnValue({
      'background-color': '#FF0000',
      'text-outline-color': '#FF0000',
      'shape': 'ellipse'
    });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CytoscapeGraphComponent
      ],
      providers: [
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: TypesService, useValue: typesServiceSpy },
        // Important: Provide the layout service at root level
        { provide: CytoscapeLayoutService, useValue: layoutServiceSpy },
        { provide: CytoscapeStylesService, useValue: stylesServiceSpy },
        { provide: PLATFORM_ID, useValue: 'browser' } // Simulate browser environment for tests
      ],
      schemas: [NO_ERRORS_SCHEMA] // Add this to ignore errors from DetailsPanelComponent
    }).compileComponents();

    fixture = TestBed.createComponent(CytoscapeGraphComponent);
    component = fixture.componentInstance;

    // Convert to GraphNodeData and GraphEdgeData as expected by the component
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

    // Set up the component for testing by adding the necessary spy properties
    spyOn(component.layoutChanged, 'emit');
    spyOn(component.positionsSaved, 'emit');
    spyOn(component.nodeClicked, 'emit');
    spyOn(component.edgeClicked, 'emit');

    // Create mock nodes with data method
    const mockCytoscapeNodes: MockCytoscapeNode[] = [
      createMockNode('1', 'type1'),
      createMockNode('2', 'type2')
    ];

    // Create mock edges with proper typing and implementation
    const mockCytoscapeEdges: MockCytoscapeEdge[] = [
      createMockEdge('1', 'relates_to')
    ];

    // Create a proper jasmine spy for cy and all its methods
    const cySpyObj = jasmine.createSpyObj('cy', [
      'fit', 'zoom', 'center', 'layout', 'style', 'nodes', 'edges', 'getElementById', 'on', 'destroy', '$'
    ]);

    // Properly configure the nested spies
    cySpyObj.layout.and.returnValue({
      run: mockLayoutRun,
      one: mockLayoutOne
    });

    // Configure nodes to return our mock nodes
    cySpyObj.nodes.and.returnValue(mockCytoscapeNodes);
    cySpyObj.edges.and.returnValue(mockCytoscapeEdges);

    // Mock getElementById to return a node or edge
    cySpyObj.getElementById.and.callFake((id: string) => {
      if (id === '1') return mockCytoscapeNodes[0];
      if (id === '2') return mockCytoscapeNodes[1];
      return null;
    });

    cySpyObj.$.and.returnValue({ unselect: jasmine.createSpy('unselect') });

    const styleSpyObj = jasmine.createSpyObj('style', ['clear']);
    cySpyObj.style.and.returnValue(styleSpyObj);

    cySpyObj.center.and.returnValue({ x: 0, y: 0 });

    // Assign the properly configured spy to the component
    (component as any).cy = cySpyObj;

    // Skip initializeCytoscape which causes issues because we can't fully mock cytoscape
    spyOn<any>(component, 'initializeCytoscape').and.returnValue(Promise.resolve());

    // Spy on updateCytoscapeStyles to prevent it from running and causing errors
    spyOn<any>(component, 'updateCytoscapeStyles').and.stub();

    // Prevent subscribeToVisualSettings from running
    spyOn<any>(component, 'subscribeToVisualSettings').and.stub();

    // Prevent subscribeToNodeUpdates and subscribeToEdgeUpdates from running
    spyOn<any>(component, 'subscribeToNodeUpdates').and.stub();
    spyOn<any>(component, 'subscribeToEdgeUpdates').and.stub();

    // IMPORTANT: We need to access component properties so Angular's DI can inject our spy service
    // Manually overwrite the layoutService with our spy 
    // Since the component is providing its own instance, we need to replace it
    (component as any).layoutService = layoutServiceSpy;

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
      expect(layoutServiceSpy.getLayoutOptions).toHaveBeenCalledWith('grid');
      expect((component as any).cy.layout).toHaveBeenCalled();
      expect(component.layoutChanged.emit).toHaveBeenCalledWith('grid');
    });

    it('should apply layout with options', () => {
      const layoutOptions = { name: 'circle', fit: true };
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
      expect((component as any).cy.$).toHaveBeenCalledWith(':selected');
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
      const newNodes: GraphNodeData[] = [{ id: '3', name: 'Node 3', nodeType: 'type3' }];
      const newEdges: GraphEdgeData[] = [{ id: '2', source: '3', target: '1', edgeType: 'relates_to' }];

      spyOn(component, 'closeDetailsPanel');

      await component.updateGraph(newNodes, newEdges);

      expect(component.closeDetailsPanel).toHaveBeenCalled();
      expect(component.nodes.length).toBe(1);
      expect(component.nodes[0].id).toBe('3');
      expect(component.edges.length).toBe(1);
      expect(component.edges[0].id).toBe('2');
    });
  });

  describe('View manipulation', () => {
    it('should fit graph', () => {
      component.fitGraph();
      expect((component as any).cy.fit).toHaveBeenCalled();
    });

    it('should apply zoom', () => {
      component.applyZoom(1.5);
      expect((component as any).cy.zoom).toHaveBeenCalledWith({
        level: 1.5,
        position: { x: 0, y: 0 }
      });
    });

    it('should handle layout change event', () => {
      const event = { target: { value: 'grid' } } as unknown as Event;
      // Need to spy here each time because we're testing this method in isolation
      spyOn(component, 'changeLayoutType');

      component.onLayoutChange(event);

      expect(component.changeLayoutType).toHaveBeenCalledWith('grid');
    });
  });
});
