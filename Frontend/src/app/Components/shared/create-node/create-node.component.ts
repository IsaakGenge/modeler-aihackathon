// Frontend/src/app/Components/create-node/create-node.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NodeService } from '../../../Services/Node/node.service';
import { ThemeService } from '../../../Services/Theme/theme.service';
import { GraphService } from '../../../Services/Graph/graph.service';
import { TypesService, NodeTypeModel } from '../../../Services/Types/types.service';
import { Observable, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SortListPipe } from '../../../Pipes/sort-list.pipe';

@Component({
  selector: 'app-create-node',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SortListPipe],
  templateUrl: './create-node.component.html',
  styleUrl: './create-node.component.css'
})
export class CreateNodeComponent implements OnInit, OnDestroy {
  nodeForm!: FormGroup;
  submitted = false;
  success = false;
  error = '';
  warning = '';
  loading = false;
  isDarkMode$: Observable<boolean>;
  nodeTypes: NodeTypeModel[] = [];
  private typeSubscription: Subscription = new Subscription();
  private readonly messageTimeout = 3000; // 3 seconds
  private messageTimeoutId: any = null;

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
    // Initialize form and node types
    this.nodeForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      nodeType: ['', [Validators.required]]
    });

    // Subscribe to node types
    this.typeSubscription = this.typesService.nodeTypes$.subscribe(types => {
      this.nodeTypes = types;
      // Set default value if available
      if (types.length > 0 && this.nodeForm) {
        this.nodeForm.get('nodeType')?.setValue(types[0].name);
      }
    });

    // Load node types
    this.typesService.loadNodeTypes();
  }
  // Add a method to clear messages with timeout
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

    // Unsubscribe from subscriptions
    this.typeSubscription.unsubscribe();
  }

  get f() {
    return this.nodeForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.nodeForm.invalid) {
      return;
    }

    this.loading = true;
    const nodeData = this.nodeForm.value;

    this.nodeService.createNode(nodeData).subscribe({
      next: (node) => {
        this.loading = false;
        this.nodeService.notifyNodeCreated();
        this.resetForm();
        this.showMessageWithTimeout('success');
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        if (error.status === 400) {
          this.showMessageWithTimeout('error', 'Invalid node data. Please check your inputs.');
        } else {
          this.showMessageWithTimeout('error', error.message);
        }
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
