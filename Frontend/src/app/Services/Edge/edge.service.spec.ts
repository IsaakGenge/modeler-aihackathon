import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { EdgeService } from './edge.service';

describe('EdgeService', () => {
  let service: EdgeService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:5447/api/edge';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EdgeService]
    });
    service = TestBed.inject(EdgeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verifies that no requests are outstanding
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEdges', () => {
    it('should return an Observable of edges', () => {
      const mockEdges = [
        { id: 'edge1', source: 'node1', target: 'node2', edgeType: 'related' },
        { id: 'edge2', source: 'node2', target: 'node3', edgeType: 'depends_on' }
      ];

      service.getEdges().subscribe(edges => {
        expect(edges).toEqual(mockEdges);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockEdges);
    });

    it('should handle errors when getting edges', () => {
      service.getEdges().subscribe({
        next: () => fail('Should have failed with an error'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe('Server Error');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Server error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('createEdge', () => {
    it('should create an edge and return it', () => {
      const newEdge = { source: 'node1', target: 'node2', edgeType: 'related' };
      const mockResponse = { id: 'edge3', source: 'node1', target: 'node2', edgeType: 'related' };

      service.createEdge(newEdge).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newEdge);
      req.flush(mockResponse);
    });

    it('should handle errors when creating an edge', () => {
      const newEdge = { source: 'node1', target: 'node2', edgeType: 'related' };

      service.createEdge(newEdge).subscribe({
        next: () => fail('Should have failed with an error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Invalid edge data', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('deleteEdge', () => {
    it('should delete an edge by id', () => {
      const edgeId = 'edge1';

      service.deleteEdge(edgeId).subscribe(response => {
        expect(response).toEqual({});
      });

      const req = httpMock.expectOne(`${apiUrl}/${edgeId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });

    it('should handle errors when deleting an edge', () => {
      const edgeId = 'nonexistent';

      service.deleteEdge(edgeId).subscribe({
        next: () => fail('Should have failed with an error'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${edgeId}`);
      req.flush('Edge not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('edge notification events', () => {
    it('should emit an event when notifyEdgeCreated is called', (done) => {
      service.edgeCreated$.subscribe(() => {
        expect(true).toBeTruthy(); // Event was emitted
        done();
      });

      service.notifyEdgeCreated();
    });

    it('should emit an event when notifyEdgeDeleted is called', (done) => {
      service.edgeDeleted$.subscribe(() => {
        expect(true).toBeTruthy(); // Event was emitted
        done();
      });

      service.notifyEdgeDeleted();
    });

    it('should not emit edgeCreated event before notifyEdgeCreated is called', () => {
      const spy = jasmine.createSpy('subscriber');
      service.edgeCreated$.subscribe(spy);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit edgeDeleted event before notifyEdgeDeleted is called', () => {
      const spy = jasmine.createSpy('subscriber');
      service.edgeDeleted$.subscribe(spy);

      expect(spy).not.toHaveBeenCalled();
    });
  });
});

