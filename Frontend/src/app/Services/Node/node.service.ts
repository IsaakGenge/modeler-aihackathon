// Frontend/src/app/Services/Node/node.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private apiUrl = `${environment.apiBaseUrl}/node`; 
  private nodeCreatedSubject = new Subject<void>();
  private nodeDeletedSubject = new Subject<void>();

  nodeCreated$ = this.nodeCreatedSubject.asObservable();
  nodeDeleted$ = this.nodeDeletedSubject.asObservable();

  constructor(private http: HttpClient) { }

  getNodes(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  createNode(node: any): Observable<any> {
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

