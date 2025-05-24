// Frontend/src/app/Services/Node/node.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GraphService } from '../Graph/graph.service';
import { Node } from '../../Models/node.model';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private apiUrl = `${environment.apiBaseUrl}/node`;
  // Change to Subject<Node> to pass the actual node data
  private nodeCreatedSubject = new Subject<Node>();
  private nodeDeletedSubject = new Subject<string>(); // Pass node ID on deletion

  // Update the observable types
  nodeCreated$ = this.nodeCreatedSubject.asObservable();
  nodeDeleted$ = this.nodeDeletedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private graphService: GraphService
  ) { }

  getNodes(graphId?: string): Observable<Node[]> {
    // Use provided graphId or fallback to the current graph from service
    const targetGraphId = graphId || this.graphService.currentGraphId;

    let params = new HttpParams();
    if (targetGraphId) {
      params = params.set('graphId', targetGraphId);
    }

    return this.http.get<Node[]>(this.apiUrl, { params });
  }

  createNode(node: Node): Observable<Node> {
    // Add the graphId to the node if not already present
    if (!node.graphId && this.graphService.currentGraphId) {
      node.graphId = this.graphService.currentGraphId;
    }

    return this.http.post<Node>(this.apiUrl, node).pipe(
      tap((createdNode: Node) => {
        // Notify subscribers with the actual node data
        this.notifyNodeCreated(createdNode);
      })
    );
  }

  // Updated to pass the actual node
  notifyNodeCreated(node?: Node): void {
    if (node) {
      // If we have node data, emit it
      this.nodeCreatedSubject.next(node);
    } else {
      // For backward compatibility, emit an empty node
      this.nodeCreatedSubject.next({} as Node);
    }
  }

  updateNode(node: Node): Observable<Node> {
    if (!node.id) {
      throw new Error('Node ID is required for update');
    }
    return this.http.put<Node>(`${this.apiUrl}/${node.id}`, node);
  }

  deleteNode(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Notify with the deleted node ID
        this.notifyNodeDeleted(id);
      })
    );
  }

  // Updated to pass the deleted node id
  notifyNodeDeleted(id?: string): void {
    if (id) {
      this.nodeDeletedSubject.next(id);
    } else {
      this.nodeDeletedSubject.next('');
    }
  }

  // Get node positions for a graph
  getNodePositions(graphId: string, forceRefresh: boolean = false): Observable<any> {
    if (!graphId) {
      console.error('Graph ID is required to get node positions');
      return new Observable(observer => observer.error('Graph ID is required'));
    }

    const httpOptions = {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };

    // Use the existing getNodes method that retrieves all node data including positions
    return this.getNodes(graphId).pipe(
      map(nodes => {
        // Transform the node array into the positions format expected by the component
        const positions: { [key: string]: { x: number, y: number } } = {};

        nodes.forEach(node => {
          if (node.id && node.positionX !== undefined && node.positionY !== undefined) {
            positions[node.id] = {
              x: Number(node.positionX),
              y: Number(node.positionY)
            };
          }
        });

        return { positions };
      })
    );
  }

  // Save node positions
  saveNodePositions(graphId: string, positions: { [key: string]: { x: number, y: number } }): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/node/positions`, {
      graphId,
      positions
    });
  }
}
