import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NodeService {

  private nodeAPI = "http://localhost:5447/api/node";

  constructor(private http: HttpClient) { }

  getNodes(): Observable<any> {
    return this.http.get<any>(this.nodeAPI);
  }

  createNode(node: any): Observable<any> {
    return this.http.post<any>(this.nodeAPI, node);
  }
}
