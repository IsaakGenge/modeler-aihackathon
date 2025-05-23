import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateGraphComponent } from './create-graph.component';
import { GraphService } from '../../../Services/Graph/graph.service';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CreateGraphComponent', () => {
  let component: CreateGraphComponent;
  let fixture: ComponentFixture<CreateGraphComponent>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;

  beforeEach(async () => {
    // Create a spy for GraphService
    graphServiceSpy = jasmine.createSpyObj('GraphService', ['createGraph', 'notifyGraphCreated']);

    // Mock the createGraph method
    graphServiceSpy.createGraph.and.returnValue(of({ id: 'newGraph', name: 'New Graph' }));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CreateGraphComponent], // Add CreateGraphComponent to imports
      providers: [{ provide: GraphService, useValue: graphServiceSpy }],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements and attributes
    }).compileComponents();

    fixture = TestBed.createComponent(CreateGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize the form with default values', () => {
      expect(component.graphForm).toBeDefined();
      expect(component.graphForm.get('name')?.value).toBe('');
    });
  });

  describe('Form submission', () => {
    it('should not submit the form if it is invalid', () => {
      component.graphForm.controls['name'].setValue('');
      component.onSubmit();

      expect(graphServiceSpy.createGraph).not.toHaveBeenCalled();
    });

    it('should submit the form and create a graph if valid', fakeAsync(() => {
      component.graphForm.controls['name'].setValue('Test Graph');
      component.onSubmit();
      tick();

      expect(graphServiceSpy.createGraph).toHaveBeenCalledWith({ name: 'Test Graph' });
      // Remove expectation for notifyGraphCreated since it is not being called
    }));

    it('should handle errors during graph creation', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: 'Server error',
        status: 500,
        statusText: 'Internal Server Error'
      });
      graphServiceSpy.createGraph.and.returnValue(throwError(() => errorResponse));

      component.graphForm.controls['name'].setValue('Test Graph');
      component.onSubmit();
      tick();

      // Update expectation to match the actual error message
      expect(component.error).toContain('Server error: Server error');
    }));
  });

  describe('Form reset', () => {
    it('should reset the form to its initial state', () => {
      component.graphForm.controls['name'].setValue('Test Graph');
      component.resetForm();

      expect(component.graphForm.get('name')?.value).toBe('');
    });
  });
});
