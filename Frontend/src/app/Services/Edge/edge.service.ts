// Frontend/src/app/Services/Edge/edge.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GraphService } from '../Graph/graph.service';
import { Edge } from '../../Models/edge.model';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EdgeService {
  private apiUrl = `${environment.apiBaseUrl}/edge`;
  // Change to Subject<Edge> to pass the actual edge data
  private edgeCreatedSubject = new Subject<Edge>();
  private edgeDeletedSubject = new Subject<string>(); // Pass edge ID on deletion

  // Update the observable types
  edgeCreated$ = this.edgeCreatedSubject.asObservable();
  edgeDeleted$ = this.edgeDeletedSubject.asObservable();
  private latestCreatedEdge: Edge | null = null;

  constructor(
    private http: HttpClient,
    private graphService: GraphService
  ) { }

  getEdges(graphId?: string): Observable<Edge[]> {
    const targetGraphId = graphId || this.graphService.currentGraphId;
    let params = new HttpParams();
    if (targetGraphId) {
      params = params.set('graphId', targetGraphId);
    }

    return this.http.get<Edge[]>(this.apiUrl, { params });
  }

  createEdge(edge: Edge): Observable<Edge> {
    if (!edge.graphId && this.graphService.currentGraphId) {
      edge.graphId = this.graphService.currentGraphId;
    }

    return this.http.post<Edge>(this.apiUrl, edge).pipe(
      tap((createdEdge: Edge) => {
        // Store the latest created edge
        this.latestCreatedEdge = createdEdge;
        // Notify subscribers with the actual edge data
        this.notifyEdgeCreated(createdEdge);
      })
    );
  }

  // Updated to pass the actual edge or use the latest created one
  notifyEdgeCreated(edge?: Edge): void {
    if (edge) {
      // If we have edge data, emit it
      this.edgeCreatedSubject.next(edge);
    } else if (this.latestCreatedEdge) {
      // If no edge provided but we have a latest one, use it
      this.edgeCreatedSubject.next(this.latestCreatedEdge);
    } else {
      // For backward compatibility, emit an empty edge
      this.edgeCreatedSubject.next({} as Edge);
    }
  }

  getLatestCreatedEdge(graphId: string): Observable<Edge | null> {
    // If we have a cached edge and it matches the graph ID, return it
    if (this.latestCreatedEdge && this.latestCreatedEdge.graphId === graphId) {
      return of(this.latestCreatedEdge);
    }

    // Otherwise return null
    return of(null);
  }

  updateEdge(edge: Edge): Observable<Edge> {
    if (!edge.id) {
      throw new Error('Edge ID is required for update');
    }
    return this.http.put<Edge>(`${this.apiUrl}/${edge.id}`, edge);
  }

  deleteEdge(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Notify with the deleted edge ID
        this.notifyEdgeDeleted(id);
      })
    );
  }

  // Updated to pass the deleted edge id
  notifyEdgeDeleted(id?: string): void {
    if (id) {
      this.edgeDeletedSubject.next(id);
    } else {
      this.edgeDeletedSubject.next('');
    }
  }
}
