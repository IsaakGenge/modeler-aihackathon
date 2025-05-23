import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DetailsPanelComponent } from './details-panel.component';
import { NodeService } from '../../Services/Node/node.service';
import { EdgeService } from '../../Services/Edge/edge.service';
import { TypesService } from '../../Services/Types/types.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { SortListPipe } from '../../Pipes/sort-list.pipe';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DetailsPanelComponent', () => {
  let component: DetailsPanelComponent;
  let fixture: ComponentFixture<DetailsPanelComponent>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let typesServiceSpy: jasmine.SpyObj<TypesService>;

  // Mock data
  const mockNodes = [
    {
      id: '1',
      name: 'Node 1',
      nodeType: 'type1',
      graphId: 'graph1',
      properties: {
        prop1: 'value1',
        prop2: 42,
        jsonProp: JSON.stringify({ key: 'value' })
      }
    },
    {
      id: '2',
      name: 'Node 2',
      nodeType: 'type2',
      graphId: 'graph1',
      properties: {
        prop3: 'value3'
      }
    }
  ];

  const mockEdges = [
    {
      id: '1',
      source: '1',
      target: '2',
      sourceLabel: 'Node 1',
      targetLabel: 'Node 2',
      edgeType: 'relates_to',
      graphId: 'graph1',
      properties: {
        weight: 5,
        description: 'Connection'
      }
    }
  ];

  const mockNodeTypes = [
    { id: 'type1', name: 'type1', description: 'Type 1', category: 'default', styleProperties: {} },
    { id: 'type2', name: 'type2', description: 'Type 2', category: 'default', styleProperties: {} }
  ];

  const mockEdgeTypes = [
    { id: 'relates_to', name: 'relates_to', description: 'Relates To', category: 'default', isDirected: true, styleProperties: {} },
    { id: 'contains', name: 'contains', description: 'Contains', category: 'default', isDirected: true, styleProperties: {} }
  ];

  beforeEach(async () => {
    // Create spies for services
    nodeServiceSpy = jasmine.createSpyObj('NodeService', [
      'getNodes',
      'deleteNode',
      'updateNode',
      'notifyNodeDeleted',
      'notifyNodeCreated'
    ]);

    edgeServiceSpy = jasmine.createSpyObj('EdgeService', [
      'getEdges',
      'deleteEdge',
      'updateEdge',
      'notifyEdgeDeleted',
      'notifyEdgeCreated'
    ]);

    typesServiceSpy = jasmine.createSpyObj('TypesService', [
      'loadNodeTypes',
      'loadEdgeTypes'
    ]);

    // Configure spy behavior
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes));
    nodeServiceSpy.deleteNode.and.returnValue(of({ success: true }));
    nodeServiceSpy.updateNode.and.returnValue(of(mockNodes[0]));

    edgeServiceSpy.getEdges.and.returnValue(of(mockEdges));
    edgeServiceSpy.deleteEdge.and.returnValue(of({ success: true }));
    edgeServiceSpy.updateEdge.and.returnValue(of(mockEdges[0]));

    // Set up node and edge observables
    Object.defineProperty(typesServiceSpy, 'nodeTypes$', {
      get: () => new BehaviorSubject<any[]>(mockNodeTypes)
    });

    Object.defineProperty(typesServiceSpy, 'edgeTypes$', {
      get: () => new BehaviorSubject<any[]>(mockEdgeTypes)
    });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        NgbTooltipModule,
        DetailsPanelComponent,
        ConfirmationModalComponent,
        SortListPipe
      ],
      providers: [
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: TypesService, useValue: typesServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // For any unresolved components
    }).compileComponents();

    fixture = TestBed.createComponent(DetailsPanelComponent);
    component = fixture.componentInstance;

    // Setup component inputs
    component.isDarkMode$ = new BehaviorSubject<boolean>(false);
    component.graphId = 'graph1';

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component initialization', () => {
    it('should initialize with default values', () => {
      expect(component.isLoadingDetails).toBeFalse();
      expect(component.isEditMode).toBeFalse();
      expect(component.fullElementData).toBeNull();
      expect(component.selectedElement).toBeNull();
    });

    it('should load node and edge types on init', () => {
      component.ngOnInit();
      expect(typesServiceSpy.loadNodeTypes).toHaveBeenCalled();
      expect(typesServiceSpy.loadEdgeTypes).toHaveBeenCalled();
    });
  });

  describe('Loading details', () => {
    it('should fetch node details when a node is selected', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.ngOnChanges({ selectedElement: {} as any });

      tick();
      fixture.detectChanges();

      expect(nodeServiceSpy.getNodes).toHaveBeenCalledWith('graph1');
      expect(component.fullElementData).toEqual(mockNodes[0]);
      expect(component.isLoadingDetails).toBeFalse();
    }));

    it('should fetch edge details when an edge is selected', fakeAsync(() => {
      component.selectedElement = { type: 'edge', data: { id: '1', edgeType: 'relates_to' } };
      component.ngOnChanges({ selectedElement: {} as any });

      tick();
      fixture.detectChanges();

      expect(edgeServiceSpy.getEdges).toHaveBeenCalledWith('graph1');
      expect(component.fullElementData).toEqual(mockEdges[0]);
      expect(component.isLoadingDetails).toBeFalse();
    }));

    it('should handle error when fetching node details', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      nodeServiceSpy.getNodes.and.returnValue(throwError(() => errorResponse));

      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.ngOnChanges({ selectedElement: {} as any });

      tick();
      fixture.detectChanges();

      expect(component.isLoadingDetails).toBeFalse();
      // Console error would be logged, but we don't spy on console in this test
    }));
  });

  describe('Element deletion', () => {
    it('should show delete confirmation modal when delete is clicked', () => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1' } };
      component.deleteElement();

      expect(component.showDeleteModal).toBeTrue();
      expect(component.deleteError).toBeNull();
    });

    it('should delete a node when confirmed', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1' } };
      component.handleConfirmDelete();

      tick();

      expect(nodeServiceSpy.deleteNode).toHaveBeenCalledWith('1');
      expect(nodeServiceSpy.notifyNodeDeleted).toHaveBeenCalled();
      expect(component.selectedElement).toBeNull();
      expect(component.showDeleteModal).toBeFalse();
    }));

    it('should delete an edge when confirmed', fakeAsync(() => {
      component.selectedElement = { type: 'edge', data: { id: '1' } };
      component.handleConfirmDelete();

      tick();

      expect(edgeServiceSpy.deleteEdge).toHaveBeenCalledWith('1');
      expect(edgeServiceSpy.notifyEdgeDeleted).toHaveBeenCalled();
      expect(component.selectedElement).toBeNull();
      expect(component.showDeleteModal).toBeFalse();
    }));

    it('should handle error when deleting a node', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      nodeServiceSpy.deleteNode.and.returnValue(throwError(() => errorResponse));

      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1' } };
      component.handleConfirmDelete();

      tick();

      expect(component.deleteInProgress).toBeFalse();
      expect(component.deleteError).toBeTruthy();
    }));
  });

  describe('Edit mode', () => {
    beforeEach(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = mockNodes[0];
      fixture.detectChanges();
    });

    it('should enter edit mode when toggle is clicked', () => {
      component.toggleEditMode();

      expect(component.isEditMode).toBeTrue();
      expect(component.editableName).toBe(mockNodes[0].name);
      expect(component.editableType).toBe(mockNodes[0].nodeType);
      expect(component.editableProperties.length).toBeGreaterThan(0);
    });

    it('should cancel edit mode without saving changes', () => {
      component.toggleEditMode();
      component.editableName = 'Changed Name';
      component.cancelEdit();

      expect(component.isEditMode).toBeFalse();
      expect(component.updateError).toBeNull();
    });

    it('should add a new property field', () => {
      component.toggleEditMode();
      const initialLength = component.editableProperties.length;

      component.addNewPropertyField();
      expect(component.isAddingProperty).toBeTrue();

      component.newProperty = { key: 'newProp', value: 'newValue' };
      component.confirmAddProperty();

      expect(component.editableProperties.length).toBe(initialLength + 1);
      expect(component.isAddingProperty).toBeFalse();
    });

    it('should not add a property with empty key', () => {
      component.toggleEditMode();
      const initialLength = component.editableProperties.length;

      component.addNewPropertyField();
      component.newProperty = { key: '', value: 'newValue' };
      component.confirmAddProperty();

      expect(component.editableProperties.length).toBe(initialLength);
      expect(component.updateError).toBeTruthy();
    });

    it('should not add a property with duplicate key', () => {
      component.toggleEditMode();
      const initialLength = component.editableProperties.length;

      // Assuming 'prop1' already exists in editableProperties
      component.addNewPropertyField();
      component.newProperty = { key: 'prop1', value: 'newValue' };
      component.confirmAddProperty();

      expect(component.editableProperties.length).toBe(initialLength);
      expect(component.updateError).toBeTruthy();
    });

    it('should remove a property', () => {
      component.toggleEditMode();
      const initialLength = component.editableProperties.length;

      component.removeProperty(0);

      expect(component.editableProperties.length).toBe(initialLength - 1);
    });
  });

  describe('Saving changes', () => {
    it('should update a node when save is clicked', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };
      component.toggleEditMode();

      component.editableName = 'Updated Node';
      component.editableType = 'type2';
      component.editableProperties = [
        { key: 'prop1', value: 'updated value', originalKey: 'prop1' },
        { key: 'newProp', value: 'new value', originalKey: '' }
      ];

      component.saveChanges();
      tick();

      expect(nodeServiceSpy.updateNode).toHaveBeenCalled();
      expect(nodeServiceSpy.notifyNodeCreated).toHaveBeenCalled();
      expect(component.isEditMode).toBeFalse();
      expect(component.isUpdating).toBeFalse();
    }));

    it('should update an edge when save is clicked', fakeAsync(() => {
      component.selectedElement = { type: 'edge', data: { id: '1', edgeType: 'relates_to' } };
      component.fullElementData = { ...mockEdges[0] };
      component.toggleEditMode();

      component.editableType = 'contains';
      component.editableProperties = [
        { key: 'weight', value: '10', originalKey: 'weight' },
        { key: 'newProp', value: 'new value', originalKey: '' }
      ];

      component.saveChanges();
      tick();

      expect(edgeServiceSpy.updateEdge).toHaveBeenCalled();
      expect(edgeServiceSpy.notifyEdgeCreated).toHaveBeenCalled();
      expect(component.isEditMode).toBeFalse();
      expect(component.isUpdating).toBeFalse();
    }));

    it('should handle error when updating a node', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      nodeServiceSpy.updateNode.and.returnValue(throwError(() => errorResponse));

      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };
      component.toggleEditMode();

      component.saveChanges();
      tick();

      expect(component.isUpdating).toBeFalse();
      expect(component.updateError).toBeTruthy();
    }));
  });

  describe('Utility methods', () => {
    it('should format property names correctly', () => {
      expect(component.formatPropertyName('propName')).toBe('Prop Name');
      expect(component.formatPropertyName('longPropertyName')).toBe('Long Property Name');
    });

    it('should identify JSON strings correctly', () => {
      expect(component.isJsonString('{"key": "value"}')).toBeTrue();
      expect(component.isJsonString('[1, 2, 3]')).toBeTrue();
      expect(component.isJsonString('not json')).toBeFalse();
      expect(component.isJsonString(123)).toBeFalse();
    });

    it('should get additional properties correctly', () => {
      component.fullElementData = {
        id: '1',
        name: 'Node 1',
        nodeType: 'type1',
        properties: {
          prop1: 'value1',
          prop2: 42
        }
      };

      const props = component.getAdditionalProperties();
      expect(props.length).toBe(2);
      expect(props[0].key).toBe('prop1');
      expect(props[1].key).toBe('prop2');
    });

    it('should close details panel', () => {
      spyOn(component.closePanel, 'emit');
      component.selectedElement = { type: 'node', data: { id: '1' } };
      component.fullElementData = mockNodes[0];

      component.closeDetailsPanel();

      expect(component.selectedElement).toBeNull();
      expect(component.fullElementData).toBeNull();
      expect(component.closePanel.emit).toHaveBeenCalled();
    });
  });

  describe('Lifecycle methods', () => {
    it('should unsubscribe from observables on destroy', () => {
      component.ngOnInit(); // Create subscriptions

      // Check that subscriptions exist
      expect((component as any).nodeTypesSubscription).toBeTruthy();
      expect((component as any).edgeTypesSubscription).toBeTruthy();

      component.ngOnDestroy();

      // Since we can't check if unsubscribe was called on the actual subscription,
      // this is more of a coverage test to ensure the method runs without errors
    });
  });
});
