// Frontend/src/app/Components/cytoscape-graph/models/graph-models.ts

import { NodeSingular } from 'cytoscape';

// Define interface for node positions
export interface NodePosition {
  x: number;
  y: number;
}

// Interface for node positions map
export interface NodePositionsMap {
  [key: string]: NodePosition;
}

// Define interface for selected graph element
export interface SelectedGraphElement {
  type: 'node' | 'edge';
  data: {
    id: string;
    label: string;
    nodeType?: string;
    edgeType?: string;
    source?: string;
    target?: string;
    sourceLabel?: string;
    targetLabel?: string;
  };
}

// Interface for graph element data
export interface GraphNodeData {
  id: string | number;
  name?: string;
  nodeType?: string;
  parent?: string | number;
  positionX?: number;
  positionY?: number;
}

export interface GraphEdgeData {
  id: string | number;
  source: string | number;
  target: string | number;
  edgeType?: string;
}

// Cytoscape element data structure
export interface CytoscapeNodeData {
  data: {
    id: string;
    label: string;
    nodeType: string;
    parent?: string;
  };
  position?: {
    x: number;
    y: number;
  };
}

export interface CytoscapeEdgeData {
  data: {
    id: string;
    source: string;
    target: string;
    sourceLabel?: string;
    targetLabel?: string;
    label: string;
    edgeType?: string;
  };
}

// Interface for compound drag and drop configuration
export interface CompoundDragAndDropConfig {
  dropTarget: (node: NodeSingular) => boolean;
  overThreshold: number;
  outThreshold: number;
  grabbedNodeClassName: {
    active: string;
    inactive: string;
  };
  dropTargetClassName: {
    active: string;
    over: string;
  };
  dropTaskFunction: (grabbedNode: NodeSingular, dropTarget: NodeSingular) => boolean;
}
