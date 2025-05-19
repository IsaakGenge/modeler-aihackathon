import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../Services/Node/node.service';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

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

  constructor(private nodeService: NodeService) { }

  ngOnInit(): void {
    this.getNodes();

    // Subscribe to node creation events
    this.nodeCreatedSubscription = this.nodeService.nodeCreated$.subscribe(() => {
      this.getNodes();
    });

    // Subscribe to node deletion events
    this.nodeDeletedSubscription = this.nodeService.nodeDeleted$.subscribe(() => {
      this.getNodes();
    });
  }

  ngAfterViewInit(): void {
    this.initializeTooltips();
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    this.nodeCreatedSubscription.unsubscribe();
    this.nodeDeletedSubscription.unsubscribe();
  }

  getNodes(): void {
    this.loading = true;
    this.error = null;
    this.warning = null;

    this.nodeService.getNodes().subscribe({
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
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  }
}
