import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreateEdgeComponent } from './create-edge.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { EdgeService } from '../../../Services/Edge/edge.service';
import { TypesService } from '../../../Services/Types/types.service';
import { GraphService } from '../../../Services/Graph/graph.service';
import { NodeService } from '../../../Services/Node/node.service';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CreateEdgeComponent', () => {
  let component: CreateEdgeComponent;
  let fixture: ComponentFixture<CreateEdgeComponent>;
  let edgeServiceSpy: jasmine.SpyObj<EdgeService>;
  let typesServiceSpy: jasmine.SpyObj<TypesService>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;
  let nodeServiceSpy: jasmine.SpyObj<NodeService>;

  // Mock data
  const mockEdgeTypes = [
    {
      id: 'relates_to',
      name: 'Relates To',
      description: 'A relationship between two nodes',
      category: 'default',
      isDirected: true,
      styleProperties: {}
    },
    {
      id: 'depends_on',
      name: 'Depends On',
      description: 'A dependency relationship',
      category: 'default',
      isDirected: false,
      styleProperties: {}
    }
  ];

  const mockNodes = [
    {
      id: 'Node1',
      name: 'Node 1',
      nodeType: 'type1',
      graphId: 'graph1',
      positionX: 100,
      positionY: 200,
      properties: {}
    },
    {
      id: 'Node2',
      name: 'Node 2',
      nodeType: 'type2',
      graphId: 'graph1',
      positionX: 300,
      positionY: 400,
      properties: {}
    }
  ];

  const mockEdge = {
    id: 'edge1',
    source: 'Node1',
    target: 'Node2',
    edgeType: 'relates_to',
    graphId: 'graph1',
    createdAt: new Date(),
    properties: {}
  };

  beforeEach(async () => {
    // Create spies for services
    edgeServiceSpy = jasmine.createSpyObj('EdgeService', ['createEdge', 'notifyEdgeCreated']);
    typesServiceSpy = jasmine.createSpyObj('TypesService', ['loadEdgeTypes']);
    graphServiceSpy = jasmine.createSpyObj('GraphService', [], { currentGraph$: of('graph1') });
    nodeServiceSpy = jasmine.createSpyObj('NodeService', ['getNodes'], {
      nodeCreated$: new BehaviorSubject<void>(undefined),
      nodeDeleted$: new BehaviorSubject<void>(undefined)
    });

    // Configure mock behavior
    Object.defineProperty(typesServiceSpy, 'edgeTypes$', {
      get: () => of(mockEdgeTypes)
    });
    typesServiceSpy.loadEdgeTypes.and.callFake(() => { });
    edgeServiceSpy.createEdge.and.returnValue(of(mockEdge));
    edgeServiceSpy.notifyEdgeCreated.and.callFake(() => { }); // Mock notifyEdgeCreated
    nodeServiceSpy.getNodes.and.returnValue(of(mockNodes)); // Mock getNodes to return mockNodes

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, HttpClientModule, CreateEdgeComponent],
      providers: [
        { provide: EdgeService, useValue: edgeServiceSpy },
        { provide: TypesService, useValue: typesServiceSpy },
        { provide: GraphService, useValue: graphServiceSpy },
        { provide: NodeService, useValue: nodeServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEdgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  
});
