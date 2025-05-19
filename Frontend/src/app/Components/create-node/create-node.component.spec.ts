import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreateNodeComponent } from './create-node.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NodeService } from '../../Services/Node/node.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

describe('CreateNodeComponent', () => {
  let component: CreateNodeComponent;
  let fixture: ComponentFixture<CreateNodeComponent>;
  let nodeService: NodeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CreateNodeComponent,
        ReactiveFormsModule,
        FormsModule,
        HttpClientTestingModule,
        CommonModule
      ],
      providers: [NodeService]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateNodeComponent);
    component = fixture.componentInstance;
    nodeService = TestBed.inject(NodeService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.nodeForm).toBeTruthy();
    expect(component.nodeForm.get('name')?.value).toBe('');
    expect(component.nodeForm.get('nodeType')?.value).toBe('default');
  });

  it('should validate form fields', () => {
    const nameControl = component.nodeForm.get('name');
    const nodeTypeControl = component.nodeForm.get('nodeType');

    // Initially form is invalid because name is required
    expect(component.nodeForm.valid).toBeFalsy();

    // Set name value
    nameControl?.setValue('Test Node');
    expect(nameControl?.valid).toBeTruthy();

    // Now form should be valid
    expect(component.nodeForm.valid).toBeTruthy();

    // Clear name to make it invalid again
    nameControl?.setValue('');
    expect(nameControl?.valid).toBeFalsy();
    expect(component.nodeForm.valid).toBeFalsy();

    // nodeType should have default value and be valid
    expect(nodeTypeControl?.valid).toBeTruthy();
  });

  it('should not submit if form is invalid', () => {
    // Spy on the service
    const createNodeSpy = spyOn(nodeService, 'createNode').and.returnValue(of({}));

    // Form is initially invalid
    component.onSubmit();

    // Service should not be called
    expect(createNodeSpy).not.toHaveBeenCalled();
    expect(component.submitted).toBeTrue();
  });

  it('should create node and reset form on successful submission', fakeAsync(() => {
    // Mock successful response
    const mockResponse = { id: '123', name: 'Test Node', nodeType: 'person' };
    const createNodeSpy = spyOn(nodeService, 'createNode').and.returnValue(of(mockResponse));
    const notifySpy = spyOn(nodeService, 'notifyNodeCreated');

    // Set valid form values
    component.nodeForm.setValue({
      name: 'Test Node',
      nodeType: 'person'
    });

    // Submit form
    component.onSubmit();
    tick();

    // Verify service was called
    expect(createNodeSpy).toHaveBeenCalled();
    expect(createNodeSpy).toHaveBeenCalledWith({
      id: undefined, // id is not in the form
      name: 'Test Node',
      nodeType: 'person'
    });

    // Verify notification was sent
    expect(notifySpy).toHaveBeenCalled();

    // Verify form was reset
    expect(component.success).toBeTrue();
    expect(component.nodeForm.get('name')?.value).toBe('');
    expect(component.nodeForm.get('nodeType')?.value).toBe('default');
  }));

  it('should handle errors during form submission', fakeAsync(() => {
    // Mock error response
    const mockError = new Error('Test error');
    const createNodeSpy = spyOn(nodeService, 'createNode').and.returnValue(throwError(() => mockError));

    // Set valid form values
    component.nodeForm.setValue({
      name: 'Test Node',
      nodeType: 'person'
    });

    // Submit form
    component.onSubmit();
    tick();

    // Verify error handling
    expect(component.error).toBe('Test error');
    expect(component.success).toBeFalse();
  }));

  it('should reset the form', () => {
    // Set values in form
    component.nodeForm.setValue({
      name: 'Test Node',
      nodeType: 'person'
    });
    component.submitted = true;

    // Reset form
    component.resetForm();

    // Verify form state
    expect(component.submitted).toBeFalse();
    expect(component.nodeForm.get('name')?.value).toBe('');
    expect(component.nodeForm.get('nodeType')?.value).toBe('default');
  });

  it('should expose form controls via f getter', () => {
    expect(component.f).toBe(component.nodeForm.controls);
  });
});
