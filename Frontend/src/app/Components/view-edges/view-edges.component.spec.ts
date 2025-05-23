import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ViewEdgesComponent } from './view-edges.component';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Edge } from '../../Models/edge.model';
import { Node } from '../../Models/node.model';

describe('ViewEdgesComponent', () => {
  let component: ViewEdgesComponent;
  let fixture: ComponentFixture<ViewEdgesComponent>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;

  // Create subjects for the observables - making them accessible for tests
  let edgeCreatedSubject: BehaviorSubject<void>;
  let edgeDeletedSubject: BehaviorSubject<void>;
  let nodeCreatedSubject: BehaviorSubject<void>;
  let nodeDeletedSubject: BehaviorSubject<void>;

  // Mock data - adding missing graphId property to fix Edge[] type error
  const mockEdges: Edge[] = [
    {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      edgeType: 'relates_to',
      graphId: 'graph1',
      createdAt: new Date('2023-01-01'),
      properties: {
        weight: 5,
        description: 'Connection'
      }
    },
    {
      id: 'edge2',
      source: 'node2',
      target: 'node3',
      edgeType: 'contains',
      graphId: 'graph1',
      createdAt: new Date('2023-01-02'),
      properties: {}
    }
  ];

  // Adding missing graphId property to fix Node[] type error
  const mockNodes: Node[] = [
    {
      id: 'node1',
      name: 'Node 1',
      nodeType: 'type1',
      graphId: 'graph1'
    },
    {
      id: 'node2',
      name: 'Node 2',
      nodeType: 'type2',
      graphId: 'graph1'
    },
    {
      id: 'node3',
      name: 'Node 3',
      nodeType: 'type1',
      graphId: 'graph1'
    }
  ];

  beforeEach(async () => {
    // Create spies for services
    edgeServiceSpy = jasmine.createSpyObj('EdgeService', [
      'getEdges',
      'deleteEdge',
      'notifyEdgeDeleted',
      'notifyEdgeCreated'
    ]);

    nodeServiceSpy = jasmine.createSpyObj('NodeService', [
      'getNodes',
      'notifyNodeDeleted',
      'notifyNodeCreated'
    ]);

    themeServiceSpy = jasmine.createSpyObj('ThemeService', [], {
      isDarkMode$: new BehaviorSubject<boolean>(false)
    });

    graphServiceSpy = jasmine.createSpyObj('GraphService', [], {
      currentGraph$: new BehaviorSubject<any>({ id: 'graph1', name: 'Test Graph' }),
      currentGraphId: 'graph1'
    });

    // Configure spy behavior
    edgeServiceSpy.getEdges.and.returnValue(of(mockEdges));
    edgeServiceSpy.deleteEdge.and.returnValue(of({ success: true }));
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));

    // Initialize subjects for the observables
    edgeCreatedSubject = new BehaviorSubject<void>(undefined);
    edgeDeletedSubject = new BehaviorSubject<void>(undefined);
    nodeCreatedSubject = new BehaviorSubject<void>(undefined);
    nodeDeletedSubject = new BehaviorSubject<void>(undefined);

    // Set up observables as properties on the service spies
    Object.defineProperty(edgeServiceSpy, 'edgeCreated$', {
      get: () => edgeCreatedSubject.asObservable()
    });
    Object.defineProperty(edgeServiceSpy, 'edgeDeleted$', {
      get: () => edgeDeletedSubject.asObservable()
    });
    Object.defineProperty(nodeServiceSpy, 'nodeCreated$', {
      get: () => nodeCreatedSubject.asObservable()
    });
    Object.defineProperty(nodeServiceSpy, 'nodeDeleted$', {
      get: () => nodeDeletedSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ViewEdgesComponent,
        ConfirmationModalComponent
      ],
      providers: [
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: GraphService, useValue: graphServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements/attributes
    }).compileComponents();

    fixture = TestBed.createComponent(ViewEdgesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component initialization', () => {
    it('should load edge and node data on init', () => {
      expect(edgeServiceSpy.getEdges).toHaveBeenCalled();
      expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
      expect(component.edgeData).toEqual(mockEdges);
      expect(component.nodeMap.size).toBe(mockNodes.length);
    });

    it('should correctly map node ids to names', () => {
      expect(component.nodeMap.get('node1')).toBe('Node 1');
      expect(component.nodeMap.get('node2')).toBe('Node 2');
      expect(component.nodeMap.get('node3')).toBe('Node 3');
    });

    it('should subscribe to graph changes', fakeAsync(() => {
      // Reset the spy to track new calls
      edgeServiceSpy.getEdges.calls.reset();
      nodeServiceSpy.getNodes.calls.reset();

      // Simulate a graph change
      (graphServiceSpy.currentGraph$ as BehaviorSubject<any>).next({ id: 'graph2', name: 'Another Graph' });
      tick();

      expect(edgeServiceSpy.getEdges).toHaveBeenCalled();
      expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
    }));

    it('should subscribe to edge created events', fakeAsync(() => {
      // Reset the spy to track new calls
      edgeServiceSpy.getEdges.calls.reset();

      // Simulate an edge created event - using the subject directly
      edgeCreatedSubject.next();
      tick();

      expect(edgeServiceSpy.getEdges).toHaveBeenCalled();
    }));

    it('should subscribe to edge deleted events', fakeAsync(() => {
      // Reset the spy to track new calls
      edgeServiceSpy.getEdges.calls.reset();

      // Simulate an edge deleted event - using the subject directly
      edgeDeletedSubject.next();
      tick();

      expect(edgeServiceSpy.getEdges).toHaveBeenCalled();
    }));

    it('should subscribe to node changes', fakeAsync(() => {
      // Reset the spy to track new calls
      nodeServiceSpy.getNodes.calls.reset();

      // Simulate a node created event - using the subject directly
      nodeCreatedSubject.next();
      tick();

      expect(nodeServiceSpy.getNodes).toHaveBeenCalled();

      // Reset the spy to track new calls
      nodeServiceSpy.getNodes.calls.reset();

      // Simulate a node deleted event - using the subject directly
      nodeDeletedSubject.next();
      tick();

      expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
    }));
  });

  describe('Cleanup', () => {
    it('should unsubscribe from all subscriptions on destroy', () => {
      // Spy on unsubscribe methods
      spyOn(component['graphChangedSubscription'], 'unsubscribe');
      spyOn(component['edgeCreatedSubscription'], 'unsubscribe');
      spyOn(component['edgeDeletedSubscription'], 'unsubscribe');
      spyOn(component['nodeChangedSubscription'], 'unsubscribe');

      component.ngOnDestroy();

      expect(component['graphChangedSubscription'].unsubscribe).toHaveBeenCalled();
      expect(component['edgeCreatedSubscription'].unsubscribe).toHaveBeenCalled();
      expect(component['edgeDeletedSubscription'].unsubscribe).toHaveBeenCalled();
      expect(component['nodeChangedSubscription'].unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Data loading', () => {
    it('should handle empty edge data', () => {
      edgeServiceSpy.getEdges.and.returnValue(of([]));

      component.loadData();

      expect(component.edgeData.length).toBe(0);
      expect(component.loading).toBeFalse();
      expect(component.error).toBeNull();
    });

    it('should handle 404 error when fetching edges', () => {
      const errorResponse = new HttpErrorResponse({
        error: 'Not Found',
        status: 404,
        statusText: 'Not Found'
      });
      edgeServiceSpy.getEdges.and.returnValue(throwError(() => errorResponse));

      component.loadData();

      expect(component.warning).toContain('No connections found');
      expect(component.loading).toBeFalse();
      expect(component.error).toBeNull();
    });

    it('should handle other errors when fetching edges', () => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Internal Server Error'
      });
      edgeServiceSpy.getEdges.and.returnValue(throwError(() => errorResponse));

      component.loadData();

      expect(component.error).toContain('Failed to load connection data');
      expect(component.loading).toBeFalse();
    });

    it('should handle errors when fetching nodes', () => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Internal Server Error'
      });
      nodeServiceSpy.getNodes.and.returnValue(throwError(() => errorResponse));

      component.loadData();

      // Should still complete without error
      expect(component.loading).toBeFalse();
      expect(component.nodeMap.size).toBe(0);
    });

    it('should load only node data', () => {
      nodeServiceSpy.getNodes.calls.reset();

      component.loadNodeData();

      expect(nodeServiceSpy.getNodes).toHaveBeenCalled();
      expect(component.nodeMap.size).toBe(mockNodes.length);
    });

    it('should handle errors when loading only node data', () => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Clear the node map before testing error case
      component.nodeMap.clear();

      nodeServiceSpy.getNodes.and.returnValue(throwError(() => errorResponse));

      component.loadNodeData();

      // The map should remain empty since we're simulating an error
      expect(component.nodeMap.size).toBe(0);
    });
  });

  describe('Utility methods', () => {
    it('should get node name from nodeMap', () => {
      expect(component.getNodeName('node1')).toBe('Node 1');
    });

    it('should return a formatted unknown node name if not in nodeMap', () => {
      expect(component.getNodeName('nonexistent')).toContain('Unknown');
      expect(component.getNodeName('nonexistent')).toContain('nonexist...');
    });

    it('should truncate ID for display', () => {
      expect(component.truncateId('12345678901234567890')).toBe('12345678...');
    });

    it('should get property count', () => {
      const properties = { a: 1, b: 2, c: 3 };
      expect(component.getPropertyCount(properties)).toBe(3);
    });

    it('should handle null or undefined properties in getPropertyCount', () => {
      expect(component.getPropertyCount({} as any)).toBe(0);
      expect(component.getPropertyCount(null as any)).toBe(0);
      expect(component.getPropertyCount(undefined as any)).toBe(0);
    });

    it('should convert properties to entries array', () => {
      const properties = { a: 1, b: 'test', c: { nested: true } };
      const result = component.getPropertyEntries(properties);

      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ key: 'a', value: 1 });
      expect(result[1]).toEqual({ key: 'b', value: 'test' });
      expect(result[2].key).toBe('c');
      expect(result[2].value).toContain('nested');
    });

    it('should handle null or undefined properties in getPropertyEntries', () => {
      expect(component.getPropertyEntries({} as any).length).toBe(0);
      expect(component.getPropertyEntries(null as any).length).toBe(0);
      expect(component.getPropertyEntries(undefined as any).length).toBe(0);
    });
  });

  describe('Edge deletion', () => {
    it('should show delete confirmation modal', () => {
      component.initiateDeleteEdge('edge1');

      expect(component.showDeleteModal).toBeTrue();
      expect(component.edgeToDelete).toBe('edge1');
      expect(component.deleteError).toBeNull();
    });

    it('should delete edge when confirmed', fakeAsync(() => {
      component.edgeToDelete = 'edge1';
      component.confirmDelete();

      tick();

      expect(edgeServiceSpy.deleteEdge).toHaveBeenCalledWith('edge1');
      expect(edgeServiceSpy.notifyEdgeDeleted).toHaveBeenCalled();
      expect(component.showDeleteModal).toBeFalse();
      expect(component.edgeToDelete).toBeNull();
      expect(component.deleteInProgress).toBeFalse();
    }));

    it('should handle 404 error when deleting edge', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Not Found',
        status: 404,
        statusText: 'Not Found'
      });
      edgeServiceSpy.deleteEdge.and.returnValue(throwError(() => errorResponse));

      component.edgeToDelete = 'edge1';
      component.confirmDelete();

      tick();

      expect(component.warning).toContain('Connection not found or already deleted');
      expect(component.showDeleteModal).toBeFalse();
      expect(component.deleteInProgress).toBeFalse();
    }));

    it('should handle other errors when deleting edge', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Internal Server Error'
      });
      edgeServiceSpy.deleteEdge.and.returnValue(throwError(() => errorResponse));

      component.edgeToDelete = 'edge1';
      component.showDeleteModal = true; // Ensure modal is shown to start with
      component.confirmDelete();

      tick();

      expect(component.deleteError).toContain('Failed to delete connection');
      // The component should keep the modal open when there's an error
      expect(component.showDeleteModal).toBeTrue();
      expect(component.deleteInProgress).toBeFalse();
    }));

    it('should not attempt deletion if edgeToDelete is null', fakeAsync(() => {
      component.edgeToDelete = null;
      component.confirmDelete();

      tick();

      expect(edgeServiceSpy.deleteEdge).not.toHaveBeenCalled();
    }));

    it('should cancel delete operation', () => {
      component.showDeleteModal = true;
      component.deleteInProgress = true;
      component.deleteError = 'Some error';
      component.edgeToDelete = 'edge1';

      component.cancelDelete();

      expect(component.showDeleteModal).toBeFalse();
      expect(component.deleteInProgress).toBeFalse();
      expect(component.deleteError).toBeNull();
      expect(component.edgeToDelete).toBeNull();
    });
  });
});
