import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape from 'cytoscape';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { CreateNodeComponent } from '../create-node/create-node.component';
import { CreateEdgeComponent } from '../create-edge/create-edge.component';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-view-fancy',
  standalone: true,
  imports: [
    CommonModule,
    CreateNodeComponent,
    CreateEdgeComponent,
    NgbNavModule
  ],
  templateUrl: './view-fancy.component.html',
  styleUrl: './view-fancy.component.css'
})
export class ViewFancyComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('cyContainer', { static: true }) private cyContainer!: ElementRef;
  private cy: any;
  loading: boolean = false;
  error: string | null = null;
  warning: string | null = null;
  activeTab = 1; // Default active tab (1 for node panel, 2 for edge panel)
  isDarkMode$: Observable<boolean>;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private edgeService: EdgeService,
    private nodeService: NodeService,
    private themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.loadGraphData();
    this.setupEventSubscriptions();
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
    // Clean up all subscriptions to prevent memory leaks
    this.subscriptions.unsubscribe();

    // Clean up cytoscape instance
    if (this.cy) {
      this.cy.destroy();
    }
  }

  loadGraphData(): void {
    this.loading = true;
    this.error = null;
    this.warning = null;

    console.log('Loading graph data...');

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
          if (err.status === 404) {
            this.warning = 'No nodes found';
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
    console.log('Initializing cytoscape with nodes:', nodes.length, 'edges:', edges.length);

    // Convert API data to Cytoscape format
    const cytoscapeNodes = nodes.map(node => ({
      data: {
        id: node.id,
        label: node.name || 'Unnamed Node'
      }
    }));

    const cytoscapeEdges = edges.map(edge => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.edgeType || this.generateEdgeLabel(edge.source, edge.target)
      }
    }));

    // If cy already exists, destroy it first to avoid memory leaks
    if (this.cy) {
      this.cy.destroy();
    }

    // Create new Cytoscape instance with the data
    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: [...cytoscapeNodes, ...cytoscapeEdges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#4CAF50',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': 'white',
            'width': 60,
            'height': 60,
            'font-size': 12
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
            'color': '#555',
            'text-background-color': '#fff',
            'text-background-opacity': 0.8
          }
        }
      ],
      layout: {
        name: 'circle'
      }
    });

    this.cy.on('tap', 'node', (event: any) => {
      const node = event.target;
      console.log('Node clicked:', node.id(), node.data('label'));
      // You could highlight the node, show details in a sidebar, etc.
    });

    // If there are no elements, show an info message
    if (cytoscapeNodes.length === 0 && cytoscapeEdges.length === 0) {
      console.info('No nodes or edges found to display in the graph');
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

