import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  private subscription: Subscription = new Subscription();

  constructor(private graphService: GraphService) { }

  ngOnInit(): void {
    // Subscribe to the current graph to show/hide components
    this.subscription.add(
      this.graphService.currentGraph$.subscribe(graph => {
        this.hasSelectedGraph = !!graph;
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }
}

