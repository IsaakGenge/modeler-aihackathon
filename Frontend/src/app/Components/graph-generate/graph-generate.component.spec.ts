import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { GraphGenerateComponent } from './graph-generate.component';
import { GraphService } from '../../Services/Graph/graph.service';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('GraphGenerateComponent', () => {
  let component: GraphGenerateComponent;
  let fixture: ComponentFixture<GraphGenerateComponent>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;

  // Mock data
  const mockStrategies = ['random', 'tree', 'complete', 'star'];
  const mockGeneratedGraph = {
    id: 'graph123',
    name: 'Test Graph',
    createdAt: new Date().toISOString(),
    nodeCount: 10,
    edgeCount: 15
  };

  beforeEach(async () => {
    // Create spy for GraphService
    graphServiceSpy = jasmine.createSpyObj('GraphService', [
      'getGenerationStrategies',
      'generateGraph'
    ]);

    // Configure mock behavior
    graphServiceSpy.getGenerationStrategies.and.returnValue(of(mockStrategies));
    graphServiceSpy.generateGraph.and.returnValue(of(mockGeneratedGraph));

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        GraphGenerateComponent
      ],
      providers: [
        { provide: GraphService, useValue: graphServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements and attributes
    }).compileComponents();

    fixture = TestBed.createComponent(GraphGenerateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.generateForm).toBeDefined();
      expect(component.generateForm.get('strategy')?.value).toBe('random');
      expect(component.generateForm.get('nodeCount')?.value).toBe(10);
      expect(component.generateForm.get('name')?.value).toBe('');
    });

    it('should load available graph generation strategies on init', () => {
      expect(graphServiceSpy.getGenerationStrategies).toHaveBeenCalled();
      expect(component.strategies).toEqual(mockStrategies);
    });

    it('should handle error when loading strategies', fakeAsync(() => {
      // Reset component
      component.strategies = [];
      component.loading = false;
      component.error = '';

      // Mock error response
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      graphServiceSpy.getGenerationStrategies.and.returnValue(throwError(() => errorResponse));

      // Call the method
      component.loadStrategies();
      tick();

      // Assert error state
      expect(component.loading).toBeFalse();
      expect(component.error).toBe('Failed to load available strategies');
    }));
  });

  describe('Form validation', () => {
    it('should validate required strategy field', () => {
      const strategyControl = component.generateForm.get('strategy');

      // Initially valid with default value
      expect(strategyControl?.valid).toBeTrue();

      // Set to invalid value
      strategyControl?.setValue(null);
      expect(strategyControl?.valid).toBeFalse();
      expect(strategyControl?.errors?.['required']).toBeTrue();
    });

    it('should validate nodeCount with min and max constraints', () => {
      const nodeCountControl = component.generateForm.get('nodeCount');

      // Initially valid with default value (10)
      expect(nodeCountControl?.valid).toBeTrue();

      // Below minimum
      nodeCountControl?.setValue(0);
      expect(nodeCountControl?.valid).toBeFalse();
      expect(nodeCountControl?.errors?.['min']).toBeDefined();  // Changed from toBeTrue()

      // Above maximum
      nodeCountControl?.setValue(1001);
      expect(nodeCountControl?.valid).toBeFalse();
      expect(nodeCountControl?.errors?.['max']).toBeDefined();  // Changed from toBeTrue()

      // Valid value
      nodeCountControl?.setValue(50);
      expect(nodeCountControl?.valid).toBeTrue();
    });
  });

  describe('Form submission', () => {
    it('should not submit if form is invalid', () => {
      // Make form invalid
      component.generateForm.get('nodeCount')?.setValue(0);

      // Submit form
      component.onSubmit();

      // Should not call service
      expect(graphServiceSpy.generateGraph).not.toHaveBeenCalled();
      expect(component.submitted).toBeTrue();
    });

    it('should submit form with valid values', fakeAsync(() => {
      // Set up valid form values
      component.generateForm.setValue({
        strategy: 'tree',
        nodeCount: 25,
        name: 'My Test Graph'
      });

      // Spy on method calls
      spyOn(component.generated, 'emit');
      spyOn(component, 'resetFormToDefaults');
      spyOn(component, 'closeModal');

      // Submit form
      component.onSubmit();
      tick();

      // Verify service called with correct params
      expect(graphServiceSpy.generateGraph).toHaveBeenCalledWith('tree', 25, 'My Test Graph');
      expect(component.loading).toBeFalse();
      expect(component.generated.emit).toHaveBeenCalledWith(mockGeneratedGraph);
      expect(component.resetFormToDefaults).toHaveBeenCalled();
      expect(component.closeModal).toHaveBeenCalled();
    }));

    it('should handle 400 error on submission', fakeAsync(() => {
      // Set up valid form values
      component.generateForm.setValue({
        strategy: 'tree',
        nodeCount: 25,
        name: 'My Test Graph'
      });

      // Mock 400 error response
      const errorResponse = new HttpErrorResponse({
        error: 'Invalid strategy',
        status: 400,
        statusText: 'Bad Request'
      });
      graphServiceSpy.generateGraph.and.returnValue(throwError(() => errorResponse));

      // Submit form
      component.onSubmit();
      tick();

      // Verify error handling
      expect(component.loading).toBeFalse();
      expect(component.error).toBe('Bad request: Invalid strategy');
    }));

    it('should handle generic error on submission', fakeAsync(() => {
      // Set up valid form values
      component.generateForm.setValue({
        strategy: 'tree',
        nodeCount: 25,
        name: 'My Test Graph'
      });

      // Mock generic error response
      const errorResponse = new HttpErrorResponse({
        error: 'Server Error',
        status: 500,
        statusText: 'Server Error'
      });
      graphServiceSpy.generateGraph.and.returnValue(throwError(() => errorResponse));

      // Submit form
      component.onSubmit();
      tick();

      // Verify error handling
      expect(component.loading).toBeFalse();
      expect(component.error).toBe('Failed to generate graph. Please try again.');
    }));
  });

  describe('UI interaction', () => {
    it('should close modal when closeModal is called', () => {
      // Initialize component with open modal
      component.show = true;
      component.error = 'Some error';
      component.submitted = true;

      // Spy on close event
      spyOn(component.close, 'emit');

      // Call closeModal
      component.closeModal();

      // Verify state and event
      expect(component.show).toBeFalse();
      expect(component.submitted).toBeFalse();
      expect(component.error).toBe('');
      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should reset form to default values', () => {
      // Set non-default values
      component.generateForm.setValue({
        strategy: 'tree',
        nodeCount: 25,
        name: 'My Test Graph'
      });
      component.submitted = true;
      component.error = 'Some error';

      // Reset form
      component.resetFormToDefaults();

      // Verify default values
      expect(component.generateForm.get('strategy')?.value).toBe('random');
      expect(component.generateForm.get('nodeCount')?.value).toBe(10);
      expect(component.generateForm.get('name')?.value).toBe('');
      expect(component.submitted).toBeFalse();
      expect(component.error).toBe('');
    });

    it('should provide access to form controls through getter', () => {
      expect(component.f).toBeDefined();

      // Need to use non-null assertion or check for existence first
      const strategyControl = component.generateForm.get('strategy');
      const nodeCountControl = component.generateForm.get('nodeCount');
      const nameControl = component.generateForm.get('name');

      // First check that controls exist
      expect(strategyControl).toBeTruthy();
      expect(nodeCountControl).toBeTruthy();
      expect(nameControl).toBeTruthy();

      // Now compare with non-null assertion since we've verified they exist
      expect(component.f['strategy']).toEqual(strategyControl!);
      expect(component.f['nodeCount']).toEqual(nodeCountControl!);
      expect(component.f['name']).toEqual(nameControl!);
    });


    // Optional: UI appearance tests if needed
    describe('DOM rendering', () => {
      it('should show modal when show is true', () => {
        // Initially not showing
        let modalElement = fixture.debugElement.query(By.css('.custom-modal'));
        expect(modalElement).toBeNull();

        // Set to show
        component.show = true;
        fixture.detectChanges();

        // Now visible
        modalElement = fixture.debugElement.query(By.css('.custom-modal'));
        expect(modalElement).not.toBeNull();
      });

      it('should display strategies in dropdown', () => {
        // Set to show
        component.show = true;
        fixture.detectChanges();

        // Get select element
        const selectElement = fixture.debugElement.query(By.css('select#strategy'));
        expect(selectElement).not.toBeNull();

        // Get all option elements
        const optionElements = fixture.debugElement.queryAll(By.css('select#strategy option'));
        expect(optionElements.length).toBe(mockStrategies.length);

        // Check first option value
        expect(optionElements[0].nativeElement.value).toBe(mockStrategies[0]);
      });
    });
  });
});
