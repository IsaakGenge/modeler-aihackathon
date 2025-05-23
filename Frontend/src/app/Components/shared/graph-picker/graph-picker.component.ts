// Frontend/src/app/Components/graph-picker/graph-picker.component.ts
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GraphService } from '../../../Services/Graph/graph.service';
import { Observable, Subscription } from 'rxjs';
import { ThemeService } from '../../../Services/Theme/theme.service';
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
  isCollapsed = false; // Track collapsed state

  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() graphSelected = new EventEmitter<string | null>();

  private subscriptions: Subscription = new Subscription();

  constructor(
    private graphService: GraphService,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) private platformId: Object
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

    // Only try to access localStorage in browser environment
    if (isPlatformBrowser(this.platformId)) {
      const savedState = localStorage.getItem('graphPickerCollapsed');
      if (savedState) {
        this.isCollapsed = savedState === 'true';
        // Emit initial collapsed state
        this.collapsedChange.emit(this.isCollapsed);
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;

    // Emit the new collapsed state
    this.collapsedChange.emit(this.isCollapsed);

    // Only save to localStorage in browser environment
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('graphPickerCollapsed', this.isCollapsed.toString());
    }
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

          // Emit the graph selected event with the ID
          this.graphSelected.emit(this.selectedGraphId);

          // Update the current graph in the service
          this.graphService.setCurrentGraph(graph);

          // Auto-collapse when a graph is selected and not already collapsed
          if (!this.isCollapsed) {
            this.toggleCollapse();
          }
        },
        error: (err) => {
          this.error = 'Failed to select graph';
          console.error('Error selecting graph:', err);
          // Emit null on error to indicate selection failed
          this.graphSelected.emit(null);
        }
      });
    } else {
      this.graphService.setCurrentGraph(null);
      // Explicitly emit null when no graph is selected
      this.graphSelected.emit(null);
    }
  }

  // Get the selected graph name for display when collapsed
  get selectedGraphName(): string {
    if (!this.selectedGraphId) return 'No graph selected';
    const graph = this.graphs.find(g => g.id === this.selectedGraphId);
    return graph ? graph.name : 'Unknown graph';
  }
}
