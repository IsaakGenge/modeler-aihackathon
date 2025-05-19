import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateNodeComponent } from './Components/create-node/create-node.component';
import { ViewNodesComponent } from './Components/view-nodes/view-nodes.component';
import { CreateEdgeComponent } from './Components/create-edge/create-edge.component';
import { ViewEdgesComponent } from './Components/view-edges/view-edges.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    CreateNodeComponent,
    ViewNodesComponent,
    CreateEdgeComponent,
    ViewEdgesComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Graph Modeler';
}
