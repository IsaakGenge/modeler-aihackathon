import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FileUploadModalComponent } from './file-upload-modal.component';

describe('FileUploadModalComponent', () => {
  let component: FileUploadModalComponent;
  let fixture: ComponentFixture<FileUploadModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FileUploadModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onFileSelected', () => {
    it('should emit fileSelected and populate name field when a file is selected', () => {
      const file = new File(['content'], 'test-file.txt', { type: 'text/plain' });
      const fileSelectedSpy = spyOn(component.fileSelected, 'emit');

      // Simulate file selection
      const event = { target: { files: [file] } } as unknown as Event;
      component.onFileSelected(event);

      expect(component.selectedFile).toBe(file);
      expect(fileSelectedSpy).toHaveBeenCalledWith(file);
      expect(component.uploadForm.get('name')?.value).toBe('test-file');
    });

    it('should clear selectedFile if no file is selected', () => {
      const event = { target: { files: [] } } as unknown as Event;
      component.onFileSelected(event);

      expect(component.selectedFile).toBeNull();
    });
  });

  describe('onConfirm', () => {
    it('should emit confirm with file and name when a file is selected', () => {
      const file = new File(['content'], 'test-file.txt', { type: 'text/plain' });
      component.selectedFile = file;
      component.uploadForm.patchValue({ name: 'Custom Name' });
      const confirmSpy = spyOn(component.confirm, 'emit');

      component.onConfirm();

      expect(confirmSpy).toHaveBeenCalledWith({
        file: file,
        name: 'Custom Name'
      });
    });

    it('should generate a default name if no name is provided', () => {
      const file = new File(['content'], 'test-file.txt', { type: 'text/plain' });
      component.selectedFile = file;
      const confirmSpy = spyOn(component.confirm, 'emit');
      spyOn<any>(component, 'generateDefaultName').and.returnValue('Default Name');

      component.onConfirm();

      expect(confirmSpy).toHaveBeenCalledWith({
        file: file,
        name: 'Default Name'
      });
    });

    it('should do nothing if no file is selected', () => {
      const confirmSpy = spyOn(component.confirm, 'emit');

      component.onConfirm();

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('onCancel', () => {
    it('should reset the form and emit cancel', () => {
      const cancelSpy = spyOn(component.cancel, 'emit');
      const resetFormSpy = spyOn(component, 'resetForm');

      component.onCancel();

      expect(resetFormSpy).toHaveBeenCalled();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('resetForm', () => {
    it('should reset the form and clear selectedFile', () => {
      component.uploadForm.patchValue({ name: 'Custom Name' });
      component.selectedFile = new File(['content'], 'test-file.txt', { type: 'text/plain' });

      component.resetForm();

      expect(component.uploadForm.get('name')?.value).toBeNull();
      expect(component.selectedFile).toBeNull();
    });
  });

  describe('generateDefaultName', () => {
    it('should generate a default name in the correct format', () => {
      const originalDate = Date;
      const mockDate = new Date('2025-05-23T14:30:45');
      // Override the Date constructor
      window.Date = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
      } as DateConstructor;

      const defaultName = (component as any).generateDefaultName();

      expect(defaultName).toBe('Imported Graph - May 23, 2025 at 14:30:45');

      // Restore the original Date constructor
      window.Date = originalDate;
    });
  });
});

