import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewBasicComponent } from './Components/view-basic/view-basic.component';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ViewFancyComponent } from './Components/view-fancy/view-fancy.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ViewBasicComponent,
    ViewFancyComponent,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Graph Modeler';
}
