// Frontend/src/app/Components/graph-manager/graph-manager.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Graph, CreateGraphDto } from '../../Models/graph.model'

@Component({
  selector: 'app-graph-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './graph-manager.component.html',
  styleUrl: './graph-manager.component.css'
})
export class GraphManagerComponent implements OnInit {
  @Input() embedded: boolean = false;

  graphForm!: FormGroup;
  graphs: Graph[] = [];
  submitted = false;
  success = false;
  loading = false;
  error = '';
  warning = '';
  isDarkMode$: Observable<boolean>;

  constructor(
    private formBuilder: FormBuilder,
    private graphService: GraphService,
    private themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.graphForm = this.formBuilder.group({
      name: ['', [Validators.required]]
    });

    this.loadGraphs();
  }

  get f() {
    return this.graphForm.controls;
  }

  loadGraphs(): void {
    this.loading = true;
    this.error = '';
    this.warning = '';

    this.graphService.getGraphs().subscribe({
      next: (data) => {
        console.log('Loaded graphs:', data); // Debug logging
        this.graphs = data;
        this.loading = false;

        if (data.length === 0) {
          this.warning = 'No graphs available. Create your first graph to get started.';
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error loading graphs:', err); // Debug logging
        this.loading = false;
        if (err.status === 404) {
          this.warning = 'No graphs found. Create your first graph to get started.';
          this.graphs = [];
        } else {
          this.error = `Failed to load graphs: ${err.message}`;
        }
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';
    this.warning = '';

    // stop here if form is invalid
    if (this.graphForm.invalid) {
      return;
    }

    const newGraph: CreateGraphDto = {
      name: this.graphForm.value.name
    };

    this.loading = true; // Show loading state
    this.graphService.createGraph(newGraph)
      .subscribe({
        next: (response) => {
          console.log('Graph created successfully:', response);
          this.success = true;
          this.resetForm();

          // Add a small delay before reloading the graph list
          // This gives the backend time to complete any async operations
          setTimeout(() => {
            this.loadGraphs();
            this.graphService.notifyGraphCreated();
            this.loading = false;
          }, 500);
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          // Detailed error logging
          console.error('Error creating graph:', error);

          if (error.status === 500) {
            // Extract and display the server error message if available
            const serverError = error.error && typeof error.error === 'string'
              ? error.error
              : (error.error?.message || 'Unknown server error');

            this.error = `Server error (500): ${serverError}`;
          } else if (error.status === 400) {
            this.error = `Bad request: ${error.error || 'Invalid input data'}`;
          } else {
            this.error = error.message || 'An error occurred while creating the graph.';
          }
        }
      });
  }

  resetForm(): void {
    this.submitted = false;
    this.graphForm.reset({
      name: ''
    });
  }

  deleteGraph(id: string | undefined, name: string | undefined): void {
    if (!id) {
      this.error = 'Cannot delete graph: missing ID';
      return;
    }

    const graphName = name || 'this graph';
    if (confirm(`Are you sure you want to delete the graph "${graphName}"? This will also delete all associated nodes and edges.`)) {
      this.loading = true;
      this.graphService.deleteGraph(id).subscribe({
        next: () => {
          setTimeout(() => {
            this.loadGraphs();
            this.graphService.notifyGraphDeleted();
            this.loading = false;
          }, 500);
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          if (err.status === 404) {
            this.warning = 'Graph not found or already deleted';
            this.loadGraphs();
          } else {
            this.error = `Failed to delete graph: ${err.message}`;
            console.error('Error deleting graph:', err);
          }
        }
      });
    }
  }

  selectGraph(graph: Graph): void {
    if (!graph || !graph.id) {
      this.error = 'Cannot select graph: invalid graph data';
      return;
    }
    this.graphService.setCurrentGraph(graph);
  }

  isSelected(graph: Graph): boolean {
    return !!graph && !!graph.id && this.graphService.currentGraphId === graph.id;
  }

  // Method to manually refresh the graph list
  refreshGraphs(): void {
    this.loadGraphs();
  }
}
