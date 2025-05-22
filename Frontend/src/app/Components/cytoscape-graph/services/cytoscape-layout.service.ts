// Frontend/src/app/Components/cytoscape-graph/services/cytoscape-layout.service.ts

import { Injectable } from '@angular/core';

// Define layout types that can be used
export const LAYOUT_TYPES = {
  BREADTHFIRST: 'breadthfirst',
  CIRCLE: 'circle',
  GRID: 'grid',
  CONCENTRIC: 'concentric',
  COSE: 'cose',
  COSE_HORIZONTAL: 'cose-horizontal',
  RANDOM: 'random'
};

// Define available layouts with labels
export const AVAILABLE_LAYOUTS = [
  { type: LAYOUT_TYPES.BREADTHFIRST, label: 'Hierarchical' },
  { type: LAYOUT_TYPES.CIRCLE, label: 'Circular' },
  { type: LAYOUT_TYPES.GRID, label: 'Grid' },
  { type: LAYOUT_TYPES.CONCENTRIC, label: 'Concentric' },
  { type: LAYOUT_TYPES.COSE, label: 'Force-Directed' },
  { type: LAYOUT_TYPES.COSE_HORIZONTAL, label: 'Force-Directed (Horizontal)' },
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
  nodeRepulsion?: number;
  idealEdgeLength?: number;
  edgeElasticity?: number;
  nestingFactor?: number;
  gravity?: number;
  numIter?: number;
  coolingFactor?: number;
  minTemp?: number;  
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
  // Breadthfirst-specific properties
  roots?: any[];
  maximal?: boolean;
  rankDir?: 'TB' | 'BT' | 'LR' | 'RL'; // Direction of tree layout
  // Grid-specific properties
  rows?: number;
  cols?: number;
  // Concentric-specific properties
  minNodeSpacing?: number;
  levelWidth?: (nodes: any) => number;
  concentric?: (node: any) => number;
  startAngle?: number;
  sweep?: number;
  equidistant?: boolean;
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
    [LAYOUT_TYPES.COSE_HORIZONTAL]: 'bi-arrows-expand',
    [LAYOUT_TYPES.RANDOM]: 'bi-shuffle'
  };

  constructor() { }

  /**
   * Get layout options based on layout type, graph size, and container dimensions
   */
  getLayoutOptions(
    layoutType: string,
    nodeCount: number = 0,
    containerWidth: number = 1000,
    containerHeight: number = 800
  ): LayoutOptions {
    // Calculate container aspect ratio (width / height)
    const containerAspectRatio = containerWidth / containerHeight;

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

    // Calculate a standardized bounding box that respects the container aspect ratio
    const standardBoundingBox = this.calculateStandardBoundingBox(
      nodeCount,
      containerWidth,
      containerHeight,
      containerAspectRatio
    );

    // Different layout types may need different parameters
    switch (layoutType) {
      case LAYOUT_TYPES.BREADTHFIRST:
        this.adaptBreadthFirstLayout(
          layoutOptions,
          nodeCount,
          containerWidth,
          containerHeight,
          containerAspectRatio
        );
        break;

      case LAYOUT_TYPES.CIRCLE:
        this.adaptCircleLayout(
          layoutOptions,
          nodeCount,
          containerWidth,
          containerHeight,
          containerAspectRatio
        );
        break;

      case LAYOUT_TYPES.GRID:
        this.adaptGridLayout(
          layoutOptions,
          nodeCount,
          containerWidth,
          containerHeight,
          containerAspectRatio
        );
        break;

      case LAYOUT_TYPES.CONCENTRIC:
        this.adaptConcentricLayout(
          layoutOptions,
          nodeCount,
          containerWidth,
          containerHeight,
          containerAspectRatio
        );
        break;

      case LAYOUT_TYPES.COSE:
        this.adaptCoseLayout(
          layoutOptions,
          nodeCount,
          containerWidth,
          containerHeight,
          containerAspectRatio,
          false // Not enforcing horizontal layout
        );
        break;

      case LAYOUT_TYPES.COSE_HORIZONTAL:
        // Custom horizontal COSE layout adapted to container
        layoutOptions.name = 'cose';

        this.adaptCoseLayout(
          layoutOptions,
          nodeCount,
          containerWidth,
          containerHeight,
          containerAspectRatio,
          true // Enforce horizontal layout
        );
        break;

      case LAYOUT_TYPES.RANDOM:
        // Set bounding box for random layout
        layoutOptions.boundingBox = standardBoundingBox;
        break;
    }

    return layoutOptions;
  }

  /**
   * Calculate a standard bounding box based on container dimensions
   */
  private calculateStandardBoundingBox(
    nodeCount: number,
    containerWidth: number,
    containerHeight: number,
    containerAspectRatio: number
  ): { x1: number; y1: number; x2: number; y2: number } {
    // Start with a size proportional to the number of nodes
    const baseArea = nodeCount * 10000; // Base area per node

    // Calculate dimensions while respecting container's aspect ratio
    let width = Math.sqrt(baseArea * containerAspectRatio);
    let height = width / containerAspectRatio;

    // Scale to fit container, using a percentage of container size
    const maxWidth = containerWidth * 0.85;
    const maxHeight = containerHeight * 0.85;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / containerAspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * containerAspectRatio;
    }

    return {
      x1: 0,
      y1: 0,
      x2: Math.round(width),
      y2: Math.round(height)
    };
  }

  /**
   * Adapt Breadth-first layout parameters to container dimensions
   */
  private adaptBreadthFirstLayout(
    layoutOptions: LayoutOptions,
    nodeCount: number,
    containerWidth: number,
    containerHeight: number,
    containerAspectRatio: number
  ): void {
    // Base configuration for the breadth-first layout
    layoutOptions.directed = true; // Always use directed for tree-like layouts

    // Special handling for larger trees - reduce spacing
    if (nodeCount > 30) {
      // For large trees, use significantly smaller spacing to avoid excessive zoom-out
      layoutOptions.spacingFactor = 0.75;
    } else if (nodeCount > 15) {
      // Medium trees
      layoutOptions.spacingFactor = 0.9;
    } else {
      // Small trees
      layoutOptions.spacingFactor = 1.0;
    }

    // Adjust node spacing based on the container shape
    if (containerAspectRatio >= 1.2) {
      // Wide container - encourage horizontal spread
      // Set specific breadthfirst options for horizontal layout
      layoutOptions.spacingFactor *= 0.9; // Further reduce spacing

      // Calculate a more compact bounding box for trees
      const treeWidth = Math.min(containerWidth * 0.85, Math.max(300, nodeCount * 60));
      const treeHeight = Math.min(containerHeight * 0.85, Math.max(300, nodeCount * 35));

      layoutOptions.boundingBox = {
        x1: 0,
        y1: 0,
        x2: treeWidth,
        y2: treeHeight
      };
    } else if (containerAspectRatio <= 0.8) {
      // Tall container - encourage vertical spread
      // Set specific breadthfirst options for vertical layout
      layoutOptions.spacingFactor *= 0.9; // Further reduce spacing

      // Calculate a more compact bounding box for trees
      const treeHeight = Math.min(containerHeight * 0.85, Math.max(300, nodeCount * 60));
      const treeWidth = Math.min(containerWidth * 0.85, Math.max(300, nodeCount * 35));

      layoutOptions.boundingBox = {
        x1: 0,
        y1: 0,
        x2: treeWidth,
        y2: treeHeight
      };
    } else {
      // Balanced container - create a more balanced tree
      layoutOptions.spacingFactor *= 0.95;

      // Square-ish bounding box for balanced containers
      const size = Math.min(
        containerWidth * 0.85,
        containerHeight * 0.85,
        Math.max(300, nodeCount * 50)
      );

      layoutOptions.boundingBox = {
        x1: 0,
        y1: 0,
        x2: size,
        y2: size
      };
    }

    // Additional breadth-first specific settings for better tree layouts
    layoutOptions.avoidOverlap = true;
    layoutOptions.padding = nodeCount > 50 ? 10 : (nodeCount > 20 ? 20 : 30); // Less padding for larger trees

    // Optional: Set a specific rank direction based on container shape
    if (!layoutOptions.rankDir) {
      layoutOptions.rankDir = containerAspectRatio > 1 ? 'LR' : 'TB';
    }
  }

  /**
   * Adapt Circle layout parameters to container dimensions
   */
  private adaptCircleLayout(
    layoutOptions: LayoutOptions,
    nodeCount: number,
    containerWidth: number,
    containerHeight: number,
    containerAspectRatio: number
  ): void {
    // Calculate optimal radius based on container size and node count
    const minDimension = Math.min(containerWidth, containerHeight);

    // Reduce radius to create tighter circle layouts with less node spread
    // Previous values were 0.3, 0.25, 0.22, 0.2
    let radius: number;
    if (nodeCount <= 5) {
      radius = minDimension * 0.25; // Reduced from 0.3
    } else if (nodeCount <= 15) {
      radius = minDimension * 0.2; // Reduced from 0.25
    } else if (nodeCount <= 30) {
      radius = minDimension * 0.18; // Reduced from 0.22
    } else {
      radius = minDimension * 0.16; // Reduced from 0.2
    }

    // Set the calculated radius
    layoutOptions.radius = radius;

    // Create a smaller, more compact bounding box to reduce spread
    // Use 75% of the standard bounding box
    const standardBox = this.calculateStandardBoundingBox(
      nodeCount,
      containerWidth,
      containerHeight,
      containerAspectRatio
    );

    layoutOptions.boundingBox = {
      x1: 0,
      y1: 0,
      x2: Math.round(standardBox.x2 * 0.8), // Use 80% of standard width
      y2: Math.round(standardBox.y2 * 0.8)  // Use 80% of standard height
    };

    // Increase spacing factor to prevent node overlap with larger nodes
    layoutOptions.spacingFactor = 1.2;

    // Ensure this is true to make nodes appear larger
    layoutOptions.avoidOverlap = true;
  }

  /**
   * Adapt Grid layout parameters to container dimensions
   */
  private adaptGridLayout(
    layoutOptions: LayoutOptions,
    nodeCount: number,
    containerWidth: number,
    containerHeight: number,
    containerAspectRatio: number
  ): void {
    // Determine optimal grid dimensions based on container aspect ratio
    if (containerAspectRatio > 1.2) {
      // Wide container - favor more columns
      const approxCols = Math.ceil(Math.sqrt(nodeCount * containerAspectRatio));
      const approxRows = Math.ceil(nodeCount / approxCols);

      layoutOptions.cols = approxCols;
      layoutOptions.rows = approxRows;
    } else if (containerAspectRatio < 0.8) {
      // Tall container - favor more rows
      const approxRows = Math.ceil(Math.sqrt(nodeCount / containerAspectRatio));
      const approxCols = Math.ceil(nodeCount / approxRows);

      layoutOptions.cols = approxCols;
      layoutOptions.rows = approxRows;
    } else {
      // Square-ish container - balanced grid
      const approxDim = Math.ceil(Math.sqrt(nodeCount));

      layoutOptions.cols = approxDim;
      layoutOptions.rows = approxDim;
    }

    // Adjust spacing based on node count and container dimensions
    const baseFactor = 1.1;
    layoutOptions.spacingFactor = baseFactor *
      Math.min(Math.max((containerWidth * containerHeight) / (100000 * nodeCount), 0.8), 1.5);

    // Set bounding box to constrain the grid
    layoutOptions.boundingBox = this.calculateStandardBoundingBox(
      nodeCount,
      containerWidth,
      containerHeight,
      containerAspectRatio
    );
  }

  /**
   * Adapt Concentric layout parameters to container dimensions
   */
  private adaptConcentricLayout(
    layoutOptions: LayoutOptions,
    nodeCount: number,
    containerWidth: number,
    containerHeight: number,
    containerAspectRatio: number
  ): void {
    // Adjust minimum spacing based on container size
    // Reduce spacing to create tighter concentric circles
    const minDimension = Math.min(containerWidth, containerHeight);

    // Previous values were 0.15, 0.1, 0.07, 0.05
    if (nodeCount <= 5) {
      layoutOptions.minNodeSpacing = minDimension * 0.12; // Reduced from 0.15
    } else if (nodeCount <= 15) {
      layoutOptions.minNodeSpacing = minDimension * 0.08; // Reduced from 0.1
    } else if (nodeCount <= 30) {
      layoutOptions.minNodeSpacing = minDimension * 0.05; // Reduced from 0.07
    } else {
      layoutOptions.minNodeSpacing = minDimension * 0.03; // Reduced from 0.05
    }

    // Set concentric specific options
    layoutOptions.equidistant = true; // Better spacing between levels

    // Create a smaller, more compact bounding box (80% of standard)
    const standardBox = this.calculateStandardBoundingBox(
      nodeCount,
      containerWidth,
      containerHeight,
      containerAspectRatio
    );

    layoutOptions.boundingBox = {
      x1: 0,
      y1: 0,
      x2: Math.round(standardBox.x2 * 0.8),
      y2: Math.round(standardBox.y2 * 0.8)
    };

    // Adjust sweep to create a more complete circle when appropriate
    if (nodeCount > 10) {
      // For larger graphs, use full 360 degrees (2π)
      layoutOptions.sweep = Math.PI * 2;
    } else if (containerAspectRatio > 1.3) {
      // For wider containers, use a horizontal elliptical layout
      layoutOptions.startAngle = Math.PI / 2; // Start from top
      layoutOptions.sweep = Math.PI * 1.6;   // More horizontal coverage
    } else if (containerAspectRatio < 0.7) {
      // For taller containers, use a vertical elliptical layout
      layoutOptions.startAngle = 0;         // Start from right
      layoutOptions.sweep = Math.PI * 1.6;  // More vertical coverage
    } else {
      // For balanced containers, use full circle
      layoutOptions.sweep = Math.PI * 2;    // Full circle for better distribution
    }

    // Ensure this is true to make nodes appear larger
    layoutOptions.avoidOverlap = true;
  }

  /**
   * Adapt COSE layout parameters to container dimensions
   */
  private adaptCoseLayout(
    layoutOptions: LayoutOptions,
    nodeCount: number,
    containerWidth: number,
    containerHeight: number,
    containerAspectRatio: number,
    enforceHorizontal: boolean
  ): void {
    // Base settings for COSE based on node count
    if (nodeCount <= 10) {
      layoutOptions.nodeRepulsion = 8000;
      layoutOptions.idealEdgeLength = enforceHorizontal ? 160 : 150;
    } else if (nodeCount <= 50) {
      layoutOptions.nodeRepulsion = 5000;
      layoutOptions.idealEdgeLength = enforceHorizontal ? 120 : 100;
    } else {
      layoutOptions.nodeRepulsion = 3000;
      layoutOptions.idealEdgeLength = enforceHorizontal ? 100 : 80;
    }

    // Calculate target bounding box with appropriate aspect ratio
    let targetWidth: number, targetHeight: number;

    if (enforceHorizontal) {
      // For horizontal layout, ensure the bounding box is wider than tall
      // but still respects the container's overall shape
      const baseWidth = Math.max(nodeCount * 100, containerWidth * 0.8);

      // Apply a modified aspect ratio - making it more horizontal than the container
      const modifiedAspectRatio = Math.max(containerAspectRatio * 1.5, 1.6);
      targetWidth = baseWidth;
      targetHeight = baseWidth / modifiedAspectRatio;

      // Ensure height doesn't exceed container
      if (targetHeight > containerHeight * 0.8) {
        targetHeight = containerHeight * 0.8;
        targetWidth = targetHeight * modifiedAspectRatio;
      }
    } else {
      // For regular layout, maintain a more natural aspect ratio based on the container
      // Start with a size proportional to the number of nodes
      const nodeArea = nodeCount * 10000; // Base area per node

      // Calculate dimensions while maintaining container's aspect ratio
      targetWidth = Math.sqrt(nodeArea * containerAspectRatio);
      targetHeight = targetWidth / containerAspectRatio;

      // Scale down if too large for container
      const maxWidth = containerWidth * 0.85;
      const maxHeight = containerHeight * 0.85;

      if (targetWidth > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = targetWidth / containerAspectRatio;
      }

      if (targetHeight > maxHeight) {
        targetHeight = maxHeight;
        targetWidth = targetHeight * containerAspectRatio;
      }
    }

    // Set the bounding box for the layout
    layoutOptions.boundingBox = {
      x1: 0,
      y1: 0,
      x2: Math.round(targetWidth),
      y2: Math.round(targetHeight)
    };

    // Set gravity parameters
    layoutOptions.gravity = enforceHorizontal ? 50 : 80;

    if (enforceHorizontal) {
      // Stronger vertical gravity for horizontal layout
      layoutOptions.gravityY = containerAspectRatio > 1.2 ? 2.5 : 2.0;
      layoutOptions.gravityX = 0.1;
    } else {
      // Balanced gravity that slightly favors container shape
      if (containerAspectRatio > 1.5) {
        // Wide container - encourage horizontal spread
        layoutOptions.gravityY = 1.2;
        layoutOptions.gravityX = 0.5;
      } else if (containerAspectRatio < 0.8) {
        // Tall container - encourage vertical spread
        layoutOptions.gravityY = 0.5;
        layoutOptions.gravityX = 1.2;
      }
    }

    // Optimization parameters
    layoutOptions.numIter = enforceHorizontal ? 2500 : 1500;
    layoutOptions.coolingFactor = enforceHorizontal ? 0.95 : 0.98;
    layoutOptions.randomize = true;
    layoutOptions.edgeElasticity = enforceHorizontal ? 50 : 100;
    layoutOptions.nestingFactor = enforceHorizontal ? 0.1 : 1.2;
    layoutOptions.refresh = 30;
  }

  /**
   * Calculate adaptive spacing parameters based on node count
   */
  private getAdaptiveSpacing(nodeCount: number): { spacingFactor: number, minNodeSpacing: number } {
    // For smaller graphs, use larger spacing to avoid nodes appearing too small
    // Reduced spacing factors to make nodes appear larger relative to spacing
    if (nodeCount <= 5) {
      return { spacingFactor: 2.0, minNodeSpacing: 120 }; // Reduced from 2.5/150
    } else if (nodeCount <= 10) {
      return { spacingFactor: 1.6, minNodeSpacing: 100 }; // Reduced from 2.0/120
    } else if (nodeCount <= 30) {
      return { spacingFactor: 1.4, minNodeSpacing: 80 };  // Reduced from 1.8/100
    } else if (nodeCount <= 50) {
      return { spacingFactor: 1.2, minNodeSpacing: 60 };  // Reduced from 1.5/80
    } else if (nodeCount <= 100) {
      return { spacingFactor: 1.0, minNodeSpacing: 50 };  // Reduced from 1.3/60
    } else {
      return { spacingFactor: 0.8, minNodeSpacing: 35 };  // Reduced from 1.0/40
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
   * Calculate optimal zoom level based on node count and container size
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

    // Consider the container's aspect ratio
    const containerAspectRatio = containerWidth / containerHeight;

    // Adjust zoom based on aspect ratio - wider containers can handle larger graphs
    let aspectRatioFactor = 1.0;
    if (containerAspectRatio > 1.5) {
      // Very wide container
      aspectRatioFactor = 1.1;
    } else if (containerAspectRatio < 0.8) {
      // Very tall container
      aspectRatioFactor = 0.9;
    }

    // Calculate container size factor (larger containers allow for higher zoom)
    const containerSizeFactor = Math.sqrt(containerWidth * containerHeight) / 800;
    const containerFactor = Math.max(0.7, Math.min(1.3, containerSizeFactor));

    // Return balanced zoom level
    return baseZoom * aspectRatioFactor * containerFactor;
  }

  /**
   * Get icon class for a layout type
   */
  getLayoutIcon(layoutType: string): string {
    return this.layoutIconMap[layoutType] || 'bi-diagram-3';
  }
}
