// Updated version of create-edge.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { ThemeService } from '../../Services/Theme/theme.service';
import { Subscription, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

interface Edge {
  id?: string;
  source: string;
  target: string;
  edgeType: string;
  createdAt?: Date;
}

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
  nodes: any[] = [];
  loading = false;
  isDarkMode$: Observable<boolean>;

  private nodeCreatedSubscription: Subscription = new Subscription();
  private nodeDeletedSubscription: Subscription = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private edgeService: EdgeService,
    private nodeService: NodeService,
    private themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.edgeForm = this.formBuilder.group({
      source: ['', [Validators.required]],
      target: ['', [Validators.required]],
      edgeType: ['default', [Validators.required]]
    });

    this.loadNodes();

    // Subscribe to node creation events to refresh the node list
    this.nodeCreatedSubscription = this.nodeService.nodeCreated$.subscribe(() => {
      this.loadNodes();
    });

    // Also subscribe to node deletion events
    this.nodeDeletedSubscription = this.nodeService.nodeDeleted$.subscribe(() => {
      this.loadNodes();
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.nodeCreatedSubscription.unsubscribe();
    this.nodeDeletedSubscription.unsubscribe();
  }

  loadNodes(): void {
    this.loading = true;
    this.error = '';
    this.warning = '';

    this.nodeService.getNodes().subscribe({
      next: (data) => {
        this.nodes = data;
        this.loading = false;

        if (data.length === 0) {
          this.warning = 'No nodes available. Please create at least two nodes to create a connection.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;

        if (err.status === 404) {
          // Handle 404 as a warning not an error
          this.warning = 'No nodes found. Please create at least two nodes to create a connection.';
          this.nodes = [];
        } else {
          this.error = 'Failed to load nodes';
          console.error('Error fetching nodes:', err);
        }
      }
    });
  }

  get f() {
    return this.edgeForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';
    this.warning = '';

    // stop here if form is invalid
    if (this.edgeForm.invalid) {
      return;
    }

    const newEdge: Edge = {
      source: this.edgeForm.value.source,
      target: this.edgeForm.value.target,
      edgeType: this.edgeForm.value.edgeType
    };

    this.edgeService.createEdge(newEdge)
      .subscribe({
        next: (response) => {
          this.success = true;
          this.resetForm();
          // Notify other components that an edge has been created
          this.edgeService.notifyEdgeCreated();
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.warning = 'One or both of the selected nodes no longer exist. Please refresh the node list.';
            // Auto refresh the node list
            this.loadNodes();
          } else if (error.status === 400) {
            this.error = 'Invalid connection data. Please check your inputs.';
          } else {
            this.error = error.message || 'An error occurred while creating the connection.';
          }
          console.error('Error creating edge:', error);
        }
      });
  }

  resetForm(): void {
    this.submitted = false;
    this.edgeForm.reset({
      source: '',
      target: '',
      edgeType: 'default'
    });
  }
}
