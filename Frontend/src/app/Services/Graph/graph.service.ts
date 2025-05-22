// Frontend/src/app/Services/Graph/graph.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { Graph, CreateGraphDto } from '../../Models/graph.model';

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  private apiUrl = `${environment.apiBaseUrl}/graph`;
  private importExportUrl = `${environment.apiBaseUrl}/importexport`;
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
    return this.http.get<Graph[]>(this.apiUrl).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching graphs:', error);
        return throwError(() => error);
      })
    );
  }

  // Get a specific graph by ID
  getGraph(id: string): Observable<Graph> {
    return this.http.get<Graph>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`Error fetching graph with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  // Create a new graph
  createGraph(graph: CreateGraphDto): Observable<Graph> {
    console.log('Creating graph:', graph);
    return this.http.post<Graph>(this.apiUrl, graph).pipe(
      tap((newGraph) => {
        console.log('Graph created successfully:', newGraph);
        // Notify after successful creation
        this.graphCreatedSubject.next();

        // Optionally update the current graph if it's the first one
        if (!this.currentGraph) {
          this.setCurrentGraph(newGraph);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error in GraphService.createGraph:', error);
        // Rethrow the error so components can handle it
        return throwError(() => error);
      })
    );
  }

  // Update an existing graph
  updateGraph(id: string, graph: Partial<Graph>): Observable<Graph> {
    return this.http.put<Graph>(`${this.apiUrl}/${id}`, graph).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`Error updating graph with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
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
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`Error deleting graph with ID ${id}:`, error);
        return throwError(() => error);
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
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`Error setting current graph by ID ${id}:`, error);
        return throwError(() => error);
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


  /**
 * Exports a graph by initiating a file download
 * @param graphId The ID of the graph to export
 */
  exportGraph(graphId: string): void {
    if (!this.isBrowser) {
      console.error("File download is only supported in browser environments");
      return;
    }

    if (!graphId) {
      console.error("Cannot export: Graph ID is missing");
      return;
    }

    // Create a direct download link to the export endpoint
    const exportUrl = `${this.importExportUrl}/export/${graphId}`;

    // Create a hidden anchor element to trigger the download
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `graph-${graphId}-export.json`;

    // Append to body, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Add this to the graph.service.ts
  /**
   * Imports a graph from a JSON file
   * @param file The JSON file containing graph data
   * @param newName Optional new name for the imported graph
   * @returns Observable with information about the imported graph
   */
  importGraph(file: File, newName?: string): Observable<any> {
    if (!file) {
      return throwError(() => new Error('No file provided for import'));
    }

    const formData = new FormData();
    formData.append('GraphFile', file);

    if (newName) {
      formData.append('NewGraphName', newName);
    }

    return this.http.post<any>(`${this.importExportUrl}/import`, formData).pipe(
      tap(response => {
        console.log('Graph imported successfully:', response);
        // Notify after successful import (same as creation)
        this.graphCreatedSubject.next();
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error importing graph:', error);
        return throwError(() => error);
      })
    );
  }
}
