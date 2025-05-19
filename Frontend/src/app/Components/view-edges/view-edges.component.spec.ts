import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ViewEdgesComponent } from './view-edges.component';
import { EdgeService } from '../../Services/Edge/edge.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';

describe('ViewEdgesComponent', () => {
  let component: ViewEdgesComponent;
  let fixture: ComponentFixture<ViewEdgesComponent>;
  let edgeService: EdgeService;
  let edgeCreatedSubject: Subject<void>;
  let edgeDeletedSubject: Subject<void>;

  // Sample test data
  const mockEdgeData = [
    { id: 'edge1', source: 'node1', target: 'node2', edgeType: 'related', createdAt: new Date() },
    { id: 'edge2', source: 'node2', target: 'node3', edgeType: 'depends_on', createdAt: new Date() }
  ];

  beforeEach(async () => {
    // Create subjects for edge events
    edgeCreatedSubject = new Subject<void>();
    edgeDeletedSubject = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [
        ViewEdgesComponent,
        HttpClientTestingModule,
        CommonModule
      ],
      providers: [
        {
          provide: EdgeService,
          useValue: {
            getEdges: () => of(mockEdgeData),
            deleteEdge: (id: string) => of({}),
            notifyEdgeDeleted: () => { },
            edgeCreated$: edgeCreatedSubject.asObservable(),
            edgeDeleted$: edgeDeletedSubject.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewEdgesComponent);
    component = fixture.componentInstance;
    edgeService = TestBed.inject(EdgeService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load edges on initialization', fakeAsync(() => {
    // After initialization, loading should be complete
    expect(component.loading).toBeFalse();

    // Verify data was loaded
    expect(component.edgeData.length).toBe(2);
    expect(component.edgeData[0].id).toBe('edge1');
    expect(component.edgeData[1].id).toBe('edge2');
  }));

  it('should reload edges when notified of edge created', fakeAsync(() => {
    // Setup spy to track reload
    const getEdgesSpy = spyOn(edgeService, 'getEdges').and.returnValue(of([
      ...mockEdgeData,
      { id: 'edge3', source: 'node3', target: 'node4', edgeType: 'connected_to', createdAt: new Date() }
    ]));

    // Trigger edge created notification
    edgeCreatedSubject.next();
    tick();

    // Verify edges were reloaded
    expect(getEdgesSpy).toHaveBeenCalled();
    expect(component.edgeData.length).toBe(3);
  }));

  it('should reload edges when notified of edge deleted', fakeAsync(() => {
    // Setup spy to track reload
    const getEdgesSpy = spyOn(edgeService, 'getEdges').and.returnValue(of([
      { id: 'edge2', source: 'node2', target: 'node3', edgeType: 'depends_on', createdAt: new Date() }
    ]));

    // Trigger edge deleted notification
    edgeDeletedSubject.next();
    tick();

    // Verify edges were reloaded
    expect(getEdgesSpy).toHaveBeenCalled();
    expect(component.edgeData.length).toBe(1);
    expect(component.edgeData[0].id).toBe('edge2');
  }));

  it('should handle errors during edge loading', fakeAsync(() => {
    // Mock error response
    const mockError = new Error('Edge load error');
    spyOn(edgeService, 'getEdges').and.returnValue(throwError(() => mockError));

    // Call getEdges
    component.getEdges();
    tick();

    // Verify error handling
    expect(component.error).toBe('Failed to load connection data');
    expect(component.loading).toBeFalse();
  }));

  it('should delete an edge after confirmation', fakeAsync(() => {
    // Setup spies
    spyOn(window, 'confirm').and.returnValue(true);
    const deleteEdgeSpy = spyOn(edgeService, 'deleteEdge').and.returnValue(of({}));
    const notifyDeletedSpy = spyOn(edgeService, 'notifyEdgeDeleted');

    // Call delete
    component.deleteEdge('edge1');
    tick();

    // Verify delete was called
    expect(deleteEdgeSpy).toHaveBeenCalledWith('edge1');
    expect(notifyDeletedSpy).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  }));

  it('should not delete an edge if confirmation is canceled', fakeAsync(() => {
    // Setup spies
    spyOn(window, 'confirm').and.returnValue(false);
    const deleteEdgeSpy = spyOn(edgeService, 'deleteEdge');

    // Call delete
    component.deleteEdge('edge1');
    tick();

    // Verify delete was not called
    expect(deleteEdgeSpy).not.toHaveBeenCalled();
  }));

  it('should handle errors during edge deletion', fakeAsync(() => {
    // Setup spies
    spyOn(window, 'confirm').and.returnValue(true);
    const mockError = new Error('Delete error');
    spyOn(edgeService, 'deleteEdge').and.returnValue(throwError(() => mockError));

    // Call delete
    component.deleteEdge('edge1');
    tick();

    // Verify error handling
    expect(component.error).toBe('Failed to delete connection');
    expect(component.loading).toBeFalse();
  }));

  it('should display loading indicator when loading is true', () => {
    component.loading = true;
    fixture.detectChanges();
    const loadingText = fixture.nativeElement.textContent;
    expect(loadingText).toContain('Loading connection data...');
  });

  it('should display error message when error is present', () => {
    component.error = 'Test error message';
    fixture.detectChanges();
    const errorElement = fixture.nativeElement.querySelector('.alert-danger');
    expect(errorElement.textContent).toContain('Test error message');
  });

  it('should display message when no edges are available', () => {
    component.edgeData = [];
    fixture.detectChanges();
    const emptyMessage = fixture.nativeElement.querySelector('.alert-info');
    expect(emptyMessage.textContent).toContain('No connections available');
  });

  it('should display table with edges when data is available', () => {
    component.edgeData = mockEdgeData;
    fixture.detectChanges();
    const tableRows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(tableRows.length).toBe(2);
  });

  it('should clean up subscriptions on destroy', () => {
    const unsubscribeSpy1 = spyOn(component['edgeCreatedSubscription'], 'unsubscribe');
    const unsubscribeSpy2 = spyOn(component['edgeDeletedSubscription'], 'unsubscribe');

    // Trigger ngOnDestroy
    component.ngOnDestroy();

    // Verify unsubscribe was called for both subscriptions
    expect(unsubscribeSpy1).toHaveBeenCalled();
    expect(unsubscribeSpy2).toHaveBeenCalled();
  });
});
