// Frontend/src/app/Components/cytoscape-graph/services/cytoscape-layout.service.ts

import { Injectable } from '@angular/core';

// Define layout types that can be used
export const LAYOUT_TYPES = {
  BREADTHFIRST: 'breadthfirst',
  CIRCLE: 'circle',
  GRID: 'grid',
  CONCENTRIC: 'concentric',
  COSE: 'cose',
  RANDOM: 'random'
};

// Define available layouts with labels
export const AVAILABLE_LAYOUTS = [
  { type: LAYOUT_TYPES.BREADTHFIRST, label: 'Hierarchical' },
  { type: LAYOUT_TYPES.CIRCLE, label: 'Circular' },
  { type: LAYOUT_TYPES.GRID, label: 'Grid' },
  { type: LAYOUT_TYPES.CONCENTRIC, label: 'Concentric' },
  { type: LAYOUT_TYPES.COSE, label: 'Force-Directed' },
  { type: LAYOUT_TYPES.RANDOM, label: 'Random' }
];

// Define default layout options
export const DEFAULT_LAYOUT_OPTIONS = {
  name: 'cose',
  fit: true,
  directed: false,
  padding: 30,
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
    [LAYOUT_TYPES.RANDOM]: 'bi-shuffle'
  };

  constructor() { }

  /**
   * Get layout options based on layout type
   */
  getLayoutOptions(layoutType: string): any {
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

    return layoutOptions;
  }

  /**
   * Get icon class for a layout type
   */
  getLayoutIcon(layoutType: string): string {
    return this.layoutIconMap[layoutType] || 'bi-diagram-3';
  }
}
