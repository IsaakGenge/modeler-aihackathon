import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EdgeService } from './edge.service';
import { GraphService } from '../Graph/graph.service';
import { environment } from '../../../environments/environment';
import { Edge } from '../../Models/edge.model';

describe('EdgeService', () => {
  let service: EdgeService;
  let httpMock: HttpTestingController;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;

  // Mock data
  const mockGraphId = 'graph123';
  const mockEdge: Edge = {
    id: 'edge1',
    source: 'node1',
    target: 'node2',
    edgeType: 'relates_to',
    graphId: mockGraphId
  };

  const mockEdges: Edge[] = [
    mockEdge,
    {
      id: 'edge2',
      source: 'node2',
      target: 'node3',
      edgeType: 'depends_on',
      graphId: mockGraphId
    }
  ];

  beforeEach(() => {
    // Create spy for GraphService
    graphServiceSpy = jasmine.createSpyObj('GraphService', [], {
      currentGraphId: mockGraphId
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EdgeService,
        { provide: GraphService, useValue: graphServiceSpy }
      ]
    });

    service = TestBed.inject(EdgeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEdges', () => {
    it('should fetch edges from API using provided graphId', () => {
      service.getEdges('custom-graph-id').subscribe(edges => {
        expect(edges).toEqual(mockEdges);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/edge?graphId=custom-graph-id`);
      expect(req.request.method).toBe('GET');
      req.flush(mockEdges);
    });

    it('should use currentGraphId from graphService if no graphId provided', () => {
      service.getEdges().subscribe(edges => {
        expect(edges).toEqual(mockEdges);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/edge?graphId=${mockGraphId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockEdges);
    });

    it('should make request without graphId if neither provided nor in service', () => {
      // Set currentGraphId to undefined
      Object.defineProperty(graphServiceSpy, 'currentGraphId', {
        get: () => undefined
      });

      service.getEdges().subscribe(edges => {
        expect(edges).toEqual(mockEdges);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/edge`);
      expect(req.request.method).toBe('GET');
      req.flush(mockEdges);
    });
  });

  describe('createEdge', () => {
    it('should create an edge via POST request', () => {
      service.createEdge(mockEdge).subscribe(edge => {
        expect(edge).toEqual(mockEdge);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/edge`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockEdge);
      req.flush(mockEdge);
    });

    it('should add graphId to edge from graphService if not present', () => {
      // Use Partial<Edge> to create an edge without graphId
      const edgeWithoutGraphId: Partial<Edge> = {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        edgeType: 'relates_to'
      };

      const expectedEdge = { ...mockEdge }; // with graphId

      // Cast to Edge since service.createEdge expects an Edge
      service.createEdge(edgeWithoutGraphId as Edge).subscribe(edge => {
        expect(edge).toEqual(expectedEdge);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/edge`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.graphId).toBe(mockGraphId);
      req.flush(expectedEdge);
    });
  });

  describe('updateEdge', () => {
    it('should update an edge via PUT request', () => {
      service.updateEdge(mockEdge).subscribe(edge => {
        expect(edge).toEqual(mockEdge);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/edge/${mockEdge.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockEdge);
      req.flush(mockEdge);
    });

    it('should throw error if edge has no id', () => {
      const edgeWithoutId = { ...mockEdge, id: undefined };

      expect(() => service.updateEdge(edgeWithoutId)).toThrowError('Edge ID is required for update');
    });
  });

  describe('deleteEdge', () => {
    it('should delete an edge via DELETE request', () => {
      service.deleteEdge(mockEdge.id!).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/edge/${mockEdge.id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('Observer notifications', () => {
    it('should notify subscribers when notifyEdgeCreated is called', () => {
      let notified = false;
      service.edgeCreated$.subscribe(() => {
        notified = true;
      });

      service.notifyEdgeCreated();
      expect(notified).toBeTrue();
    });

    it('should notify subscribers when notifyEdgeDeleted is called', () => {
      let notified = false;
      service.edgeDeleted$.subscribe(() => {
        notified = true;
      });

      service.notifyEdgeDeleted();
      expect(notified).toBeTrue();
    });
  });
});
