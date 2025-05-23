// Modified details-panel.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { TypesService, NodeTypeModel, EdgeTypeModel } from '../../Services/Types/types.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { Node } from '../../Models/node.model';
import { Edge } from '../../Models/edge.model';
import { SortListPipe } from '../../Pipes/sort-list.pipe'
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-details-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent, SortListPipe, NgbTooltipModule],
  templateUrl: './details-panel.component.html',
  styleUrls: ['./details-panel.component.css']
})
export class DetailsPanelComponent implements OnChanges, OnInit, OnDestroy {
  @Input() selectedElement: any = null;
  @Input() graphId: string = '';
  @Input() isDarkMode$!: Observable<boolean>;
  @Input() isEmbedded: boolean = false; // New property to detect embedded mode
  @Output() closePanel = new EventEmitter<void>();

  public isLoadingDetails: boolean = false;
  public fullElementData: any = null;

  // Edit mode properties
  public isEditMode: boolean = false;
  public editableProperties: { key: string, value: any, originalKey: string }[] = [];
  public newProperty: { key: string, value: any } = { key: '', value: '' };
  public isAddingProperty: boolean = false;
  public isUpdating: boolean = false;
  public updateError: string | null = null;

  // Type and name editing
  public editableName: string = '';
  public editableType: string = '';
  public availableNodeTypes: NodeTypeModel[] = [];
  public availableEdgeTypes: EdgeTypeModel[] = [];

  // Subscriptions
  private nodeTypesSubscription: Subscription | null = null;
  private edgeTypesSubscription: Subscription | null = null;

  // Modal properties
  showDeleteModal: boolean = false;
  deleteInProgress: boolean = false;
  deleteError: string | null = null;

  constructor(
    private nodeService: NodeService,
    private edgeService: EdgeService,
    private typesService: TypesService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    // When selectedElement changes, fetch the details
    if (changes['selectedElement'] && this.selectedElement) {
      this.fetchElementDetails();
      this.isEditMode = false; // Reset edit mode when selection changes
    }
  }

  ngOnInit(): void {
    // Load available types
    this.nodeTypesSubscription = this.typesService.nodeTypes$.subscribe(types => {
      this.availableNodeTypes = types;
    });

    this.edgeTypesSubscription = this.typesService.edgeTypes$.subscribe(types => {
      this.availableEdgeTypes = types;
    });

    this.typesService.loadNodeTypes();
    this.typesService.loadEdgeTypes();

    // Add a small delay when in embedded mode before initializing any dropdowns
    if (this.isEmbedded) {
      setTimeout(() => {
        this.initializeDropdowns();
      }, 100);
    }
  }

  // Add this method to initialize dropdowns properly
  private initializeDropdowns(): void {
    // Force recalculation of dropdown positions
    const dropdowns = document.querySelectorAll('.form-select, .dropdown-toggle');
    dropdowns.forEach(dropdown => {
      // Trigger a focus and blur event to recalculate positions
      dropdown.dispatchEvent(new Event('focus', { bubbles: true }));
      dropdown.dispatchEvent(new Event('blur', { bubbles: true }));
    });
  }

  ngOnDestroy(): void {
    if (this.nodeTypesSubscription) {
      this.nodeTypesSubscription.unsubscribe();
    }

    if (this.edgeTypesSubscription) {
      this.edgeTypesSubscription.unsubscribe();
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
  public deleteElement(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.selectedElement || !['node', 'edge'].includes(this.selectedElement.type)) {
      console.error('Invalid element selected for deletion.');
      return;
    }

    this.showDeleteModal = true;
    this.deleteError = null;

    // Add a class to block pointer events on the details-panel
    const detailsPanel = document.querySelector('.details-panel') as HTMLElement;
    if (detailsPanel) {
      detailsPanel.classList.add('modal-open');
    }
  }

  

  // Handles the confirmation of deletion
  public handleConfirmDelete(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.selectedElement || !['node', 'edge'].includes(this.selectedElement.type)) {
      console.error('Invalid element selected for deletion.');
      return;
    }

    const elementType = this.selectedElement.type;
    const elementId = this.selectedElement.data.id;

    if (!elementId) {
      console.error('Cannot delete element: ID is missing');
      return;
    }

    this.deleteInProgress = true;
    this.deleteError = null;

    const deleteObservable = elementType === 'node'
      ? this.nodeService.deleteNode(elementId)
      : this.edgeService.deleteEdge(elementId);

    deleteObservable.subscribe({
      next: () => {
        // Notify deletion and reset state
        if (elementType === 'node') {
          this.nodeService.notifyNodeDeleted();
        } else {
          this.edgeService.notifyEdgeDeleted();
        }

        this.closeDetailsPanel(); // Close the details panel
        this.resetDeleteState(); // Reset modal state

        // Reset selectedElement and modal state
        this.selectedElement = null;
        this.showDeleteModal = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error(`Error deleting ${elementType}: ${error.message}`);
        this.deleteInProgress = false;
        this.deleteError = `Failed to delete ${elementType}. Please try again.`;
      }
    });
  }

