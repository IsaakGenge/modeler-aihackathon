// Frontend/src/app/Components/cytoscape-graph/services/cytoscape-layout.service.ts

import { Injectable } from '@angular/core';

// Define layout types that can be used
export const LAYOUT_TYPES = {
  BREADTHFIRST: 'breadthfirst',
  CIRCLE: 'circle',
  GRID: 'grid',
  CONCENTRIC: 'concentric',
  COSE: 'cose',
  COSE_HORIZONTAL: 'cose-horizontal', // Add new horizontal variant
  RANDOM: 'random'
};

// Define available layouts with labels
export const AVAILABLE_LAYOUTS = [
  { type: LAYOUT_TYPES.BREADTHFIRST, label: 'Hierarchical' },
  { type: LAYOUT_TYPES.CIRCLE, label: 'Circular' },
  { type: LAYOUT_TYPES.GRID, label: 'Grid' },
  { type: LAYOUT_TYPES.CONCENTRIC, label: 'Concentric' },
  { type: LAYOUT_TYPES.COSE, label: 'Force-Directed' },
  { type: LAYOUT_TYPES.COSE_HORIZONTAL, label: 'Force-Directed (Horizontal)' }, // Add new horizontal variant
  { type: LAYOUT_TYPES.RANDOM, label: 'Random' }
];

// Create a comprehensive type for layout options
interface LayoutOptions {
  name: string;
  fit: boolean;
  directed: boolean;
  padding: number;
  spacingFactor: number;
  avoidOverlap: boolean;
  nodeDimensionsIncludeLabels: boolean;
  animate: boolean;
  animationDuration: number;
  nodeRepulsion: number;
  idealEdgeLength: number;
  edgeElasticity: number;
  nestingFactor: number;
  gravity: number;
  numIter: number;
  coolingFactor: number;
  minTemp: number;
  minNodeSpacing?: number;
  // Additional properties for specific layouts
  radius?: number;
  boundingBox?: { x1: number; y1: number; x2: number; y2: number };
  // Additional COSE-specific properties
  gravityX?: number;
  gravityY?: number;
  gravityCompound?: number;
  gravityRangeCompound?: number;
  randomize?: boolean;
  refresh?: number;
  aspectRatio?: number; // For controlling width/height ratio
  // Add any other properties that might be used
}

// Define default layout options
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  name: 'cose',
  fit: true,
  directed: false,
  padding: 50,
  spacingFactor: 1.5,
  avoidOverlap: true,
  nodeDimensionsIncludeLabels: true,
  animate: false,
  animationDuration: 500,
  // cose-specific options
  nodeRepulsion: 5000,
  idealEdgeLength: 100,
  edgeElasticity: 100,
  nestingFactor: 1.2,
  gravity: 80,
  numIter: 1000,
  coolingFactor: 0.99,
  minTemp: 1.0
};

@Injectable({
  providedIn: 'root'
})
export class CytoscapeLayoutService {
  // Map of layout type to icon
  private layoutIconMap: Record<string, string> = {
    [LAYOUT_TYPES.BREADTHFIRST]: 'bi-diagram-3',
    [LAYOUT_TYPES.CIRCLE]: 'bi-circle',
    [LAYOUT_TYPES.GRID]: 'bi-grid',
    [LAYOUT_TYPES.CONCENTRIC]: 'bi-record-circle',
    [LAYOUT_TYPES.COSE]: 'bi-asterisk',
    [LAYOUT_TYPES.COSE_HORIZONTAL]: 'bi-arrows-expand', // New icon for horizontal variant
    [LAYOUT_TYPES.RANDOM]: 'bi-shuffle'
  };

  constructor() { }

