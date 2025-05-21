import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { TypesService, NodeTypeModel, EdgeTypeModel } from './types.service';
import { environment } from '../../../environments/environment';
import { NodeVisualSetting, EdgeVisualSetting } from '../../Models/node-visual.model';
import { of } from 'rxjs';
import { Injectable } from '@angular/core';

describe('TypesService', () => {
  let service: TypesService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiBaseUrl}/types`;

  // Mock data
  const mockNodeTypes: NodeTypeModel[] = [
    {
      id: '1',
      name: 'Person',
      description: 'Human entity',
      category: 'Entity',
      styleProperties: { 'shape': 'circle', 'color': '#ff0000' }
    },
    {
      id: '2',
      name: 'Organization',
      description: 'Organization entity',
      category: 'Entity',
      styleProperties: { 'shape': 'rectangle', 'color': '#0000ff' }
    }
  ];

  const mockEdgeTypes: EdgeTypeModel[] = [
    {
      id: '1',
      name: 'KNOWS',
      description: 'Person knows another person',
      category: 'Relationship',
      isDirected: true,
      styleProperties: { 'lineColor': '#00ff00', 'lineStyle': 'solid' }
    },
    {
      id: '2',
      name: 'WORKS_FOR',
      description: 'Person works for an organization',
      category: 'Relationship',
      isDirected: true,
      styleProperties: { 'lineColor': '#ffff00', 'lineStyle': 'dashed' }
    }
  ];

  // Create a fully mocked version of the service for testing
  @Injectable()
  class MockTypesService extends TypesService {
    constructor(http: HttpClient) {
      super(http);
    }

    // Override the constructor's auto-initialization
    override loadNodeTypes(): void { /* Do nothing */ }
    override loadEdgeTypes(): void { /* Do nothing */ }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: TypesService, useClass: MockTypesService }
      ]
    });

    service = TestBed.inject(TypesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('node types', () => {
    it('should get node types', () => {
      service.getNodeTypes().subscribe(types => {
        expect(types.length).toBe(2);
        expect(types).toEqual(jasmine.arrayContaining([
          jasmine.objectContaining({ id: '1', name: 'Person' }),
          jasmine.objectContaining({ id: '2', name: 'Organization' })
        ]));
      });

      const req = httpMock.expectOne(`${apiUrl}/nodes`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNodeTypes);
    });

    it('should process node visual settings from style properties', () => {
      service.getNodeTypes().subscribe(types => {
        expect(types[0].visualSettings).toBeDefined();
        expect(types[0].visualSettings?.shape).toBe('circle');
        expect(types[0].visualSettings?.color).toBe('#ff0000');
      });

      const req = httpMock.expectOne(`${apiUrl}/nodes`);
      req.flush(mockNodeTypes);
    });

    it('should update node visual settings map after loading node types', () => {
      service.getNodeTypes().subscribe(() => {
        const visualSettings = service.getAllNodeVisualSettings();
        expect(visualSettings['Person']).toBeDefined();
        expect(visualSettings['Organization']).toBeDefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/nodes`);
      req.flush(mockNodeTypes);
    });

    it('should get node visual setting for a specific node type', () => {
      service.getNodeTypes().subscribe(() => {
        const visualSetting = service.getNodeVisualSetting('Person');
        expect(visualSetting.shape).toBe('circle');
        expect(visualSetting.color).toBe('#ff0000');
      });

      const req = httpMock.expectOne(`${apiUrl}/nodes`);
      req.flush(mockNodeTypes);
    });

    it('should return default node visual setting when type is not found', () => {
      service.getNodeTypes().subscribe(() => {
        const visualSetting = service.getNodeVisualSetting('NonExistentType');
        expect(visualSetting).toBeDefined();
        expect(visualSetting.shape).toBe('ellipse'); // Default shape
        expect(visualSetting.color).toBe('#8A2BE2'); // Default color
      });

      const req = httpMock.expectOne(`${apiUrl}/nodes`);
      req.flush(mockNodeTypes);
    });

    it('should get current node types without subscribing', () => {
      service.getNodeTypes().subscribe(() => {
        const currentTypes = service.getCurrentNodeTypes();
        expect(currentTypes.length).toBe(2);
        expect(currentTypes[0].name).toBe('Person');
        expect(currentTypes[1].name).toBe('Organization');
      });

      const req = httpMock.expectOne(`${apiUrl}/nodes`);
      req.flush(mockNodeTypes);
    });

    it('should handle HTTP errors when fetching node types', () => {
      const errorResponse = new ErrorEvent('Network error', {
        message: 'Connection refused'
      });

      service.getNodeTypes().subscribe({
        next: (types) => {
          expect(types).toEqual([]);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/nodes`);
      req.error(errorResponse);
    });
  });

  describe('edge types', () => {
    it('should get edge types', () => {
      service.getEdgeTypes().subscribe(types => {
        expect(types.length).toBe(2);
        expect(types).toEqual(jasmine.arrayContaining([
          jasmine.objectContaining({ id: '1', name: 'KNOWS' }),
          jasmine.objectContaining({ id: '2', name: 'WORKS_FOR' })
        ]));
      });

      const req = httpMock.expectOne(`${apiUrl}/edges`);
      expect(req.request.method).toBe('GET');
      req.flush(mockEdgeTypes);
    });

    it('should process edge visual settings from style properties', () => {
      service.getEdgeTypes().subscribe(types => {
        expect(types[0].visualSettings).toBeDefined();
        expect(types[0].visualSettings?.lineColor).toBe('#00ff00');
        expect(types[0].visualSettings?.lineStyle).toBe('solid');
      });

      const req = httpMock.expectOne(`${apiUrl}/edges`);
      req.flush(mockEdgeTypes);
    });

    it('should update edge visual settings map after loading edge types', () => {
      service.getEdgeTypes().subscribe(() => {
        const visualSettings = service.getAllEdgeVisualSettings();
        expect(visualSettings['KNOWS']).toBeDefined();
        expect(visualSettings['WORKS_FOR']).toBeDefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/edges`);
      req.flush(mockEdgeTypes);
    });

    it('should get edge visual setting for a specific edge type', () => {
      service.getEdgeTypes().subscribe(() => {
        const visualSetting = service.getEdgeVisualSetting('KNOWS');
        expect(visualSetting.lineColor).toBe('#00ff00');
        expect(visualSetting.lineStyle).toBe('solid');
      });

      const req = httpMock.expectOne(`${apiUrl}/edges`);
      req.flush(mockEdgeTypes);
    });

    it('should return default edge visual setting when type is not found', () => {
      service.getEdgeTypes().subscribe(() => {
        const visualSetting = service.getEdgeVisualSetting('NonExistentType');
        expect(visualSetting).toBeDefined();
        expect(visualSetting.lineColor).toBe('#757575'); // Default color
        expect(visualSetting.lineStyle).toBe('solid'); // Default style
      });

      const req = httpMock.expectOne(`${apiUrl}/edges`);
      req.flush(mockEdgeTypes);
    });

    it('should get current edge types without subscribing', () => {
      service.getEdgeTypes().subscribe(() => {
        const currentTypes = service.getCurrentEdgeTypes();
        expect(currentTypes.length).toBe(2);
        expect(currentTypes[0].name).toBe('KNOWS');
        expect(currentTypes[1].name).toBe('WORKS_FOR');
      });

      const req = httpMock.expectOne(`${apiUrl}/edges`);
      req.flush(mockEdgeTypes);
    });

    it('should handle HTTP errors when fetching edge types', () => {
      const errorResponse = new ErrorEvent('Network error', {
        message: 'Connection refused'
      });

      service.getEdgeTypes().subscribe({
        next: (types) => {
          expect(types).toEqual([]);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/edges`);
      req.error(errorResponse);
    });
  });
});
