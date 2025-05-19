import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NodeService } from './node.service';
import { environment } from '../../../environments/environment';

describe('NodeService', () => {
  let service: NodeService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiBaseUrl}/node`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NodeService]
    });
    service = TestBed.inject(NodeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verifies that no requests are outstanding
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNodes', () => {
    it('should return an Observable of nodes', () => {
      const mockNodes = [
        { id: 'node1', name: 'Test Node 1', nodeType: 'person' },
        { id: 'node2', name: 'Test Node 2', nodeType: 'location' }
      ];

      service.getNodes().subscribe(nodes => {
        expect(nodes).toEqual(mockNodes);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockNodes);
    });

    it('should handle errors when getting nodes', () => {
      service.getNodes().subscribe({
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

  describe('createNode', () => {
    it('should create a node and return it', () => {
      const newNode = { name: 'New Node', nodeType: 'system' };
      const mockResponse = { id: 'node3', name: 'New Node', nodeType: 'system' };

      service.createNode(newNode).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newNode);
      req.flush(mockResponse);
    });

    it('should handle errors when creating a node', () => {
      const newNode = { name: 'New Node', nodeType: 'system' };

      service.createNode(newNode).subscribe({
        next: () => fail('Should have failed with an error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Invalid node data', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('deleteNode', () => {
    it('should delete a node by id', () => {
      const nodeId = 'node1';

      service.deleteNode(nodeId).subscribe(response => {
        expect(response).toEqual({});
      });

      const req = httpMock.expectOne(`${apiUrl}/${nodeId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });

    it('should handle errors when deleting a node', () => {
      const nodeId = 'nonexistent';

      service.deleteNode(nodeId).subscribe({
        next: () => fail('Should have failed with an error'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${nodeId}`);
      req.flush('Node not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('node notification events', () => {
    it('should emit an event when notifyNodeCreated is called', (done) => {
      service.nodeCreated$.subscribe(() => {
        expect(true).toBeTruthy(); // Event was emitted
        done();
      });

      service.notifyNodeCreated();
    });

    it('should emit an event when notifyNodeDeleted is called', (done) => {
      service.nodeDeleted$.subscribe(() => {
        expect(true).toBeTruthy(); // Event was emitted
        done();
      });

      service.notifyNodeDeleted();
    });

    it('should not emit nodeCreated event before notifyNodeCreated is called', () => {
      const spy = jasmine.createSpy('subscriber');
      service.nodeCreated$.subscribe(spy);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit nodeDeleted event before notifyNodeDeleted is called', () => {
      const spy = jasmine.createSpy('subscriber');
      service.nodeDeleted$.subscribe(spy);

      expect(spy).not.toHaveBeenCalled();
    });
  });
});

