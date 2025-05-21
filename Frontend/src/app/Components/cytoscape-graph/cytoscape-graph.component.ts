// First, let's add this to the imports at the top

import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import cytoscape from 'cytoscape';


import type { NodeSingular } from 'cytoscape';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
import { NodeType } from '../../Models/node-type.model';
import { NodeVisualSetting, EdgeVisualSetting } from '../../Models/node-visual.model';
import { TypesService } from '../../Services/Types/types.service';
import { NodeService } from '../../Services/Node/node.service';
import { EdgeService } from '../../Services/Edge/edge.service';
import { DetailsPanelComponent } from '../details-panel/details-panel.component';


// Define default layout options that can be used throughout the application
export const DEFAULT_LAYOUT_OPTIONS = {
  name: 'cose',
  fit: true,
  directed: false,
  padding: 30, // Reduced from 50
  spacingFactor: 1.5, // Reduced from 3
  avoidOverlap: true,
  nodeDimensionsIncludeLabels: true,
  animate: false,
  animationDuration: 500,
  // cose-specific options
  nodeRepulsion: 5000, // Reduced from 10000
  idealEdgeLength: 100,
  edgeElasticity: 100,
  nestingFactor: 1.2,
  gravity: 80,
  numIter: 1000,
  coolingFactor: 0.99,
  minTemp: 1.0
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
  imports: [CommonModule, DetailsPanelComponent],
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
  @Input() graphId: string = '';
  @Output() positionsSaved = new EventEmitter<any>();

  public positionsChanged = false;
  public isSaving = false;

  // New input for layout configuration with a default value
  @Input() layoutConfig: any = DEFAULT_LAYOUT_OPTIONS;

  // New input for initial zoom level
  @Input() initialZoom: number = 1.5;

  // Add this with your other @Input properties
  @Input() wheelSensitivity: number = 0.8;

  @Output() nodeClicked = new EventEmitter<any>();
  @Output() edgeClicked = new EventEmitter<any>();
  @Output() layoutChanged = new EventEmitter<string>();

  private cy: any;
  private destroy$ = new Subject<void>();
  private nodeVisualSettings: Record<string, NodeVisualSetting> = {};
  private edgeVisualSettings: Record<string, EdgeVisualSetting> = {}

  // Default node visual setting for fallback
  private defaultNodeVisualSetting: NodeVisualSetting = {
    shape: 'ellipse',
    color: '#8A2BE2' // BlueViolet color
  };
  // Default node color for fallback
  private defaultNodeColor = '#8A2BE2'; // BlueViolet color

  private defaultEdgeVisualSetting: EdgeVisualSetting = {
    lineColor: '#757575',  // Grey
    lineStyle: 'solid',
    width: '1',
    targetArrowShape: 'triangle',
    curveStyle: 'bezier',
    lineOpacity: '0.8'
  };
  public isApplyingSaved = false;
  public selectedElement: any = null;

  constructor(private typesService: TypesService, private nodeService: NodeService, private edgeService: EdgeService, @Inject(PLATFORM_ID) private platformId: Object) {
    // Subscribe to node visual settings
    this.typesService.nodeVisualSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.nodeVisualSettings = settings;
        // Update cytoscape styles if the instance exists
        if (this.cy) {
          this.updateCytoscapeStyles();
        }
      });

    // Subscribe to edge visual settings
    this.typesService.edgeVisualSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.edgeVisualSettings = settings;
        // Update cytoscape styles if the instance exists
        if (this.cy) {
          this.updateCytoscapeStyles();
        }
      });
  }

  public applySavedLayout(forceRefresh: boolean = false): void {
    if (!this.cy || !this.graphId) {
      console.warn('Cannot apply saved layout: Cytoscape instance or graphId is missing');
      return;
    }

    this.isApplyingSaved = true;

    this.nodeService.getNodePositions(this.graphId, forceRefresh).subscribe({
      next: (response: any) => {
        if (response && response.positions) {
          console.log('Retrieved saved positions:', response.positions);

          // Apply the positions to each node
          Object.keys(response.positions).forEach(nodeId => {
            const node = this.cy.getElementById(nodeId);
            if (node) {
              const pos = response.positions[nodeId];
              // Ensure we're using numbers
              const x = Number(pos.x);
              const y = Number(pos.y);
              if (!isNaN(x) && !isNaN(y)) {
                node.position({ x, y });
                console.log(`Applied position to node ${nodeId}: (${x}, ${y})`);
              }
            }
          });

          // Fit the graph after applying positions
          this.cy.fit();

          // Apply zoom centered on the graph
          this.cy.zoom({
            level: this.initialZoom,
            position: this.cy.center()
          });

          console.log('Applied saved layout positions successfully');
          this.positionsChanged = false;
        } else {
          console.warn('No saved positions found for this graph');
        }

        this.isApplyingSaved = false;
      },
      error: (error) => {
        console.error('Error retrieving saved node positions:', error);
        // Error handling...
        this.isApplyingSaved = false;
      }
    });
  }

  public closeDetailsPanel(): void {
    this.selectedElement = null;
    // Also unselect in cytoscape
    if (this.cy) {
      this.cy.$(':selected').unselect();
    }
  }

  // Add handling for when the background is clicked to clear selection
  private handleBackgroundClick(): void {
    if (this.cy) {
      this.cy.on('tap', (event: any) => {
        // Check if we clicked on the background (not a node or edge)
        if (event.target === this.cy) {
          this.closeDetailsPanel();
        }
      });
    }
  }


  private debugPositionData(): void {
    console.log("=== POSITION DEBUGGING ===");

    // Check raw data
    console.log("Raw node array:", this.nodes);

    // Check positions in raw data
    this.nodes.forEach(node => {
      console.log(`Node ${node.id} DB data:`, {
        name: node.name,
        positionX: node.positionX,
        positionY: node.positionY,
        type: typeof node.positionX
      });
    });

    // Check current Cytoscape positions
    if (this.cy) {
      this.cy.nodes().forEach((node: any) => {
        console.log(`Node ${node.id()} Cytoscape position:`, node.position());
      });
    }

    console.log("=== END POSITION DEBUGGING ===");
  }

  public getNodePositions(): { [key: string]: { x: number, y: number } } {
    if (!this.cy) return {};

    const positions: { [key: string]: { x: number, y: number } } = {};
    this.cy.nodes().forEach((node: any) => {
      // Use POSITION (not renderedPosition) for consistent model coordinates
      const position = node.position();
      positions[node.id()] = {
        x: Math.round(position.x),
        y: Math.round(position.y)
      };

      // Log the node data for debugging
      console.log(`Saving position for node ${node.id()}, label: ${node.data('label')}, position: (${position.x}, ${position.y})`);
    });

    return positions;
  }

  private logNodeData(): void {
    console.log("Current nodes data:", this.nodes);

    if (this.cy) {
      console.log("Cytoscape nodes data:");
      this.cy.nodes().forEach((node: any) => {
        console.log(`Node ID: ${node.id()}, Label: ${node.data('label')}, Position: (${node.position().x}, ${node.position().y})`);
      });
    }
  }

  // Method to save positions to the backend
  public saveNodePositions(): void {
    if (!this.cy || !this.graphId) {
      console.warn('Cannot save positions: Cytoscape instance or graphId is missing');
      return;
    }

    this.isSaving = true;
    const positions = this.getNodePositions();

    this.nodeService.saveNodePositions(this.graphId, positions).subscribe({
      next: (response) => {
        console.log('Node positions saved successfully:', response);

        // Reset position tracking state
        this.positionsChanged = false;
        this.isSaving = false;

        // Force a full refresh of the layout from backend
        // Using forceRefresh option but no timestamp
        this.applySavedLayout(true);

        // Emit the saved positions
        this.positionsSaved.emit(positions);
      },
      error: (error) => {
        console.error('Error saving node positions:', error);
        this.isSaving = false;
      }
    });
  }


  private updateCytoscapeStyles(): void {
    if (!this.cy) return;

    this.isDarkMode$.pipe(
      takeUntil(this.destroy$),
      startWith(false) // Start with light mode as default
    ).subscribe(isDark => {
      const styles = this.getGraphStyles(isDark);
      this.cy.style(styles);
    });
  }

  ngOnInit(): void {
    // Load node types to ensure we have the visual settings
    this.typesService.loadNodeTypes();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initializeCytoscape();
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
  // Add this to the updateGraph method to clear selection when the graph is updated
  public async updateGraph(nodes: any[], edges: any[]): Promise<void> {
    console.log("Updating graph with new data:", { nodes, edges });

    // Clear any selected element when the graph is updated
    this.closeDetailsPanel();

    // Make a deep copy to ensure we don't lose data
    this.nodes = nodes.map(node => ({ ...node }));
    this.edges = edges.map(edge => ({ ...edge }));

    await this.initializeCytoscape();
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

    // Create layout-specific options to avoid cumulative spacing issues
    const baseOptions = { ...DEFAULT_LAYOUT_OPTIONS };

    // Add any layout-specific adjustments
    const layoutOptions = {
      ...baseOptions,
      name: layoutType,
      animate: true,
      animationDuration: 500,
      fit: true, // Ensure fit is always true
      padding: 30 // Keep consistent padding
    };

    // Different layout types may need different parameters
    switch (layoutType) {
      case LAYOUT_TYPES.BREADTHFIRST:
        layoutOptions.spacingFactor = 1.2;
        break;
      case LAYOUT_TYPES.CIRCLE:
        layoutOptions.spacingFactor = 1;
        break;
      case LAYOUT_TYPES.GRID:
        layoutOptions.spacingFactor = 1.1;
        break;
      case LAYOUT_TYPES.CONCENTRIC:
        layoutOptions.spacingFactor = 1.2;
        break;
      case LAYOUT_TYPES.COSE:
        layoutOptions.spacingFactor = 1.5;
        break;
      case LAYOUT_TYPES.RANDOM:
        layoutOptions.spacingFactor = 1.3;
        break;
    }

    // Update the component's layoutConfig
    this.layoutConfig = layoutOptions;

    // Apply the layout with a consistent approach
    let layout = this.cy.layout(layoutOptions);

    // Ensure proper zooming after layout completes
    layout.one('layoutstop', () => {
      // Fit the graph to view
      this.cy.fit();

      // Apply consistent zoom level
      this.cy.zoom({
        level: this.initialZoom,
        position: this.cy.center()
      });
    });

    layout.run();

    // Emit the layout change event
    this.layoutChanged.emit(layoutType);
  }

  private getGraphStyles(isDark: boolean): any[] {
    // Base node styles that apply to all nodes
    const baseNodeStyles = {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'color': '#fff',
      'width': 30, // Reduced from 60
      'height': 30, // Reduced from 60
      'font-size': 12, // Reduced from 14
      'text-outline-width': 2, // Reduced from 3
      'font-weight': 'bold',
      'text-wrap': 'ellipsis'
    };

    // Get all node type names from the available settings
    const nodeTypeNames = Object.keys(this.nodeVisualSettings);

    // Create node type-specific styles using the visual settings from the service
    const nodeTypeStyles = nodeTypeNames.map(typeName => ({
      selector: `node[nodeType="${typeName}"]`,
      style: {
        'background-color': this.nodeVisualSettings[typeName]?.color || this.defaultNodeVisualSetting.color,
        'text-outline-color': this.nodeVisualSettings[typeName]?.color || this.defaultNodeVisualSetting.color,
        'shape': this.nodeVisualSettings[typeName]?.shape || this.defaultNodeVisualSetting.shape
      }
    }));

    // Get all edge type names from the available settings
    const edgeTypeNames = Object.keys(this.edgeVisualSettings);

    // Create edge type-specific styles using the visual settings from the service
    const edgeTypeStyles = edgeTypeNames.map(typeName => ({
      selector: `edge[edgeType="${typeName}"]`,
      style: {
        'line-color': this.edgeVisualSettings[typeName]?.lineColor || this.defaultEdgeVisualSetting.lineColor,
        'line-style': this.edgeVisualSettings[typeName]?.lineStyle || this.defaultEdgeVisualSetting.lineStyle,
        'width': this.edgeVisualSettings[typeName]?.width || this.defaultEdgeVisualSetting.width,
        'target-arrow-shape': this.edgeVisualSettings[typeName]?.targetArrowShape || this.defaultEdgeVisualSetting.targetArrowShape,
        'curve-style': this.edgeVisualSettings[typeName]?.curveStyle || this.defaultEdgeVisualSetting.curveStyle,
        'opacity': this.edgeVisualSettings[typeName]?.lineOpacity || this.defaultEdgeVisualSetting.lineOpacity,
        'target-arrow-color': this.edgeVisualSettings[typeName]?.lineColor || this.defaultEdgeVisualSetting.lineColor
      }
    }));

    const selectedStyles = {
      'background-color': '#2196F3',
      'line-color': '#2196F3',
      'target-arrow-color': '#2196F3',
      'text-outline-color': '#2196F3',
      'font-weight': 'bold'
    };

    // Add selection box styles
    const selectionBoxStyles = [
      {
        selector: 'core',  // This targets core Cytoscape functionality
        style: {
          'selection-box-color': isDark ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
          'selection-box-border-color': 'rgb(33, 150, 243)',
          'selection-box-border-width': '2px',
          'selection-box-opacity': 0.3,
          'outside-texture-bg-color': 'rgba(33, 150, 243, 0.1)',
          'outside-texture-bg-opacity': 0.5
        }
      },
      // Additional style for the active selection box
      {
        selector: ':active',  // This targets active elements during selection
        style: {
          'overlay-color': isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.1)',
          'overlay-padding': '8px',
          'overlay-opacity': 0.3
        }
      }
    ];

    // Return the complete style array
    return [
      {
        selector: 'node',
        style: {
          ...baseNodeStyles,
          'background-color': this.defaultNodeColor,
          'text-outline-color': this.defaultNodeColor,
          'shape': 'ellipse'
        }
      },
      // Add specific styles for each node type
      ...nodeTypeStyles,
      {
        selector: 'edge',
        style: {
          // Default edge styles
          'line-color': isDark ? '#6E6E6E' : '#9E9E9E',
          'target-arrow-color': isDark ? '#6E6E6E' : '#9E9E9E',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': 12,
          'text-rotation': 'autorotate',
          'color': isDark ? '#FFFFFF' : '#000000',
          'text-background-color': isDark ? '#333333' : '#F5F5F5',
          'text-background-opacity': 1,
          'text-background-padding': 3,
          'text-background-shape': 'roundrectangle',
          'text-outline-color': isDark ? '#000000' : '#FFFFFF',
          'text-outline-width': 1,
          'font-weight': 'bold'
        }
      },
      // Add specific styles for each edge type
      ...edgeTypeStyles,
      {
        selector: ':selected',
        style: selectedStyles
      },
      // Add the selection box styles
      ...selectionBoxStyles
    ];
  }

  private async initializeCytoscape(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      console.debug('Skipping Cytoscape initialization in SSR');
      return;
    }
    // Add safety check for container
    if (!this.cyContainer?.nativeElement) {
      console.warn('Cytoscape container is not available');
      return;
    }

    // Log raw node data for debugging
    console.log("Raw node data received:", JSON.stringify(this.nodes));
    this.nodes.forEach(node => {
      console.log(`Node ${node.id} (${node.name}): DB Position X=${node.positionX}, Y=${node.positionY}`);
    });

    // Create a node map for lookup (this will help with edge references)
    const nodeMap = new Map();
    this.nodes.forEach(node => {
      nodeMap.set(node.id, node.name || 'Unnamed Node');
    });

    // Create Cytoscape nodes with positions included directly
    const cytoscapeNodes = this.nodes.map(node => {
      // Basic node data with parent property if available
      const nodeData: any = {
        data: {
          id: String(node.id),
          label: node.name || 'Unnamed Node',
          nodeType: node.nodeType || NodeType.Default,
          parent: node.parent ? String(node.parent) : undefined, // Add parent reference
        }
      };

      // If position data exists, include it in the node
      if (node.positionX !== undefined && node.positionY !== undefined) {
        // Ensure we have valid numeric positions
        const x = Number(node.positionX);
        const y = Number(node.positionY);

        if (!isNaN(x) && !isNaN(y)) {
          // @ts-ignore - TypeScript may complain about this structure
          nodeData.position = { x, y };
        }
      }

      return nodeData;
    });

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
        label: edge.edgeType || `${nodeMap.get(edge.source)} → ${nodeMap.get(edge.target)}`,
        edgeType: edge.edgeType
      }
    }));

    // If cy already exists, destroy it first
    if (this.cy) {
      this.cy.destroy();
    }

    try {
      // Initialize with light mode styles
      const initialStyles = this.getGraphStyles(false);

      // Check if positions are available and valid
      const hasValidPositions = this.nodes.some(
        node => node.positionX !== undefined &&
          node.positionY !== undefined &&
          !isNaN(Number(node.positionX)) &&
          !isNaN(Number(node.positionY))
      );

      console.log('Has valid saved positions:', hasValidPositions);

      // Adjust layout settings based on whether we have positions
      let initialLayout = { ...this.layoutConfig };

      if (hasValidPositions) {
        // If we have positions, don't run the automatic layout
        initialLayout = {
          name: 'preset', // 'preset' uses the positions we'll set
          fit: true,
          padding: 50
        };
      }

      // Register the extension with Cytoscape
  

      // Create the Cytoscape instance
      this.cy = cytoscape({
        container: this.cyContainer.nativeElement,
        elements: {
          nodes: cytoscapeNodes,
          edges: cytoscapeEdges
        },
        style: initialStyles,
        layout: initialLayout,
        wheelSensitivity: this.wheelSensitivity
      });

      // Configure the compound drag and drop extension with proper options
      // Dynamically load and initialize the compound drag and drop extension
      try {
        const compoundDragAndDrop = (await import('cytoscape-compound-drag-and-drop')).default;
        cytoscape.use(compoundDragAndDrop);

        // Configure the compound drag and drop extension
        if (this.cy.compoundDragAndDrop) {
          this.cy.compoundDragAndDrop({
            dropTarget: (node: NodeSingular) => node.isParent(),
            overThreshold: 10,
            outThreshold: 10,
            grabbedNodeClassName: {
              active: 'cy-compound-dnd-grabbed-node',
              inactive: 'cy-compound-dnd-grabbed-node-inactive'
            },
            dropTargetClassName: {
              active: 'cy-compound-dnd-drop-target-active',
              over: 'cy-compound-dnd-drop-target-over'
            },
            dropTaskFunction: (grabbedNode: NodeSingular, dropTarget: NodeSingular) => {
              if (dropTarget && grabbedNode) {
                grabbedNode.move({ parent: dropTarget.id() });
                return true;
              }
              return false;
            }
          });
        }
      } catch (err) {
        console.warn('Failed to initialize compound drag and drop:', err);
      }

      // Debug data after Cytoscape is created
      this.debugPositionData();

      // Apply positions again for safety (sometimes preset layout doesn't work)
      if (hasValidPositions) {
        // Force positions with a small delay to ensure Cytoscape is ready
        setTimeout(() => {
          this.nodes.forEach(node => {
            if (node.positionX !== undefined && node.positionY !== undefined) {
              const x = Number(node.positionX);
              const y = Number(node.positionY);

              if (!isNaN(x) && !isNaN(y)) {
                const cyNode = this.cy.getElementById(String(node.id));
                if (cyNode) {
                  cyNode.position({ x, y });
                  console.log(`Force-set node ${node.id} position to database values: (${x}, ${y})`);
                }
              }
            }
          });

          // Debug after setting positions
          this.debugPositionData();

          // Fit view after positions are set
          this.cy.fit();

          // Apply zoom centered on the graph
          this.cy.zoom({
            level: this.initialZoom,
            position: this.cy.center()
          });
        }, 100);
      } else {
        // Run an automatic layout if no positions are stored
        setTimeout(() => {
          if (this.cy && this.cy.elements().length > 0) {
            const animatedLayout = {
              ...this.layoutConfig,
              animate: true
            };
            this.cy.layout(animatedLayout).run();

            // After layout is done
            setTimeout(() => {
              // Fit view
              this.cy.fit();

              // Apply zoom centered on the graph
              this.cy.zoom({
                level: this.initialZoom,
                position: this.cy.center()
              });

              // Debug final positions
              this.debugPositionData();
            }, 1000);
          }
        }, 100);
      }

      // Subscribe to dark mode changes
      this.isDarkMode$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
        const styles = this.getGraphStyles(isDark);
        if (this.cy) {
          this.cy.style(styles);
        }
      });

      // Add event handlers
      this.cy.on('tap', 'node', (event: any) => {
        const node = event.target;
        console.log('Node clicked:', node.id(), node.data('label'), 'Type:', node.data('nodeType'));

        // Set the selected element (this will be passed to the details panel)
        this.selectedElement = {
          type: 'node',
          data: {
            id: node.id(),
            label: node.data('label'),
            nodeType: node.data('nodeType')
          }
        };

        // Emit the node click event for parent components
        this.nodeClicked.emit({
          id: node.id(),
          label: node.data('label'),
          nodeType: node.data('nodeType')
        });
      });

      this.cy.on('tap', 'edge', (event: any) => {
        const edge = event.target;
        console.log('Edge clicked:', edge.id(), edge.data('label'));

        // Set the selected element (this will be passed to the details panel)
        this.selectedElement = {
          type: 'edge',
          data: {
            id: edge.id(),
            label: edge.data('label'),
            source: edge.data('source'),
            target: edge.data('target'),
            sourceLabel: edge.data('sourceLabel'),
            targetLabel: edge.data('targetLabel'),
            edgeType: edge.data('edgeType')
          }
        };

        // Emit the edge click event for parent components
        this.edgeClicked.emit({
          id: edge.id(),
          label: edge.data('label'),
          source: edge.data('source'),
          target: edge.data('target')
        });
      });

      // Set up background click handling
      this.handleBackgroundClick();

      // Add position change tracking
      this.cy.on('position', 'node', () => {
        this.positionsChanged = true;
      });

      // Add drag end event to check positions
      this.cy.on('dragfree', 'node', () => {
        this.positionsChanged = true;
      });

      // Event handlers for compound drag and drop
      this.cy.on('cdndover', (event: any, dropTarget: NodeSingular, grabbedNode: NodeSingular) => {
        console.log(`Node ${grabbedNode.id()} is over potential parent ${dropTarget.id()}`);
      });

      this.cy.on('cdndout', (event: any, dropTarget: NodeSingular, grabbedNode: NodeSingular) => {
        console.log(`Node ${grabbedNode.id()} moved out from potential parent ${dropTarget.id()}`);
      });

      this.cy.on('cdnddrop', (event: any, dropTarget: NodeSingular, grabbedNode: NodeSingular) => {
        console.log(`Node ${grabbedNode.id()} was dropped into parent ${dropTarget.id()}`);
        // Update your data model or service to reflect the parent-child relationship
        this.positionsChanged = true;
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
