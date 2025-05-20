// Frontend/src/app/Services/Types/types.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface NodeTypeModel {
    id: string;
    name: string;
    description: string;
    category: string;
    icon?: string;
    styleProperties: Record<string, string>;
}

export interface EdgeTypeModel {
    id: string;
    name: string;
    description: string;
    category: string;
    isDirected: boolean;
    styleProperties: Record<string, string>;
}

@Injectable({
    providedIn: 'root'
})
export class TypesService {
    private apiUrl = `${environment.apiBaseUrl}/types`;
    private _nodeTypes = new BehaviorSubject<NodeTypeModel[]>([]);
    private _edgeTypes = new BehaviorSubject<EdgeTypeModel[]>([]);

    // Expose the observable parts of the subjects
    readonly nodeTypes$ = this._nodeTypes.asObservable();
    readonly edgeTypes$ = this._edgeTypes.asObservable();

    constructor(private http: HttpClient) {
        // Load types on service initialization
        this.loadNodeTypes();
        this.loadEdgeTypes();
    }

    /**
     * Gets all available node types from the API
     */
    getNodeTypes(): Observable<NodeTypeModel[]> {
        return this.http.get<NodeTypeModel[]>(`${this.apiUrl}/nodes`).pipe(
            tap(types => this._nodeTypes.next(types)),
            catchError(error => {
                console.error('Error fetching node types', error);
                return of([]);
            })
        );
    }

    /**
     * Gets all available edge types from the API
     */
    getEdgeTypes(): Observable<EdgeTypeModel[]> {
        return this.http.get<EdgeTypeModel[]>(`${this.apiUrl}/edges`).pipe(
            tap(types => this._edgeTypes.next(types)),
            catchError(error => {
                console.error('Error fetching edge types', error);
                return of([]);
            })
        );
    }

    /**
     * Load node types and update the BehaviorSubject
     */
    loadNodeTypes(): void {
        this.getNodeTypes().subscribe();
    }

    /**
     * Load edge types and update the BehaviorSubject
     */
    loadEdgeTypes(): void {
        this.getEdgeTypes().subscribe();
    }

    /**
     * Get the current value of node types without subscribing
     */
    getCurrentNodeTypes(): NodeTypeModel[] {
        return this._nodeTypes.value;
    }

    /**
     * Get the current value of edge types without subscribing
     */
    getCurrentEdgeTypes(): EdgeTypeModel[] {
        return this._edgeTypes.value;
    }
}
