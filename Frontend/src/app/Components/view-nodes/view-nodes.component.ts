import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../Services/Node/node.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-view-nodes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-nodes.component.html',
  styleUrl: './view-nodes.component.css'
})
export class ViewNodesComponent implements OnInit, OnDestroy {
  nodeData: any[] = [];
  loading: boolean = false;
  error: string | null = null;
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

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    this.nodeCreatedSubscription.unsubscribe();
    this.nodeDeletedSubscription.unsubscribe();
  }

  getNodes(): void {
    this.loading = true;
    this.nodeService.getNodes().subscribe({
      next: (data) => {
        this.nodeData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load node data';
        this.loading = false;
        console.error('Error fetching node data:', err);
      }
    });
  }

  deleteNode(id: string): void {
    if (confirm('Are you sure you want to delete this node?')) {
      this.loading = true;
      this.nodeService.deleteNode(id).subscribe({
        next: () => {
          this.nodeService.notifyNodeDeleted();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to delete node';
          this.loading = false;
          console.error('Error deleting node:', err);
        }
      });
    }
  }
}
