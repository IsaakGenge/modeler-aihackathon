// Frontend/src/app/Components/view-edges/view-edges.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdgeService } from '../../Services/Edge/edge.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-view-edges',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-edges.component.html',
  styleUrl: './view-edges.component.css'
})
export class ViewEdgesComponent implements OnInit, OnDestroy {
  edgeData: any[] = [];
  loading: boolean = false;
  error: string | null = null;
  private edgeCreatedSubscription: Subscription = new Subscription();

  constructor(private edgeService: EdgeService) { }

  ngOnInit(): void {
    // Get edges on component initialization
    this.getEdges();

    // Subscribe to edge creation events
    this.edgeCreatedSubscription = this.edgeService.edgeCreated$.subscribe(() => {
      this.getEdges();
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    this.edgeCreatedSubscription.unsubscribe();
  }

  getEdges(): void {
    this.loading = true;
    this.edgeService.getEdges().subscribe({
      next: (data) => {
        this.edgeData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load connection data';
        this.loading = false;
        console.error('Error fetching edge data:', err);
      }
    });
  }
}
