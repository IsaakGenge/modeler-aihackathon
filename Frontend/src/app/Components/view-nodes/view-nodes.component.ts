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

  constructor(private nodeService: NodeService) { }

  ngOnInit(): void {
    // Get nodes on component initialization
    this.getNodes();

    // Subscribe to node creation events
    this.nodeCreatedSubscription = this.nodeService.nodeCreated$.subscribe(() => {
      this.getNodes();
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    this.nodeCreatedSubscription.unsubscribe();
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
}
