import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NodeService } from './node.service';
import { GraphService } from '../Graph/graph.service';
import { environment } from '../../../environments/environment';
import { Node } from '../../Models/node.model';

describe('NodeService', () => {
  let service: NodeService;
  let httpMock: HttpTestingController;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;

  // Mock data
  const mockGraphId = 'graph123';
  const mockNode: Node = {
    id: 'node1',
    name: 'Test Node',
    nodeType: 'person',
    graphId: mockGraphId,
    positionX: 100,
    positionY: 200
  };

  const mockNodes: Node[] = [
    mockNode,
    {
      id: 'node2',
      name: 'Another Node',
      nodeType: 'company',
      graphId: mockGraphId,
      positionX: 300,
      positionY: 400
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
        NodeService,
        { provide: GraphService, useValue: graphServiceSpy }
      ]
    });

    service = TestBed.inject(NodeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNodes', () => {
    it('should fetch nodes from API using provided graphId', () => {
      service.getNodes('custom-graph-id').subscribe(nodes => {
        expect(nodes).toEqual(mockNodes);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node?graphId=custom-graph-id`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNodes);
    });

    it('should use currentGraphId from graphService if no graphId provided', () => {
      service.getNodes().subscribe(nodes => {
        expect(nodes).toEqual(mockNodes);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node?graphId=${mockGraphId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNodes);
    });

    it('should make request without graphId if neither provided nor in service', () => {
      // Set currentGraphId to undefined
      Object.defineProperty(graphServiceSpy, 'currentGraphId', {
        get: () => undefined
      });

      service.getNodes().subscribe(nodes => {
        expect(nodes).toEqual(mockNodes);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNodes);
    });
  });

  describe('createNode', () => {
    it('should create a node via POST request', () => {
      service.createNode(mockNode).subscribe(node => {
        expect(node).toEqual(mockNode);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockNode);
      req.flush(mockNode);
    });

    it('should add graphId to node from graphService if not present', () => {
      // Use Partial<Node> to create a node without graphId
      const nodeWithoutGraphId: Partial<Node> = {
        id: 'node1',
        name: 'Test Node',
        nodeType: 'person',
        positionX: 100,
        positionY: 200
      };

      const expectedNode = { ...mockNode }; // with graphId

      // Cast to Node since service.createNode expects a Node
      service.createNode(nodeWithoutGraphId as Node).subscribe(node => {
        expect(node).toEqual(expectedNode);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.graphId).toBe(mockGraphId);
      req.flush(expectedNode);
    });
  });

  describe('updateNode', () => {
    it('should update a node via PUT request', () => {
      service.updateNode(mockNode).subscribe(node => {
        expect(node).toEqual(mockNode);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node/${mockNode.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockNode);
      req.flush(mockNode);
    });

    it('should throw error if node has no id', () => {
      const nodeWithoutId = { ...mockNode, id: undefined };

      expect(() => service.updateNode(nodeWithoutId)).toThrowError('Node ID is required for update');
    });
  });

  describe('deleteNode', () => {
    it('should delete a node via DELETE request', () => {
      service.deleteNode(mockNode.id!).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node/${mockNode.id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('getNodePositions', () => {
    it('should get node positions via getNodes and transform response', () => {
      const expectedPositions = {
        positions: {
          'node1': { x: 100, y: 200 },
          'node2': { x: 300, y: 400 }
        }
      };

      service.getNodePositions(mockGraphId).subscribe(result => {
        expect(result).toEqual(expectedPositions);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node?graphId=${mockGraphId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNodes);
    });

    it('should return error observable if graphId is not provided', () => {
      let errorMessage: string | undefined;

      service.getNodePositions('').subscribe({
        error: (error) => {
          errorMessage = error;
        }
      });

      expect(errorMessage).toBe('Graph ID is required');
    });
  });

  describe('saveNodePositions', () => {
    it('should save node positions via POST request', () => {
      const positions = {
        'node1': { x: 100, y: 200 },
        'node2': { x: 300, y: 400 }
      };

      service.saveNodePositions(mockGraphId, positions).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/node/positions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        graphId: mockGraphId,
        positions: positions
      });
      req.flush({ success: true });
    });
  });

  describe('Observer notifications', () => {
    it('should notify subscribers when notifyNodeCreated is called', () => {
      let notified = false;
      service.nodeCreated$.subscribe(() => {
        notified = true;
      });

      service.notifyNodeCreated();
      expect(notified).toBeTrue();
    });

    it('should notify subscribers when notifyNodeDeleted is called', () => {
      let notified = false;
      service.nodeDeleted$.subscribe(() => {
        notified = true;
      });

      service.notifyNodeDeleted();
      expect(notified).toBeTrue();
    });
  });
});
