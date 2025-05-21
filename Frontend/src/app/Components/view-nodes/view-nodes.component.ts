import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../Services/Node/node.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TypesService } from '../../Services/Types/types.service'

declare var bootstrap: any;

@Component({
  selector: 'app-view-nodes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-nodes.component.html',
  styleUrl: './view-nodes.component.css'
})
export class ViewNodesComponent implements OnInit, AfterViewInit, OnDestroy {
  nodeData: any[] = [];
  loading: boolean = false;
  error: string | null = null;
  warning: string | null = null;
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

  ngAfterViewInit(): void {
    this.initializeTooltips();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.nodeCreatedSubscription.unsubscribe();
    this.nodeDeletedSubscription.unsubscribe();
    this.graphChangeSubscription.unsubscribe();
  }

  getNodes(graphId?: string): void {
    this.loading = true;
    this.error = null;
    this.warning = null;

    this.nodeService.getNodes(graphId).subscribe({
      next: (data) => {
        this.nodeData = data;
        this.loading = false;
        // Initialize tooltips after data is loaded
        setTimeout(() => this.initializeTooltips(), 0);
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

  deleteNode(id: string): void {
    if (confirm('Are you sure you want to delete this node?')) {
      this.loading = true;
      this.error = null;
      this.warning = null;

      this.nodeService.deleteNode(id).subscribe({
        next: () => {
          this.nodeService.notifyNodeDeleted();
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;

          if (err.status === 404) {
            this.warning = 'Node not found or already deleted';
          } else {
            this.error = 'Failed to delete node';
            console.error('Error deleting node:', err);
          }
        }
      });
    }
  }

  private initializeTooltips(): void {
    // Check if we're in a browser environment
    if (typeof document !== 'undefined') {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      if (tooltipTriggerList.length > 0 && typeof bootstrap !== 'undefined') {
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
      }
    }
  }
}
