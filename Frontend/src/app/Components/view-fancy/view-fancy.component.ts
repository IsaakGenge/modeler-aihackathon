// Frontend/src/app/Components/view-fancy/view-fancy.component.ts
import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { CreateNodeComponent } from '../create-node/create-node.component';
import { CreateEdgeComponent } from '../create-edge/create-edge.component';
import { GraphPickerComponent } from '../graph-picker/graph-picker.component';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CytoscapeGraphComponent } from '../cytoscape-graph/cytoscape-graph.component';

@Component({
  selector: 'app-view-fancy',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CreateNodeComponent,
    CreateEdgeComponent,
    GraphPickerComponent,
    NgbNavModule,
    CytoscapeGraphComponent
  ],
  templateUrl: './view-fancy.component.html',
  styleUrl: './view-fancy.component.css'
})
export class ViewFancyComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  @ViewChild(CytoscapeGraphComponent) private cytoscapeGraph!: CytoscapeGraphComponent;

  loading: boolean = false;
  error: string | null = null;
  warning: string | null = null;
  activeTab = 1; // Default active tab (1 for node panel, 2 for edge panel, 3 for graph panel)
  isDarkMode$: Observable<boolean>;
  hasSelectedGraph: boolean = false;
  toolsPanelCollapsed: boolean = false;

  // Data for the graph
  graphNodes: any[] = [];
  graphEdges: any[] = [];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private edgeService: EdgeService,
    private nodeService: NodeService,
    private graphService: GraphService,
    private themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    // Load saved tools panel state
    if (typeof localStorage !== 'undefined') {
      const savedState = localStorage.getItem('toolsPanelCollapsed');
      this.toolsPanelCollapsed = savedState === 'true';
    }
    this.graphService.currentGraph$
      .pipe(takeUntil(this.destroy$))
      .subscribe(graph => {
        this.hasSelectedGraph = !!graph;
        if (this.hasSelectedGraph) {
          console.log('Graph selected in fancy view:', graph);
          // Add setTimeout to ensure DOM is updated
          setTimeout(() => {
            this.loadGraphData();
          });
        } else {
          this.graphNodes = [];
          this.graphEdges = [];
          this.warning = 'Please select a graph to view its data.';
        }
      });

    this.setupEventSubscriptions();
  }

  toggleToolsPanel(): void {
    this.toolsPanelCollapsed = !this.toolsPanelCollapsed;

    // Trigger a resize event after the panel is toggled
    // This ensures the cytoscape graph redraws correctly
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));

      // Fit the graph to view after resize
      if (this.cytoscapeGraph) {
        this.cytoscapeGraph.fitGraph();
      }
    }, 300);

    // Optionally, save the state to localStorage if you want it to persist
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('toolsPanelCollapsed', this.toolsPanelCollapsed.toString());
    }
  }

  // Separate method to set up event subscriptions for better organization
  private setupEventSubscriptions(): void {
    // Subscribe to node creation events
    this.subscriptions.add(
      this.nodeService.nodeCreated$.subscribe(() => {
        console.log('Node created event received');
        this.loadGraphData();
      })
    );

    // Subscribe to node deletion events
    this.subscriptions.add(
      this.nodeService.nodeDeleted$.subscribe(() => {
        console.log('Node deleted event received');
        this.loadGraphData();
      })
    );

    // Subscribe to edge creation events
    this.subscriptions.add(
      this.edgeService.edgeCreated$.subscribe(() => {
        console.log('Edge created event received');
        this.loadGraphData();
      })
    );

    // Subscribe to edge deletion events
    this.subscriptions.add(
      this.edgeService.edgeDeleted$.subscribe(() => {
        console.log('Edge deleted event received');
        this.loadGraphData();
      })
    );
  }

  ngAfterViewInit(): void {
    // Any post-view initialization can go here if needed
  }

  ngOnDestroy(): void {
    // Trigger the destroy subject
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up all subscriptions
    this.subscriptions.unsubscribe();
  }

  loadGraphData(): void {
    // Don't load data if no graph is selected
    if (!this.graphService.currentGraphId) {
      this.warning = 'Please select a graph to view its data.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.warning = null;

    console.log('Loading graph data for GraphId:', this.graphService.currentGraphId);

    // Use forkJoin to get both edges and nodes in parallel with error handling
    forkJoin({
      edges: this.edgeService.getEdges(this.graphService.currentGraphId).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.warning = 'No connections found in this graph';
            return of([]);
          }
          this.error = 'Failed to load connection data';
          console.error('Error fetching edge data:', err);
          return of([]);
        })
      ),
      nodes: this.nodeService.getNodes(this.graphService.currentGraphId).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.warning = 'No nodes found in this graph';
            return of([]);
          }
          this.error = 'Failed to load node data';
          console.error('Error fetching node data:', err);
          return of([]);
        })
      )
    }).subscribe({
      next: (result) => {
        console.log('Graph data loaded:', result);
        this.graphNodes = result.nodes;
        this.graphEdges = result.edges;

        // Update the cytoscape graph if it exists
        if (this.cytoscapeGraph) {
          this.cytoscapeGraph.updateGraph(this.graphNodes, this.graphEdges);
        }

        this.loading = false;

        // Show warning if no data to display
        if (this.graphNodes.length === 0 && this.graphEdges.length === 0) {
          this.warning = 'No data to display. Try adding nodes and connections.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load graph data';
        console.error('Unexpected error in forkJoin:', err);
      }
    });
  }

  // Event handlers for graph interactions
  onNodeClicked(node: any): void {
    console.log('Node clicked in parent component:', node);
    // Handle node click in the parent component if needed
  }

  onEdgeClicked(edge: any): void {
    console.log('Edge clicked in parent component:', edge);
    // Handle edge click in the parent component if needed
  }
  onLayoutChanged(layoutType: string): void {
    console.log('Layout changed to:', layoutType);
    // You can add logic here to remember user preferences
  }
}
