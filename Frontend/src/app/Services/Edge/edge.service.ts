// Frontend/src/app/Services/Edge/edge.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EdgeService {
  private edgeAPI = "http://localhost:5447/api/edge";
  private edgeCreatedSubject = new Subject<void>();
  private edgeDeletedSubject = new Subject<void>();

  edgeCreated$ = this.edgeCreatedSubject.asObservable();
  edgeDeleted$ = this.edgeDeletedSubject.asObservable();

  constructor(private http: HttpClient) { }

  getEdges(): Observable<any> {
    return this.http.get<any>(this.edgeAPI);
  }

  createEdge(edge: any): Observable<any> {
    return this.http.post<any>(this.edgeAPI, edge);
  }

  deleteEdge(id: string): Observable<any> {
    return this.http.delete<any>(`${this.edgeAPI}/${id}`);
  }

  notifyEdgeCreated(): void {
    this.edgeCreatedSubject.next();
  }

  notifyEdgeDeleted(): void {
    this.edgeDeletedSubject.next();
  }
}

