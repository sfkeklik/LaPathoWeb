import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { interval, Subject, switchMap, takeUntil, startWith } from 'rxjs';
import { ImageOverview, ImageService } from '../../services/image.service';
import { ImageUploadService, UploadProgress } from '../../services/image-upload.service';
import { ImageEditModalComponent } from '../image-edit-modal/image-edit-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ImageEditModalComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput', { static: true }) fileInput!: ElementRef<HTMLInputElement>;

  images: ImageOverview[] = [];
  uploading = false;

  // Upload progress tracking
  uploadProgress = 0;
  uploadStatus: 'uploading' | 'processing' | 'completed' | 'error' = 'uploading';
  uploadFileName = '';

  // Image edit modal için
  showEditModal = false;
  selectedImage: ImageOverview | null = null;

  // Toolbar functionality için özellikler
  currentView: 'grid' | 'list' = 'grid';
  searchTerm: string = '';
  currentFilter: string = 'all';
  currentSort: string = 'date-desc';
  allImages: ImageOverview[] = []; // Orijinal liste

  // destroy sinyali
  private destroy$ = new Subject<void>();

  // Hazır görüntü sayısı için getter
  get readyImagesCount(): number {
    return this.allImages.filter(img => img.status === 'READY').length;
  }

  // Filtrelenmiş görüntülerin getter'ı
  get filteredImages(): ImageOverview[] {
    let filtered = [...this.allImages];

    // Arama filtresi
    if (this.searchTerm.trim()) {
      filtered = filtered.filter(img =>
        img.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Status filtresi
    if (this.currentFilter !== 'all') {
      const statusMap: { [key: string]: string } = {
        'ready': 'READY',
        'processing': 'PROCESSING',
        'failed': 'ERROR'
      };
      filtered = filtered.filter(img => img.status === statusMap[this.currentFilter]);
    }

    // Sıralama uygula
    this.applySorting(filtered);

    return filtered;
  }

  constructor(
    private imageService: ImageService,
    private uploadService: ImageUploadService,
    private router: Router
  ) {}

  ngOnInit() {
    // hemen çağır, sonra her 60 saniyede bir tekrar
    interval(60_000).pipe(
      startWith(0),
      switchMap(() => this.imageService.getImages()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: list => {
        this.allImages = list;
        this.images = list; // Backward compatibility için
      },
      error: err => console.error('Liste yüklenirken hata:', err)
    });
  }

  // Toolbar işlevleri
  setView(view: 'grid' | 'list'): void {
    this.currentView = view;
    console.log('Görünüm değiştirildi:', view);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    console.log('Arama terimi:', this.searchTerm);
  }

  onFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentFilter = select.value;
    console.log('Filtre değiştirildi:', this.currentFilter);
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentSort = select.value;
    console.log('Sıralama değiştirildi:', this.currentSort);
  }

  clearSearch(): void {
    this.searchTerm = '';
    // HTML'deki input'u da temizle
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    console.log('Arama temizlendi');
  }

  private applySorting(images: ImageOverview[]): void {
    switch(this.currentSort) {
      case 'date-desc':
        images.sort((a, b) => new Date(b.created || '').getTime() - new Date(a.created || '').getTime());
        break;
      case 'date-asc':
        images.sort((a, b) => new Date(a.created || '').getTime() - new Date(b.created || '').getTime());
        break;
      case 'name-asc':
        images.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        images.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
  }

  startUpload() {
    const files = this.fileInput.nativeElement.files;
    if (!files?.length) return;

    const file = files[0];
    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadStatus = 'uploading';
    this.uploadFileName = file.name;

    console.log('Upload başlıyor:', file.name, 'Boyut:', this.formatFileSize(file.size));

    this.uploadService.uploadWithProgress(file).subscribe({
      next: (progress: UploadProgress) => {
        this.uploadProgress = progress.progress;
        this.uploadStatus = progress.status;

        console.log(`Upload progress: ${progress.progress}% - Status: ${progress.status}`);

        if (progress.status === 'completed' && progress.result) {
          console.log('Upload tamamlandı:', progress.result);
          this.uploading = false;
          this.loadListOnce();

          // Input'u temizle
          this.fileInput.nativeElement.value = '';
        }
      },
      error: err => {
        console.error('Upload hatası:', err);
        this.uploading = false;
        this.uploadStatus = 'error';
        this.uploadProgress = 0;

        // Input'u temizle
        this.fileInput.nativeElement.value = '';
      }
    });
  }

  // Format file size helper
  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Cancel upload functionality
  cancelUpload() {
    this.uploading = false;
    this.uploadProgress = 0;
    this.uploadStatus = 'uploading';
    this.fileInput.nativeElement.value = '';
  }

  open(id: number) {
    this.router.navigate(['/annotate', id]);
  }

  /** Image silme işlemi */
  deleteImage(image: ImageOverview, event: Event) {
    event.stopPropagation();

    if (confirm(`"${image.name}" isimli görüntüyü silmek istediğinizden emin misiniz?`)) {
      this.imageService.deleteImage(image.id).subscribe({
        next: () => {
          console.log('Image başarıyla silindi');
          this.loadListOnce();
        },
        error: (err) => {
          console.error('Image silinirken hata:', err);
          alert('Image silinirken bir hata oluştu!');
        }
      });
    }
  }

  /** Image düzenleme */
  editImage(image: ImageOverview, event: Event) {
    event.stopPropagation();
    this.selectedImage = image;
    this.showEditModal = true;
  }

  /** Image güncelleme sonrası callback */
  onImageUpdated(updatedImage: ImageOverview) {
    const index = this.allImages.findIndex(img => img.id === updatedImage.id);
    if (index !== -1) {
      this.allImages[index] = updatedImage;
    }
    this.showEditModal = false;
    this.selectedImage = null;
  }

  /** Modal kapatıldığında */
  onModalClosed() {
    this.showEditModal = false;
    this.selectedImage = null;
  }

  /** Liste yenileme */
  private loadListOnce() {
    this.imageService.getImages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.allImages = list;
          this.images = list;
        },
        error: err => console.error('Liste yüklenirken hata:', err)
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
