import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreateEdgeComponent } from './create-edge.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';

describe('CreateEdgeComponent', () => {
  let component: CreateEdgeComponent;
  let fixture: ComponentFixture<CreateEdgeComponent>;
  let edgeService: EdgeService;
  let nodeService: NodeService;
  let nodeCreatedSubject: Subject<void>;

  beforeEach(async () => {
    nodeCreatedSubject = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [
        CreateEdgeComponent,
        ReactiveFormsModule,
        FormsModule,
        HttpClientTestingModule,
        CommonModule
      ],
      providers: [
        EdgeService,
        {
          provide: NodeService,
          useValue: {
            getNodes: () => of([
              { id: 'node1', name: 'Node 1' },
              { id: 'node2', name: 'Node 2' }
            ]),
            nodeCreated$: nodeCreatedSubject.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEdgeComponent);
    component = fixture.componentInstance;
    edgeService = TestBed.inject(EdgeService);
    nodeService = TestBed.inject(NodeService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.edgeForm).toBeTruthy();
    expect(component.edgeForm.get('source')?.value).toBe('');
    expect(component.edgeForm.get('target')?.value).toBe('');
    expect(component.edgeForm.get('edgeType')?.value).toBe('default');
  });

  it('should load nodes on initialization', fakeAsync(() => {
    expect(component.loading).toBeFalse(); // Loading should be finished
    expect(component.nodes.length).toBe(2);
    expect(component.nodes[0].id).toBe('node1');
    expect(component.nodes[1].id).toBe('node2');
  }));

  it('should reload nodes when notified of new node creation', fakeAsync(() => {
    // Setup spy
    const getNodesSpy = spyOn(nodeService, 'getNodes').and.returnValue(of([
      { id: 'node1', name: 'Node 1' },
      { id: 'node2', name: 'Node 2' },
      { id: 'node3', name: 'New Node' }
    ]));

    // Trigger node created notification
    nodeCreatedSubject.next();
    tick();

    // Verify nodes were reloaded
    expect(getNodesSpy).toHaveBeenCalled();
    expect(component.nodes.length).toBe(3);
  }));

  it('should validate form fields', () => {
    const sourceControl = component.edgeForm.get('source');
    const targetControl = component.edgeForm.get('target');

    // Initially form is invalid because source and target are required
    expect(component.edgeForm.valid).toBeFalsy();

    // Set source and target values
    sourceControl?.setValue('node1');
    targetControl?.setValue('node2');

    // Now form should be valid
    expect(component.edgeForm.valid).toBeTruthy();

    // Clear source to make it invalid again
    sourceControl?.setValue('');
    expect(sourceControl?.valid).toBeFalsy();
    expect(component.edgeForm.valid).toBeFalsy();
  });

  it('should not submit if form is invalid', () => {
    // Spy on the service
    const createEdgeSpy = spyOn(edgeService, 'createEdge').and.returnValue(of({}));

    // Form is initially invalid
    component.onSubmit();

    // Service should not be called
    expect(createEdgeSpy).not.toHaveBeenCalled();
    expect(component.submitted).toBeTrue();
  });

  it('should create edge and reset form on successful submission', fakeAsync(() => {
    // Mock successful response
    const mockResponse = { id: 'edge1', source: 'node1', target: 'node2', edgeType: 'related' };
    const createEdgeSpy = spyOn(edgeService, 'createEdge').and.returnValue(of(mockResponse));
    const notifySpy = spyOn(edgeService, 'notifyEdgeCreated');

    // Set valid form values
    component.edgeForm.setValue({
      source: 'node1',
      target: 'node2',
      edgeType: 'related'
    });

    // Submit form
    component.onSubmit();
    tick();

    // Verify service was called
    expect(createEdgeSpy).toHaveBeenCalled();
    expect(createEdgeSpy).toHaveBeenCalledWith({
      source: 'node1',
      target: 'node2',
      edgeType: 'related'
    });

    // Verify notification was sent
    expect(notifySpy).toHaveBeenCalled();

    // Verify form was reset
    expect(component.success).toBeTrue();
    expect(component.edgeForm.get('source')?.value).toBe('');
    expect(component.edgeForm.get('target')?.value).toBe('');
    expect(component.edgeForm.get('edgeType')?.value).toBe('default');
  }));

  it('should handle errors during form submission', fakeAsync(() => {
    // Mock error response
    const mockError = new Error('Test error');
    const createEdgeSpy = spyOn(edgeService, 'createEdge').and.returnValue(throwError(() => mockError));

    // Set valid form values
    component.edgeForm.setValue({
      source: 'node1',
      target: 'node2',
      edgeType: 'related'
    });

    // Submit form
    component.onSubmit();
    tick();

    // Verify error handling
    expect(component.error).toBe('Test error');
    expect(component.success).toBeFalse();
  }));

  it('should handle errors during loadNodes', fakeAsync(() => {
    // Mock error response
    const mockError = new Error('Node load error');
    spyOn(nodeService, 'getNodes').and.returnValue(throwError(() => mockError));

    // Call loadNodes
    component.loadNodes();
    tick();

    // Verify error handling
    expect(component.error).toBe('Failed to load nodes');
    expect(component.loading).toBeFalse();
  }));

  it('should reset the form', () => {
    // Set values in form
    component.edgeForm.setValue({
      source: 'node1',
      target: 'node2',
      edgeType: 'related'
    });
    component.submitted = true;

    // Reset form
    component.resetForm();

    // Verify form state
    expect(component.submitted).toBeFalse();
    expect(component.edgeForm.get('source')?.value).toBe('');
    expect(component.edgeForm.get('target')?.value).toBe('');
    expect(component.edgeForm.get('edgeType')?.value).toBe('default');
  });

  it('should clean up subscriptions on destroy', () => {
    const unsubscribeSpy = spyOn(component['nodeCreatedSubscription'], 'unsubscribe');

    // Trigger ngOnDestroy
    component.ngOnDestroy();

    // Verify unsubscribe was called
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('should expose form controls via f getter', () => {
    expect(component.f).toBe(component.edgeForm.controls);
  });
});
