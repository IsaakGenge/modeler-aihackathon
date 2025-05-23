import { Routes } from '@angular/router';
import { ViewBasicComponent } from './Components/view-basic/view-basic.component';
import { ViewFancyComponent } from './Components/view-fancy/view-fancy.component';
import { GraphManagerComponent } from './Components/graph-manager/graph-manager.component';
import { HomeComponent } from './Components/home/home.component'

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'view-basic', component: ViewBasicComponent },
  { path: 'view-fancy', component: ViewFancyComponent },
  { path: 'graph-manager', component: GraphManagerComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' } // Add default route
];
