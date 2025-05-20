// Frontend/src/app/Components/graph-picker/graph-picker.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphService } from '../../Services/Graph/graph.service';
import { Observable, Subscription } from 'rxjs';
import { ThemeService } from '../../Services/Theme/theme.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-graph-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graph-picker.component.html',
  styleUrl: './graph-picker.component.css'
})
export class GraphPickerComponent implements OnInit, OnDestroy {
  graphs: any[] = [];
  selectedGraphId: string | null = null;
  loading = false;
  error = '';
  warning = '';
  isDarkMode$: Observable<boolean>;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private graphService: GraphService,
    private themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.loadGraphs();

    // Subscribe to graph changes
    this.subscriptions.add(
      this.graphService.currentGraph$.subscribe(graph => {
        this.selectedGraphId = graph?.id || null;
      })
    );

    // Subscribe to graph creation events
    this.subscriptions.add(
      this.graphService.graphCreated$.subscribe(() => {
        this.loadGraphs();
      })
    );

    // Subscribe to graph deletion events
    this.subscriptions.add(
      this.graphService.graphDeleted$.subscribe(() => {
        this.loadGraphs();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
          this.warning = 'No graphs available. Please create a graph to get started.';
        }
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 404) {
          this.warning = 'No graphs found. Please create a graph to get started.';
          this.graphs = [];
        } else {
          this.error = 'Failed to load graphs';
          console.error('Error fetching graphs:', err);
        }
      }
    });
  }

  onGraphSelect(): void {
    if (this.selectedGraphId) {
      this.graphService.setCurrentGraphById(this.selectedGraphId).subscribe({
        next: (graph) => {
          console.log('Graph selected:', graph.name);
        },
        error: (err) => {
          this.error = 'Failed to select graph';
          console.error('Error selecting graph:', err);
        }
      });
    } else {
      this.graphService.setCurrentGraph(null);
    }
  }
}
