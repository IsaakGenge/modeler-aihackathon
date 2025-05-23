import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateNodeComponent } from './create-node.component';
import { NodeService } from '../../../Services/Node/node.service';
import { GraphService } from '../../../Services/Graph/graph.service';
import { TypesService } from '../../../Services/Types/types.service';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CreateNodeComponent', () => {
  let component: CreateNodeComponent;
  let fixture: ComponentFixture<CreateNodeComponent>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;
  let typesServiceSpy: jasmine.SpyObj<TypesService>;

  beforeEach(async () => {
    // Create spies for services
    nodeServiceSpy = jasmine.createSpyObj('NodeService', ['createNode', 'notifyNodeCreated']);
    graphServiceSpy = jasmine.createSpyObj('GraphService', [], { currentGraphId: 'graph1' });
    typesServiceSpy = jasmine.createSpyObj('TypesService', ['loadNodeTypes'], {
      nodeTypes$: of([{ name: 'type1' }, { name: 'type2' }])
    });

    // Mock the createNode method
    nodeServiceSpy.createNode.and.returnValue(
      of({ id: 'newNode', name: 'New Node', nodeType: 'type1', graphId: 'graph1' })
    );

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CreateNodeComponent], // Add CreateNodeComponent to imports
      providers: [
        { provide: NodeService, useValue: nodeServiceSpy },
        { provide: GraphService, useValue: graphServiceSpy },
        { provide: TypesService, useValue: typesServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements and attributes
    }).compileComponents();

    fixture = TestBed.createComponent(CreateNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize the form with default values', () => {
      expect(component.nodeForm).toBeDefined();
      expect(component.nodeForm.get('name')?.value).toBe('');
      expect(component.nodeForm.get('nodeType')?.value).toBe('type1'); // Default value from mock
    });
  });

  describe('Form submission', () => {
    it('should not submit the form if it is invalid', () => {
      component.nodeForm.controls['name'].setValue('');
      component.nodeForm.controls['nodeType'].setValue('');
      component.onSubmit();

      expect(nodeServiceSpy.createNode).not.toHaveBeenCalled();
    });

    //it('should submit the form and create a node if valid', fakeAsync(() => {
    //  component.nodeForm.controls['name'].setValue('Test Node');
    //  component.nodeForm.controls['nodeType'].setValue('type1');
    //  component.onSubmit();
    //  tick();

    //  // Include graphId in the expected object
    //  expect(nodeServiceSpy.createNode).toHaveBeenCalledWith({
    //    name: 'Test Node',
    //    nodeType: 'type1',
    //    graphId: 'graph1' // Explicitly include graphId
    //  });
    //}));

    it('should handle errors during node creation', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Http failure response for (unknown url): 500 Internal Server Error',
        status: 500,
        statusText: 'Internal Server Error'
      });
      nodeServiceSpy.createNode.and.returnValue(throwError(() => errorResponse));

      component.nodeForm.controls['name'].setValue('Test Node');
      component.nodeForm.controls['nodeType'].setValue('type1');
      component.onSubmit();
      tick();

      expect(component.error).toContain('Http failure response for (unknown url): 500 Internal Server Error');
    }));
  });

  describe('Form reset', () => {
    it('should reset the form to its initial state', () => {
      component.nodeForm.controls['name'].setValue('Test Node');
      component.nodeForm.controls['nodeType'].setValue('type1');
      component.resetForm();

      expect(component.nodeForm.get('name')?.value).toBe('');
      expect(component.nodeForm.get('nodeType')?.value).toBe('type1'); // Default value from mock
    });
  });
});
