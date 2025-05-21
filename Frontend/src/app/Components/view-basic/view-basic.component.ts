import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { CreateNodeComponent } from '../shared/create-node/create-node.component';
import { ViewNodesComponent } from '../view-nodes/view-nodes.component';
import { CreateEdgeComponent } from '../shared/create-edge/create-edge.component';
import { ViewEdgesComponent } from '../view-edges/view-edges.component';
import { GraphPickerComponent } from '../shared/graph-picker/graph-picker.component';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';

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
    GraphPickerComponent
  ],
  templateUrl: './view-basic.component.html',
  styleUrl: './view-basic.component.css'
})
export class ViewBasicComponent implements OnInit, OnDestroy {
  hasSelectedGraph: boolean = false;
  creationPanelCollapsed: boolean = true; // Collapsed by default
  viewNodesPanelCollapsed: boolean = false; // Expanded by default
  viewEdgesPanelCollapsed: boolean = false; // Expanded by default
  isDarkMode$: Observable<boolean>; // Declare without initializing
  private subscription: Subscription = new Subscription();

  constructor(
    private graphService: GraphService,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize after constructor parameters
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    // Subscribe to the current graph to show/hide components
    this.subscription.add(
      this.graphService.currentGraph$.subscribe(graph => {
        this.hasSelectedGraph = !!graph;
      })
    );

    // Load saved collapse state if in browser environment
    if (isPlatformBrowser(this.platformId)) {
      const savedCreationPanelState = localStorage.getItem('creationPanelCollapsed');
      const savedViewNodesPanelState = localStorage.getItem('viewNodesPanelCollapsed');
      const savedViewEdgesPanelState = localStorage.getItem('viewEdgesPanelCollapsed');

      // Only update if saved state exists, otherwise use the default
      if (savedCreationPanelState !== null) {
        this.creationPanelCollapsed = savedCreationPanelState === 'true';
      }
      if (savedViewNodesPanelState !== null) {
        this.viewNodesPanelCollapsed = savedViewNodesPanelState === 'true';
      }
      if (savedViewEdgesPanelState !== null) {
        this.viewEdgesPanelCollapsed = savedViewEdgesPanelState === 'true';
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }

  toggleCreationPanel(): void {
    this.creationPanelCollapsed = !this.creationPanelCollapsed;
    this.saveCollapseState('creationPanelCollapsed', this.creationPanelCollapsed);
  }

  toggleViewNodesPanel(): void {
    this.viewNodesPanelCollapsed = !this.viewNodesPanelCollapsed;
    this.saveCollapseState('viewNodesPanelCollapsed', this.viewNodesPanelCollapsed);
  }

  toggleViewEdgesPanel(): void {
    this.viewEdgesPanelCollapsed = !this.viewEdgesPanelCollapsed;
    this.saveCollapseState('viewEdgesPanelCollapsed', this.viewEdgesPanelCollapsed);
  }

  private saveCollapseState(key: string, value: boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value.toString());
    }
  }
}
