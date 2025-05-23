import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { CreateNodeComponent } from '../shared/create-node/create-node.component';
import { ViewNodesComponent } from '../view-nodes/view-nodes.component';
import { CreateEdgeComponent } from '../shared/create-edge/create-edge.component';
import { ViewEdgesComponent } from '../view-edges/view-edges.component';
import { GraphPickerComponent } from '../shared/graph-picker/graph-picker.component';
import { DetailsPanelComponent } from '../details-panel/details-panel.component';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

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
    NgbNavModule
  ],
  templateUrl: './view-basic.component.html',
  styleUrl: './view-basic.component.css'
})
export class ViewBasicComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('viewNodes') viewNodesComponent!: ViewNodesComponent;
  @ViewChild('viewEdges') viewEdgesComponent!: ViewEdgesComponent;

  hasSelectedGraph: boolean = false;
  toolsPanelCollapsed: boolean = true; // Collapsed by default
  viewNodesPanelCollapsed: boolean = false; // Expanded by default
  viewEdgesPanelCollapsed: boolean = false; // Expanded by default
  isDarkMode$: Observable<boolean>;
  currentGraphId: string = ''; // Changed from string | null to just string
  selectedElement: any = null; // For details panel
  activeTab = 1; // Default active tab (1 for node panel, 2 for edge panel)

  private subscription: Subscription = new Subscription();

  constructor(
    private graphService: GraphService,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    // Subscribe to the current graph to show/hide components
    this.subscription.add(
      this.graphService.currentGraph$.subscribe(graph => {
        this.hasSelectedGraph = !!graph;
        this.currentGraphId = graph ? graph.id : ''; // Set to empty string instead of null
      })
    );

    // Load saved collapse states if in browser environment
    if (isPlatformBrowser(this.platformId)) {
      const savedToolsPanelState = localStorage.getItem('toolsPanelCollapsed');
      const savedViewNodesPanelState = localStorage.getItem('viewNodesPanelCollapsed');
      const savedViewEdgesPanelState = localStorage.getItem('viewEdgesPanelCollapsed');
      const savedActiveTabState = localStorage.getItem('activeTab');

      // Only update if saved state exists, otherwise use the default
      if (savedToolsPanelState !== null) {
        this.toolsPanelCollapsed = savedToolsPanelState === 'true';
      }
      if (savedViewNodesPanelState !== null) {
        this.viewNodesPanelCollapsed = savedViewNodesPanelState === 'true';
      }
      if (savedViewEdgesPanelState !== null) {
        this.viewEdgesPanelCollapsed = savedViewEdgesPanelState === 'true';
      }
      if (savedActiveTabState !== null) {
        this.activeTab = parseInt(savedActiveTabState, 10);
      }
    }
  }

  ngAfterViewInit(): void {
    // Set up click handlers for nodes and edges after view is initialized
    this.setupClickHandlers();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }

  private setupClickHandlers(): void {
    // Add click handlers to node elements
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

      // Add click handlers to edge rows
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
    }, 500); // Small delay to ensure DOM is ready
  }

  toggleToolsPanel(): void {
    this.toolsPanelCollapsed = !this.toolsPanelCollapsed;
    this.saveCollapseState('toolsPanelCollapsed', this.toolsPanelCollapsed);

    // Trigger window resize after animation completes to help other components adjust
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  toggleViewNodesPanel(): void {
    this.viewNodesPanelCollapsed = !this.viewNodesPanelCollapsed;
    this.saveCollapseState('viewNodesPanelCollapsed', this.viewNodesPanelCollapsed);

    // Re-setup click handlers when panel is expanded
    if (!this.viewNodesPanelCollapsed) {
      setTimeout(() => this.setupClickHandlers(), 500);
    }
  }

  toggleViewEdgesPanel(): void {
    this.viewEdgesPanelCollapsed = !this.viewEdgesPanelCollapsed;
    this.saveCollapseState('viewEdgesPanelCollapsed', this.viewEdgesPanelCollapsed);

    // Re-setup click handlers when panel is expanded
    if (!this.viewEdgesPanelCollapsed) {
      setTimeout(() => this.setupClickHandlers(), 500);
    }
  }

  // Save the active tab state
  onTabChange(activeTabId: number): void {
    this.activeTab = activeTabId;
    this.saveCollapseState('activeTab', activeTabId.toString());
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
  }

  onEdgeSelected(edge: any): void {
    console.log('Edge selected:', edge);
    this.selectedElement = {
      type: 'edge',
      data: edge
    };
  }

  onBackdropClick(): void {
    this.closeDetailsPanel();
  }

  closeDetailsPanel(): void {
    this.selectedElement = null;
  }

  private saveCollapseState(key: string, value: string | boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value.toString());
    }
  }
}
