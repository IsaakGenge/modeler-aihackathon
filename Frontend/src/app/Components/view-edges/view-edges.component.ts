// Frontend/src/app/Components/view-edges/view-edges.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-view-edges',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-edges.component.html',
  styleUrl: './view-edges.component.css'
})
export class ViewEdgesComponent implements OnInit, OnDestroy {
  edgeData: any[] = [];
  nodeMap: Map<string, string> = new Map(); // Map to store node id -> node name
  loading: boolean = false;
  error: string | null = null;
  warning: string | null = null;
  private edgeCreatedSubscription: Subscription = new Subscription();
  private edgeDeletedSubscription: Subscription = new Subscription();
  private nodeChangedSubscription: Subscription = new Subscription();

  constructor(
    private edgeService: EdgeService,
    private nodeService: NodeService
  ) { }

  ngOnInit(): void {
    // Get edges and nodes on component initialization
    this.loadData();

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
    this.edgeCreatedSubscription.unsubscribe();
    this.edgeDeletedSubscription.unsubscribe();
    this.nodeChangedSubscription.unsubscribe();
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

  deleteEdge(id: string): void {
    if (confirm('Are you sure you want to delete this connection?')) {
      this.loading = true;
      this.error = null;
      this.warning = null;

      this.edgeService.deleteEdge(id).subscribe({
        next: () => {
          this.edgeService.notifyEdgeDeleted();
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;

          if (err.status === 404) {
            this.warning = 'Connection not found or already deleted';
          } else {
            this.error = 'Failed to delete connection';
            console.error('Error deleting edge:', err);
          }
        }
      });
    }
  }
}

