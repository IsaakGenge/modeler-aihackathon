import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphPickerComponent } from './graph-picker.component';
import { GraphService } from '../../../Services/Graph/graph.service';
import { ThemeService } from '../../../Services/Theme/theme.service';
import { of, Subject, throwError } from 'rxjs'; // Added throwError import
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('GraphPickerComponent', () => {
  let component: GraphPickerComponent;
  let fixture: ComponentFixture<GraphPickerComponent>;
  let graphServiceSpy: jasmine.SpyObj<GraphService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  beforeEach(async () => {
    // Create spies for services
    graphServiceSpy = jasmine.createSpyObj('GraphService', [
      'getGraphs',
      'setCurrentGraphById',
      'setCurrentGraph'
    ], {
      currentGraph$: new Subject(),
      graphCreated$: new Subject(),
      graphDeleted$: new Subject()
    });

    themeServiceSpy = jasmine.createSpyObj('ThemeService', [], {
      isDarkMode$: of(false)
    });

    // Mock getGraphs to return an observable
    graphServiceSpy.getGraphs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [GraphPickerComponent],
      providers: [
        { provide: GraphService, useValue: graphServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: 'PLATFORM_ID', useValue: 'browser' }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements and attributes
    }).compileComponents();

    fixture = TestBed.createComponent(GraphPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleCollapse', () => {
    it('should toggle the collapsed state and emit collapsedChange', () => {
      const collapsedChangeSpy = spyOn(component.collapsedChange, 'emit');

      // Initial state should be true (based on current functionality)
      expect(component.isCollapsed).toBeTrue();

      // Toggle to false
      component.toggleCollapse();
      expect(component.isCollapsed).toBeFalse();
      expect(collapsedChangeSpy).toHaveBeenCalledWith(false);

      // Toggle back to true
      component.toggleCollapse();
      expect(component.isCollapsed).toBeTrue();
      expect(collapsedChangeSpy).toHaveBeenCalledWith(true);
    });
  })

  describe('ngOnInit', () => {
    it('should load graphs and subscribe to graph events', () => {
      const mockGraphs = [{ id: '1', name: 'Graph 1' }, { id: '2', name: 'Graph 2' }];
      graphServiceSpy.getGraphs.and.returnValue(of(mockGraphs));

      component.ngOnInit();

      expect(graphServiceSpy.getGraphs).toHaveBeenCalled();
      expect(component.graphs).toEqual(mockGraphs);
    });
  });

  describe('loadGraphs', () => {
    it('should load graphs successfully', () => {
      const mockGraphs = [{ id: '1', name: 'Graph 1' }];
      graphServiceSpy.getGraphs.and.returnValue(of(mockGraphs));

      component.loadGraphs();

      expect(component.graphs).toEqual(mockGraphs);
      expect(component.warning).toBe('');
      expect(component.error).toBe('');
    });

    it('should handle no graphs found', () => {
      graphServiceSpy.getGraphs.and.returnValue(of([]));

      component.loadGraphs();

      expect(component.graphs).toEqual([]);
      expect(component.warning).toBe('No graphs available. Please create a graph to get started.');
    });

    it('should handle errors when loading graphs', () => {
      graphServiceSpy.getGraphs.and.returnValue(throwError(() => ({ status: 500 })));

      component.loadGraphs();

      expect(component.error).toBe('Failed to load graphs');
    });
  });

  describe('onGraphSelect', () => {
    it('should select a graph and emit graphSelected', () => {
      const mockGraph = { id: '1', name: 'Graph 1' };
      component.selectedGraphId = '1';
      graphServiceSpy.setCurrentGraphById.and.returnValue(of(mockGraph));
      const graphSelectedSpy = spyOn(component.graphSelected, 'emit');

      component.onGraphSelect();

      expect(graphServiceSpy.setCurrentGraphById).toHaveBeenCalledWith('1');
      expect(graphSelectedSpy).toHaveBeenCalledWith('1');
    });

    it('should handle errors when selecting a graph', () => {
      component.selectedGraphId = '1';
      graphServiceSpy.setCurrentGraphById.and.returnValue(throwError(() => ({ status: 500 })));
      const graphSelectedSpy = spyOn(component.graphSelected, 'emit');

      component.onGraphSelect();

      expect(component.error).toBe('Failed to select graph');
      expect(graphSelectedSpy).toHaveBeenCalledWith(null);
    });

    it('should emit null when no graph is selected', () => {
      component.selectedGraphId = null;
      const graphSelectedSpy = spyOn(component.graphSelected, 'emit');

      component.onGraphSelect();

      expect(graphSelectedSpy).toHaveBeenCalledWith(null);
    });
  });

  describe('selectedGraphName', () => {
    it('should return the name of the selected graph', () => {
      component.graphs = [{ id: '1', name: 'Graph 1' }];
      component.selectedGraphId = '1';

      expect(component.selectedGraphName).toBe('Graph 1');
    });

    it('should return "No graph selected" if no graph is selected', () => {
      component.selectedGraphId = null;

      expect(component.selectedGraphName).toBe('No graph selected');
    });
  });
});
