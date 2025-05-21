// Frontend/src/app/Components/shared/confirmation-modal/confirmation-modal.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css']
})
export class ConfirmationModalComponent {
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() confirmButtonText: string = 'Confirm';
  @Input() cancelButtonText: string = 'Cancel';
  @Input() isLoading: boolean = false;
  @Input() error: string | null = null;
  @Input() show: boolean = false;
  @Input() warningText: string = 'This action cannot be undone.';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
