// Frontend/src/app/Services/Edge/edge.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GraphService } from '../Graph/graph.service';
import { Edge } from '../../Models/edge.model';

@Injectable({
    providedIn: 'root'
})
export class EdgeService {
    private apiUrl = `${environment.apiBaseUrl}/edge`;
    private edgeCreatedSubject = new Subject<void>();
    private edgeDeletedSubject = new Subject<void>();

    edgeCreated$ = this.edgeCreatedSubject.asObservable();
    edgeDeleted$ = this.edgeDeletedSubject.asObservable();

    constructor(
        private http: HttpClient,
        private graphService: GraphService
    ) { }

    getEdges(graphId?: string): Observable<Edge[]> {
        // Use provided graphId or fallback to the current graph from service
        const targetGraphId = graphId || this.graphService.currentGraphId;

        let params = new HttpParams();
        if (targetGraphId) {
            params = params.set('graphId', targetGraphId);
        }

        return this.http.get<Edge[]>(this.apiUrl, { params });
    }

    createEdge(edge: Edge): Observable<Edge> {
        // Add the graphId to the edge if not already present
        if (!edge.graphId && this.graphService.currentGraphId) {
            edge.graphId = this.graphService.currentGraphId;
        }

        return this.http.post<Edge>(this.apiUrl, edge);
  }
  updateEdge(edge: Edge): Observable<Edge> {
    if (!edge.id) {
      throw new Error('Edge ID is required for update');
    }
    return this.http.put<Edge>(`${this.apiUrl}/${edge.id}`, edge);
  }

    deleteEdge(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }

    notifyEdgeCreated(): void {
        this.edgeCreatedSubject.next();
    }

    notifyEdgeDeleted(): void {
        this.edgeDeletedSubject.next();
    }
}
