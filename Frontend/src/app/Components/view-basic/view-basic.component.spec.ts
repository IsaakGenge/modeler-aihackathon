import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewBasicComponent } from './view-basic.component';
import { GraphService } from '../../Services/Graph/graph.service';

import { ToolsPanelStateService } from '../../Services/ToolPanelState/tool-panel-state.service';
import { of, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { HttpClientTestingModule } from '@angular/common/http/testing';

import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';

@Component({
  selector: 'app-create-edge',
  template: ''
})
class MockCreateEdgeComponent { }

@Component({
  selector: 'app-create-node',
  template: ''
})
class MockCreateNodeComponent { }

describe('ViewBasicComponent', () => {
  let component: ViewBasicComponent;
  let fixture: ComponentFixture<ViewBasicComponent>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;
  let toolsPanelStateServiceSpy: jasmine.SpyObj<ToolsPanelStateService>;

  beforeEach(async () => {
    graphServiceSpy = jasmine.createSpyObj('GraphService', ['setCurrentGraph', 'getGraphs'], {
      currentGraph$: new Subject(),
      graphCreated$: new Subject(),
      graphDeleted$: new Subject(),
      edgeCreated$: new Subject()
    });
    graphServiceSpy.getGraphs.and.returnValue(of([
      { id: 'graph1', name: 'Graph 1' },
      { id: 'graph2', name: 'Graph 2' }
    ]))

    toolsPanelStateServiceSpy = jasmine.createSpyObj('ToolsPanelStateService', ['setCollapsed'], {
      collapsed$: of(false)
    });

    await TestBed.configureTestingModule({
     
      imports: [
        ViewBasicComponent,
        MockCreateEdgeComponent,
        MockCreateNodeComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: GraphService, useValue: graphServiceSpy },
        { provide: ToolsPanelStateService, useValue: toolsPanelStateServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleToolsPanel', () => {
    it('should toggle toolsPanelCollapsed and update ToolsPanelStateService', () => {
      component.toolsPanelCollapsed = false;
      component.toggleToolsPanel();

      expect(component.toolsPanelCollapsed).toBeTrue();
      expect(toolsPanelStateServiceSpy.setCollapsed).toHaveBeenCalledWith(true);
    });
  });

  describe('onTabChange', () => {
    it('should update activeTab', () => {
      component.onTabChange(2);

      expect(component.activeTab).toBe(2);
    });
  });

  describe('onNodeSelected', () => {
    it('should set selectedElement with node data', () => {
      const mockNode = { id: '1', name: 'Node 1', nodeType: 'type1', graphId: 'graph1' };
      component.onNodeSelected(mockNode);

      expect(component.selectedElement).toEqual({
        type: 'node',
        data: { ...mockNode, label: 'Node 1' }
      });
    });
  });

 
  describe('toggleViewNodesPanel', () => {
    it('should toggle viewNodesPanelCollapsed', () => {
      component.viewNodesPanelCollapsed = false;
      component.toggleViewNodesPanel();

      expect(component.viewNodesPanelCollapsed).toBeTrue();
    });
  });

  describe('toggleViewEdgesPanel', () => {
    it('should toggle viewEdgesPanelCollapsed', () => {
      component.viewEdgesPanelCollapsed = false;
      component.toggleViewEdgesPanel();

      expect(component.viewEdgesPanelCollapsed).toBeTrue();
    });
  });
});


