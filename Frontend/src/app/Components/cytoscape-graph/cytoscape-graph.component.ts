// First, let's add this to the imports at the top
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape from 'cytoscape';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NodeType } from '../../Models/node-type.model';
import { NODE_VISUAL_SETTINGS } from '../../Models/node-visual.model';

// Define default layout options that can be used throughout the application
export const DEFAULT_LAYOUT_OPTIONS = {
  name: 'breadthfirst',
  fit: true,
  directed: false,
  padding: 30,
  circle: false,
  grid: false,
  spacingFactor: 1.75,
  avoidOverlap: true,
  nodeDimensionsIncludeLabels: false,
  animate: false,
  animationDuration: 500,
  animateFilter: function (node: any, i: number) { return true; },
  transform: function (node: any, position: any) { return position; }
};

// Define alternate layout types that can be used
export const LAYOUT_TYPES = {
  BREADTHFIRST: 'breadthfirst',
  CIRCLE: 'circle',
  GRID: 'grid',
  CONCENTRIC: 'concentric',
  COSE: 'cose',
  RANDOM: 'random'
};

@Component({
  selector: 'app-cytoscape-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cytoscape-graph.component.html',
  styleUrl: './cytoscape-graph.component.css'
})
export class CytoscapeGraphComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('cyContainer') private cyContainer!: ElementRef;
  @Input() nodes: any[] = [];
  @Input() edges: any[] = [];
  @Input() isDarkMode$!: Observable<boolean>;
  @Input() showLayoutControls: boolean = true;
  public availableLayouts = [
    { type: LAYOUT_TYPES.BREADTHFIRST, label: 'Hierarchical' },
    { type: LAYOUT_TYPES.CIRCLE, label: 'Circular' },
    { type: LAYOUT_TYPES.GRID, label: 'Grid' },
    { type: LAYOUT_TYPES.CONCENTRIC, label: 'Concentric' },
    { type: LAYOUT_TYPES.COSE, label: 'Force-Directed' },
    { type: LAYOUT_TYPES.RANDOM, label: 'Random' }
  ];

  // New input for layout configuration with a default value
  @Input() layoutConfig: any = DEFAULT_LAYOUT_OPTIONS;

  // New input for initial zoom level
  @Input() initialZoom: number = 1.5;

  @Output() nodeClicked = new EventEmitter<any>();
  @Output() edgeClicked = new EventEmitter<any>();
  @Output() layoutChanged = new EventEmitter<string>();


  private cy: any;
  private destroy$ = new Subject<void>();

  // Default node color for fallback
  private defaultNodeColor = '#8A2BE2'; // BlueViolet color

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initializeCytoscape();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up cytoscape instance
    if (this.cy) {
      this.cy.destroy();
    }
  }

  // Public method to reinitialize or update the graph
  public updateGraph(nodes: any[], edges: any[]): void {
    this.nodes = nodes;
    this.edges = edges;
    this.initializeCytoscape();
  }

  // Method to fit the graph to the view area
  public fitGraph(): void {
    if (this.cy) {
      this.cy.fit();
    }
  }

  // Method to apply zoom
  public applyZoom(level: number, position?: any): void {
    if (this.cy) {
      this.cy.zoom({
        level: level,
        position: position || this.cy.center()
      });
    }
  }

  public onLayoutChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const layoutType = select.value;
    this.changeLayoutType(layoutType);
  }

  public getLayoutIcon(layoutType: string): string {
    const icons: Record<string, string> = {
      [LAYOUT_TYPES.BREADTHFIRST]: 'bi-diagram-3',
      [LAYOUT_TYPES.CIRCLE]: 'bi-circle',
      [LAYOUT_TYPES.GRID]: 'bi-grid',
      [LAYOUT_TYPES.CONCENTRIC]: 'bi-record-circle',
      [LAYOUT_TYPES.COSE]: 'bi-asterisk',
      [LAYOUT_TYPES.RANDOM]: 'bi-shuffle'
    };

    return icons[layoutType] || 'bi-diagram-3';
  }

  // Method to apply a new layout
  public applyLayout(layoutOptions?: any): void {
    if (!this.cy) return;

    // Use provided options or default to the component's layoutConfig
    const options = layoutOptions || this.layoutConfig;

    // Enable animation for the layout change
    const animatedOptions = {
      ...options,
      animate: true
    };

    this.cy.layout(animatedOptions).run();
  }

  // Method to change the layout type
  public changeLayoutType(layoutType: string): void {
    if (!this.cy) return;

    // Create a new layout configuration with the new type
    const newLayout = {
      ...this.layoutConfig,
      name: layoutType,
      animate: true
    };

    this.layoutConfig = newLayout;
    this.applyLayout(newLayout);

    // Emit the layout change event
    this.layoutChanged.emit(layoutType);
  }

  private initializeCytoscape(): void {
    // Add safety check for container
    if (!this.cyContainer?.nativeElement) {
      console.warn('Cytoscape container is not available');
      return;
    }

    this.isDarkMode$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      const baseNodeStyles = {
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#fff',
        'width': 60,
        'height': 60,
        'font-size': 12,
        'text-outline-width': 2
      };

      // Base style for all nodes
      const styles = [
        {
          selector: 'node',
          style: {
            ...baseNodeStyles,
            'background-color': this.defaultNodeColor,
            'text-outline-color': this.defaultNodeColor,
            'shape': 'ellipse' // Default shape
          }
        },
        // Add specific styles for each node type
        ...Object.values(NodeType).map(type => ({
          selector: `node[nodeType="${type}"]`,
          style: {
            'background-color': NODE_VISUAL_SETTINGS[type as NodeType]?.color || this.defaultNodeColor,
            'text-outline-color': NODE_VISUAL_SETTINGS[type as NodeType]?.color || this.defaultNodeColor,
            'shape': NODE_VISUAL_SETTINGS[type as NodeType]?.shape || 'ellipse'
          }
        })),
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
    this.nodes.forEach(node => {
      nodeMap.set(node.id, node.name || 'Unnamed Node');
    });

    // Convert API data to Cytoscape format with proper string IDs and nodeType
    const cytoscapeNodes = this.nodes.map(node => ({
      data: {
        id: String(node.id),
        label: node.name || 'Unnamed Node',
        nodeType: node.nodeType || NodeType.Default // Make sure nodeType is included
      }
    }));

    // Filter and validate edges (ensure both source and target exist)
    const validEdges = this.edges.filter(edge => {
      return nodeMap.has(edge.source) && nodeMap.has(edge.target);
    });

    if (this.edges.length > validEdges.length) {
      console.warn(`Filtered out ${this.edges.length - validEdges.length} edges with invalid references`);
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
              'background-color': this.defaultNodeColor,
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#fff',
              'width': 60,
              'height': 60,
              'font-size': 12,
              'text-outline-color': this.defaultNodeColor,
              'text-outline-width': 2,
              'shape': 'ellipse' // Default shape
            }
          },
          // Add specific styles for each node type
          ...Object.values(NodeType).map(type => ({
            selector: `node[nodeType="${type}"]`,
            style: {
              'background-color': NODE_VISUAL_SETTINGS[type as NodeType]?.color || this.defaultNodeColor,
              'text-outline-color': NODE_VISUAL_SETTINGS[type as NodeType]?.color || this.defaultNodeColor,
              'shape': NODE_VISUAL_SETTINGS[type as NodeType]?.shape || 'ellipse'
            }
          })),
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
        // Use the configurable layout
        layout: this.layoutConfig,
        wheelSensitivity: 0.3
      });

      // Run the layout to ensure everything is positioned properly
      setTimeout(() => {
        if (this.cy && this.cy.elements().length > 0) {
          // Create a layout configuration with animation enabled for this run
          const animatedLayout = {
            ...this.layoutConfig,
            animate: true
          };

          this.cy.layout(animatedLayout).run();

          // Apply initial zoom - the higher the number, the more zoomed in
          if (cytoscapeNodes.length > 0) {
            // First fit to see all elements
            this.cy.fit();

            // Then apply the zoom centered on the graph
            this.cy.zoom({
              level: this.initialZoom,
              position: this.cy.center()
            });
          }
        }
      }, 100);

      // Add event handlers
      this.cy.on('tap', 'node', (event: any) => {
        const node = event.target;
        console.log('Node clicked:', node.id(), node.data('label'), 'Type:', node.data('nodeType'));
        this.nodeClicked.emit({
          id: node.id(),
          label: node.data('label'),
          nodeType: node.data('nodeType')
        });
      });

      this.cy.on('tap', 'edge', (event: any) => {
        const edge = event.target;
        console.log('Edge clicked:', edge.id(), edge.data('label'));
        this.edgeClicked.emit({
          id: edge.id(),
          label: edge.data('label'),
          source: edge.data('source'),
          target: edge.data('target')
        });
      });

      // Log success or empty state
      if (this.cy.elements().length === 0) {
        console.warn('Graph visualization is empty - no elements to display');
      } else {
        console.log(`Graph visualization initialized with ${cytoscapeNodes.length} nodes and ${cytoscapeEdges.length} edges`);
      }
    } catch (error) {
      console.error('Error initializing Cytoscape:', error);
    }
  }
}
