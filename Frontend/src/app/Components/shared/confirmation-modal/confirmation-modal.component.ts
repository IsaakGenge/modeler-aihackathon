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
  @Input() show: boolean = false;
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() confirmButtonText: string = 'Confirm';
  @Input() cancelButtonText: string = 'Cancel'; // Added property
  @Input() warningText: string | null = null; // Added property
  @Input() isLoading: boolean = false;
  @Input() error: string | null = null;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(event: Event): void {
    event.stopPropagation(); // Prevent event bubbling
    console.log('Confirm button clicked'); // Debugging
    this.confirm.emit();
  }

  onCancel(event: Event): void {
    console.log('onCancel triggered by:', event.target); // Debugging
    event.stopPropagation();
    this.cancel.emit();
  }
}
