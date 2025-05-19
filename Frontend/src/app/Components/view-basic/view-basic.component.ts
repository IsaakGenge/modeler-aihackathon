import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateNodeComponent } from '../create-node/create-node.component';
import { ViewNodesComponent } from '../view-nodes/view-nodes.component';
import { CreateEdgeComponent } from '../create-edge/create-edge.component';
import { ViewEdgesComponent } from '../view-edges/view-edges.component';

@Component({
  selector: 'app-view-basic',
  standalone: true,
  imports: [
    CommonModule,
    CreateNodeComponent,
    ViewNodesComponent,
    CreateEdgeComponent,
    ViewEdgesComponent
  ],
  templateUrl: './view-basic.component.html',
  styleUrl: './view-basic.component.css'
})
export class ViewBasicComponent { }
