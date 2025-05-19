// Frontend/src/app/Services/Node/node.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  private nodeAPI = "http://localhost:5447/api/node";
  private nodeCreatedSubject = new Subject<void>();

  nodeCreated$ = this.nodeCreatedSubject.asObservable();

  constructor(private http: HttpClient) { }

  getNodes(): Observable<any> {
    return this.http.get<any>(this.nodeAPI);
  }

  createNode(node: any): Observable<any> {
    return this.http.post<any>(this.nodeAPI, node);
  }

  notifyNodeCreated(): void {
    this.nodeCreatedSubject.next();
  }
}
