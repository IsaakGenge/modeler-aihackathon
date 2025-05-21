// Frontend/src/app/Components/details-panel/details-panel.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-details-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './details-panel.component.html',
    styleUrls: ['./details-panel.component.css']
})
export class DetailsPanelComponent implements OnChanges {
    @Input() selectedElement: any = null;
    @Input() graphId: string = '';
    @Input() isDarkMode$!: Observable<boolean>;
    @Output() closePanel = new EventEmitter<void>();

    public isLoadingDetails: boolean = false;
    public fullElementData: any = null;

    constructor(
        private nodeService: NodeService,
        private edgeService: EdgeService
    ) { }

    ngOnChanges(changes: SimpleChanges): void {
        // When selectedElement changes, fetch the details
        if (changes['selectedElement'] && this.selectedElement) {
            this.fetchElementDetails();
        }
    }

    public closeDetailsPanel(): void {
        this.selectedElement = null;
        this.fullElementData = null;
        this.closePanel.emit();
    }

    public formatPropertyName(propName: string): string {
        // Convert camelCase to Title Case with spaces
        return propName
            .replace(/([A-Z])/g, ' $1') // Insert a space before all uppercase letters
            .replace(/^./, (str) => str.toUpperCase()); // Capitalize the first letter
    }

    public getAdditionalProperties(): { key: string, value: any }[] {
        if (!this.fullElementData) return [];

        // Properties we don't want to show (already displayed or internal)
        const excludedProps = [
            'id', 'name', 'label', 'nodeType', 'edgeType', 'source', 'target',
            'sourceLabel', 'targetLabel', 'graphId', 'positionX', 'positionY'
        ];

        return Object.entries(this.fullElementData)
            .filter(([key]) => !excludedProps.includes(key) && this.fullElementData[key] !== null)
            .map(([key, value]) => {
                let displayValue = value;

                // Format date strings
                if (typeof value === 'string' &&
                    (key.includes('date') || key.includes('Date') || key.includes('At'))) {
                    try {
                        displayValue = new Date(value).toLocaleString();
                    } catch (e) {
                        // Not a valid date, use original value
                    }
                }

                return { key, value: displayValue };
            });
    }

    private fetchElementDetails(): void {
        if (!this.selectedElement) return;

        this.isLoadingDetails = true;

        if (this.selectedElement.type === 'node') {
            this.fetchNodeDetails(this.selectedElement.data.id);
        } else if (this.selectedElement.type === 'edge') {
            this.fetchEdgeDetails(this.selectedElement.data.id);
        }
    }

  // Method to fetch complete node data
  private fetchNodeDetails(nodeId: string): void {
    this.nodeService.getNodes(this.graphId).subscribe({
      next: (nodes) => {
        // Find the node with matching ID - add null check for id
        const node = nodes.find(n => n.id !== undefined && n.id !== null && n.id.toString() === nodeId);

        if (node) {
          this.fullElementData = node;
        } else {
          console.warn(`Node with ID ${nodeId} not found in the data`);
        }

        this.isLoadingDetails = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching node details:', error);
        this.isLoadingDetails = false;
      }
    });
  }

  // Method to fetch complete edge data
  private fetchEdgeDetails(edgeId: string): void {
    this.edgeService.getEdges(this.graphId).subscribe({
      next: (edges) => {
        // Find the edge with matching ID - add null check for id
        const edge = edges.find(e => e.id !== undefined && e.id !== null && e.id.toString() === edgeId);

        if (edge) {
          this.fullElementData = edge;
        } else {
          console.warn(`Edge with ID ${edgeId} not found in the data`);
        }

        this.isLoadingDetails = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching edge details:', error);
        this.isLoadingDetails = false;
      }
    });
  }

}
