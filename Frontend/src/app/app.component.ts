import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateNodeComponent } from './Components/create-node/create-node.component';
import { ViewNodesComponent } from './Components/view-nodes/view-nodes.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CreateNodeComponent, ViewNodesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Frontend';
}
