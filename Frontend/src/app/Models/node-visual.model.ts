// First, let's create a new model to handle node visual settings
// File: Frontend/src/app/Models/node-visual-settings.model.ts

export interface NodeVisualSetting {
  shape: string;     // Cytoscape shape name
  color: string;     // Color for the node
  icon?: string;     // Optional: Font Awesome or other icon name if using
}

export interface EdgeVisualSetting {
  lineColor: string;     // CSS color for the edge line
  lineStyle: string;     // Line style (solid, dashed, dotted)
  width: string;         // Line width
  targetArrowShape: string; // Shape of the target arrow (triangle, circle, etc.)
  curveStyle?: string;   // Optional curve style
  lineOpacity?: string;  // Optional opacity
}

