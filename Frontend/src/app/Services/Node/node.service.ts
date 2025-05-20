// Frontend/src/app/Services/Node/node.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GraphService } from '../Graph/graph.service';

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private apiUrl = `${environment.apiBaseUrl}/node`;
  private nodeCreatedSubject = new Subject<void>();
  private nodeDeletedSubject = new Subject<void>();

  nodeCreated$ = this.nodeCreatedSubject.asObservable();
  nodeDeleted$ = this.nodeDeletedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private graphService: GraphService
  ) { }

  getNodes(graphId?: string): Observable<any> {
    // Use provided graphId or fallback to the current graph from service
    const targetGraphId = graphId || this.graphService.currentGraphId;

    let params = new HttpParams();
    if (targetGraphId) {
      params = params.set('graphId', targetGraphId);
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  createNode(node: any): Observable<any> {
    // Add the graphId to the node if not already present
    if (!node.graphId && this.graphService.currentGraphId) {
      node.graphId = this.graphService.currentGraphId;
    }

    return this.http.post<any>(this.apiUrl, node);
  }

  notifyNodeCreated(): void {
    this.nodeCreatedSubject.next();
  }

  deleteNode(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  notifyNodeDeleted(): void {
    this.nodeDeletedSubject.next();
  }
}
