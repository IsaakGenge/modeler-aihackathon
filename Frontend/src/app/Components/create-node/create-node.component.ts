import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NodeService } from '../../Services/node.service';

interface Node {
  id: string;
  name: string;
  nodeType: string;
  createdAt?: Date;
}

@Component({
  selector: 'app-create-node',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-node.component.html',
  styleUrl: './create-node.component.css'
})
export class CreateNodeComponent implements OnInit {
  nodeForm!: FormGroup;
  submitted = false;
  success = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private nodeService: NodeService
  ) { }

  ngOnInit(): void {
    this.nodeForm = this.formBuilder.group({      
      name: ['', [Validators.required]],
      nodeType: ['default', [Validators.required]]
    });
  }

  get f() {
    return this.nodeForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';

    // stop here if form is invalid
    if (this.nodeForm.invalid) {
      return;
    }

    const newNode: Node = {
      id: this.nodeForm.value.id,
      name: this.nodeForm.value.name,
      nodeType: this.nodeForm.value.nodeType
    };

    this.nodeService.createNode(newNode)
      .subscribe({
        next: (response) => {
          this.success = true;
          this.resetForm();
        },
        error: (error) => {
          this.error = error.message || 'An error occurred while creating the node.';
        }
      });
  }

  resetForm(): void {
    this.submitted = false;
    this.nodeForm.reset({
      id: '',
      name: '',
      nodeType: 'default'
    });
  }
}
