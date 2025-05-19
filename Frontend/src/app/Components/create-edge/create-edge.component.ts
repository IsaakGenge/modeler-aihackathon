// Updated version of create-edge.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EdgeService } from '../../Services/Edge/edge.service';
import { NodeService } from '../../Services/Node/node.service';
import { Subscription } from 'rxjs';

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
  nodes: any[] = [];
  loading = false;
  private nodeCreatedSubscription: Subscription = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private edgeService: EdgeService,
    private nodeService: NodeService
  ) { }

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
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    this.nodeCreatedSubscription.unsubscribe();
  }

  loadNodes(): void {
    this.loading = true;
    this.nodeService.getNodes().subscribe({
      next: (data) => {
        this.nodes = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load nodes';
        this.loading = false;
        console.error('Error fetching nodes:', err);
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
        error: (error) => {
          this.error = error.message || 'An error occurred while creating the edge.';
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
