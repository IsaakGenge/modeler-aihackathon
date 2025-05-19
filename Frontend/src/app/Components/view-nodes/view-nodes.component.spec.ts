import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ViewNodesComponent } from './view-nodes.component';
import { NodeService } from '../../Services/Node/node.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';

describe('ViewNodesComponent', () => {
  let component: ViewNodesComponent;
  let fixture: ComponentFixture<ViewNodesComponent>;
  let nodeService: NodeService;
  let nodeCreatedSubject: Subject<void>;
  let nodeDeletedSubject: Subject<void>;

  beforeEach(async () => {
    nodeCreatedSubject = new Subject<void>();
    nodeDeletedSubject = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [
        ViewNodesComponent,
        HttpClientTestingModule,
        CommonModule
      ],
      providers: [
        {
          provide: NodeService,
          useValue: {
            getNodes: () => of([
              { id: 'node1', name: 'Test Node 1', nodeType: 'person', createdAt: new Date() },
              { id: 'node2', name: 'Test Node 2', nodeType: 'location', createdAt: new Date() }
            ]),
            deleteNode: (id: string) => of({}),
            notifyNodeDeleted: () => { },
            nodeCreated$: nodeCreatedSubject.asObservable(),
            nodeDeleted$: nodeDeletedSubject.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewNodesComponent);
    component = fixture.componentInstance;
    nodeService = TestBed.inject(NodeService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load nodes on initialization', fakeAsync(() => {
    expect(component.loading).toBeFalse(); // Loading should be finished after fixture.detectChanges()
    expect(component.nodeData.length).toBe(2);
    expect(component.nodeData[0].id).toBe('node1');
    expect(component.nodeData[1].id).toBe('node2');
  }));

  it('should reload nodes when notified of node created', fakeAsync(() => {
    // Setup spy to track reload
    const getNodesSpy = spyOn(nodeService, 'getNodes').and.returnValue(of([
      { id: 'node1', name: 'Test Node 1' },
      { id: 'node2', name: 'Test Node 2' },
      { id: 'node3', name: 'New Node' }
    ]));

    // Trigger node created notification
    nodeCreatedSubject.next();
    tick();

    // Verify nodes were reloaded
    expect(getNodesSpy).toHaveBeenCalled();
    expect(component.nodeData.length).toBe(3);
  }));

  it('should reload nodes when notified of node deleted', fakeAsync(() => {
    // Setup spy to track reload
    const getNodesSpy = spyOn(nodeService, 'getNodes').and.returnValue(of([
      { id: 'node2', name: 'Test Node 2' } // Node 1 removed
    ]));

    // Trigger node deleted notification
    nodeDeletedSubject.next();
    tick();

    // Verify nodes were reloaded
    expect(getNodesSpy).toHaveBeenCalled();
    expect(component.nodeData.length).toBe(1);
    expect(component.nodeData[0].id).toBe('node2');
  }));

  it('should handle errors during node loading', fakeAsync(() => {
    // Mock error response
    const mockError = new Error('Node load error');
    spyOn(nodeService, 'getNodes').and.returnValue(throwError(() => mockError));

    // Call getNodes
    component.getNodes();
    tick();

    // Verify error handling
    expect(component.error).toBe('Failed to load node data');
    expect(component.loading).toBeFalse();
  }));

  it('should delete a node after confirmation', fakeAsync(() => {
    // Setup spies
    spyOn(window, 'confirm').and.returnValue(true);
    const deleteNodeSpy = spyOn(nodeService, 'deleteNode').and.returnValue(of({}));
    const notifyDeletedSpy = spyOn(nodeService, 'notifyNodeDeleted');

    // Call delete
    component.deleteNode('node1');
    tick();

    // Verify delete was called
    expect(deleteNodeSpy).toHaveBeenCalledWith('node1');
    expect(notifyDeletedSpy).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  }));

  it('should not delete a node if confirmation is canceled', fakeAsync(() => {
    // Setup spies
    spyOn(window, 'confirm').and.returnValue(false);
    const deleteNodeSpy = spyOn(nodeService, 'deleteNode');

    // Call delete
    component.deleteNode('node1');
    tick();

    // Verify delete was not called
    expect(deleteNodeSpy).not.toHaveBeenCalled();
  }));

  it('should handle errors during node deletion', fakeAsync(() => {
    // Setup spies
    spyOn(window, 'confirm').and.returnValue(true);
    const mockError = new Error('Delete error');
    spyOn(nodeService, 'deleteNode').and.returnValue(throwError(() => mockError));

    // Call delete
    component.deleteNode('node1');
    tick();

    // Verify error handling
    expect(component.error).toBe('Failed to delete node');
    expect(component.loading).toBeFalse();
  }));

  it('should clean up subscriptions on destroy', () => {
    const unsubscribeSpy1 = spyOn(component['nodeCreatedSubscription'], 'unsubscribe');
    const unsubscribeSpy2 = spyOn(component['nodeDeletedSubscription'], 'unsubscribe');

    // Trigger ngOnDestroy
    component.ngOnDestroy();

    // Verify unsubscribe was called for both subscriptions
    expect(unsubscribeSpy1).toHaveBeenCalled();
    expect(unsubscribeSpy2).toHaveBeenCalled();
  });
});
