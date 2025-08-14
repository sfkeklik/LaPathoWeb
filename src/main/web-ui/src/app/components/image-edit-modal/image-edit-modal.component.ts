import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageDTO, ImageOverview, ImageService } from '../../services/image.service';

@Component({
  selector: 'app-image-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Görüntü Düzenle</h2>
          <button class="close-btn" (click)="close()">&times;</button>
        </div>

        <div class="modal-body" *ngIf="editForm">
          <form (ngSubmit)="onSubmit()" #form="ngForm">
            <div class="form-group">
              <label for="imageName">Görüntü Adı:</label>
              <input
                type="text"
                id="imageName"
                name="name"
                [(ngModel)]="editForm.name"
                required
                class="form-control"
                placeholder="Görüntü adını girin">
            </div>

            <div class="form-group">
              <label for="imageStatus">Durum:</label>
              <select
                id="imageStatus"
                name="status"
                [(ngModel)]="editForm.status"
                class="form-control">
                <option value="PENDING">Beklemede</option>
                <option value="PROCESSING">İşleniyor</option>
                <option value="READY">Hazır</option>
                <option value="ERROR">Hata</option>
              </select>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-cancel" (click)="close()">
                İptal
              </button>
              <button
                type="submit"
                class="btn btn-save"
                [disabled]="!form.valid || saving">
                {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #eee;
    }

    .modal-header h2 {
      margin: 0;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    }

    .close-btn:hover {
      background: #f0f0f0;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: #f8f9fa;
      color: #666;
      border: 1px solid #ddd;
    }

    .btn-cancel:hover {
      background: #e9ecef;
    }

    .btn-save {
      background: #0052cc;
      color: white;
    }

    .btn-save:hover:not(:disabled) {
      background: #003d99;
    }

    .btn-save:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class ImageEditModalComponent {
  @Input() isVisible = false;
  @Input() image: ImageOverview | null = null;
  @Output() imageUpdated = new EventEmitter<ImageOverview>();
  @Output() modalClosed = new EventEmitter<void>();

  editForm: any = {};
  saving = false;

  constructor(private imageService: ImageService) {}

  ngOnChanges() {
    if (this.image && this.isVisible) {
      // Form verilerini image'dan doldur
      this.editForm = {
        name: this.image.name,
        status: this.image.status
      };
    }
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close() {
    this.isVisible = false;
    this.modalClosed.emit();
  }

  onSubmit() {
    if (!this.image || this.saving) return;

    this.saving = true;

    // Sadece değişen alanları gönder
    const updateData: any = {};
    if (this.editForm.name !== this.image.name) {
      updateData.name = this.editForm.name;
    }
    if (this.editForm.status !== this.image.status) {
      updateData.status = this.editForm.status;
    }

    this.imageService.updateImage(this.image.id, updateData).subscribe({
      next: (updatedImage) => {
        console.log('Image başarıyla güncellendi:', updatedImage);

        // Güncellenmiş image verilerini parent'a gönder
        const updatedOverview: ImageOverview = {
          ...this.image!,
          name: updatedImage.name,
          status: updatedImage.status as any
        };

        this.imageUpdated.emit(updatedOverview);
        this.saving = false;
        this.close();
      },
      error: (err) => {
        console.error('Image güncellenirken hata:', err);
        alert('Image güncellenirken bir hata oluştu!');
        this.saving = false;
      }
    });
  }
}
