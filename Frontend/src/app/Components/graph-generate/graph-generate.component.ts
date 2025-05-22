// Frontend/src/app/Components/graph-generate/graph-generate.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GraphService } from '../../Services/Graph/graph.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-graph-generate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './graph-generate.component.html',
  styleUrl: './graph-generate.component.css'
})
export class GraphGenerateComponent implements OnInit {
  @Input() show: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() generated = new EventEmitter<any>();

  generateForm!: FormGroup;
  strategies: string[] = [];
  loading: boolean = false;
  error: string = '';
  submitted = false;

  // Default values for the form
  private defaultValues = {
    strategy: 'random',
    nodeCount: 10,
    name: ''
  };

  constructor(
    private formBuilder: FormBuilder,
    private graphService: GraphService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadStrategies();
  }

  initForm(): void {
    this.generateForm = this.formBuilder.group({
      strategy: [this.defaultValues.strategy, [Validators.required]],
      nodeCount: [this.defaultValues.nodeCount, [Validators.required, Validators.min(1), Validators.max(1000)]],
      name: [this.defaultValues.name]
    });
  }

  loadStrategies(): void {
    this.loading = true;
    this.graphService.getGenerationStrategies().subscribe({
      next: (strategies) => {
        this.strategies = strategies;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading strategies:', error);
        this.error = 'Failed to load available strategies';
        this.loading = false;
      }
    });
  }

  resetFormToDefaults(): void {
    this.generateForm.setValue({
      strategy: this.defaultValues.strategy,
      nodeCount: this.defaultValues.nodeCount,
      name: this.defaultValues.name
    });
    this.submitted = false;
    this.error = '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (this.generateForm.invalid) {
      return;
    }

    const { strategy, nodeCount, name } = this.generateForm.value;

    this.loading = true;
    this.graphService.generateGraph(strategy, nodeCount, name).subscribe({
      next: (result) => {
        this.loading = false;
        this.generated.emit(result);
        this.resetFormToDefaults(); // Reset the form after successful generation
        this.closeModal();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        if (error.status === 400) {
          this.error = `Bad request: ${error.error}`;
        } else {
          this.error = 'Failed to generate graph. Please try again.';
        }
      }
    });
  }

  closeModal(): void {
    this.show = false;
    this.submitted = false;
    this.error = '';
    this.close.emit();
  }

  get f() {
    return this.generateForm.controls;
  }
}
