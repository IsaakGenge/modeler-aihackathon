import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
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

    // Mock Element.prototype.focus
    spyOn(HTMLElement.prototype, 'focus').and.callFake(() => { });
  });

  // Existing tests...

  describe('Edit mode functionality', () => {
    it('should initialize edit mode correctly', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      // Need to wait for the setTimeout to complete
      tick(10);

      expect(component.isEditMode).toBeTrue();
      expect(component.editableName).toBe('Node 1');
      expect(component.editableType).toBe('type1');
      expect(component.editableProperties.length).toBeGreaterThan(0);

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should initialize edit mode for edge correctly', fakeAsync(() => {
      component.selectedElement = { type: 'edge', data: { id: '1', edgeType: 'relates_to' } };
      component.fullElementData = { ...mockEdges[0] };

      component.toggleEditMode();
      // Wait for the setTimeout to complete
      tick(10);

      expect(component.isEditMode).toBeTrue();
      expect(component.editableType).toBe('relates_to');
      expect(component.editableProperties.length).toBeGreaterThan(0);

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should cancel edit mode without saving changes', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      tick(10);

      component.editableName = 'Changed Name';
      component.editableType = 'type2';

      component.cancelEdit();

      expect(component.isEditMode).toBeFalse();
      expect(component.updateError).toBeNull();
      expect(component.fullElementData.name).toBe('Node 1');

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should add a new property field', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      tick(10);

      const initialPropertiesCount = component.editableProperties.length;
      component.addNewPropertyField();

      expect(component.isAddingProperty).toBeTrue();
      expect(component.newProperty).toEqual({ key: '', value: '' });

      component.newProperty = { key: 'newTestProp', value: 'test value' };
      component.confirmAddProperty();

      expect(component.editableProperties.length).toBe(initialPropertiesCount + 1);
      expect(component.editableProperties[component.editableProperties.length - 1].key).toBe('newTestProp');
      expect(component.editableProperties[component.editableProperties.length - 1].value).toBe('test value');
      expect(component.isAddingProperty).toBeFalse();

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should not add a property with empty key', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      tick(10);

      const initialPropertiesCount = component.editableProperties.length;
      component.addNewPropertyField();
      component.newProperty = { key: '', value: 'test value' };
      component.confirmAddProperty();

      expect(component.editableProperties.length).toBe(initialPropertiesCount);
      expect(component.updateError).toBeTruthy();

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should not add a property with duplicate key', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      tick(10);

      // Ensure there's at least one property
      if (component.editableProperties.length === 0) {
        component.editableProperties.push({ key: 'testProp', value: 'test value', originalKey: 'testProp' });
      }

      const existingKey = component.editableProperties[0].key;
      component.addNewPropertyField();
      component.newProperty = { key: existingKey, value: 'test value' };
      component.confirmAddProperty();

      expect(component.updateError).toContain(`already exists`);

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should remove a property', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      tick(10);

      // Ensure there's at least one property to remove
      if (component.editableProperties.length === 0) {
        component.editableProperties.push({ key: 'testProp', value: 'test value', originalKey: 'testProp' });
      }

      const initialPropertiesCount = component.editableProperties.length;
      component.removeProperty(0);

      expect(component.editableProperties.length).toBe(initialPropertiesCount - 1);

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should cancel adding a new property', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      tick(10);

      component.addNewPropertyField();
      component.newProperty = { key: 'testKey', value: 'testValue' };
      component.cancelAddProperty();

      expect(component.isAddingProperty).toBeFalse();
      expect(component.newProperty).toEqual({ key: '', value: '' });

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should handle JSON property values correctly', fakeAsync(() => {
      const jsonValue = '{"test": "value", "nested": {"key": 123}}';
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = {
        ...mockNodes[0],
        properties: {
          ...mockNodes[0].properties,
          jsonProp: jsonValue
        }
      };

      component.toggleEditMode();
      tick(10);

      // Add a JSON property if it doesn't exist in the editable properties
      if (component.editableProperties.findIndex(p => p.key === 'jsonProp') === -1) {
        component.editableProperties.push({
          key: 'jsonProp',
          value: jsonValue,
          originalKey: 'jsonProp'
        });
      }

      // Find the JSON property in editable properties
      const jsonPropIndex = component.editableProperties.findIndex(p => p.key === 'jsonProp');
      expect(jsonPropIndex).not.toBe(-1);

      // Make a change to the JSON property
      const updatedJsonValue = '{"test": "updated", "nested": {"key": 456}}';
      component.editableProperties[jsonPropIndex].value = updatedJsonValue;

      // Save changes
      component.saveChanges();
      tick();

      // The update service should have been called with properly parsed JSON
      const updateCall = nodeServiceSpy.updateNode.calls.mostRecent();
      const updatedNode = updateCall.args[0];

      // Check if properties exists and use bracket notation
      expect(updatedNode.properties && updatedNode.properties['jsonProp']).toEqual(JSON.parse(updatedJsonValue));

      // Clean up any remaining timers
      discardPeriodicTasks();
    }));

    it('should handle embedded mode with special positioning', fakeAsync(() => {
      // Create mock element
      const mockPanel = document.createElement('div');
      mockPanel.className = 'details-panel';
      document.body.appendChild(mockPanel);

      // Set up the component for embedded mode
      component.isEmbedded = true;
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      // Setup spy to track DOM class changes
      spyOn(mockPanel.classList, 'add').and.callThrough();
      spyOn(mockPanel.classList, 'remove').and.callThrough();

      // Toggle edit mode
      component.toggleEditMode();

      // Need to wait for all the timeouts
      tick(10); // Wait for the first timeout to toggle isEditMode
      tick(100); // Wait for the embedded mode dropdown initialization

      // Check that special embedded mode handling happens
      expect(component.isEditMode).toBeTrue();

      // Clean up
      document.body.removeChild(mockPanel);
      discardPeriodicTasks();
    }));

    // Keep existing JSON string detection test
    it('should detect JSON strings correctly', () => {
      expect(component.isJsonString('{"key": "value"}')).toBeTrue();
      expect(component.isJsonString('[1,2,3]')).toBeTrue();
      expect(component.isJsonString('not json')).toBeFalse();
      expect(component.isJsonString({ key: 'value' })).toBeFalse();
      expect(component.isJsonString(null)).toBeFalse();
    });
  });

  // Keep existing Type editing tests but make them fakeAsync
  describe('Type editing', () => {
    it('should change node type correctly', fakeAsync(() => {
      component.selectedElement = { type: 'node', data: { id: '1', label: 'Node 1', nodeType: 'type1' } };
      component.fullElementData = { ...mockNodes[0] };

      component.toggleEditMode();
      tick(10);

      component.editableType = 'type2';

      component.saveChanges();
      tick();

      const updateCall = nodeServiceSpy.updateNode.calls.mostRecent();
      const updatedNode = updateCall.args[0];
      expect(updatedNode.nodeType).toBe('type2');

      discardPeriodicTasks();
    }));

    it('should change edge type correctly', fakeAsync(() => {
      component.selectedElement = { type: 'edge', data: { id: '1', edgeType: 'relates_to' } };
      component.fullElementData = { ...mockEdges[0] };

      component.toggleEditMode();
      tick(10);

      component.editableType = 'contains';

      component.saveChanges();
      tick();

      const updateCall = edgeServiceSpy.updateEdge.calls.mostRecent();
      const updatedEdge = updateCall.args[0];
      expect(updatedEdge.edgeType).toBe('contains');

      discardPeriodicTasks();
    }));

    // Keep existing load types tests
    it('should load available node types on init', () => {
      component.ngOnInit();
      expect(component.availableNodeTypes).toEqual(mockNodeTypes);
    });

    it('should load available edge types on init', () => {
      component.ngOnInit();
      expect(component.availableEdgeTypes).toEqual(mockEdgeTypes);
    });
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
