// Frontend/src/app/Services/Graph/graph.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

// Interface for graphs received from the backend
export interface Graph {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for creating a new graph
export interface CreateGraphDto {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  private apiUrl = `${environment.apiBaseUrl}/graph`;
  private isBrowser: boolean;

  // Store the currently selected graph
  private currentGraphSubject = new BehaviorSubject<Graph | null>(null);

  // Subjects for graph operations notifications
  private graphCreatedSubject = new Subject<void>();
  private graphDeletedSubject = new Subject<void>();

  // Make observables available to components
  currentGraph$ = this.currentGraphSubject.asObservable();
  graphCreated$ = this.graphCreatedSubject.asObservable();
  graphDeleted$ = this.graphDeletedSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Try to load the last selected graph ID from local storage if in browser
    if (this.isBrowser) {
      this.loadSavedGraph();
    }
  }

  // Get the current graph synchronously
  get currentGraph(): Graph | null {
    return this.currentGraphSubject.value;
  }

  // Get the current graph ID to be used in API calls
  get currentGraphId(): string | null {
    return this.currentGraph?.id || null;
  }

  // Get all graphs from the API
  getGraphs(): Observable<Graph[]> {
    return this.http.get<Graph[]>(this.apiUrl);
  }

  // Get a specific graph by ID
  getGraph(id: string): Observable<Graph> {
    return this.http.get<Graph>(`${this.apiUrl}/${id}`);
  }

  // Create a new graph
  createGraph(graph: CreateGraphDto): Observable<Graph> {
    return this.http.post<Graph>(this.apiUrl, graph).pipe(
      tap(() => {
        this.graphCreatedSubject.next();
      })
    );
  }

  // Update an existing graph
  updateGraph(id: string, graph: Partial<Graph>): Observable<Graph> {
    return this.http.put<Graph>(`${this.apiUrl}/${id}`, graph);
  }

  // Delete a graph
  deleteGraph(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // If we delete the current graph, unset it
        if (this.currentGraph?.id === id) {
          this.setCurrentGraph(null);
        }
        this.graphDeletedSubject.next();
      })
    );
  }

  // Set the current active graph and store in local storage
  setCurrentGraph(graph: Graph | null): void {
    this.currentGraphSubject.next(graph);

    // Save to local storage for persistence if in browser
    if (this.isBrowser) {
      if (graph && graph.id) {
        localStorage.setItem('currentGraphId', graph.id);
        localStorage.setItem('currentGraphName', graph.name || 'Unnamed Graph');
      } else {
        localStorage.removeItem('currentGraphId');
        localStorage.removeItem('currentGraphName');
      }
    }
  }

  // Set the current graph by ID
  setCurrentGraphById(id: string): Observable<Graph> {
    return this.getGraph(id).pipe(
      tap((graph) => {
        this.setCurrentGraph(graph);
      })
    );
  }

  // Send a notification that a graph was created
  notifyGraphCreated(): void {
    this.graphCreatedSubject.next();
  }

  // Send a notification that a graph was deleted
  notifyGraphDeleted(): void {
    this.graphDeletedSubject.next();
  }

  // Load saved graph from local storage on service initialization
  private loadSavedGraph(): void {
    if (!this.isBrowser) return;

    try {
      const savedGraphId = localStorage.getItem('currentGraphId');
      const savedGraphName = localStorage.getItem('currentGraphName');

      if (savedGraphId && savedGraphName) {
        // Create a minimal graph object from stored data
        const savedGraph: Graph = {
          id: savedGraphId,
          name: savedGraphName
        };

        this.currentGraphSubject.next(savedGraph);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }
}

