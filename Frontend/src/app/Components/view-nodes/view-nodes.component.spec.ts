import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ViewNodesComponent } from './view-nodes.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { NodeService } from '../../Services/Node/node.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { TypesService } from '../../Services/Types/types.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Node } from '../../Models/node.model';

describe('ViewNodesComponent', () => {
  let component: ViewNodesComponent;
  let fixture: ComponentFixture<ViewNodesComponent>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;
  let typesServiceSpy: jasmine.SpyObj<TypesService>;

  // Event subjects for service mocks
  const graphChangedSubject = new Subject<any>();
  const nodeCreatedSubject = new Subject<Node>();  // Change from void to Node
  const nodeDeletedSubject = new Subject<string>(); // Change from void to string


  // Mock data - updated to match the Node interface
  const mockNodes: any[] = [
    {
      id: 'node1',
      name: 'Test Node 1',
      nodeType: 'person',
      graphId: 'graph1',
      properties: { age: '30', occupation: 'developer' }
    },
    {
      id: 'node2',
      name: 'Test Node 2',
      nodeType: 'location',
      graphId: 'graph1',
      properties: { city: 'New York', country: 'USA' }
    },
    {
      id: 'node3',
      name: 'Test Node 3',
      nodeType: 'event',
      graphId: 'graph1',
      properties: {}
    }
  ];

  const mockVisualSettings = {
    person: { shape: 'ellipse', color: '#FF5733' },
    location: { shape: 'rectangle', color: '#33FF57' },
    event: { shape: 'diamond', color: '#3357FF' }
  };

  beforeEach(async () => {
    // Create spy objects for services
    nodeServiceSpy = jasmine.createSpyObj('NodeService', [
      'getNodes',
      'deleteNode',
      'notifyNodeDeleted'
    ]);
    graphServiceSpy = jasmine.createSpyObj('GraphService', ['getGraph'], {
      currentGraph$: graphChangedSubject.asObservable(),
      currentGraphId: 'graph1'
    });
    typesServiceSpy = jasmine.createSpyObj('TypesService', [
      'getNodeVisualSetting'
    ]);

    // Set up subject observables for the services
    nodeServiceSpy.nodeCreated$ = nodeCreatedSubject.asObservable();
    nodeServiceSpy.nodeDeleted$ = nodeDeletedSubject.asObservable();

    // Set up mock return values
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));
    typesServiceSpy.getNodeVisualSetting.and.callFake((nodeType: string) => {
      return mockVisualSettings[nodeType as keyof typeof mockVisualSettings] ||
        { shape: 'ellipse', color: '#8A2BE2' }; // Default
    });

    await TestBed.configureTestingModule({
      imports: [
        ViewNodesComponent,
        ConfirmationModalComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: GraphService, useValue: graphServiceSpy },
        { provide: TypesService, useValue: typesServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements
    })
      .compileComponents();

    fixture = TestBed.createComponent(ViewNodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should subscribe to graph changes on init', () => {
      // The subscription is set up in ngOnInit which is called in beforeEach
      // Instead of accessing private property, check if getNodes was called
      nodeServiceSpy.getNodes.calls.reset();

      // Simulate a graph change
      const mockGraph = { id: 'graph1', name: 'Test Graph' };
      graphChangedSubject.next(mockGraph);

      expect(nodeServiceSpy.getNodes).toHaveBeenCalledWith('graph1');
    });

    it('should load nodes when a graph is selected', () => {
      // Reset the spy call count
      nodeServiceSpy.getNodes.calls.reset();

      // Simulate a graph change
      const mockGraph = { id: 'graph1', name: 'Test Graph' };
      graphChangedSubject.next(mockGraph);

      expect(nodeServiceSpy.getNodes).toHaveBeenCalledWith('graph1');
      expect(component.nodeData.length).toBe(3); // Three mock nodes
    });

    it('should clear nodes when no graph is selected', () => {
      // First set some data
      component.nodeData = [...mockNodes];
      expect(component.nodeData.length).toBe(3);

      // Then simulate no graph selected
      graphChangedSubject.next(null);

      expect(component.nodeData.length).toBe(0);
    });

    it('should reload nodes when a node is created', () => {
      // Reset the spy call count
      nodeServiceSpy.getNodes.calls.reset();

      // Since currentGraphId is private, we'll use a workaround
      // First trigger a graph selection to set the currentGraphId internally
      graphChangedSubject.next({ id: 'graph1', name: 'Test Graph' });
      nodeServiceSpy.getNodes.calls.reset(); // Reset again after the graph change

      // Simulate node creation with a mock node
      const mockCreatedNode: Node = {
        id: 'new-node',
        name: 'New Test Node',
        nodeType: 'person',
        graphId: 'graph1'
      };
      nodeCreatedSubject.next(mockCreatedNode);

      expect(nodeServiceSpy.getNodes).toHaveBeenCalledWith('graph1');
    });

    it('should reload nodes when a node is deleted', () => {
      // Reset the spy call count
      nodeServiceSpy.getNodes.calls.reset();

      // First trigger a graph selection to set the currentGraphId internally
      graphChangedSubject.next({ id: 'graph1', name: 'Test Graph' });
      nodeServiceSpy.getNodes.calls.reset(); // Reset again after the graph change

      // Simulate node deletion with an ID
      nodeDeletedSubject.next('node1');

      expect(nodeServiceSpy.getNodes).toHaveBeenCalledWith('graph1');
    });
  });

  describe('Data Handling', () => {
    it('should update nodeData when getNodes is successful', () => {
      component.getNodes('graph1');
      expect(component.nodeData).toEqual(mockNodes);
      expect(component.loading).toBeFalse();
      expect(component.error).toBeNull();
      expect(component.warning).toBeNull();
    });

    it('should handle 404 error appropriately', () => {
      const errorResponse = new HttpErrorResponse({
        error: 'Not Found',
        status: 404,
        statusText: 'Not Found'
      });
      nodeServiceSpy.getNodes.and.returnValue(throwError(() => errorResponse));

      component.getNodes('graph1');

      expect(component.loading).toBeFalse();
      expect(component.error).toBeNull();
      expect(component.warning).toBe('No nodes found');
      expect(component.nodeData.length).toBe(0);
    });

    it('should handle other errors appropriately', () => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      nodeServiceSpy.getNodes.and.returnValue(throwError(() => errorResponse));

      component.getNodes('graph1');

      expect(component.loading).toBeFalse();
      expect(component.error).toBe('Failed to load node data');
      expect(component.warning).toBeNull();
    });

    it('should correctly process node properties', () => {
      // Use 'any' assertion to avoid TypeScript errors with the properties type
      const props = mockNodes[0].properties as any;
      const propertyCount = component.getPropertyCount(props);
      expect(propertyCount).toBe(2);

      const propertyEntries = component.getPropertyEntries(props);
      expect(propertyEntries.length).toBe(2);
      expect(propertyEntries[0].key).toBe('age');
      expect(propertyEntries[0].value).toBe('30');
    });

    it('should handle null or undefined properties gracefully', () => {
      expect(component.getPropertyCount(null!)).toBe(0);
      expect(component.getPropertyEntries(undefined!).length).toBe(0);
    });

    it('should get visual style for node types', () => {
      const style = component.getNodeVisualStyle('person');
      expect(style['background-color']).toBe('#FF5733');
      expect(style['border-radius']).toBe('50%'); // ellipse

      // Test with a different shape
      typesServiceSpy.getNodeVisualSetting.and.returnValue({ shape: 'rectangle', color: '#33FF57' });
      const rectangleStyle = component.getNodeVisualStyle('location');
      expect(rectangleStyle['border-radius']).toBe('0%'); // rectangle
    });
  });

  describe('UI Rendering', () => {
    it('should show loading indicator when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.spinner-border'));
      expect(loadingElement).toBeTruthy();
    });

    it('should show error alert when there is an error', () => {
      component.error = 'Test error message';
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('.alert-danger'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent).toContain('Test error message');
    });

    it('should show warning alert when there is a warning', () => {
      component.warning = 'Test warning message';
      fixture.detectChanges();

      const warningElement = fixture.debugElement.query(By.css('.alert-warning'));
      expect(warningElement).toBeTruthy();
      expect(warningElement.nativeElement.textContent).toContain('Test warning message');
    });

    it('should render node cards when there is data', () => {
      component.nodeData = [...mockNodes];
      component.filteredNodes = [...mockNodes]; // This was missing
      fixture.detectChanges();

      const nodeCards = fixture.debugElement.queryAll(By.css('.node-card'));
      expect(nodeCards.length).toBe(3);
    });

    it('should show "No nodes available" message when nodeData is empty', () => {
      component.nodeData = [];
      component.loading = false;
      component.error = null;
      component.warning = null;
      fixture.detectChanges();

      // Changed from alert-info to empty-state to match the actual component HTML
      const emptyMessage = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage.nativeElement.textContent).toContain('No Nodes Available');
    });
  });

  describe('Node Deletion', () => {
    it('should show confirmation modal when initiateDeleteNode is called', () => {
      component.initiateDeleteNode('node1');

      expect(component.showDeleteModal).toBeTrue();
      expect(component.nodeToDelete).toBe('node1');
      expect(component.deleteError).toBeNull();
    });

    it('should delete node when confirmDelete is called', fakeAsync(() => {
      nodeServiceSpy.deleteNode.and.returnValue(of({}));

      component.nodeToDelete = 'node1';
      component.confirmDelete();

      expect(nodeServiceSpy.deleteNode).toHaveBeenCalledWith('node1');
      expect(nodeServiceSpy.notifyNodeDeleted).toHaveBeenCalled();

      // After success, modal should be closed
      expect(component.showDeleteModal).toBeFalse();
      expect(component.nodeToDelete).toBeNull();
    }));

    it('should handle delete error appropriately', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      nodeServiceSpy.deleteNode.and.returnValue(throwError(() => errorResponse));

      component.nodeToDelete = 'node1';
      component.confirmDelete();

      // Use tick to allow all async operations to complete
      tick();

      expect(nodeServiceSpy.deleteNode).toHaveBeenCalledWith('node1');
      expect(component.deleteInProgress).toBeFalse();
      expect(component.deleteError).toBe('Failed to delete node');

      // Modal should still be open on error
      expect(component.showDeleteModal).toBeTrue();
    }));

    it('should handle 404 delete error as "already deleted"', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Not Found',
        status: 404,
        statusText: 'Not Found'
      });
      nodeServiceSpy.deleteNode.and.returnValue(throwError(() => errorResponse));

      component.nodeToDelete = 'node1';
      component.confirmDelete();

      expect(nodeServiceSpy.deleteNode).toHaveBeenCalledWith('node1');
      expect(component.warning).toBe('Node not found or already deleted');

      // Modal should be closed on 404
      expect(component.showDeleteModal).toBeFalse();
    }));

    it('should cancel deletion when cancelDelete is called', () => {
      component.showDeleteModal = true;
      component.nodeToDelete = 'node1';

      component.cancelDelete();

      expect(component.showDeleteModal).toBeFalse();
      expect(component.nodeToDelete).toBeNull();
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe from all subscriptions on ngOnDestroy', () => {
      // Create spies for the unsubscribe methods
      const spyNodeCreated = spyOn(component['nodeCreatedSubscription'], 'unsubscribe');
      const spyNodeDeleted = spyOn(component['nodeDeletedSubscription'], 'unsubscribe');
      const spyGraphChange = spyOn(component['graphChangeSubscription'], 'unsubscribe');

      component.ngOnDestroy();

      expect(spyNodeCreated).toHaveBeenCalled();
      expect(spyNodeDeleted).toHaveBeenCalled();
      expect(spyGraphChange).toHaveBeenCalled();
    });
  });
});
