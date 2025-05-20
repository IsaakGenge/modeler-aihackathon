// Frontend/src/app/Components/view-fancy/view-fancy.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import cytoscape from 'cytoscape';
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

@Component({
  selector: 'app-view-fancy',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CreateNodeComponent,
    CreateEdgeComponent,
    GraphPickerComponent,   
    NgbNavModule
  ],
  templateUrl: './view-fancy.component.html',
  styleUrl: './view-fancy.component.css'
})
export class ViewFancyComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>(); 
  @ViewChild('cyContainer') private cyContainer!: ElementRef;
  private cy: any;
  loading: boolean = false;
  error: string | null = null;
  warning: string | null = null;
  activeTab = 1; // Default active tab (1 for node panel, 2 for edge panel, 3 for graph panel)
  isDarkMode$: Observable<boolean>;
  hasSelectedGraph: boolean = false;
  toolsPanelCollapsed: boolean = false;

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
          if (this.cy) {
            this.cy.elements().remove();
            console.log('Graph view cleared - no graph selected');
          }
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
      if (this.cy) {
        this.cy.fit();
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

    // Clean up cytoscape instance
    if (this.cy) {
      this.cy.destroy();
    }
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
        this.initializeCytoscape(result.nodes, result.edges);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load graph data';
        console.error('Unexpected error in forkJoin:', err);
      }
    });
  }

  private initializeCytoscape(nodes: any[], edges: any[]): void {
    console.log('Initializing cytoscape with nodes:', nodes, 'edges:', edges);

    // Add safety check for container
    if (!this.cyContainer?.nativeElement) {
      console.warn('Cytoscape container is not available');
      return;
    }

    // Define the new node color - using a nice purple instead of green
    const nodeColor = '#8A2BE2'; // BlueViolet color

    this.isDarkMode$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      const styles = [
        {
          selector: 'node',
          style: {
            'background-color': nodeColor,
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#fff',
            'width': 60,
            'height': 60,
            'font-size': 12,
            'text-outline-color': nodeColor,
            'text-outline-width': 2
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': isDark ? '#6E6E6E' : '#9E9E9E',
            'target-arrow-color': isDark ? '#6E6E6E' : '#9E9E9E',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': 10,
            'text-rotation': 'autorotate',
            'color': isDark ? '#E0E0E0' : '#555',
            'text-background-color': isDark ? '#424242' : '#fff',
            'text-background-opacity': 0.9
          }
        },
        {
          selector: ':selected',
          style: {
            'background-color': '#2196F3',
            'line-color': '#2196F3',
            'target-arrow-color': '#2196F3',
            'text-outline-color': '#2196F3',
            'font-weight': isDark ? 'bold' : 'normal'
          }
        }
      ];

      if (this.cy) {
        this.cy.style(styles);
      }
    });

    // Create a node map for lookup (this will help with edge references)
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.id, node.name || 'Unnamed Node');
    });

    // Convert API data to Cytoscape format with proper string IDs
    const cytoscapeNodes = nodes.map(node => ({
      data: {
        id: String(node.id),
        label: node.name || 'Unnamed Node'
      }
    }));

    // Filter and validate edges (ensure both source and target exist)
    const validEdges = edges.filter(edge => {
      return nodeMap.has(edge.source) && nodeMap.has(edge.target);
    });

    if (edges.length > validEdges.length) {
      console.warn(`Filtered out ${edges.length - validEdges.length} edges with invalid references`);
    }

    const cytoscapeEdges = validEdges.map(edge => ({
      data: {
        id: String(edge.id),
        source: String(edge.source),
        target: String(edge.target),
        sourceLabel: nodeMap.get(edge.source),
        targetLabel: nodeMap.get(edge.target),
        label: edge.edgeType || `${nodeMap.get(edge.source)} → ${nodeMap.get(edge.target)}`
      }
    }));

    // If cy already exists, destroy it first
    if (this.cy) {
      this.cy.destroy();
    }

    try {
      // Define the new node color
      const nodeColor = '#8A2BE2'; // BlueViolet color

      // Create new Cytoscape instance with the data
      this.cy = cytoscape({
        container: this.cyContainer.nativeElement,
        elements: {
          nodes: cytoscapeNodes,
          edges: cytoscapeEdges
        },
        style: [
          {
            selector: 'node',
            style: {
              'background-color': nodeColor,
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#fff',
              'width': 60,
              'height': 60,
              'font-size': 12,
              'text-outline-color': nodeColor,
              'text-outline-width': 2
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#9E9E9E',
              'target-arrow-color': '#9E9E9E',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': 10,
              'text-rotation': 'autorotate',
              'color': '#555',
              'text-background-color': '#fff',
              'text-background-opacity': 0.8
            }
          },
          {
            selector: ':selected',
            style: {
              'background-color': '#2196F3',
              'line-color': '#2196F3',
              'target-arrow-color': '#2196F3',
              'text-outline-color': '#2196F3'
            }
          }
        ],
        layout: {
          name: 'circle',
          fit: true,
          padding: 30,
          avoidOverlap: true
        },
        wheelSensitivity: 0.3
      });

      // Run the layout to ensure everything is positioned properly
      setTimeout(() => {
        if (this.cy && this.cy.elements().length > 0) {
          this.cy.layout({
            name: 'circle',
            animate: true,
            animationDuration: 500,
            fit: true,
            padding: 50
          }).run();

          // Apply initial zoom - the higher the number, the more zoomed in
          if (cytoscapeNodes.length > 0) {
            // Set initial zoom level - values > 1 are zoomed in
            const initialZoom = 1.5;

            // First fit to see all elements
            this.cy.fit();

            // Then apply the zoom centered on the graph
            this.cy.zoom({
              level: initialZoom,
              position: this.cy.center()
            });
          }
        }
      }, 100);

      // Add event handlers
      this.cy.on('tap', 'node', (event: any) => {
        const node = event.target;
        console.log('Node clicked:', node.id(), node.data('label'));
      });

      // Log success or empty state
      if (this.cy.elements().length === 0) {
        console.warn('Graph visualization is empty - no elements to display');
        this.warning = 'No data to display. Try adding nodes and connections.';
      } else {
        console.log(`Graph visualization initialized with ${cytoscapeNodes.length} nodes and ${cytoscapeEdges.length} edges`);
      }
    } catch (error) {
      console.error('Error initializing Cytoscape:', error);
      this.error = 'Failed to initialize graph visualization';
    }
  }


  // Helper method to generate a label for edges that don't have one
  private generateEdgeLabel(sourceId: string, targetId: string): string {
    if (!sourceId || !targetId) {
      return 'Connection';
    }

    // Safely create a shortened form of the IDs for the label
    const sourcePrefix = sourceId.substring(0, Math.min(4, sourceId.length));
    const targetPrefix = targetId.substring(0, Math.min(4, targetId.length));

    return `${sourcePrefix}→${targetPrefix}`;
  }
}
