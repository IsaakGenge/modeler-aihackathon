import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Graph, CreateGraphDto } from '../../Models/graph.model';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { Router } from '@angular/router';
import { SortListPipe } from '../../Pipes/sort-list.pipe';

@Component({
  selector: 'app-graph-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmationModalComponent, SortListPipe],
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

  // Delete confirmation modal properties
  showDeleteModal = false;
  deleteInProgress = false;
  graphToDelete: { id: string, name: string } | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private graphService: GraphService,
    private themeService: ThemeService,
    private router: Router
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
  // Add this computed property in your component class
  get deleteConfirmationMessage(): string {
    return `Are you sure you want to delete the graph "${this.graphToDelete?.name || ''}"?`;
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

  // Initialize delete graph process
  initiateDeleteGraph(id: string | undefined, name: string | undefined): void {
    if (!id) {
      this.error = 'Cannot delete graph: missing ID';
      return;
    }

    this.graphToDelete = {
      id,
      name: name || 'Unnamed Graph' // Provide a fallback for missing name
    };
    this.showDeleteModal = true;
  }

  // Confirm delete graph
  confirmDeleteGraph(): void {
    if (!this.graphToDelete) return;

    this.deleteInProgress = true;
    const id = this.graphToDelete.id;

    this.graphService.deleteGraph(id).subscribe({
      next: () => {
        setTimeout(() => {
          this.loadGraphs();
          this.graphService.notifyGraphDeleted();
          this.resetDeleteState();
        }, 500);
      },
      error: (err: HttpErrorResponse) => {
        this.deleteInProgress = false;
        if (err.status === 404) {
          this.warning = 'Graph not found or already deleted';
          this.loadGraphs();
          this.resetDeleteState();
        } else {
          this.error = `Failed to delete graph: ${err.message}`;
          console.error('Error deleting graph:', err);
          this.resetDeleteState();
        }
      }
    });
  }

  // Cancel delete graph
  cancelDeleteGraph(): void {
    this.resetDeleteState();
  }

  // Reset delete modal state
  private resetDeleteState(): void {
    this.showDeleteModal = false;
    this.deleteInProgress = false;
    this.graphToDelete = null;
  }

  viewGraph(graph: Graph): void {
    if (!graph || !graph.id) {
      this.error = 'Cannot view graph: invalid graph data';
      return;
    }
    // Set current graph first
    this.graphService.setCurrentGraph(graph);
    // Then navigate to view-fancy
    this.router.navigate(['/view-fancy']);
  }

  isSelected(graph: Graph): boolean {
    return !!graph && !!graph.id && this.graphService.currentGraphId === graph.id;
  }

  // Method to manually refresh the graph list
  refreshGraphs(): void {
    this.loadGraphs();
  }

  exportGraph(graph: Graph): void {
    if (!graph || !graph.id) {
      this.error = 'Cannot export: invalid graph data';
      return;
    }

    this.graphService.exportGraph(graph.id);
  }
}
