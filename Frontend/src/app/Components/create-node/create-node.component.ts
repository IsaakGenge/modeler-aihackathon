// Frontend/src/app/Components/create-node/create-node.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NodeService } from '../../Services/Node/node.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { TypesService, NodeTypeModel } from '../../Services/Types/types.service';
import { Observable, Subscription } from 'rxjs';
import { Node } from '../../Models/node.model';

@Component({
  selector: 'app-create-node',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-node.component.html',
  styleUrl: './create-node.component.css'
})
export class CreateNodeComponent implements OnInit, OnDestroy {
  nodeForm!: FormGroup;
  submitted = false;
  success = false;
  error = '';
  warning = '';
  isDarkMode$: Observable<boolean>;
  nodeTypes: NodeTypeModel[] = [];
  private typeSubscription: Subscription = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private nodeService: NodeService,
    private graphService: GraphService,
    private themeService: ThemeService,
    private typesService: TypesService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.nodeForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      nodeType: ['', [Validators.required]]
    });

    // Subscribe to node types
    this.typeSubscription = this.typesService.nodeTypes$.subscribe(types => {
      this.nodeTypes = types;
      // Set default value if available and form control exists
      if (types.length > 0 && this.nodeForm) {
        this.nodeForm.get('nodeType')?.setValue(types[0].name);
      }
    });

    // Load node types if not already loaded
    this.typesService.loadNodeTypes();
  }

  ngOnDestroy(): void {
    this.typeSubscription.unsubscribe();
  }

  get f() {
    return this.nodeForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';
    this.warning = '';

    // Check if a graph is selected
    if (!this.graphService.currentGraphId) {
      this.warning = 'Please select a graph before creating a node.';
      return;
    }

    // stop here if form is invalid
    if (this.nodeForm.invalid) {
      return;
    }

    const newNode: Node = {
      name: this.nodeForm.value.name,
      nodeType: this.nodeForm.value.nodeType,
      graphId: this.graphService.currentGraphId as string
    };

    this.nodeService.createNode(newNode)
      .subscribe({
        next: (response) => {
          this.success = true;
          this.resetForm();
          // Notify other components that a node has been created
          this.nodeService.notifyNodeCreated();
        },
        error: (error) => {
          if (error.status === 400) {
            this.error = 'Invalid node data. Please check your inputs.';
          } else {
            this.error = error.message || 'An error occurred while creating the node.';
          }
          console.error('Error creating node:', error);
        }
      });
  }

  resetForm(): void {
    this.submitted = false;
    // Reset form but set the nodeType to the first available type if any exist
    this.nodeForm.reset({
      name: '',
      nodeType: this.nodeTypes.length > 0 ? this.nodeTypes[0].name : ''
    });
  }
}
