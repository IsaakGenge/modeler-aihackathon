// Frontend/src/app/Components/graph-manager/graph-manager.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GraphService, Graph, CreateGraphDto } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

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
        this.graphs = data;
        this.loading = false;

        if (data.length === 0) {
          this.warning = 'No graphs available. Create your first graph to get started.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 404) {
          this.warning = 'No graphs found. Create your first graph to get started.';
          this.graphs = [];
        } else {
          this.error = 'Failed to load graphs';
          console.error('Error fetching graphs:', err);
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

    this.graphService.createGraph(newGraph)
      .subscribe({
        next: (response) => {
          this.success = true;
          this.resetForm();
          this.loadGraphs();
          // Notify other components that a graph has been created
          this.graphService.notifyGraphCreated();
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 400) {
            this.error = 'Invalid graph data. Please check your inputs.';
          } else {
            this.error = error.message || 'An error occurred while creating the graph.';
          }
          console.error('Error creating graph:', error);
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
      this.graphService.deleteGraph(id).subscribe({
        next: () => {
          this.loadGraphs();
          this.graphService.notifyGraphDeleted();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.warning = 'Graph not found or already deleted';
            this.loadGraphs();
          } else {
            this.error = 'Failed to delete graph';
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
}
