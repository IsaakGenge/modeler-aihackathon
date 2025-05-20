// Frontend/src/app/Services/Types/types.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, map } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NodeVisualSetting, EdgeVisualSetting } from '../../Models/node-visual.model';

export interface NodeTypeModel {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  styleProperties: Record<string, string>;
  visualSettings?: NodeVisualSetting;
}

export interface EdgeTypeModel {
  id: string;
  name: string;
  description: string;
  category: string;
  isDirected: boolean;
  styleProperties: Record<string, string>;
  visualSettings?: EdgeVisualSetting;
}

@Injectable({
  providedIn: 'root'
})
export class TypesService {
  private apiUrl = `${environment.apiBaseUrl}/types`;
  private _nodeTypes = new BehaviorSubject<NodeTypeModel[]>([]);
  private _edgeTypes = new BehaviorSubject<EdgeTypeModel[]>([]);
  private _nodeVisualSettings = new BehaviorSubject<Record<string, NodeVisualSetting>>({});
  private _edgeVisualSettings = new BehaviorSubject<Record<string, EdgeVisualSetting>>({});

  // Expose the observable parts of the subjects
  readonly nodeTypes$ = this._nodeTypes.asObservable();
  readonly edgeTypes$ = this._edgeTypes.asObservable();
  readonly nodeVisualSettings$ = this._nodeVisualSettings.asObservable();
  readonly edgeVisualSettings$ = this._edgeVisualSettings.asObservable();

  // Default visual settings as fallback
  private defaultNodeVisualSetting: NodeVisualSetting = {
    shape: 'ellipse',
    color: '#8A2BE2'  // BlueViolet (current default color)
  };

  private defaultEdgeVisualSetting: EdgeVisualSetting = {
    lineColor: '#757575',  // Grey
    lineStyle: 'solid',
    width: '1',
    targetArrowShape: 'triangle',
    curveStyle: 'bezier',
    lineOpacity: '0.8'
  };

  constructor(private http: HttpClient) {
    // Load types on service initialization
    this.loadNodeTypes();
    this.loadEdgeTypes();
  }

  /**
   * Gets all available node types from the API
   */
  getNodeTypes(): Observable<NodeTypeModel[]> {
    return this.http.get<NodeTypeModel[]>(`${this.apiUrl}/nodes`).pipe(
      map(types => this.processNodeVisualSettings(types)),
      tap(types => {
        this._nodeTypes.next(types);
        this.updateNodeVisualSettings(types);
      }),
      catchError(error => {
        console.error('Error fetching node types', error);
        return of([]);
      })
    );
  }

  /**
   * Gets all available edge types from the API
   */
  getEdgeTypes(): Observable<EdgeTypeModel[]> {
    return this.http.get<EdgeTypeModel[]>(`${this.apiUrl}/edges`).pipe(
      map(types => this.processEdgeVisualSettings(types)),
      tap(types => {
        this._edgeTypes.next(types);
        this.updateEdgeVisualSettings(types);
      }),
      catchError(error => {
        console.error('Error fetching edge types', error);
        return of([]);
      })
    );
  }

  /**
   * Process the node types to extract visual settings from styleProperties
   */
  private processNodeVisualSettings(nodeTypes: NodeTypeModel[]): NodeTypeModel[] {
    return nodeTypes.map(nodeType => {
      const visualSetting: NodeVisualSetting = {
        shape: nodeType.styleProperties['shape'] || this.defaultNodeVisualSetting.shape,
        color: nodeType.styleProperties['color'] || this.defaultNodeVisualSetting.color,
        icon: nodeType.icon || undefined
      };

      return {
        ...nodeType,
        visualSettings: visualSetting
      };
    });
  }

  /**
   * Process the edge types to extract visual settings from styleProperties
   */
  private processEdgeVisualSettings(edgeTypes: EdgeTypeModel[]): EdgeTypeModel[] {
    return edgeTypes.map(edgeType => {
      const visualSetting: EdgeVisualSetting = {
        lineColor: edgeType.styleProperties['lineColor'] || this.defaultEdgeVisualSetting.lineColor,
        lineStyle: edgeType.styleProperties['lineStyle'] || this.defaultEdgeVisualSetting.lineStyle,
        width: edgeType.styleProperties['width'] || this.defaultEdgeVisualSetting.width,
        targetArrowShape: edgeType.styleProperties['targetArrowShape'] || this.defaultEdgeVisualSetting.targetArrowShape,
        curveStyle: edgeType.styleProperties['curveStyle'] || this.defaultEdgeVisualSetting.curveStyle,
        lineOpacity: edgeType.styleProperties['lineOpacity'] || this.defaultEdgeVisualSetting.lineOpacity
      };

      return {
        ...edgeType,
        visualSettings: visualSetting
      };
    });
  }

  /**
   * Create a map of node type names to visual settings
   */
  private updateNodeVisualSettings(nodeTypes: NodeTypeModel[]): void {
    const visualSettingsMap: Record<string, NodeVisualSetting> = {};

    nodeTypes.forEach(nodeType => {
      if (nodeType.visualSettings) {
        visualSettingsMap[nodeType.name] = nodeType.visualSettings;
      }
    });

    this._nodeVisualSettings.next(visualSettingsMap);
  }

  /**
   * Create a map of edge type names to visual settings
   */
  private updateEdgeVisualSettings(edgeTypes: EdgeTypeModel[]): void {
    const visualSettingsMap: Record<string, EdgeVisualSetting> = {};

    edgeTypes.forEach(edgeType => {
      if (edgeType.visualSettings) {
        visualSettingsMap[edgeType.name] = edgeType.visualSettings;
      }
    });

    this._edgeVisualSettings.next(visualSettingsMap);
  }

  /**
   * Load node types and update the BehaviorSubject
   */
  loadNodeTypes(): void {
    this.getNodeTypes().subscribe();
  }

  /**
   * Load edge types and update the BehaviorSubject
   */
  loadEdgeTypes(): void {
    this.getEdgeTypes().subscribe();
  }

  /**
   * Get the current value of node types without subscribing
   */
  getCurrentNodeTypes(): NodeTypeModel[] {
    return this._nodeTypes.value;
  }

  /**
   * Get the current value of edge types without subscribing
   */
  getCurrentEdgeTypes(): EdgeTypeModel[] {
    return this._edgeTypes.value;
  }

  /**
   * Get node visual settings for a specific node type
   */
  getNodeVisualSetting(nodeType: string): NodeVisualSetting {
    const visualSettings = this._nodeVisualSettings.value;
    return visualSettings[nodeType] || this.defaultNodeVisualSetting;
  }

  /**
   * Get all node visual settings as a record
   */
  getAllNodeVisualSettings(): Record<string, NodeVisualSetting> {
    return this._nodeVisualSettings.value;
  }

  /**
  * Get edge visual settings for a specific edge type
  */
  getEdgeVisualSetting(edgeType: string): EdgeVisualSetting {
    const visualSettings = this._edgeVisualSettings.value;
    return visualSettings[edgeType] || this.defaultEdgeVisualSetting;
  }

  /**
   * Get all edge visual settings as a record
   */
  getAllEdgeVisualSettings(): Record<string, EdgeVisualSetting> {
    return this._edgeVisualSettings.value;
  }
}
