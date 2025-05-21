// Frontend/src/app/Components/create-edge/create-edge.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { GraphService } from '../../Services/Graph/graph.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { TypesService, EdgeTypeModel } from '../../Services/Types/types.service';
import { Subscription, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Edge } from '../../Models/edge.model';
import { Node } from '../../Models/node.model';

@Component({
  selector: 'app-create-edge',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-edge.component.html',
  styleUrl: './create-edge.component.css'
})
export class CreateEdgeComponent implements OnInit, OnDestroy {
  edgeForm!: FormGroup;
  submitted = false;
  success = false;
  error = '';
  warning = '';
  nodes: Node[] = [];
  loading = false;
  isDarkMode$: Observable<boolean>;
  edgeTypes: EdgeTypeModel[] = [];

  private readonly messageTimeout = 3000; // 3 seconds
  private messageTimeoutId: any = null;

  private nodeCreatedSubscription: Subscription = new Subscription();
  private nodeDeletedSubscription: Subscription = new Subscription();
  private graphChangedSubscription: Subscription = new Subscription();
  private typeSubscription: Subscription = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private edgeService: EdgeService,
    private nodeService: NodeService,
    private graphService: GraphService,
    private themeService: ThemeService,
    private typesService: TypesService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.edgeForm = this.formBuilder.group({
      source: ['', [Validators.required]],
      target: ['', [Validators.required]],
      edgeType: ['', [Validators.required]]
    });

    // Subscribe to edge types
    this.typeSubscription = this.typesService.edgeTypes$.subscribe(types => {
      this.edgeTypes = types;
      // Set default value if available and form control exists
      if (types.length > 0 && this.edgeForm) {
        this.edgeForm.get('edgeType')?.setValue(types[0].name);
      }
    });


    // Load edge types if not already loaded
    this.typesService.loadEdgeTypes();

    this.loadNodes();

    // Subscribe to node creation events to refresh the node list
    this.nodeCreatedSubscription = this.nodeService.nodeCreated$.subscribe(() => {
      this.loadNodes();
    });

    // Also subscribe to node deletion events
    this.nodeDeletedSubscription = this.nodeService.nodeDeleted$.subscribe(() => {
      this.loadNodes();
    });

    // Subscribe to graph changes to refresh the node list
    this.graphChangedSubscription = this.graphService.currentGraph$.subscribe(() => {
      this.loadNodes();
    });
  }

  private showMessageWithTimeout(type: 'success' | 'error' | 'warning', message: string = ''): void {
    // Clear any existing timeout
    if (this.messageTimeoutId) {
      clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }

    // Reset all messages first
    this.success = false;
    this.error = '';
    this.warning = '';

    // Set the appropriate message
    if (type === 'success') {
      this.success = true;
    } else if (type === 'error') {
      this.error = message;
    } else if (type === 'warning') {
      this.warning = message;
    }

    // Set timeout to clear the message
    this.messageTimeoutId = setTimeout(() => {
      this.success = false;
      this.error = '';
      this.warning = '';
      this.messageTimeoutId = null;
    }, this.messageTimeout);
  }

  ngOnDestroy(): void {
    // Clear timeout if component is destroyed
    if (this.messageTimeoutId) {
      clearTimeout(this.messageTimeoutId);
    }

    // Existing unsubscribe code...
    this.nodeCreatedSubscription.unsubscribe();
    this.nodeDeletedSubscription.unsubscribe();
    this.graphChangedSubscription.unsubscribe();
    this.typeSubscription.unsubscribe();
  }

  loadNodes(): void {
    this.loading = true;
    this.nodeService.getNodes().subscribe({
      next: (nodes) => {
        this.nodes = nodes;
        this.loading = false;

        if (nodes.length === 0) {
          this.showMessageWithTimeout('warning', 'No nodes available. Please create at least two nodes to create a connection.');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        if (error.status === 404) {
          this.showMessageWithTimeout('warning', 'No nodes found. Please create at least two nodes to create a connection.');
        } else {
          this.showMessageWithTimeout('error', 'Failed to load nodes');
        }
      }
    });
  }

  get f() {
    return this.edgeForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.edgeForm.invalid) {
      return;
    }

    this.loading = true;
    const edgeData = this.edgeForm.value;

    this.edgeService.createEdge(edgeData).subscribe({
      next: (edge) => {
        this.loading = false;
        this.edgeService.notifyEdgeCreated();
        this.resetForm();
        this.showMessageWithTimeout('success');
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        if (error.status === 404) {
          this.showMessageWithTimeout('warning', 'One or both of the selected nodes no longer exist. Please refresh the node list.');
          this.loadNodes();
        } else if (error.status === 400) {
          this.showMessageWithTimeout('error', 'Invalid connection data. Please check your inputs.');
        } else {
          this.showMessageWithTimeout('error', error.message);
        }
      }
    });
  }

  resetForm(): void {
    this.submitted = false;
    // Reset form but set the edgeType to the first available type if any exist
    this.edgeForm.reset({
      source: '',
      target: '',
      edgeType: this.edgeTypes.length > 0 ? this.edgeTypes[0].name : ''
    });
  }  
}
