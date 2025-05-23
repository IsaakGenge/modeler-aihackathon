import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GraphService } from '../../../Services/Graph/graph.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-create-graph',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl : './create-graph.component.html',
  styleUrl: './create-graph.component.css'
})
export class CreateGraphComponent implements OnInit {
  graphForm!: FormGroup;
  submitted = false;
  success = false;
  loading = false;
  error = '';

  @Output() graphCreated = new EventEmitter<any>();

  constructor(
    private formBuilder: FormBuilder,
    private graphService: GraphService
  ) { }

  ngOnInit(): void {
    this.graphForm = this.formBuilder.group({
      name: ['', [Validators.required]]
    });
  }

  get f() {
    return this.graphForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';

    if (this.graphForm.invalid) {
      return;
    }

    const newGraph = {
      name: this.graphForm.value.name
    };

    this.loading = true;
    this.graphService.createGraph(newGraph)
      .subscribe({
        next: (response) => {
          console.log('Graph created successfully:', response);
          this.resetForm();
          this.success = true;
          this.loading = false;

          // Emit the created graph
          this.graphCreated.emit(response);

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = false;
          }, 3000);
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          console.error('Error creating graph:', error);

          let errorMessage = '';
          if (error.status === 500) {
            const serverError = error.error && typeof error.error === 'string'
              ? error.error
              : (error.error?.message || 'Unknown server error');

            errorMessage = `Server error: ${serverError}`;
          } else if (error.status === 400) {
            errorMessage = `Bad request: ${error.error || 'Invalid input data'}`;
          } else {
            errorMessage = error.message || 'An error occurred while creating the graph.';
          }

          this.error = errorMessage;

          // Clear error message after 5 seconds
          setTimeout(() => {
            this.error = '';
          }, 5000);
        }
      });
  }

  resetForm(): void {
    this.submitted = false;
    this.graphForm.reset({
      name: ''
    });
  }
}
