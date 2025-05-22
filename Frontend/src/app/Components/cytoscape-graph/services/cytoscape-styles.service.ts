// Frontend/src/app/Components/cytoscape-graph/services/cytoscape-styles.service.ts

import { Injectable } from '@angular/core';
import { NodeVisualSetting, EdgeVisualSetting } from '../../../Models/node-visual.model';

@Injectable({
  providedIn: 'root'
})
export class CytoscapeStylesService {
  // Default node visual setting for fallback
  private defaultNodeVisualSetting: NodeVisualSetting = {
    shape: 'ellipse',
    color: '#8A2BE2' // BlueViolet color
  };

  // Default edge visual setting for fallback
  private defaultEdgeVisualSetting: EdgeVisualSetting = {
    lineColor: '#757575',  // Grey
    lineStyle: 'solid',
    width: '1',
    targetArrowShape: 'triangle',
    curveStyle: 'bezier',
    lineOpacity: '0.8'
  };

  constructor() { }

  /**
   * Get graph styles based on dark mode and node/edge settings
   */
  getGraphStyles(
    isDark: boolean,
    nodeVisualSettings: Record<string, NodeVisualSetting>,
    edgeVisualSettings: Record<string, EdgeVisualSetting>
  ): any[] {
    // Base node styles that apply to all nodes
    const baseNodeStyles = {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'color': '#fff',
      'width': 30,
      'height': 30,
      'font-size': 12,
      'text-outline-width': 2,
      'font-weight': 'bold',
      'text-wrap': 'ellipsis'
    };

    // Get all node type names from the available settings
    const nodeTypeNames = Object.keys(nodeVisualSettings);

    // Create node type-specific styles using the visual settings
    const nodeTypeStyles = nodeTypeNames.map(typeName => ({
      selector: `node[nodeType="${typeName}"]`,
      style: {
        'background-color': nodeVisualSettings[typeName]?.color || this.defaultNodeVisualSetting.color,
        'text-outline-color': nodeVisualSettings[typeName]?.color || this.defaultNodeVisualSetting.color,
        'shape': nodeVisualSettings[typeName]?.shape || this.defaultNodeVisualSetting.shape
      }
    }));

    // Get all edge type names from the available settings
    const edgeTypeNames = Object.keys(edgeVisualSettings);

    // Create edge type-specific styles using the visual settings
    const edgeTypeStyles = edgeTypeNames.map(typeName => ({
      selector: `edge[edgeType="${typeName}"]`,
      style: {
        'line-color': edgeVisualSettings[typeName]?.lineColor || this.defaultEdgeVisualSetting.lineColor,
        'line-style': edgeVisualSettings[typeName]?.lineStyle || this.defaultEdgeVisualSetting.lineStyle,
        'width': edgeVisualSettings[typeName]?.width || this.defaultEdgeVisualSetting.width,
        'target-arrow-shape': edgeVisualSettings[typeName]?.targetArrowShape || this.defaultEdgeVisualSetting.targetArrowShape,
        'curve-style': edgeVisualSettings[typeName]?.curveStyle || this.defaultEdgeVisualSetting.curveStyle,
        'opacity': edgeVisualSettings[typeName]?.lineOpacity || this.defaultEdgeVisualSetting.lineOpacity,
        'target-arrow-color': edgeVisualSettings[typeName]?.lineColor || this.defaultEdgeVisualSetting.lineColor
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
          'background-color': this.defaultNodeVisualSetting.color,
          'text-outline-color': this.defaultNodeVisualSetting.color,
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

  /**
   * Get style settings for a specific node type
   */
  getNodeTypeStyle(
    nodeId: string,
    nodeType: string,
    nodeVisualSettings: Record<string, NodeVisualSetting>
  ): Record<string, string> {
    const typeStyle = nodeVisualSettings[nodeType];
    if (!typeStyle) {
      return {
        'background-color': this.defaultNodeVisualSetting.color,
        'text-outline-color': this.defaultNodeVisualSetting.color,
        'shape': this.defaultNodeVisualSetting.shape
      };
    }

    return {
      'background-color': typeStyle.color,
      'text-outline-color': typeStyle.color,
      'shape': typeStyle.shape
    };
  }
}
