// Frontend/src/app/Components/details-panel/details-panel.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-details-panel',
  standalone: true,
  imports: [CommonModule, ConfirmationModalComponent],
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

  // Modal properties
  showDeleteModal: boolean = false;
  deleteInProgress: boolean = false;
  deleteError: string | null = null;

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

    // Get properties from custom properties object if it exists
    if (this.fullElementData.properties && typeof this.fullElementData.properties === 'object') {
      return Object.entries(this.fullElementData.properties)
        .filter(([key, value]) => value !== null && value !== undefined)
        .map(([key, value]) => {
          return {
            key,
            value: this.formatPropertyValue(key, value)
          };
        });
    }

    // Fallback to showing all non-excluded properties from the main object
    return Object.entries(this.fullElementData)
      .filter(([key]) => !excludedProps.includes(key) &&
        this.fullElementData[key] !== null &&
        this.fullElementData[key] !== undefined &&
        key !== 'properties') // Skip the properties object itself
      .map(([key, value]) => {
        return {
          key,
          value: this.formatPropertyValue(key, value)
        };
      });
  }

  // Helper method to check if a value is a JSON string
  public isJsonString(value: any): boolean {
    if (typeof value !== 'string') return false;

    // Check if it starts and ends with curly braces or square brackets
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        JSON.parse(value);
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  // Helper method to format property values based on their type
  private formatPropertyValue(key: string, value: any): any {
    // Format date strings
    if (typeof value === 'string' &&
      (key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('time') ||
        key.toLowerCase().includes('at'))) {
      try {
        return new Date(value).toLocaleString();
      } catch (e) {
        // Not a valid date, use original value
      }
    }

    // Format boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // Format objects and arrays
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return '[Complex Object]';
      }
    }

    // Handle numbers
    if (typeof value === 'number') {
      // Check if it's a decimal number that needs formatting
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
      return value;
    }

    // Return as is for other types
    return value;
  }

  // Opens the delete confirmation modal
  public deleteElement(): void {
    this.showDeleteModal = true;
    this.deleteError = null;
  }

  // Handles the confirmation of deletion
  public handleConfirmDelete(): void {
    if (!this.selectedElement) return;

    const elementType = this.selectedElement.type;
    const elementId = this.selectedElement.data.id;

    if (!elementId) {
      console.error('Cannot delete element: ID is missing');
      return;
    }

    this.deleteInProgress = true;
    this.deleteError = null;

    if (elementType === 'node') {
      this.nodeService.deleteNode(elementId).subscribe({
        next: () => {
          this.nodeService.notifyNodeDeleted();
          this.closeDetailsPanel();
          this.resetDeleteState();
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error deleting node: ${error.message}`);
          this.deleteInProgress = false;
          this.deleteError = 'Failed to delete node. Please try again.';
        }
      });
    } else if (elementType === 'edge') {
      this.edgeService.deleteEdge(elementId).subscribe({
        next: () => {
          this.edgeService.notifyEdgeDeleted();
          this.closeDetailsPanel();
          this.resetDeleteState();
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Error deleting edge: ${error.message}`);
          this.deleteInProgress = false;
          this.deleteError = 'Failed to delete connection. Please try again.';
        }
      });
    }
  }

  // Handles the cancellation of deletion
  public handleCancelDelete(): void {
    this.resetDeleteState();
  }

  // Resets the delete modal state
  private resetDeleteState(): void {
    this.showDeleteModal = false;
    this.deleteInProgress = false;
    this.deleteError = null;
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
          console.log('Node details loaded:', this.fullElementData);
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
          console.log('Edge details loaded:', this.fullElementData);
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
