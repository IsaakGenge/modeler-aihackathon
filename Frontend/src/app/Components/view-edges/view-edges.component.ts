// Frontend/src/app/Components/view-edges/view-edges.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-view-edges',
  standalone: true,
  imports: [CommonModule, ConfirmationModalComponent],
  templateUrl: './view-edges.component.html',
  styleUrl: './view-edges.component.css'
})
export class ViewEdgesComponent implements OnInit, OnDestroy {
  @Output() edgeSelected = new EventEmitter<any>();

  edgeData: any[] = [];
  nodeMap: Map<string, string> = new Map(); // Map to store node id -> node name
  loading: boolean = false;
  error: string | null = null;
  warning: string | null = null;
  isDarkMode$: Observable<boolean>;

  // Modal properties
  showDeleteModal: boolean = false;
  deleteInProgress: boolean = false;
  deleteError: string | null = null;
  edgeToDelete: string | null = null;

  private edgeCreatedSubscription: Subscription = new Subscription();
  private edgeDeletedSubscription: Subscription = new Subscription();
  private nodeChangedSubscription: Subscription = new Subscription();
  private graphChangedSubscription: Subscription = new Subscription();

  constructor(
    private edgeService: EdgeService,
    private nodeService: NodeService,
    private themeService: ThemeService,
    private graphService: GraphService,
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    // Get edges and nodes on component initialization
    this.loadData();

    // Subscribe to graph changes
    this.graphChangedSubscription = this.graphService.currentGraph$.subscribe(() => {
      this.loadData();
    });

    // Subscribe to edge creation events
    this.edgeCreatedSubscription = this.edgeService.edgeCreated$.subscribe(() => {
      this.loadData();
    });

    // Subscribe to edge deletion events
    this.edgeDeletedSubscription = this.edgeService.edgeDeleted$.subscribe(() => {
      this.loadData();
    });

    // Subscribe to node changes (created or deleted)
    this.nodeChangedSubscription = this.nodeService.nodeCreated$.subscribe(() => {
      this.loadNodeData();
    });

    this.nodeChangedSubscription.add(
      this.nodeService.nodeDeleted$.subscribe(() => {
        this.loadNodeData();
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.graphChangedSubscription.unsubscribe();
    this.edgeCreatedSubscription.unsubscribe();
    this.edgeDeletedSubscription.unsubscribe();
    this.nodeChangedSubscription.unsubscribe();
  }

  // Method to handle edge selection
  selectEdge(edge: any): void {
    // Stop propagation to prevent delete button from triggering selection
    event?.stopPropagation();

    // Add a visual indication of selection
    const edgeRows = document.querySelectorAll('.edge-data table tbody tr');
    edgeRows.forEach(row => row.classList.remove('selected-row'));

    // Find the clicked row and add selected class
    const edgeIndex = this.edgeData.findIndex(e => e.id === edge.id);
    if (edgeIndex >= 0 && edgeIndex < edgeRows.length) {
      edgeRows[edgeIndex].classList.add('selected-row');
    }

    // Emit the selected edge to parent component
    this.edgeSelected.emit(edge);
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.warning = null;

    // Use forkJoin to get both edges and nodes in parallel with error handling
    forkJoin({
      edges: this.edgeService.getEdges().pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.warning = 'No connections found';
            return of([]);
          }
          this.error = 'Failed to load connection data';
          console.error('Error fetching edge data:', err);
          return of([]);
        })
      ),
      nodes: this.nodeService.getNodes().pipe(
        catchError((err: HttpErrorResponse) => {
          console.error('Error fetching node data:', err);
          return of([]);
        })
      )
    }).subscribe({
      next: (result) => {
        this.edgeData = result.edges;

        // Create a map of node ids to node names
        this.nodeMap.clear();
        result.nodes.forEach((node: any) => {
          this.nodeMap.set(node.id, node.name || 'Unnamed Node');
        });

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load data';
        console.error('Unexpected error in forkJoin:', err);
      }
    });
  }

  loadNodeData(): void {
    this.nodeService.getNodes().pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('Error fetching node data:', err);
        return of([]);
      })
    ).subscribe({
      next: (nodes) => {
        // Update the node map
        this.nodeMap.clear();
        nodes.forEach((node: any) => {
          this.nodeMap.set(node.id, node.name || 'Unnamed Node');
        });
      }
    });
  }

  getNodeName(nodeId: string): string {
    return this.nodeMap.get(nodeId) || `Unknown (${this.truncateId(nodeId)})`;
  }

  truncateId(id: string): string {
    return id.substring(0, 8) + '...';
  }

  // Helper method to get count of properties
  getPropertyCount(properties: { [key: string]: any }): number {
    return properties ? Object.keys(properties).length : 0;
  }

  // Helper method to convert properties to an array for ngFor
  getPropertyEntries(properties: { [key: string]: any }): { key: string, value: any }[] {
    if (!properties) return [];
    return Object.entries(properties).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    }));
  }

  // Show delete confirmation modal
  initiateDeleteEdge(id: string, event?: MouseEvent): void {
    // Stop event propagation to prevent row selection when clicking delete
    event?.stopPropagation();

    this.edgeToDelete = id;
    this.showDeleteModal = true;
    this.deleteError = null;
  }

  // Handle confirmed deletion
  confirmDelete(): void {
    if (!this.edgeToDelete) return;

    this.deleteInProgress = true;
    this.deleteError = null;

    this.edgeService.deleteEdge(this.edgeToDelete).subscribe({
      next: () => {
        this.edgeService.notifyEdgeDeleted();
        this.resetDeleteState();
        this.loading = false;
      },

      error: (err: HttpErrorResponse) => {
        this.deleteInProgress = false;
        this.loading = false;

        if (err.status === 404) {
          this.warning = 'Connection not found or already deleted';
          this.resetDeleteState();
        } else {
          this.deleteError = 'Failed to delete connection';
          console.error('Error deleting edge:', err);
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
    this.edgeToDelete = null;
  }
}