  // Handles the cancellation of deletion
  public handleCancelDelete(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.resetDeleteState();
    this.showDeleteModal = false;

    // Remove the class to re-enable pointer events on the details-panel
    const detailsPanel = document.querySelector('.details-panel') as HTMLElement;
    if (detailsPanel) {
      detailsPanel.classList.remove('modal-open');
    }
  }

  // Resets the delete modal state
  private resetDeleteState(): void {
    this.showDeleteModal = false;
    this.deleteInProgress = false;
    this.deleteError = null;

    // Remove the modal-open class from the details-panel
    const detailsPanel = document.querySelector('.details-panel') as HTMLElement;
    if (detailsPanel) {
      detailsPanel.classList.remove('modal-open');
    }
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

  // NEW METHODS FOR EDIT FUNCTIONALITY

  
  // Prepare properties for editing
  private preparePropertiesForEdit(): void {
    this.editableProperties = [];

    if (!this.fullElementData) return;

    // Set the editable name and type
    if (this.selectedElement.type === 'node') {
      this.editableName = this.fullElementData.name || '';
      this.editableType = this.fullElementData.nodeType || '';
    } else if (this.selectedElement.type === 'edge') {
      // Edges don't have names, only types
      this.editableType = this.fullElementData.edgeType || '';
    }

    // If we have properties in a separate object
    if (this.fullElementData.properties && typeof this.fullElementData.properties === 'object') {
      this.editableProperties = Object.entries(this.fullElementData.properties)
        .map(([key, value]) => ({
          key,
          value: this.formatPropertyValueForEdit(value),
          originalKey: key
        }));
    } else {
      // Properties we don't want to edit (already displayed or internal)
      const excludedProps = [
        'id', 'name', 'nodeType', 'edgeType', 'source', 'target',
        'sourceLabel', 'targetLabel', 'graphId', 'positionX', 'positionY',
        'properties', 'createdAt'
      ];

      // Get other properties from the main object
      this.editableProperties = Object.entries(this.fullElementData)
        .filter(([key]) => !excludedProps.includes(key) &&
          this.fullElementData[key] !== null &&
          this.fullElementData[key] !== undefined)
        .map(([key, value]) => ({
          key,
          value: this.formatPropertyValueForEdit(value),
          originalKey: key
        }));
    }
  }

  // Format property for editing (keep original format)
  private formatPropertyValueForEdit(value: any): any {
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    return value;
  }

  // Add a new property field
  public addNewPropertyField(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.isAddingProperty = true;
    this.newProperty = { key: '', value: '' };
  }

  // Confirm adding a new property
  public confirmAddProperty(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.newProperty.key.trim()) {
      this.updateError = 'Property name cannot be empty';
      return;
    }

    // Check if property name already exists
    if (this.editableProperties.some(p => p.key === this.newProperty.key)) {
      this.updateError = `Property "${this.newProperty.key}" already exists`;
      return;
    }

    this.editableProperties.push({
      key: this.newProperty.key,
      value: this.newProperty.value,
      originalKey: '' // New property has no original key
    });

    this.isAddingProperty = false;
    this.newProperty = { key: '', value: '' };
    this.updateError = null;
  }

  // Cancel adding a new property
  public cancelAddProperty(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.isAddingProperty = false;
    this.newProperty = { key: '', value: '' };
    this.updateError = null;
  }

  // Remove a property
  public removeProperty(index: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.editableProperties.splice(index, 1);
  }

  // Save all changes
  public saveChanges(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.fullElementData || !this.selectedElement) return;

    this.isUpdating = true;
    this.updateError = null;

