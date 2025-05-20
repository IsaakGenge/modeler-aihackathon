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
  nodeCollapsed: boolean = true; // Collapsed by default
  edgeCollapsed: boolean = true; // Collapsed by default
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

    // Load saved collapse states if in browser environment
    if (isPlatformBrowser(this.platformId)) {
      const savedNodeState = localStorage.getItem('nodeCollapsed');
      const savedEdgeState = localStorage.getItem('edgeCollapsed');

      // Only update if saved state exists, otherwise use the default (collapsed)
      if (savedNodeState !== null) {
        this.nodeCollapsed = savedNodeState === 'true';
      }

      if (savedEdgeState !== null) {
        this.edgeCollapsed = savedEdgeState === 'true';
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }

  toggleNodePanel(): void {
    this.nodeCollapsed = !this.nodeCollapsed;

    // Save state to localStorage if in browser environment
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('nodeCollapsed', this.nodeCollapsed.toString());
    }
  }

  toggleEdgePanel(): void {
    this.edgeCollapsed = !this.edgeCollapsed;

    // Save state to localStorage if in browser environment
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('edgeCollapsed', this.edgeCollapsed.toString());
    }
  }
}
