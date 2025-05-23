// Frontend/src/app/Components/shared/file-upload-modal/file-upload-modal.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-file-upload-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-upload-modal.component.html',
  styleUrls: ['./file-upload-modal.component.css']
})
export class FileUploadModalComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Upload File';
  @Input() nameFieldLabel: string = 'Name (Optional)';
  @Input() nameFieldPlaceholder: string = 'Enter a name';
  @Input() nameFieldHelpText: string = 'Leave blank to use default';
  @Input() acceptFileTypes: string = '*/*';
  @Input() isLoading: boolean = false;
  @Input() error: string = '';

  @Output() confirm = new EventEmitter<{ file: File, name?: string }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();

  uploadForm: FormGroup;
  selectedFile: File | null = null;

  constructor(private formBuilder: FormBuilder) {
    this.uploadForm = this.formBuilder.group({
      name: ['']
    });
  }

  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files.length > 0) {
      this.selectedFile = fileInput.files[0];
      this.fileSelected.emit(this.selectedFile);

      // Auto-populate name field with a suggested name based on file name
      // if the name field is currently empty
      if (!this.uploadForm.get('name')?.value) {
        const fileName = this.selectedFile.name;
        const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
        const suggestedName = nameWithoutExtension || fileName;
        this.uploadForm.patchValue({ name: suggestedName });
      }
    } else {
      this.selectedFile = null;
    }
  }

  onConfirm(): void {
    if (!this.selectedFile) {
      return;
    }

    let name = this.uploadForm.get('name')?.value;

    // If no name is provided, generate one using the current date/time
    if (!name) {
      name = this.generateDefaultName();
    }

    this.confirm.emit({
      file: this.selectedFile,
      name: name
    });
  }

  onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  resetForm(): void {
    this.uploadForm.reset();
    this.selectedFile = null;
  }

  /**
   * Generates a default name for the uploaded file if none is provided
   * Format: "Imported Graph - May 23, 2025 at 14:30:45"
   */
  private generateDefaultName(): string {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return `Imported Graph - ${date} at ${time}`;
  }
}
