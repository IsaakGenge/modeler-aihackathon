import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { GraphService } from './graph.service';
import { environment } from '../../../environments/environment';
import { Graph, CreateGraphDto } from '../../Models/graph.model';
import { isPlatformBrowser } from '@angular/common';

describe('GraphService', () => {
  let service: GraphService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiBaseUrl}/graph`;

  // Mock data
  const mockGraphs: Graph[] = [
    { id: '1', name: 'Graph 1' },
    { id: '2', name: 'Graph 2' }
  ];

  const mockGraph: Graph = { id: '1', name: 'Graph 1' };
  const mockCreateGraphDto: CreateGraphDto = { name: 'New Graph' };
  const mockNewGraph: Graph = { id: '3', name: 'New Graph' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ],
      providers: [
        GraphService,
        // Use the actual browser platform ID token for testing
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    service = TestBed.inject(GraphService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem').and.callFake(() => { });
    spyOn(localStorage, 'removeItem').and.callFake(() => { });

    // Force isBrowser to be true by directly modifying the private property
    // @ts-ignore - accessing private property for testing
    service['isBrowser'] = true;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all graphs', () => {
    service.getGraphs().subscribe(graphs => {
      expect(graphs).toEqual(mockGraphs);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockGraphs);
  });

  it('should get a specific graph by ID', () => {
    const graphId = '1';

    service.getGraph(graphId).subscribe(graph => {
      expect(graph).toEqual(mockGraph);
    });

    const req = httpMock.expectOne(`${apiUrl}/${graphId}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGraph);
  });

  it('should create a new graph', () => {
    service.createGraph(mockCreateGraphDto).subscribe(graph => {
      expect(graph).toEqual(mockNewGraph);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockCreateGraphDto);
    req.flush(mockNewGraph);
  });

  it('should update an existing graph', () => {
    const graphId = '1';
    const updatedGraph = { name: 'Updated Graph' };
    const resultGraph = { ...mockGraph, ...updatedGraph };

    service.updateGraph(graphId, updatedGraph).subscribe(graph => {
      expect(graph).toEqual(resultGraph);
    });

    const req = httpMock.expectOne(`${apiUrl}/${graphId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedGraph);
    req.flush(resultGraph);
  });

  it('should delete a graph', () => {
    const graphId = '1';

    service.deleteGraph(graphId).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/${graphId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should set the current graph', () => {
    // Set the graph
    service.setCurrentGraph(mockGraph);

    // Verify the current graph was updated
    expect(service.currentGraph).toEqual(mockGraph);

    // Verify localStorage was updated
    expect(localStorage.setItem).toHaveBeenCalledWith('currentGraphId', mockGraph.id);
    expect(localStorage.setItem).toHaveBeenCalledWith('currentGraphName', mockGraph.name);
  });

  it('should remove current graph from localStorage when setting to null', () => {
    service.setCurrentGraph(null);

    expect(localStorage.removeItem).toHaveBeenCalledWith('currentGraphId');
    expect(localStorage.removeItem).toHaveBeenCalledWith('currentGraphName');
  });

  it('should set current graph by ID', () => {
    service.setCurrentGraphById('1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGraph);

    // Verify the current graph was updated
    expect(service.currentGraph).toEqual(mockGraph);
  });

  it('should notify when a graph is created', () => {
    let notified = false;
    service.graphCreated$.subscribe(() => {
      notified = true;
    });

    service.notifyGraphCreated();

    expect(notified).toBe(true);
  });

  it('should notify when a graph is deleted', () => {
    let notified = false;
    service.graphDeleted$.subscribe(() => {
      notified = true;
    });

    service.notifyGraphDeleted();

    expect(notified).toBe(true);
  });

  it('should handle HTTP errors when fetching graphs', () => {
    const errorResponse = new ErrorEvent('Network error', {
      message: 'Connection refused'
    });

    service.getGraphs().subscribe({
      next: () => fail('Expected an error'),
      error: (error) => expect(error).toBeTruthy()
    });

    const req = httpMock.expectOne(apiUrl);
    req.error(errorResponse);
  });
});