  /**
   * Get layout options based on layout type and graph size
   */
  getLayoutOptions(layoutType: string, nodeCount: number = 0): LayoutOptions {
    // Create layout-specific options to avoid cumulative spacing issues
    const baseOptions = { ...DEFAULT_LAYOUT_OPTIONS };

    // Adjust spacing based on node count
    const adaptiveSpacing = this.getAdaptiveSpacing(nodeCount);

    // Calculate adaptive padding based on node count
    const adaptivePadding = this.getAdaptivePadding(nodeCount);

    // Add any layout-specific adjustments
    const layoutOptions: LayoutOptions = {
      ...baseOptions,
      name: layoutType,
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: adaptivePadding,
      spacingFactor: adaptiveSpacing.spacingFactor,
      minNodeSpacing: adaptiveSpacing.minNodeSpacing
    };

    // Different layout types may need different parameters
    switch (layoutType) {
      case LAYOUT_TYPES.BREADTHFIRST:
        layoutOptions.spacingFactor *= 1.2;
        break;

      case LAYOUT_TYPES.CIRCLE:
        if (nodeCount <= 5) {
          layoutOptions.radius = 150;
        }
        break;

      case LAYOUT_TYPES.GRID:
        layoutOptions.spacingFactor *= 1.1;
        break;

      case LAYOUT_TYPES.CONCENTRIC:
        layoutOptions.spacingFactor *= 1.2;
        if (nodeCount <= 5) {
          layoutOptions.minNodeSpacing = 100;
        }
        break;

      case LAYOUT_TYPES.COSE:
        // Regular COSE layout adjustments
        if (nodeCount <= 10) {
          layoutOptions.nodeRepulsion = 8000;
          layoutOptions.idealEdgeLength = 150;
        } else if (nodeCount <= 50) {
          layoutOptions.nodeRepulsion = 5000;
          layoutOptions.idealEdgeLength = 100;
        } else {
          layoutOptions.nodeRepulsion = 3000;
          layoutOptions.idealEdgeLength = 80;
        }
        break;

      case LAYOUT_TYPES.COSE_HORIZONTAL:
        // Custom horizontal COSE layout
        layoutOptions.name = 'cose'; // Still use the base COSE algorithm

        // Base settings similar to regular COSE
        if (nodeCount <= 10) {
          layoutOptions.nodeRepulsion = 8000;
          layoutOptions.idealEdgeLength = 160;
        } else if (nodeCount <= 50) {
          layoutOptions.nodeRepulsion = 5000;
          layoutOptions.idealEdgeLength = 120;
        } else {
          layoutOptions.nodeRepulsion = 3000;
          layoutOptions.idealEdgeLength = 100;
        }

        // Horizontal spreading adjustments

        // Create a wider bounding box to encourage horizontal spread
        const width = Math.max(nodeCount * 120, 800);  // Scale width with node count
        const height = Math.min(width * 0.6, 600);     // Keep height smaller than width

        layoutOptions.boundingBox = {
          x1: 0,
          y1: 0,
          x2: width,
          y2: height
        };

        // Adjust gravity to be stronger vertically than horizontally
        layoutOptions.gravity = 50;           // Reduced base gravity
        layoutOptions.gravityY = 2.0;         // Stronger vertical gravity (pulls nodes to center line)
        layoutOptions.gravityX = 0.1;         // Weaker horizontal gravity (allows horizontal spread)

        // Favor convergence speed
        layoutOptions.numIter = 2500;         // More iterations for better results
        layoutOptions.coolingFactor = 0.95;   // Slower cooling for better convergence

        // Other adjustments to improve layout
        layoutOptions.randomize = true;       // Start with randomized positions
        layoutOptions.edgeElasticity = 50;    // Reduced elasticity
        layoutOptions.nestingFactor = 0.1;    // Reduced nesting factor
        layoutOptions.refresh = 30;           // Refresh every 30 iterations

        break;

      case LAYOUT_TYPES.RANDOM:
        if (nodeCount <= 5) {
          layoutOptions.boundingBox = { x1: 0, y1: 0, x2: 500, y2: 500 };
        }
        break;
    }

    return layoutOptions;
  }

  /**
   * Calculate adaptive spacing parameters based on node count
   */
  private getAdaptiveSpacing(nodeCount: number): { spacingFactor: number, minNodeSpacing: number } {
    // For smaller graphs, use larger spacing to avoid nodes appearing too small
    if (nodeCount <= 5) {
      return { spacingFactor: 2.5, minNodeSpacing: 150 };
    } else if (nodeCount <= 10) {
      return { spacingFactor: 2.0, minNodeSpacing: 120 };
    } else if (nodeCount <= 30) {
      return { spacingFactor: 1.8, minNodeSpacing: 100 };
    } else if (nodeCount <= 50) {
      return { spacingFactor: 1.5, minNodeSpacing: 80 };
    } else if (nodeCount <= 100) {
      return { spacingFactor: 1.3, minNodeSpacing: 60 };
    } else {
      return { spacingFactor: 1.0, minNodeSpacing: 40 };
    }
  }

  /**
   * Calculate adaptive padding based on node count
   */
  private getAdaptivePadding(nodeCount: number): number {
    // Larger padding for smaller graphs
    if (nodeCount <= 5) {
      return 100;
    } else if (nodeCount <= 20) {
      return 80;
    } else if (nodeCount <= 50) {
      return 60;
    } else if (nodeCount <= 100) {
      return 40;
    } else {
      return 30;
    }
  }

  /**
   * Calculate optimal zoom level based on node count
   */
  public getOptimalZoom(nodeCount: number, containerWidth: number, containerHeight: number): number {
    // Base zoom level
    let baseZoom = 1.5;

    // Adjust based on node count - smaller graphs get higher zoom
    if (nodeCount <= 5) {
      baseZoom = 2.0;
    } else if (nodeCount <= 10) {
      baseZoom = 1.8;
    } else if (nodeCount <= 30) {
      baseZoom = 1.5;
    } else if (nodeCount <= 50) {
      baseZoom = 1.2;
    } else if (nodeCount <= 100) {
      baseZoom = 1.0;
    } else {
      baseZoom = 0.8;
    }

    // Adjust for container size
    const containerFactor = Math.min(containerWidth, containerHeight) / 1000;

    // Return balanced zoom level
    return baseZoom * (containerFactor > 0.5 ? containerFactor : 0.5);
  }

  /**
   * Get icon class for a layout type
   */
  getLayoutIcon(layoutType: string): string {
    return this.layoutIconMap[layoutType] || 'bi-diagram-3';
  }
}
