import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CreateNodeComponent } from '../create-node/create-node.component';
import { ViewNodesComponent } from '../view-nodes/view-nodes.component';
import { CreateEdgeComponent } from '../create-edge/create-edge.component';
import { ViewEdgesComponent } from '../view-edges/view-edges.component';
import { GraphPickerComponent } from '../graph-picker/graph-picker.component';
import { GraphService } from '../../Services/Graph/graph.service';

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
  private subscription: Subscription = new Subscription();

  constructor(
    private graphService: GraphService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

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

      // Only update if saved state exists, otherwise use the default (collapsed)
      if (savedCreationPanelState !== null) {
        this.creationPanelCollapsed = savedCreationPanelState === 'true';
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }

  toggleCreationPanel(): void {
    this.creationPanelCollapsed = !this.creationPanelCollapsed;

    // Save state to localStorage if in browser environment
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('creationPanelCollapsed', this.creationPanelCollapsed.toString());
    }
  }
}
