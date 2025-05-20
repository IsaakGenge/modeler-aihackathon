// First, let's create a new model to handle node visual settings
// File: Frontend/src/app/Models/node-visual-settings.model.ts

import { NodeType } from './node-type.model';

export interface NodeVisualSetting {
  shape: string;     // Cytoscape shape name
  color: string;     // Color for the node
  icon?: string;     // Optional: Font Awesome or other icon name if using
}

export const NODE_VISUAL_SETTINGS: Record<NodeType, NodeVisualSetting> = {
  [NodeType.Default]: {
    shape: 'ellipse',
    color: '#8A2BE2'  // BlueViolet (current color)
  },
  [NodeType.Person]: {
    shape: 'round-rectangle',
    color: '#E91E63'  // Pink
  },
  [NodeType.Place]: {
    shape: 'triangle',
    color: '#009688'  // Teal
  },
  [NodeType.Thing]: {
    shape: 'diamond',
    color: '#FF9800'  // Orange
  },
  [NodeType.Concept]: {
    shape: 'hexagon',
    color: '#3F51B5'  // Indigo
  }
};