    try {
      // Create a copy of the original data
      const updatedData = { ...this.fullElementData };

      // Update name and type
      if (this.selectedElement.type === 'node') {
        updatedData.name = this.editableName;
        updatedData.nodeType = this.editableType;
      } else if (this.selectedElement.type === 'edge') {
        // This line was missing or not working properly
        updatedData.edgeType = this.editableType;
      }

      // Make sure properties object exists
      if (!updatedData.properties) {
        updatedData.properties = {};
      }

      // If the properties object is not a proper object, initialize it
      if (typeof updatedData.properties !== 'object' || updatedData.properties === null) {
        updatedData.properties = {};
      }

      console.log('Before update - Properties object:', updatedData.properties);
      console.log('Before update - Edge Type:', updatedData.edgeType); // Add this line for debugging

      // Clear existing properties to avoid mixing with properties that should be removed
      // Create a fresh properties object instead of modifying the existing one
      const newProperties: { [key: string]: any } = {};

      // Add all current properties (this ensures removed properties are gone)
      this.editableProperties.forEach(prop => {
        let value = prop.value;

        // Try to parse JSON strings
        if (typeof value === 'string' && this.isJsonString(value)) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        // Try to convert numeric strings to numbers
        if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            value = numValue;
          }
        }

        // Handle boolean values
        if (value === 'Yes' || value === 'true') {
          value = true;
        } else if (value === 'No' || value === 'false') {
          value = false;
        }

        // Add to new properties object
        newProperties[prop.key] = value;
      });

      // Replace the properties object with our new one
      updatedData.properties = newProperties;

      console.log('After update - Properties object:', updatedData.properties);
      console.log('After update - Edge type:', updatedData.edgeType); // Add this line for debugging
      console.log('Updating with name:', updatedData.name, 'type:', updatedData.nodeType || updatedData.edgeType);

      // Save the updated data
      if (this.selectedElement.type === 'node') {
        this.updateNode(updatedData);
      } else if (this.selectedElement.type === 'edge') {
        this.updateEdge(updatedData);
      }
    } catch (error) {
      console.error('Error preparing data for update:', error);
      this.isUpdating = false;
      this.updateError = 'Failed to prepare data for update. Please check your input.';
    }
  }

  // Update node
  private updateNode(updatedNode: Node): void {
    this.nodeService.updateNode(updatedNode).subscribe({
      next: (result) => {
        console.log('Node updated successfully:', result);

        // Notify other components that the node was updated
        this.nodeService.notifyNodeCreated(); // Reuse the creation event to trigger refresh

        // Update the local state
        this.isUpdating = false;
        this.isEditMode = false;
        this.fullElementData = result;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error updating node:', error);
        this.isUpdating = false;
        this.updateError = 'Failed to update node. Please try again.';
      }
    });
  }

  // Update edge
  private updateEdge(updatedEdge: Edge): void {
    this.edgeService.updateEdge(updatedEdge).subscribe({
      next: (result) => {
        console.log('Edge updated successfully:', result);

        // Notify other components that the edge was updated
        this.edgeService.notifyEdgeCreated(); // Reuse the creation event to trigger refresh

        // Update the local state
        this.isUpdating = false;
        this.isEditMode = false;
        this.fullElementData = result;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error updating edge:', error);
        this.isUpdating = false;
        this.updateError = 'Failed to update edge. Please try again.';
      }
    });
  }

  // Cancel editing
  public cancelEdit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.isEditMode = false;
    this.updateError = null;
  }
  private ensureEventPropagation(event?: Event): void {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Focus on the clicked element to ensure proper event handling
    const target = event.target as HTMLElement;
    if (target) {
      setTimeout(() => {
        target.focus();
      }, 0);
    }
  }
}

// Then modify these methods to use it:

// Toggle edit mode
  public toggleEditMode(event?: Event): void {
    this.ensureEventPropagation(event);

    // Force a more immediate UI update
    setTimeout(() => {
      this.isEditMode = !this.isEditMode;

      // Add this line to force DOM reflow before toggling edit mode
      if (this.isEmbedded) {
        // Force layout computation to prevent position change
        const panel = document.querySelector('.details-panel') as HTMLElement;
        if (panel) {
          // Save current position
          const rect = panel.getBoundingClientRect();
          const top = panel.style.top;
          const right = panel.style.right;

          // Apply edit mode class
          if (this.isEditMode) {
            panel.classList.add('edit-active');

            // Force position back to saved coordinates if needed
            setTimeout(() => {
              panel.style.position = 'absolute';

              // Only apply saved positions if they exist
              if (top) panel.style.top = top;
              if (right) panel.style.right = right;

              // Prevent any transforms
              panel.style.transform = 'none';
            }, 0);
          } else {
            panel.classList.remove('edit-active');
          }
        }
      } else {
        // Normal toggle for non-embedded mode
        if (this.isEditMode) {
          document.querySelector('.details-panel')?.classList.add('edit-active');
        } else {
          document.querySelector('.details-panel')?.classList.remove('edit-active');
        }
      }

      if (this.isEditMode) {
        this.preparePropertiesForEdit();

        // Add delay for embedded mode to ensure dropdowns work properly
        if (this.isEmbedded) {
          setTimeout(() => {
            this.initializeDropdowns();
          }, 100);
        }
      } else {
        // Reset any unsaved changes
        this.updateError = null;
      }
    }, 0);
  }
}

