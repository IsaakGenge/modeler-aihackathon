import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild, AfterViewInit, Renderer2 } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterModule, Router, NavigationStart } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CreateNodeComponent } from '../shared/create-node/create-node.component';
import { ViewNodesComponent } from '../view-nodes/view-nodes.component';
import { CreateEdgeComponent } from '../shared/create-edge/create-edge.component';
import { ViewEdgesComponent } from '../view-edges/view-edges.component';
import { GraphPickerComponent } from '../shared/graph-picker/graph-picker.component';
import { DetailsPanelComponent } from '../details-panel/details-panel.component';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { NodeService } from '../../Services/Node/node.service';
import { Node } from '../../Models/node.model';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ToolsPanelComponent } from '../shared/tools-panel/tools-panel.component';
import { ToolsPanelStateService } from '../../Services/ToolPanelState/tool-panel-state.service';

@Component({
  selector: 'app-view-basic',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CreateNodeComponent,
    ViewNodesComponent,
    CreateEdgeComponent,
    ViewEdgesComponent,
    GraphPickerComponent,
    DetailsPanelComponent,
    NgbNavModule,
    ToolsPanelComponent
  ],
  templateUrl: './view-basic.component.html',
  styleUrl: './view-basic.component.css'
})
export class ViewBasicComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('viewNodes') viewNodesComponent!: ViewNodesComponent;
  @ViewChild('viewEdges') viewEdgesComponent!: ViewEdgesComponent;

  hasSelectedGraph: boolean = false;
  toolsPanelCollapsed = false;
  viewNodesPanelCollapsed: boolean = false; // Expanded by default
  viewEdgesPanelCollapsed: boolean = false; // Expanded by default
  isDarkMode$: Observable<boolean>;
  currentGraphId: string = '';
  selectedElement: any = null;
  activeTab = 1; // Default active tab (1 for node panel, 2 for edge panel)

  private subscription: Subscription = new Subscription();

  constructor(
    private graphService: GraphService,
    private themeService: ThemeService,
    private nodeService: NodeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private toolsPanelStateService: ToolsPanelStateService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }



  ngOnInit(): void {
    // Subscribe to the current graph to show/hide components
    this.subscription.add(
      this.graphService.currentGraph$.subscribe(graph => {
        this.hasSelectedGraph = !!graph;
        this.currentGraphId = graph ? graph.id : '';
      })
    );

    this.subscription.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationStart)
      ).subscribe(() => {
        if (this.selectedElement) {
          this.cleanUpModalState();
        }
      })
    );


    // Load saved collapse states if in browser environment
    this.toolsPanelStateService.collapsed$.subscribe(collapsed => {
      this.toolsPanelCollapsed = collapsed;
    });
  }

  ngAfterViewInit(): void {
    this.setupClickHandlers();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (isPlatformBrowser(this.platformId)) {
      this.cleanUpModalState();
    }
  }

  onTabChange(activeTabId: number): void {
    this.activeTab = activeTabId;
    
  }

  onToolsPanelToggle(collapsed: boolean): void {
    this.toolsPanelCollapsed = collapsed;
    this.toolsPanelStateService.setCollapsed(collapsed);
  }

  private setupClickHandlers(): void {
    setTimeout(() => {
      if (this.viewNodesComponent) {
        const nodeElements = document.querySelectorAll('.node-card');
        nodeElements.forEach((element, index) => {
          element.addEventListener('click', () => {
            if (this.viewNodesComponent.nodeData && this.viewNodesComponent.nodeData[index]) {
              this.onNodeSelected(this.viewNodesComponent.nodeData[index]);
            }
          });
          element.classList.add('clickable-row');
        });
      }

      if (this.viewEdgesComponent) {
        const edgeRows = document.querySelectorAll('.edge-data table tbody tr');
        edgeRows.forEach((element, index) => {
          element.addEventListener('click', () => {
            if (this.viewEdgesComponent.edgeData && this.viewEdgesComponent.edgeData[index]) {
              this.onEdgeSelected(this.viewEdgesComponent.edgeData[index]);
            }
          });
          element.classList.add('clickable-row');
        });
      }
    }, 500);
  }

  toggleToolsPanel(): void {
    this.toolsPanelCollapsed = !this.toolsPanelCollapsed;
    this.toolsPanelStateService.setCollapsed(this.toolsPanelCollapsed);

    // Keep the existing resize handling
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  onToolsPanelCollapsedChange(collapsed: boolean): void {
    this.toolsPanelCollapsed = collapsed;
    this.toolsPanelStateService.setCollapsed(collapsed);
  }

  toggleViewNodesPanel(): void {
    this.viewNodesPanelCollapsed = !this.viewNodesPanelCollapsed;    

    // Re-setup click handlers when panel is expanded
    if (!this.viewNodesPanelCollapsed) {
      setTimeout(() => this.setupClickHandlers(), 500);
    }
  }

  toggleViewEdgesPanel(): void {
    this.viewEdgesPanelCollapsed = !this.viewEdgesPanelCollapsed;    

    // Re-setup click handlers when panel is expanded
    if (!this.viewEdgesPanelCollapsed) {
      setTimeout(() => this.setupClickHandlers(), 500);
    }
  }

  onNodeSelected(node: any): void {
    console.log('Node selected:', node);

    // Create a copy of the node with label property to satisfy details-panel component
    const nodeWithLabel = {
      ...node,
      label: node.name // Add label property using the name value
    };

    this.selectedElement = {
      type: 'node',
      data: nodeWithLabel
    };

    this.applyModalState();
  }

  onEdgeSelected(edge: any): void {
    console.log('Edge selected:', edge);

    // Get the node names to replace the GUIDs
    this.nodeService.getNodes(this.currentGraphId).subscribe((nodes: Node[]) => {
      // Create a map of node IDs to node names
      const nodeMap = new Map<string, string>();
      nodes.forEach((node: Node) => {
        nodeMap.set(node.id?.toString() || '', node.name);
      });

      // Create a copy of the edge with additional properties for details-panel
      const edgeWithLabels = {
        ...edge,
        sourceLabel: nodeMap.get(edge.source) || edge.source,
        targetLabel: nodeMap.get(edge.target) || edge.target
      };

      this.selectedElement = {
        type: 'edge',
        data: edgeWithLabels
      };

      // Move this inside the subscription to ensure it happens after data is ready
      this.applyModalState();
    });
  }

  // Add the onGraphSelected method implementation here
  onGraphSelected(graph: any): void {
    if (graph) {
      console.log('Graph selected:', graph); // Debugging log
      this.graphService.setCurrentGraph(graph); // Update the current graph in the service
    }
  }

  private applyModalState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollbarWidth = this.calculateScrollbarWidth();

      this.renderer.addClass(this.document.body, 'modal-open');
      this.renderer.setStyle(this.document.body, 'padding-right', `${scrollbarWidth}px`);
      this.renderer.setStyle(this.document.documentElement, 'padding-right', `${scrollbarWidth}px`);
      this.renderer.setStyle(this.document.documentElement, '--scrollbar-width', `${scrollbarWidth}px`);
      this.renderer.setStyle(this.document.documentElement, '--scroll-position', `-${scrollY}px`);
      this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
      this.renderer.setStyle(this.document.documentElement, 'overflow', 'hidden');

      const containerFluid = this.document.querySelector('.container-fluid');
      if (containerFluid) {
        this.renderer.setStyle(containerFluid, 'padding-right', `${scrollbarWidth}px`);
      }
    }
  }



  private calculateScrollbarWidth(): number {
    // This method is more reliable across browsers
    return window.innerWidth - this.document.documentElement.clientWidth;
  }

  // Helper method to clean up modal state
  private cleanUpModalState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const scrollPosition = this.document.documentElement.style.getPropertyValue('--scroll-position');
      const scrollY = scrollPosition ? parseInt(scrollPosition.replace('-', '').replace('px', '')) : 0;

      this.renderer.removeClass(this.document.body, 'modal-open');
      this.renderer.removeStyle(this.document.body, 'padding-right');
      this.renderer.removeStyle(this.document.documentElement, 'padding-right');
      this.renderer.setStyle(this.document.documentElement, '--scrollbar-width', null);
      this.renderer.setStyle(this.document.documentElement, '--scroll-position', null);

      const containerFluid = this.document.querySelector('.container-fluid');
      if (containerFluid) {
        this.renderer.removeStyle(containerFluid, 'padding-right');
      }

      window.scrollTo(0, scrollY);
    }
  }


  onBackdropClick(): void {
    this.closeDetailsPanel();
  }

  closeDetailsPanel(): void {
    this.selectedElement = null;
    this.cleanUpModalState();
  }  
}
