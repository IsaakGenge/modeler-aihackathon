// Frontend/src/app/Components/cytoscape-graph/cytoscape-graph.component.ts

import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import cytoscape from 'cytoscape';
import type { NodeSingular } from 'cytoscape';
import { Observable, Subject } from 'rxjs';
import { takeUntil, startWith, take } from 'rxjs/operators';
import { NodeVisualSetting, EdgeVisualSetting } from '../../Models/node-visual.model';
import { TypesService } from '../../Services/Types/types.service';
import { NodeService } from '../../Services/Node/node.service';
import { EdgeService } from '../../Services/Edge/edge.service';
import { DetailsPanelComponent } from '../details-panel/details-panel.component';

// Import newly created files
import {
  GraphNodeData,
  GraphEdgeData,
  CytoscapeNodeData,
  CytoscapeEdgeData,
  SelectedGraphElement,
  NodePositionsMap
} from './models/graph-models';
import {
  CytoscapeLayoutService,
  LAYOUT_TYPES,
  AVAILABLE_LAYOUTS,
  DEFAULT_LAYOUT_OPTIONS
} from './services/cytoscape-layout.service';
import { CytoscapeStylesService } from './services/cytoscape-styles.service';

@Component({
  selector: 'app-cytoscape-graph',
  standalone: true,
  imports: [CommonModule, DetailsPanelComponent],
  templateUrl: './cytoscape-graph.component.html',
  styleUrl: './cytoscape-graph.component.css',
  providers: [CytoscapeLayoutService, CytoscapeStylesService]
})
export class CytoscapeGraphComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('cyContainer') private cyContainer!: ElementRef;
  @Input() nodes: GraphNodeData[] = [];
  @Input() edges: GraphEdgeData[] = [];
  @Input() isDarkMode$!: Observable<boolean>;
  @Input() showLayoutControls: boolean = true;
  @Input() graphId: string = '';
  @Input() layoutConfig: any = DEFAULT_LAYOUT_OPTIONS;
  @Input() initialZoom: number = 1.5;
  @Input() wheelSensitivity: number = 1;

  @Output() positionsSaved = new EventEmitter<NodePositionsMap>();
  @Output() nodeClicked = new EventEmitter<any>();
  @Output() edgeClicked = new EventEmitter<any>();
  @Output() layoutChanged = new EventEmitter<string>();

  // Public properties
  public availableLayouts = AVAILABLE_LAYOUTS;
  public positionsChanged = false;
  public isSaving = false;
  public isApplyingSaved = false;
  public selectedElement: SelectedGraphElement | null = null;

  // Private properties
  private cy: cytoscape.Core | null = null;
  private destroy$ = new Subject<void>();
  private nodeVisualSettings: Record<string, NodeVisualSetting> = {};
  private edgeVisualSettings: Record<string, EdgeVisualSetting> = {};

  //Zoom properties
  private readonly ZOOM_FACTOR = 1.5; 
  private readonly MAX_ZOOM_LEVEL = 5.0; 
  private readonly MIN_ZOOM_LEVEL = 0.2; 



  constructor(
    private typesService: TypesService,
    private nodeService: NodeService,
    private edgeService: EdgeService,
    private layoutService: CytoscapeLayoutService,
    private stylesService: CytoscapeStylesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // Load node types to ensure we have the visual settings
    this.typesService.loadNodeTypes();

    // Subscribe to visual settings
    this.subscribeToVisualSettings();

    // Subscribe to node and edge updates
    this.subscribeToNodeUpdates();
    this.subscribeToEdgeUpdates();

    // Add subscriptions for deletions
    this.subscribeToNodeDeletions();
    this.subscribeToEdgeDeletions();
  }

  async ngAfterViewInit(): Promise<void> {
    setTimeout(async () => {
      await this.initializeCytoscape();
    }, 100); // 100ms delay
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up cytoscape instance
    if (this.cy) {
      this.cy.destroy();
    }
  }

  //
  // PUBLIC METHODS - GRAPH CONTROLS
  //

  /**
   * Applies saved layout from the backend
   */
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
          this.applyNodePositions(response.positions);

          // Reset tracking state
          this.positionsChanged = false;
        } else {
          console.warn('No saved positions found for this graph');
        }

        this.isApplyingSaved = false;
      },
      error: (error) => {
        console.error('Error retrieving saved node positions:', error);
        this.isApplyingSaved = false;
      }
    });
  }

  /**
   * Close the details panel and deselect any selected elements
   */
  public closeDetailsPanel(): void {
    // Store current viewport state before making changes
    const currentPan = this.cy ? { ...this.cy.pan() } : null;
    const currentZoom = this.cy ? this.cy.zoom() : null;

    // First update the selection state
    this.selectedElement = null;

    // Then handle cytoscape operations with proper null checks
    if (this.cy) {
      // Batch this operation to prevent multiple renders
      this.cy.batch(() => {
        // Clear selection
        this.cy?.$(":selected").unselect(); // Optional chaining to handle null case
      });

      // Restore viewport exactly as it was before selection changes
      if (currentPan && currentZoom) {
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          if (this.cy) { // Double-check cy is still valid when animation frame executes
            this.cy.viewport({
              zoom: currentZoom,
              pan: currentPan
            });
          }
        });
      }
    }
  }

  /**
   * Get the current positions of all nodes
   */
  public getNodePositions(): NodePositionsMap {
    if (!this.cy) return {};

    const positions: NodePositionsMap = {};
    this.cy.nodes().forEach((node: any) => {
      const position = node.position();
      positions[node.id()] = {
        x: Math.round(position.x),
        y: Math.round(position.y)
      };
    });

    return positions;
  }

  /**
   * Save node positions to the backend
   */
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

  /**
   * Update graph with new data
   */
  public async updateGraph(nodes: GraphNodeData[], edges: GraphEdgeData[], preservePositions: boolean = true): Promise<void> {
    console.log("Updating graph with new data:", { nodes, edges, preservePositions });

    // If there's no cytoscape instance or we don't want to preserve positions, perform full initialization
    if (!this.cy || !preservePositions) {
      // Clear any selected element when the graph is updated
      this.closeDetailsPanel();

      // Make a deep copy to ensure we don't lose data
      this.nodes = nodes.map(node => ({ ...node }));
      this.edges = edges.map(edge => ({ ...edge }));

      await this.initializeCytoscape();
      return;
    }

    // Get current node positions to preserve them
    const currentPositions = this.getNodePositions();

    // Store viewport state
    const currentPan = this.cy ? { ...this.cy.pan() } : null;
    const currentZoom = this.cy ? this.cy.zoom() : null;

    // Find new nodes (nodes that aren't already in the graph)
    const existingNodeIds = this.nodes.map(n => String(n.id));
    const newNodes = nodes.filter(n => !existingNodeIds.includes(String(n.id)));

    // Find removed nodes (nodes that are in the graph but not in the new data)
    const newNodeIds = nodes.map(n => String(n.id));
    const removedNodes = this.nodes.filter(n => !newNodeIds.includes(String(n.id)));

    // Find new edges (edges that aren't already in the graph)
    const existingEdgeIds = this.edges.map(e => String(e.id));
    const newEdges = edges.filter(e => !existingEdgeIds.includes(String(e.id)));

    // Find removed edges (edges that are in the graph but not in the new data)
    const newEdgeIds = edges.map(e => String(e.id));
    const removedEdges = this.edges.filter(e => !newEdgeIds.includes(String(e.id)));

    // Determine if we have significant changes that would require re-fitting
    const hasSignificantChanges = newNodes.length > 3 || newEdges.length > 5 ||
      removedNodes.length > 3 || removedEdges.length > 5;

    // Temporarily disable auto-fitting
    const oldAutoungrabify = this.cy ? this.cy.autoungrabify() : false;
    if (this.cy) this.cy.autoungrabify(true);

    // Use batching for better performance
    this.cy.batch(() => {
      // Handle removed nodes and edges
      if (removedEdges.length > 0) {
        removedEdges.forEach(edge => {
          const idStr = String(edge.id);
          const edgeElement = this.cy?.getElementById(idStr);
          if (edgeElement) {
            // If this edge was selected, close the details panel
            if (this.selectedElement?.type === 'edge' && this.selectedElement.data.id === idStr) {
              this.closeDetailsPanel();
            }
            edgeElement.remove();
          }
        });
        // Update our local array in one operation
        this.edges = this.edges.filter(e => !removedEdges.some(re => String(re.id) === String(e.id)));
      }

      if (removedNodes.length > 0) {
        removedNodes.forEach(node => {
          const idStr = String(node.id);
          const nodeElement = this.cy?.getElementById(idStr);
          if (nodeElement) {
            // If this node was selected, close the details panel
            if (this.selectedElement?.type === 'node' && this.selectedElement.data.id === idStr) {
              this.closeDetailsPanel();
            }
            nodeElement.remove();
          }
        });
        // Update our local array in one operation
        this.nodes = this.nodes.filter(n => !removedNodes.some(rn => String(rn.id) === String(n.id)));
        // Mark that positions have changed
        this.positionsChanged = true;
      }

      // Update existing nodes (in case properties have changed)
      nodes.filter(n => existingNodeIds.includes(String(n.id))).forEach(node => {
        const cyNode = this.cy?.getElementById(String(node.id));
        if (cyNode) {
          cyNode.data('label', node.name || 'Unnamed Node');
          cyNode.data('nodeType', node.nodeType || 'Default');

          // Apply styles but maintain position
          if (!cyNode.selected()) {
            this.updateNodeTypeStyle(String(node.id), node.nodeType as string);
          }
        }
      });

      // Update existing edges (in case properties have changed)
      edges.filter(e => existingEdgeIds.includes(String(e.id))).forEach(edge => {
        const cyEdge = this.cy?.getElementById(String(edge.id));
        if (cyEdge) {
          cyEdge.data('edgeType', edge.edgeType);
          cyEdge.data('label', edge.edgeType);

          // Apply styles
          if (edge.edgeType && this.edgeVisualSettings[edge.edgeType]) {
            const typeStyle = this.edgeVisualSettings[edge.edgeType];
            cyEdge.style({
              'line-color': typeStyle.lineColor,
              'target-arrow-color': typeStyle.lineColor,
              'line-style': typeStyle.lineStyle,
              'width': typeStyle.width,
              'target-arrow-shape': typeStyle.targetArrowShape,
              'curve-style': typeStyle.curveStyle,
              'opacity': typeStyle.lineOpacity
            });
          }
        }
      });

      // Add new nodes and edges
      newNodes.forEach(node => {
        // If the node has no specified position, check if it had a saved position previously
        if (node.positionX === undefined && node.positionY === undefined &&
          node.id !== undefined && currentPositions[String(node.id)]) {
          node.positionX = currentPositions[String(node.id)].x;
          node.positionY = currentPositions[String(node.id)].y;
        }

        // Ensure node has a valid id
        if (node.id !== undefined) {
          // Create a safe copy with required properties
          const safeNode: GraphNodeData = {
            id: String(node.id),
            name: node.name,
            nodeType: node.nodeType,
            positionX: node.positionX,
            positionY: node.positionY,
            parent: node.parent
          };
          this.addSingleNode(safeNode);
        }
      });

      newEdges.forEach(edge => {
        if (edge.id !== undefined && edge.source !== undefined && edge.target !== undefined) {
          // Create a safe copy with required properties
          const safeEdge: GraphEdgeData = {
            id: String(edge.id),
            source: String(edge.source),
            target: String(edge.target),
            edgeType: edge.edgeType
          };
          this.addSingleEdge(safeEdge);
        }
      });
    });

    // Restore original autoungrabify setting
    if (this.cy) this.cy.autoungrabify(oldAutoungrabify);

    // Update the component's node and edge lists to ensure consistency
    this.nodes = nodes
      .filter(node => node.id !== undefined)
      .map(node => ({
        ...node,
        id: node.id !== undefined ? String(node.id) : '0' // Fallback if somehow undefined
      })) as GraphNodeData[];

    this.edges = edges
      .filter(edge => edge.id !== undefined)
      .map(edge => ({
        ...edge,
        id: edge.id !== undefined ? String(edge.id) : '0', // Fallback
        source: String(edge.source),
        target: String(edge.target)
      })) as GraphEdgeData[];

    // Restore viewport for minor changes or fit graph for significant changes
    if (!hasSignificantChanges && currentPan && currentZoom) {
      // For minor changes, restore exactly the same viewport to prevent jiggle
      this.cy.viewport({
        zoom: currentZoom,
        pan: currentPan
      });
    } else if (hasSignificantChanges) {
      // For significant changes, use requestAnimationFrame for smoother transition
      requestAnimationFrame(() => {
        this.smartFitGraph();
      });
    }
  }

  /**
   * Add a single node to the graph without reinitializing
   * @param newNode The node to add to the graph
   */
  public addSingleNode(newNode: GraphNodeData): void {
    if (!this.cy) {
      console.warn('Cannot add node: Cytoscape instance is not initialized');
      return;
    }

    // Make sure we have a valid ID
    const nodeId = String(newNode.id);

    // Check if the node already exists to avoid duplicates
    if (this.cy.getElementById(nodeId).length > 0) {
      console.log(`Node with ID ${nodeId} already exists`);
      return;
    }

    console.log(`Adding node to graph: ${newNode.name} (${nodeId})`);

    // Create the node data
    const nodeData: CytoscapeNodeData = {
      data: {
        id: nodeId,
        label: newNode.name || 'Unnamed Node',
        nodeType: newNode.nodeType || 'Default',
        parent: newNode.parent ? String(newNode.parent) : undefined,
      }
    };

    // Add position - use viewport center if not specified
    if (newNode.positionX !== undefined && newNode.positionY !== undefined) {
      const x = Number(newNode.positionX);
      const y = Number(newNode.positionY);

      if (!isNaN(x) && !isNaN(y)) {
        nodeData.position = { x, y };
      } else {
        // Calculate viewport center if position is invalid
        this.calculateViewportCenter(nodeData);
      }
    } else {
      // Calculate viewport center
      this.calculateViewportCenter(nodeData);
    }

    // Add the node without animation or batching
    const newCyNode = this.cy.add({
      group: 'nodes',
      data: nodeData.data,
      position: nodeData.position
    });

    // Apply styles immediately
    const nodeType = newNode.nodeType || 'Default';
    this.updateNodeTypeStyle(nodeId, nodeType);

    // Mark positions changed
    this.positionsChanged = true;

    // Log success
    console.log(`Node added successfully: ${newNode.name} (${nodeId})`);
  }

  // Helper method to calculate viewport center
  private calculateViewportCenter(nodeData: CytoscapeNodeData): void {
    if (!this.cy) return;

    // Get pan and zoom to calculate center of current viewport
    const pan = this.cy.pan();
    const zoom = this.cy.zoom();
    const width = this.cy.width();
    const height = this.cy.height();

    // Use center of viewport
    nodeData.position = {
      x: (pan.x * -1 + width / 2) / zoom,
      y: (pan.y * -1 + height / 2) / zoom
    };
  }

  /**
   * Add a single edge to the graph without reinitializing
   * @param newEdge The edge to add to the graph
   */
  public addSingleEdge(newEdge: GraphEdgeData): void {
    if (!this.cy) {
      console.warn('Cannot add edge: Cytoscape instance is not initialized');
      return;
    }

    // Find source and target nodes to get their labels
    const sourceNode = this.nodes.find(n => n.id === newEdge.source);
    const targetNode = this.nodes.find(n => n.id === newEdge.target);

    if (!sourceNode || !targetNode) {
      console.warn('Cannot add edge: Source or target node not found');
      return;
    }

    const edgeData: CytoscapeEdgeData = {
      data: {
        id: String(newEdge.id),
        source: String(newEdge.source),
        target: String(newEdge.target),
        sourceLabel: sourceNode.name || 'Unnamed Node',
        targetLabel: targetNode.name || 'Unnamed Node',
        label: newEdge.edgeType || `${sourceNode.name} → ${targetNode.name}`,
        edgeType: newEdge.edgeType
      }
    };

    // Add the edge to the graph
    this.cy.add({
      group: 'edges',
      data: edgeData.data
    });

    // Apply edge style
    if (newEdge.edgeType && this.edgeVisualSettings[newEdge.edgeType]) {
      const edge = this.cy.getElementById(String(newEdge.id));
      const typeStyle = this.edgeVisualSettings[newEdge.edgeType];

      edge.style({
        'line-color': typeStyle.lineColor,
        'target-arrow-color': typeStyle.lineColor,
        'line-style': typeStyle.lineStyle,
        'width': typeStyle.width,
        'target-arrow-shape': typeStyle.targetArrowShape,
        'curve-style': typeStyle.curveStyle,
        'opacity': typeStyle.lineOpacity
      });
    }

    // Add new edge to our local array for tracking
    this.edges.push({ ...newEdge });
  }

  /**
   * Remove a node from the graph
   */
  public removeNode(nodeId: string | number): void {
    if (!this.cy) return;

    const idStr = String(nodeId);
    const node = this.cy.getElementById(idStr);

    if (node) {
      // Store the current viewport state before removal
      const currentPan = { ...this.cy.pan() };
      const currentZoom = this.cy.zoom();

      // Store all other nodes' positions before the deletion
      const allNodePositions: { [id: string]: { x: number, y: number } } = {};
      this.cy.nodes().forEach((n: any) => {
        if (n.id() !== idStr) {  // Skip the node being deleted
          const pos = n.position();
          allNodePositions[n.id()] = { x: pos.x, y: pos.y };
        }
      });

      // Check if this node is selected before removal
      const wasSelected = this.selectedElement?.type === 'node' &&
        this.selectedElement.data.id === idStr;

      // Clear the selection state to prevent details panel rerendering
      if (wasSelected) {
        this.selectedElement = null;
      }

      // Get connected edges to remove them from our local array too
      const connectedEdges = node.connectedEdges();
      if (connectedEdges.length > 0) {
        const connectedEdgeIds = connectedEdges.map(edge => edge.id());
        // Update our local edges array
        this.edges = this.edges.filter(e => !connectedEdgeIds.includes(String(e.id)));
      }

      // Temporarily disable all automated layout adjustments
      const oldAutoungrabify = this.cy.autoungrabify();
      this.cy.autoungrabify(true);
      const oldUserZoomingEnabled = this.cy.userZoomingEnabled();
      this.cy.userZoomingEnabled(false);
      const oldUserPanningEnabled = this.cy.userPanningEnabled();
      this.cy.userPanningEnabled(false);

      // Use batch operations for better performance
      this.cy.batch(() => {
        // If node was selected, unselect it within the batch operation
        if (wasSelected) {
          node.unselect();
        }

        // Remove the node
        node.remove();

        // Update our local array
        this.nodes = this.nodes.filter(n => String(n.id) !== idStr);
      });

      // Apply the exact same positions to all remaining nodes to prevent any movement
      if (this.cy) { // Add a null check here
        Object.keys(allNodePositions).forEach(id => {
          const n = this.cy?.getElementById(id); // Use optional chaining
          if (n && n.length > 0) { // Check that n exists
            n.position(allNodePositions[id]);
          }
        });
      }

      // Restore settings
      this.cy.autoungrabify(oldAutoungrabify);
      this.cy.userZoomingEnabled(oldUserZoomingEnabled);
      this.cy.userPanningEnabled(oldUserPanningEnabled);

      // Restore viewport exactly as it was before deletion to prevent jiggling
      this.cy.viewport({
        zoom: currentZoom,
        pan: currentPan
      });

      // Mark that positions have changed
      this.positionsChanged = true;

      console.log(`Node ${idStr} removed successfully`);
    }
  }

  /**
   * Remove an edge from the graph
   */
  public removeEdge(edgeId: string | number): void {
    if (!this.cy) return;

    const idStr = String(edgeId);
    const edge = this.cy.getElementById(idStr);

    if (edge) {
      // Store the current viewport state before removal
      const currentPan = { ...this.cy.pan() };
      const currentZoom = this.cy.zoom();

      // Store all nodes' positions before the deletion
      const allNodePositions: { [id: string]: { x: number, y: number } } = {};
      this.cy.nodes().forEach((n: any) => {
        const pos = n.position();
        allNodePositions[n.id()] = { x: pos.x, y: pos.y };
      });

      // Check if this edge is selected before removal
      const wasSelected = this.selectedElement?.type === 'edge' &&
        this.selectedElement.data.id === idStr;

      // Clear the selection state to prevent details panel rerendering
      if (wasSelected) {
        this.selectedElement = null;
      }

      // Temporarily disable all automated layout adjustments
      const oldAutoungrabify = this.cy.autoungrabify();
      this.cy.autoungrabify(true);
      const oldUserZoomingEnabled = this.cy.userZoomingEnabled();
      this.cy.userZoomingEnabled(false);
      const oldUserPanningEnabled = this.cy.userPanningEnabled();
      this.cy.userPanningEnabled(false);

      // Use batch operations for better performance
      this.cy.batch(() => {
        // If edge was selected, unselect it within the batch operation
        if (wasSelected) {
          edge.unselect();
        }

        // Remove the edge
        edge.remove();

        // Update our local array
        this.edges = this.edges.filter(e => String(e.id) !== idStr);
      });

      // Apply the exact same positions to all nodes to prevent any movement
      if (this.cy) { // Add a null check here
        Object.keys(allNodePositions).forEach(id => {
          const n = this.cy?.getElementById(id); // Use optional chaining
          if (n && n.length > 0) { // Check that n exists
            n.position(allNodePositions[id]);
          }
        });
      }

      // Restore settings
      this.cy.autoungrabify(oldAutoungrabify);
      this.cy.userZoomingEnabled(oldUserZoomingEnabled);
      this.cy.userPanningEnabled(oldUserPanningEnabled);

      // Restore viewport exactly as it was before deletion to prevent jiggling
      this.cy.viewport({
        zoom: currentZoom,
        pan: currentPan
      });

      console.log(`Edge ${idStr} removed successfully`);
    }
  }


  /**
 * Fit the graph to the view area with smart padding
 */
  public fitGraph(): void {
    if (this.cy) {
      this.smartFitGraph();
    }
  }

  /**
 * Apply zoom level with better positioning logic
 */
  public applyZoom(level: number, position?: any): void {
    if (!this.cy) return;

    // For small graphs, use center of graph instead of viewport center
    let zoomCenter;
    if (!position) {
      const nodeCount = this.cy.nodes().length;
      if (nodeCount <= 10) {
        // Use the center of the actual nodes rather than the viewport
        const bb = this.cy.nodes().boundingBox();
        zoomCenter = { x: bb.x1 + bb.w / 2, y: bb.y1 + bb.h / 2 };
      } else {
        // Use viewport center for larger graphs
        zoomCenter = this.cy.center();
      }
    } else {
      zoomCenter = position;
    }

    this.cy.zoom({
      level: level,
      position: zoomCenter
    });
  }

  /**
   * Handle layout change from dropdown
   */
  public onLayoutChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const layoutType = select.value;
    this.changeLayoutType(layoutType);
  }

  /**
   * Get icon for layout type
   */
  public getLayoutIcon(layoutType: string): string {
    return this.layoutService.getLayoutIcon(layoutType);
  }

  /**
   * Apply a new layout
   */
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

  /**
 * Change the layout type with node count adaptation
 */
  public changeLayoutType(layoutType: string): void {
    if (!this.cy) return;

    // Get node count for adaptive options
    const nodeCount = this.cy.nodes().length;

    // Get container dimensions
    const container = this.cy.container();
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Get layout options with container dimensions
    const layoutOptions = this.layoutService.getLayoutOptions(
      layoutType,
      nodeCount,
      containerWidth,
      containerHeight
    );

    // Update the component's layoutConfig
    this.layoutConfig = layoutOptions;

    // Apply the layout
    let layout = this.cy.layout(layoutOptions);

    // Ensure proper zooming after layout completes
    layout.one('layoutstop', () => {
      // Use smart fit
      this.smartFitGraph();

      // Get optimal zoom based on node count and container size
      const optimalZoom = this.layoutService.getOptimalZoom(
        nodeCount,
        containerWidth,
        containerHeight
      );

      // Apply the optimal zoom
      this.applyZoom(optimalZoom);
    });

    layout.run();

    // Emit the layout change event
    this.layoutChanged.emit(layoutType);
  }

  /**
 * Smart fit function that adjusts based on the number of elements
 */
  public smartFitGraph(): void {
    if (!this.cy) return;

    const nodeCount = this.cy.nodes().length;

    // Apply padding based on node count
    let padding;
    if (nodeCount <= 5) {
      padding = 100;
    } else if (nodeCount <= 20) {
      padding = 80;
    } else if (nodeCount <= 50) {
      padding = 60;
    } else {
      padding = 40;
    }

    // Use adaptive fit
    this.cy.fit(undefined, padding);

    // For small graphs, ensure they don't appear too big
    if (nodeCount <= 5) {
      // Calculate container dimensions - add null check
      const container = this.cy.container();
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Get optimal zoom
      const optimalZoom = this.layoutService.getOptimalZoom(
        nodeCount,
        containerWidth,
        containerHeight
      );

      // Apply the zoom
      this.applyZoom(optimalZoom);
    }
  }
   
  /**
 * Zoom in by a fixed factor
 */
  public zoomIn(): void {
    if (!this.cy) return;

    // Get current zoom level
    const currentZoom = this.cy.zoom();

    // Calculate new zoom level, but cap at maximum
    const newZoom = Math.min(currentZoom * this.ZOOM_FACTOR, this.MAX_ZOOM_LEVEL);

    // Apply the zoom with animation but without specifying center
    // This avoids the TS error by not using the center property
    this.cy.animate({
      zoom: newZoom,
      duration: 200 // Short animation duration for responsiveness
    });
  }

  /**
   * Zoom out by a fixed factor
   */
  public zoomOut(): void {
    if (!this.cy) return;

    // Get current zoom level
    const currentZoom = this.cy.zoom();

    // Calculate new zoom level, but cap at minimum
    const newZoom = Math.max(currentZoom / this.ZOOM_FACTOR, this.MIN_ZOOM_LEVEL);

    // Apply the zoom with animation but without specifying center
    // This avoids the TS error by not using the center property
    this.cy.animate({
      zoom: newZoom,
      duration: 200 // Short animation duration for responsiveness
    });
  }

  //
  // PRIVATE METHODS
  //

  /**
   * Determine if node is selected
   */
  private isNodeSelected(nodeId: string): boolean {
    if (!this.cy) return false;
    const node = this.cy.getElementById(nodeId);
    return node && node.selected();
  }

  /**
   * Subscribe to visual settings
   */
  private subscribeToVisualSettings(): void {
    // Subscribe to node visual settings
    this.typesService.nodeVisualSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.nodeVisualSettings = settings;
        if (this.cy) {
          this.updateCytoscapeStyles();
        }
      });

    // Subscribe to edge visual settings
    this.typesService.edgeVisualSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.edgeVisualSettings = settings;
        if (this.cy) {
          this.updateCytoscapeStyles();
        }
      });
  }

  /**
   * Subscribe to node updates from service
   */
  private subscribeToNodeUpdates(): void {
    this.nodeService.nodeCreated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((newNode: any) => {
        if (!this.graphId || !this.cy) return;

        // Check if we received a node with actual data
        if (newNode && newNode.id && newNode.graphId === this.graphId) {
          console.log('Received new node:', newNode);

          // Check if node already exists in our graph
          if (this.cy.getElementById(String(newNode.id)).length === 0) {
            console.log('Adding new node to graph:', newNode.name);

            // Create a safe node object
            const safeNode: GraphNodeData = {
              id: String(newNode.id),
              name: newNode.name,
              nodeType: newNode.nodeType,
              positionX: newNode.positionX,
              positionY: newNode.positionY
            };

            // Add just this single node to the graph
            this.addSingleNode(safeNode);

            // Update our internal nodes array - but avoid duplicates
            const existingIndex = this.nodes.findIndex(n => String(n.id) === String(newNode.id));
            if (existingIndex === -1) {
              this.nodes.push(safeNode);
            }
          }
        } else {
          // If we didn't get a valid node (old way), fetch latest node
          console.log('Node created event without data, fetching latest nodes');

          // Get the latest node data from the service
          this.nodeService.getNodes(this.graphId).subscribe(nodes => {
            // Find any new nodes (nodes that aren't already in the graph)
            const existingNodeIds = this.nodes.map(n => String(n.id));
            const newNodes = nodes.filter(n => !existingNodeIds.includes(String(n.id)));

            // Only add the new nodes to the graph
            newNodes.forEach(node => {
              if (node.id !== undefined) {
                const safeNode: GraphNodeData = {
                  id: String(node.id),
                  name: node.name,
                  nodeType: node.nodeType,
                  positionX: node.positionX,
                  positionY: node.positionY
                };
                this.addSingleNode(safeNode);
              }
            });

            // Update our internal node list
            this.nodes = nodes
              .filter(node => node.id !== undefined)
              .map(node => ({
                ...node,
                id: String(node.id)
              })) as GraphNodeData[];
          });
        }
      });
  }

  /**
   * Subscribe to edge updates from service
   */
  private subscribeToEdgeUpdates(): void {
    this.edgeService.edgeCreated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((newEdge: any) => {
        if (!this.graphId || !this.cy) return;

        // Check if we received an edge with actual data
        if (newEdge && newEdge.id && newEdge.graphId === this.graphId) {
          console.log('Received new edge:', newEdge);

          // Check if edge already exists in our graph
          if (this.cy.getElementById(String(newEdge.id)).length === 0) {
            console.log('Adding new edge to graph:', newEdge.edgeType);

            // Create a safe edge object
            const safeEdge: GraphEdgeData = {
              id: String(newEdge.id),
              source: String(newEdge.source),
              target: String(newEdge.target),
              edgeType: newEdge.edgeType
            };

            // Add just this single edge to the graph
            this.addSingleEdge(safeEdge);

            // Update our internal edges array - but avoid duplicates
            const existingIndex = this.edges.findIndex(e => String(e.id) === String(newEdge.id));
            if (existingIndex === -1) {
              this.edges.push(safeEdge);
            }
          }
        } else {
          // If we didn't get a valid edge (old way), fetch latest edges
          console.log('Edge created event without data, fetching latest edges');

          // Get the latest edge data from the service
          this.edgeService.getEdges(this.graphId).subscribe(edges => {
            // Find any new edges (edges that aren't already in the graph)
            const existingEdgeIds = this.edges.map(e => String(e.id));
            const newEdges = edges.filter(e => e.id !== undefined && !existingEdgeIds.includes(String(e.id)));

            // Only add the new edges to the graph
            newEdges.forEach(edge => {
              if (edge.id !== undefined) {
                const safeEdge: GraphEdgeData = {
                  id: String(edge.id),
                  source: String(edge.source),
                  target: String(edge.target),
                  edgeType: edge.edgeType
                };
                this.addSingleEdge(safeEdge);
              }
            });

            // Update our internal edge list
            this.edges = edges
              .filter(edge => edge.id !== undefined)
              .map(edge => ({
                ...edge,
                id: String(edge.id),
                source: String(edge.source),
                target: String(edge.target)
              })) as GraphEdgeData[];
          });
        }
      });
  }

  /**
 * Subscribe to node deletion events from service
 */
  private subscribeToNodeDeletions(): void {
    // Check if nodeDeleted$ exists before subscribing to it
    if (this.nodeService && this.nodeService.nodeDeleted$) {
      this.nodeService.nodeDeleted$
        .pipe(takeUntil(this.destroy$))
        .subscribe((nodeId: string) => {
          if (!this.graphId || !this.cy) return;

          // nodeId is just a string containing the ID, not an object with properties
          if (nodeId) {
            console.log('Received node deletion:', nodeId);

            // Store viewport before deletion
            const currentPan = { ...this.cy.pan() };
            const currentZoom = this.cy.zoom();

            // Remove the node from the graph
            this.removeNode(nodeId);

            // Immediately restore viewport to prevent jiggle
            this.cy.viewport({
              zoom: currentZoom,
              pan: currentPan
            });
          }
        });
    }
  }

  /**
   * Subscribe to edge deletion events from service
   */
  private subscribeToEdgeDeletions(): void {
    // Check if edgeDeleted$ exists before subscribing to it
    if (this.edgeService && this.edgeService.edgeDeleted$) {
      this.edgeService.edgeDeleted$
        .pipe(takeUntil(this.destroy$))
        .subscribe((deletedEdgeInfo: any) => {
          if (!this.graphId || !this.cy) return;

          // Check if we received edge data
          if (deletedEdgeInfo && deletedEdgeInfo.id && deletedEdgeInfo.graphId === this.graphId) {
            console.log('Received edge deletion:', deletedEdgeInfo);

            // Store viewport before deletion
            const currentPan = { ...this.cy.pan() };
            const currentZoom = this.cy.zoom();

            // Remove the edge from the graph
            this.removeEdge(String(deletedEdgeInfo.id));

            // Immediately restore viewport to prevent jiggle
            this.cy.viewport({
              zoom: currentZoom,
              pan: currentPan
            });
          }
        });
    }  
  }
  /**
   * Apply positions to nodes
   */
  private applyNodePositions(positions: NodePositionsMap): void {
    if (!this.cy) return;

    Object.keys(positions).forEach(nodeId => {
      const node = this.cy?.getElementById(nodeId);
      if (node) {
        const pos = positions[nodeId];
        const x = Number(pos.x);
        const y = Number(pos.y);
        if (!isNaN(x) && !isNaN(y)) {
          node.position({ x, y });
        }
      }
    });

    // Fit the graph and apply zoom
    this.fitGraph();
    this.applyZoom(this.initialZoom);
  }

  /**
   * Handle background click to clear selection
   */
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

  /**
   * Update styles on the Cytoscape instance
   */
  private updateCytoscapeStyles(): void {
    if (!this.cy) return;

    // Keep track of selected nodes to restore selection
    const selectedNodes = this.cy.$('node:selected');
    const selectedNodeIds = selectedNodes.map(node => node.id());

    this.isDarkMode$.pipe(
      takeUntil(this.destroy$),
      startWith(false)
    ).subscribe(isDark => {
      const styles = this.stylesService.getGraphStyles(
        isDark,
        this.nodeVisualSettings,
        this.edgeVisualSettings
      );

      // Add non-null assertion operator (!) to ensure the compiler 
      // knows this.cy is not null at this point
      this.cy!.style().clear();
      this.cy!.style(styles);

      // Apply styles to each edge based on its type
      this.applyEdgeStyles();

      // Apply styles to each node based on its type (but only to unselected nodes)
      this.applyNodeStyles();

      // Ensure selection styles are preserved
      this.refreshSelectionStyles();
    });
  }

  /**
   * Apply styles to all nodes
   */
  private applyNodeStyles(): void {
    if (!this.cy) return;

    // Only apply styles to unselected nodes
    this.cy.nodes().filter(':unselected').forEach((node: NodeSingular) => {
      const nodeType = node.data('nodeType');
      if (nodeType) {
        this.updateNodeTypeStyle(node.id(), nodeType);
      }
    });
  }

  /**
   * Apply styles to all edges
   */
  private applyEdgeStyles(): void {
    if (!this.cy) return;

    // Change type annotation to EdgeSingular
    this.cy.edges().forEach((edge: cytoscape.EdgeSingular) => {
      const edgeType = edge.data('edgeType');
      if (edgeType && this.edgeVisualSettings[edgeType]) {
        const typeStyle = this.edgeVisualSettings[edgeType];
        edge.style({
          'line-color': typeStyle.lineColor,
          'target-arrow-color': typeStyle.lineColor,
          'line-style': typeStyle.lineStyle,
          'width': typeStyle.width,
          'target-arrow-shape': typeStyle.targetArrowShape,
          'curve-style': typeStyle.curveStyle,
          'opacity': typeStyle.lineOpacity
        });
      }
    });
  }

  /**
   * Update style for a specific node type
   */
  private updateNodeTypeStyle(nodeId: string, nodeType: string): void {
    if (!this.cy) return;

    const node = this.cy.getElementById(nodeId);
    if (!node) {
      console.warn(`Could not find node with ID: ${nodeId}`);
      return;
    }

    // Skip applying styles if the node is selected
    if (node.selected()) {
      return;
    }

    // Get the style for this specific node type
    const styleProps = this.stylesService.getNodeTypeStyle(
      nodeId,
      nodeType,
      this.nodeVisualSettings
    );

    // Apply style directly to the node element
    node.style(styleProps);
  }

  /**
   * Initialize the Cytoscape instance
   */
  private async initializeCytoscape(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      console.debug('Skipping Cytoscape initialization in SSR');
      return;
    }

    // Check if container is available
    if (!this.cyContainer?.nativeElement) {
      console.warn('Cytoscape container is not available');
      return;
    }

    // Create node map for lookup
    const nodeMap = new Map<string | number, string>();
    this.nodes.forEach(node => {
      nodeMap.set(node.id, node.name || 'Unnamed Node');
    });

    // Create Cytoscape nodes
    const cytoscapeNodes = this.prepareCytoscapeNodes();

    // Create Cytoscape edges
    const cytoscapeEdges = this.prepareCytoscapeEdges(nodeMap);

    // If cy already exists, destroy it first
    if (this.cy) {
      this.cy.destroy();
    }

    try {
      // Initialize with light mode styles
      const initialStyles = this.stylesService.getGraphStyles(
        false,
        this.nodeVisualSettings,
        this.edgeVisualSettings
      );

      // Check if positions are available and valid
      const hasValidPositions = this.hasValidNodePositions();

      // Adjust layout settings based on whether we have positions
      let initialLayout = { ...this.layoutConfig };
      if (hasValidPositions) {
        initialLayout = {
          name: 'preset', // Use preset for saved positions
          fit: true,
          padding: 50
        };
      }

      // Create the Cytoscape instance
      this.cy = cytoscape({
        container: this.cyContainer.nativeElement,
        elements: {
          nodes: cytoscapeNodes,
          edges: cytoscapeEdges
        },
        style: initialStyles,
        layout: initialLayout        
      });

      // Initialize extensions
      await this.initializeCytoscapeExtensions();

      // Apply positions or layout
      if (hasValidPositions) {
        this.applyInitialNodePositions();
      } else {
        this.runInitialLayout();
      }

      // Subscribe to dark mode and set up event handlers
      this.setupEventHandlers();

      // Log status
      this.logInitializationStatus(cytoscapeNodes.length, cytoscapeEdges.length);
    } catch (error) {
      //console.error('Error initializing Cytoscape:', error);
    }
  }

  /**
   * Check if nodes have valid position data
   */
  private hasValidNodePositions(): boolean {
    return this.nodes.some(
      node => node.positionX !== undefined &&
        node.positionY !== undefined &&
        !isNaN(Number(node.positionX)) &&
        !isNaN(Number(node.positionY))
    );
  }

  /**
   * Prepare Cytoscape node data from input nodes
   */
  private prepareCytoscapeNodes(): CytoscapeNodeData[] {
    return this.nodes.map(node => {
      // Basic node data
      const nodeData: CytoscapeNodeData = {
        data: {
          id: String(node.id),
          label: node.name || 'Unnamed Node',
          nodeType: node.nodeType || 'Default',
          parent: node.parent ? String(node.parent) : undefined,
        }
      };

      // Add position if available
      if (node.positionX !== undefined && node.positionY !== undefined) {
        const x = Number(node.positionX);
        const y = Number(node.positionY);

        if (!isNaN(x) && !isNaN(y)) {
          nodeData.position = { x, y };
        }
      }

      return nodeData;
    });
  }

  /**
   * Prepare Cytoscape edge data from input edges
   */
  private prepareCytoscapeEdges(nodeMap: Map<string | number, string>): CytoscapeEdgeData[] {
    // Filter and validate edges
    const validEdges = this.edges.filter(edge => {
      return nodeMap.has(edge.source) && nodeMap.has(edge.target);
    });

    if (this.edges.length > validEdges.length) {
      console.warn(`Filtered out ${this.edges.length - validEdges.length} edges with invalid references`);
    }

    return validEdges.map(edge => ({
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
  }

  /**
   * Initialize Cytoscape extensions
   */
  private async initializeCytoscapeExtensions(): Promise<void> {
    if (!this.cy) return;

    try {
      const compoundDragAndDrop = (await import('cytoscape-compound-drag-and-drop')).default;

      // Check if the plugin is already registered
      if (!cytoscape.prototype.hasOwnProperty('compoundDragAndDrop')) {
        cytoscape.use(compoundDragAndDrop);
      }

      // Use type assertion to handle the extension
      const cyAny = this.cy as any;
      if (cyAny?.compoundDragAndDrop) {
        cyAny.compoundDragAndDrop({
          dropTarget: (node: NodeSingular) => node?.isParent?.(),
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
  }


  /**
 * Apply initial node positions with better zoom handling for small graphs
 */
  private applyInitialNodePositions(): void {
    if (!this.cy) return;

    // Force positions with a small delay to ensure Cytoscape is ready
    setTimeout(() => {
      if (!this.cy) return; // Re-check cy after timeout

      this.nodes.forEach(node => {
        if (node.positionX !== undefined && node.positionY !== undefined) {
          const x = Number(node.positionX);
          const y = Number(node.positionY);

          if (!isNaN(x) && !isNaN(y)) {
            const cyNode = this.cy?.getElementById(String(node.id));
            if (cyNode) {
              cyNode.position({ x, y });
            }
          }
        }
      });

      // Use smart fit and optimal zoom
      const nodeCount = this.cy.nodes().length;
      this.smartFitGraph();

      // Get optimal zoom based on node count and container size
      const container = this.cy.container();
      if (!container) return;

      const optimalZoom = this.layoutService.getOptimalZoom(
        nodeCount,
        container.clientWidth,
        container.clientHeight
      );

      this.applyZoom(optimalZoom);
    }, 100);
  }

  /**
 * Run initial layout with better node positioning for small graphs
 */
  private runInitialLayout(): void {
    if (!this.cy) return;

    // Run an automatic layout if no positions are stored
    setTimeout(() => {
      if (!this.cy) return; // Re-check cy after timeout

      if (this.cy.elements().length > 0) {
        const nodeCount = this.cy.nodes().length;

        // Get container dimensions
        const container = this.cy.container();
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Get adaptive options for current layout with container dimensions
        const adaptiveLayout = {
          ...this.layoutService.getLayoutOptions(
            this.layoutConfig.name,
            nodeCount,
            containerWidth,
            containerHeight
          ),
          animate: true
        };

        this.cy.layout(adaptiveLayout).run();

        // After layout is done
        setTimeout(() => {
          if (!this.cy) return; // Re-check cy after second timeout

          this.smartFitGraph();

          // Get optimal zoom based on node count and container dimensions
          const optimalZoom = this.layoutService.getOptimalZoom(
            nodeCount,
            containerWidth,
            containerHeight
          );

          this.applyZoom(optimalZoom);
        }, 1000);
      }
    }, 100);
  }

  /**
   * Set up event handlers for the graph
   */
  private setupEventHandlers(): void {
    if (!this.cy) return;

    // Subscribe to dark mode changes
    this.isDarkMode$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      const styles = this.stylesService.getGraphStyles(
        isDark,
        this.nodeVisualSettings,
        this.edgeVisualSettings
      );

      if (this.cy) {
        this.cy.style(styles);
      }
    });

    // Node click handler
    this.cy.on('tap', 'node', (event: any) => {
      const node = event.target;

      this.selectedElement = {
        type: 'node',
        data: {
          id: node.id(),
          label: node.data('label'),
          nodeType: node.data('nodeType')
        }
      };

      // Re-apply styles after a short delay to ensure selection styling works
      // This ensures the :selected styling is correctly applied
      setTimeout(() => {
        if (this.cy) {
          this.updateCytoscapeStyles();
        }
      }, 10);

      this.nodeClicked.emit({
        id: node.id(),
        label: node.data('label'),
        nodeType: node.data('nodeType')
      });
    });

    // Edge click handler
    this.cy.on('tap', 'edge', (event: any) => {
      const edge = event.target;
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

      this.edgeClicked.emit({
        id: edge.id(),
        label: edge.data('label'),
        source: edge.data('source'),
        target: edge.data('target')
      });
    });

    //Select handler
    this.cy.on('select', 'node', (event: any) => {
      // Force the selected node to use the selection style
      const node = event.target;

      // Remove any direct styles that might override the selection style
      node.removeStyle('background-color');
      node.removeStyle('text-outline-color');

      // Apply selection styles
      node.style({
        'background-color': '#2196F3',
        'text-outline-color': '#2196F3'
      });
    });

    this.cy.on('unselect', 'node', (event: any) => {
      const node = event.target;
      const nodeType = node.data('nodeType');

      // Re-apply the node type style
      if (nodeType) {
        this.updateNodeTypeStyle(node.id(), nodeType);
      }
    });

    // Background click handling
    this.handleBackgroundClick();

    // Position change tracking
    this.cy.on('position', 'node', () => {
      this.positionsChanged = true;
    });

    // Drag end event
    this.cy.on('dragfree', 'node', () => {
      this.positionsChanged = true;
    });

    // Compound drag and drop events
    this.setupCompoundEvents();
  }

  /**
   * Set up compound drag and drop events
   */
  private setupCompoundEvents(): void {
    if (!this.cy) return;

    this.cy.on('cdndover', (event: any, dropTarget: NodeSingular, grabbedNode: NodeSingular) => {
      console.log(`Node ${grabbedNode.id()} is over potential parent ${dropTarget.id()}`);
    });

    this.cy.on('cdndout', (event: any, dropTarget: NodeSingular, grabbedNode: NodeSingular) => {
      console.log(`Node ${grabbedNode.id()} moved out from potential parent ${dropTarget.id()}`);
    });

    this.cy.on('cdnddrop', (event: any, dropTarget: NodeSingular, grabbedNode: NodeSingular) => {
      console.log(`Node ${grabbedNode.id()} was dropped into parent ${dropTarget.id()}`);
      this.positionsChanged = true;
    });
  }

  /**
   * Refresh Selection Styles
   */
  private refreshSelectionStyles(): void {
    if (!this.cy) return;

    // Get all selected elements
    const selectedElements = this.cy.$(':selected');

    if (selectedElements.length > 0) {
      // Temporarily unselect then reselect to force style refresh
      selectedElements.unselect();
      // Reselect after a short delay
      setTimeout(() => {
        selectedElements.select();
      }, 5);
    }
  }

  /**
 * Set up compound drag and drop events
 */
  public exportGraphAsImage(): void {
    if (!this.cy) {
      console.warn('Cytoscape instance is not initialized');
      return;
    }

    // Check the current theme by subscribing to isDarkMode$
    let isDark: boolean = false; // Explicitly type as boolean
    this.isDarkMode$.pipe(take(1)).subscribe((darkMode: boolean) => {
      isDark = darkMode;
    });

    // Determine the background color based on the current theme
    const backgroundColor = isDark ? '#121212' : '#ffffff'; // Match your theme's bg-secondary

    // Generate the image with the specified background color
    const imageData = this.cy!.png({
      full: true, // Export the entire graph
      bg: backgroundColor // Set the background color
    });

    // Create a temporary link element to download the image
    const link = document.createElement('a');
    link.href = imageData;
    link.download = 'graph.png';
    link.click();
  }


  /**
   * Log initialization status
   */
  private logInitializationStatus(nodeCount: number, edgeCount: number): void {
    if (!this.cy) return;

    if (this.cy.elements().length === 0) {
      console.warn('Graph visualization is empty - no elements to display');
    } else {
      console.log(`Graph visualization initialized with ${nodeCount} nodes and ${edgeCount} edges`);
    }
  }
}
