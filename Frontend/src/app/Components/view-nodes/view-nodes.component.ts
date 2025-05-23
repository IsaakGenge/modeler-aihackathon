// Frontend/src/app/Components/view-nodes/view-nodes.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../Services/Node/node.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TypesService } from '../../Services/Types/types.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-view-nodes',
  standalone: true,
  imports: [CommonModule, ConfirmationModalComponent],
  templateUrl: './view-nodes.component.html',
  styleUrl: './view-nodes.component.css'
})
export class ViewNodesComponent implements OnInit, OnDestroy {
  @Output() nodeSelected = new EventEmitter<any>();

  nodeData: any[] = [];
  loading: boolean = false;
  error: string | null = null;
  warning: string | null = null;

  // Modal properties
  showDeleteModal: boolean = false;
  deleteInProgress: boolean = false;
  deleteError: string | null = null;
  nodeToDelete: string | null = null;

  private nodeCreatedSubscription: Subscription = new Subscription();
  private nodeDeletedSubscription: Subscription = new Subscription();
  private graphChangeSubscription: Subscription = new Subscription();
  private currentGraphId: string | null = null;

  constructor(
    private nodeService: NodeService,
    private graphService: GraphService,
    private typesService: TypesService
  ) { }

  ngOnInit(): void {
    // Subscribe to graph changes
    this.graphChangeSubscription = this.graphService.currentGraph$.subscribe(graph => {
      this.currentGraphId = graph?.id || null;
      if (this.currentGraphId) {
        this.getNodes(this.currentGraphId);
      } else {
        // Clear nodes if no graph is selected
        this.nodeData = [];
      }
    });

    // Subscribe to node creation events
    this.nodeCreatedSubscription = this.nodeService.nodeCreated$.subscribe(() => {
      if (this.currentGraphId) {
        this.getNodes(this.currentGraphId);
      }
    });

    // Subscribe to node deletion events
    this.nodeDeletedSubscription = this.nodeService.nodeDeleted$.subscribe(() => {
      if (this.currentGraphId) {
        this.getNodes(this.currentGraphId);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.nodeCreatedSubscription.unsubscribe();
    this.nodeDeletedSubscription.unsubscribe();
    this.graphChangeSubscription.unsubscribe();
  }

  // Method to handle node selection
  selectNode(node: any): void {
    // Stop propagation to prevent delete button from triggering selection
    event?.stopPropagation();

    // Add a visual indication of selection
    const nodeCards = document.querySelectorAll('.node-card');
    nodeCards.forEach(card => card.classList.remove('selected-row'));

    // Find the clicked card and add selected class
    const nodeIndex = this.nodeData.findIndex(n => n.id === node.id);
    if (nodeIndex >= 0 && nodeIndex < nodeCards.length) {
      nodeCards[nodeIndex].classList.add('selected-row');
    }

    // Emit the selected node to parent component
    this.nodeSelected.emit(node);
  }

  getNodes(graphId?: string): void {
    this.loading = true;
    this.error = null;
    this.warning = null;

    this.nodeService.getNodes(graphId).subscribe({
      next: (data) => {
        this.nodeData = data;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;

        if (err.status === 404) {
          // Handle 404 as "no content" rather than an error
          this.warning = 'No nodes found';
          this.nodeData = []; // Ensure empty array
        } else {
          // Handle other errors normally
          this.error = 'Failed to load node data';
          console.error('Error fetching node data:', err);
        }
      }
    });
  }

  getNodeVisualStyle(nodeType: string): { [key: string]: string } {
    const visualSetting = this.typesService.getNodeVisualSetting(nodeType);

    return {
      'background-color': visualSetting.color || '#8A2BE2',
      'border-radius': visualSetting.shape === 'ellipse' ? '50%' :
        visualSetting.shape === 'rectangle' ? '0%' : '10%'
    };
  }

  // Helper method to get count of properties
  getPropertyCount(properties: { [key: string]: string }): number {
    return properties ? Object.keys(properties).length : 0;
  }

  // Helper method to convert properties to an array for ngFor
  getPropertyEntries(properties: { [key: string]: string }): { key: string, value: string }[] {
    if (!properties) return [];
    return Object.entries(properties).map(([key, value]) => ({ key, value }));
  }

  // Show delete confirmation modal
  initiateDeleteNode(id: string, event?: MouseEvent): void {
    // Stop event propagation to prevent card selection when clicking delete
    event?.stopPropagation();

    this.nodeToDelete = id;
    this.showDeleteModal = true;
    this.deleteError = null;
  }

  // Handle confirmed deletion
  confirmDelete(): void {
    if (!this.nodeToDelete) return;

    this.deleteInProgress = true;
    this.deleteError = null;

    this.nodeService.deleteNode(this.nodeToDelete).subscribe({
      next: () => {
        this.nodeService.notifyNodeDeleted();
        this.resetDeleteState();
      },
      error: (err: HttpErrorResponse) => {
        this.deleteInProgress = false;

        if (err.status === 404) {
          this.warning = 'Node not found or already deleted';
          this.resetDeleteState();
        } else {
          this.deleteError = 'Failed to delete node';
          // Explicitly set showDeleteModal to true for non-404 errors
          this.showDeleteModal = true;
          console.error('Error deleting node:', err);
        }
      }
    });
  }

  // Handle cancel deletion
  cancelDelete(): void {
    this.resetDeleteState();
  }

  // Reset delete modal state
  private resetDeleteState(): void {
    this.showDeleteModal = false;
    this.deleteInProgress = false;
    this.deleteError = null;
    this.nodeToDelete = null;
  }
}
