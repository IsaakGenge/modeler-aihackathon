import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Graph, CreateGraphDto } from '../../Models/graph.model';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { Router } from '@angular/router';
import { FileUploadModalComponent } from '../shared/file-upload-modal/file-upload-modal.component';
import { GraphGenerateComponent } from '../graph-generate/graph-generate.component';
import { ToolsPanelComponent } from '../shared/tools-panel/tools-panel.component';
import { ToolsPanelStateService } from '../../Services/ToolPanelState/tool-panel-state.service';
import { CreateGraphComponent } from '../shared/create-graph/create-graph.component';

@Component({
  selector: 'app-graph-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmationModalComponent,
    FileUploadModalComponent,
    GraphGenerateComponent,
    ToolsPanelComponent,
    CreateGraphComponent
  ],
  templateUrl: './graph-manager.component.html',
  styleUrl: './graph-manager.component.css'
})
export class GraphManagerComponent implements OnInit, OnDestroy {
  @Input() embedded: boolean = false;

  // Add properties for tools panel
  toolsPanelCollapsed = false;
  activeTab: number = 1;

  graphForm!: FormGroup;
  graphs: Graph[] = [];
  submitted = false;
  success = false;
  loading = false;
  error = '';
  warning = '';
  isDarkMode$: Observable<boolean>;

  // Collapsible section state
  isCreateSectionOpen: boolean = false;

  // Delete confirmation modal properties
  showDeleteModal = false;
  deleteInProgress = false;
  graphToDelete: { id: string, name: string } | null = null;

  //Import Modal properties
  showImportModal = false;
  importInProgress = false;
  importError = '';

  //Generate Modal properties
  showGenerateModal = false;
  generateInProgress = false;

  // Message timeout handling
  private readonly messageTimeout = 3000; // 3 seconds
  private messageTimeoutId: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private graphService: GraphService,
    private themeService: ThemeService,
    private router: Router,
    private toolsPanelStateService: ToolsPanelStateService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.graphForm = this.formBuilder.group({
      name: ['', [Validators.required]]
    });
    this.loadGraphs();

    // Initialize tools panel state from service or localStorage
    this.toolsPanelStateService.collapsed$.subscribe(collapsed => {
      this.toolsPanelCollapsed = collapsed;
    });

    if (typeof localStorage !== 'undefined') {
      const savedActiveTab = localStorage.getItem('activeTab');
      if (savedActiveTab !== null) {
        this.activeTab = parseInt(savedActiveTab, 10);
      }
    }
  }

  ngOnDestroy(): void {
    // Clear any active timeouts when component is destroyed
    if (this.messageTimeoutId) {
      clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }
  }

  // Handle tools panel collapsed state change
  onToolsPanelCollapsedChange(collapsed: boolean): void {
    this.toolsPanelCollapsed = collapsed;
    this.toolsPanelStateService.setCollapsed(collapsed);
  }

  // Handle tools panel active tab change
  onActiveTabChange(tabId: number): void {
    this.activeTab = tabId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('activeTab', tabId.toString());
    }
  }

  // Helper method to show messages with a timeout
  private showMessageWithTimeout(type: 'success' | 'error' | 'warning', message: string = ''): void {
    // Clear any existing timeout
    if (this.messageTimeoutId) {
      clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }

    // Reset all messages first
    this.success = false;
    this.error = '';
    this.warning = '';

    // Set the appropriate message
    if (type === 'success') {
      this.success = true;
    } else if (type === 'error') {
      this.error = message;
    } else if (type === 'warning') {
      this.warning = message;
    }

    // Set timeout to clear the message
    this.messageTimeoutId = setTimeout(() => {
      this.success = false;
      this.error = '';
      this.warning = '';
      this.messageTimeoutId = null;
    }, this.messageTimeout);
  }

  get f() {
    return this.graphForm.controls;
  }

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
          this.showMessageWithTimeout('warning', 'No graphs available. Create your first graph to get started.');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error loading graphs:', err); // Debug logging
        this.loading = false;
        if (err.status === 404) {
          this.showMessageWithTimeout('warning', 'No graphs found. Create your first graph to get started.');
          this.graphs = [];
        } else {
          this.showMessageWithTimeout('error', `Failed to load graphs: ${err.message}`);
        }
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;

    // Reset messages
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
          this.resetForm();

          // Use the timeout method for success message
          this.showMessageWithTimeout('success');

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

          let errorMessage = '';
          if (error.status === 500) {
            // Extract and display the server error message if available
            const serverError = error.error && typeof error.error === 'string'
              ? error.error
              : (error.error?.message || 'Unknown server error');

            errorMessage = `Server error (500): ${serverError}`;
          } else if (error.status === 400) {
            errorMessage = `Bad request: ${error.error || 'Invalid input data'}`;
          } else {
            errorMessage = error.message || 'An error occurred while creating the graph.';
          }

          this.showMessageWithTimeout('error', errorMessage);
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
      this.showMessageWithTimeout('error', 'Cannot delete graph: missing ID');
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
          this.showMessageWithTimeout('success');
        }, 500);
      },
      error: (err: HttpErrorResponse) => {
        this.deleteInProgress = false;
        if (err.status === 404) {
          this.showMessageWithTimeout('warning', 'Graph not found or already deleted');
          this.loadGraphs();
          this.resetDeleteState();
        } else {
          this.showMessageWithTimeout('error', `Failed to delete graph: ${err.message}`);
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
      this.showMessageWithTimeout('error', 'Cannot view graph: invalid graph data');
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
      this.showMessageWithTimeout('error', 'Cannot export: invalid graph data');
      return;
    }

    this.graphService.exportGraph(graph.id);
  }

  onFileUploadSubmit(data: { file: File, name?: string }): void {
    this.importInProgress = true;
    this.importError = '';

    this.graphService.importGraph(data.file, data.name).subscribe({
      next: (response) => {
        console.log('Import successful:', response);
        this.importInProgress = false;
        this.showImportModal = false;

        // Show success message with timeout
        this.showMessageWithTimeout('success');

        // Reload graphs
        setTimeout(() => {
          this.loadGraphs();
        }, 500);
      },
      error: (error: HttpErrorResponse) => {
        this.importInProgress = false;
        console.error('Error importing graph:', error);

        let errorMessage = '';
        if (error.status === 400) {
          errorMessage = `Invalid import file: ${error.error}`;
        } else if (error.status === 500) {
          errorMessage = `Server error: ${error.error}`;
        } else {
          errorMessage = error.message || 'Failed to import graph';
        }

        this.importError = errorMessage;
      }
    });
  }

  cancelImport(): void {
    this.showImportModal = false;
    this.importError = '';
  }

  onGraphGenerated(result: any): void {
    console.log('Graph generated successfully:', result);
    this.showGenerateModal = false;

    // Show success message with timeout
    this.showMessageWithTimeout('success');

    // Reload graphs
    setTimeout(() => {
      this.loadGraphs();
      this.graphService.notifyGraphCreated();
    }, 500);
  }

  onGraphCreated(graph: any): void {
    console.log('Graph created from create-graph component:', graph);
    this.loadGraphs();
    this.graphService.notifyGraphCreated();
    this.isCreateSectionOpen = false; // Close the creation panel after successful creation
  }

  cancelGenerate(): void {
    this.showGenerateModal = false;
  }
}
