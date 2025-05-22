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
    } else {
      this.selectedFile = null;
    }
  }

  onConfirm(): void {
    if (!this.selectedFile) {
      return;
    }

    const name = this.uploadForm.get('name')?.value;
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
}
