import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape from 'cytoscape';

@Component({
  selector: 'app-view-fancy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-fancy.component.html',
  styleUrl: './view-fancy.component.css'
})
export class ViewFancyComponent implements OnInit {
  @ViewChild('cyContainer', { static: true }) private cyContainer!: ElementRef;
  private cy: any;

  ngOnInit(): void {
    this.initializeCytoscape();
  }

  private initializeCytoscape(): void {
    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: [
        // nodes
        { data: { id: 'a', label: 'Node A' } },
        { data: { id: 'b', label: 'Node B' } },
        { data: { id: 'c', label: 'Node C' } },
        { data: { id: 'd', label: 'Node D' } },
        { data: { id: 'e', label: 'Node E' } },

        // edges
        { data: { id: 'ab', source: 'a', target: 'b', label: 'A→B' } },
        { data: { id: 'bc', source: 'b', target: 'c', label: 'B→C' } },
        { data: { id: 'cd', source: 'c', target: 'd', label: 'C→D' } },
        { data: { id: 'de', source: 'd', target: 'e', label: 'D→E' } },
        { data: { id: 'ea', source: 'e', target: 'a', label: 'E→A' } }
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#4CAF50',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': 'white',
            'width': 60,
            'height': 60,
            'font-size': 12
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#9E9E9E',
            'target-arrow-color': '#9E9E9E',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': 10,
            'color': '#555',
            'text-background-color': '#fff',
            'text-background-opacity': 0.8,            
          }
        }
      ],
      layout: {
        name: 'circle'
      }
    });

    this.cy.on('tap', 'node', (event: any) => {
      const node = event.target;
      console.log('Node clicked:', node.id(), node.data('label'));
      // You could highlight the node, show details in a sidebar, etc.
    });
  }
}
