import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { interval, Subject, switchMap, takeUntil, startWith } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ImageOverview, ImageService, LabelingStats, LabelingStatus } from '../../services/image.service';
import { ImageUploadService, UploadProgress } from '../../services/image-upload.service';
import { ImageEditModalComponent } from '../image-edit-modal/image-edit-modal.component';
import { AuthService } from '../../services/auth.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { ChangePasswordModalComponent } from '../change-password-modal/change-password-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ImageEditModalComponent, TranslateModule, LanguageSwitcherComponent, SkeletonComponent, ChangePasswordModalComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput', { static: true }) fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('changePasswordModal') changePasswordModal!: ChangePasswordModalComponent;

  images: ImageOverview[] = [];
  uploading = false;
  isLoading = true; // Loading state for skeleton

  // Upload progress tracking - Multi file support
  uploadProgress = 0;
  uploadStatus: 'uploading' | 'processing' | 'completed' | 'error' = 'uploading';
  uploadFileName = '';

  // Multi-file upload tracking
  uploadQueue: File[] = [];
  currentUploadIndex = 0;
  totalFilesToUpload = 0;
  completedUploads = 0;
  failedUploads = 0;

  // Image edit modal için
  showEditModal = false;
  selectedImage: ImageOverview | null = null;

  // Toolbar functionality için özellikler
  currentView: 'grid' | 'list' = 'grid';
  searchTerm: string = '';
  currentFilter: string = 'all';
  currentSort: string = 'date-desc';
  allImages: ImageOverview[] = []; // Orijinal liste

  // User menu dropdown
  showUserMenu = false;

  // Labeling stats
  labelingStats: LabelingStats = { total: 0, completed: 0, inProgress: 0, notStarted: 0 };

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

    // Status filtresi (işlem durumu + etiketleme durumu)
    if (this.currentFilter !== 'all') {
      const statusMap: { [key: string]: string } = {
        'ready': 'READY',
        'processing': 'PROCESSING',
        'failed': 'ERROR'
      };

      // Etiketleme durumu filtreleri
      if (this.currentFilter === 'labeling-completed') {
        filtered = filtered.filter(img => img.labelingStatus === 'COMPLETED');
      } else if (this.currentFilter === 'labeling-inprogress') {
        filtered = filtered.filter(img => img.labelingStatus === 'IN_PROGRESS');
      } else if (this.currentFilter === 'labeling-notstarted') {
        filtered = filtered.filter(img => !img.labelingStatus);
      } else if (statusMap[this.currentFilter]) {
        filtered = filtered.filter(img => img.status === statusMap[this.currentFilter]);
      }
    }

    // Sıralama uygula
    this.applySorting(filtered);

    return filtered;
  }

  constructor(
    private imageService: ImageService,
    private uploadService: ImageUploadService,
    private router: Router,
    public authService: AuthService,
    private toastService: ToastService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit() {
    // Hemen yükle
    this.refreshImages();
    this.loadLabelingStats();

    // Sonra her 60 saniyede bir tekrar
    interval(60_000).pipe(
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

  // Labeling stats yükleme
  loadLabelingStats(): void {
    this.imageService.getLabelingStats().subscribe({
      next: stats => {
        this.labelingStats = stats;
        console.log('Labeling stats loaded:', stats);
      },
      error: err => console.error('Labeling stats yüklenirken hata:', err)
    });
  }

  // Manuel yenileme
  refreshImages(): void {
    this.isLoading = true;
    this.imageService.getImages().subscribe({
      next: list => {
        console.log('Images refreshed:', list.length, 'images');
        this.allImages = list;
        this.images = list;
        this.isLoading = false;
      },
      error: err => {
        console.error('Liste yüklenirken hata:', err);
        this.isLoading = false;
      }
    });
    this.loadLabelingStats();
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

    // Convert FileList to array
    this.uploadQueue = Array.from(files);
    this.totalFilesToUpload = this.uploadQueue.length;
    this.currentUploadIndex = 0;
    this.completedUploads = 0;
    this.failedUploads = 0;
    this.uploading = true;

    console.log(`Toplam ${this.totalFilesToUpload} dosya yüklenecek`);

    // Start uploading first file
    this.uploadNextFile();
  }

  private uploadNextFile() {
    if (this.currentUploadIndex >= this.uploadQueue.length) {
      // All files processed
      this.uploadStatus = 'completed';
      this.uploadProgress = 100;
      this.uploadFileName = `${this.completedUploads}/${this.totalFilesToUpload} dosya yüklendi`;

      console.log(`Yükleme tamamlandı: ${this.completedUploads} başarılı, ${this.failedUploads} başarısız`);

      // Refresh list after all uploads
      this.loadListOnce();

      // Clear input
      this.fileInput.nativeElement.value = '';
      return;
    }

    const file = this.uploadQueue[this.currentUploadIndex];
    this.uploadStatus = 'uploading';
    this.uploadFileName = `(${this.currentUploadIndex + 1}/${this.totalFilesToUpload}) ${file.name}`;

    // Calculate overall progress
    const baseProgress = (this.currentUploadIndex / this.totalFilesToUpload) * 100;

    console.log(`Yükleniyor (${this.currentUploadIndex + 1}/${this.totalFilesToUpload}):`, file.name);

    this.uploadService.uploadWithProgress(file).subscribe({
      next: (progress: UploadProgress) => {
        // Calculate combined progress
        const fileProgress = progress.progress / this.totalFilesToUpload;
        this.uploadProgress = Math.round(baseProgress + fileProgress);

        if (progress.status === 'processing') {
          this.uploadStatus = 'processing';
        }

        if (progress.status === 'completed' && progress.result) {
          console.log(`Dosya yüklendi: ${file.name}`);
          this.completedUploads++;
          this.currentUploadIndex++;

          // Upload next file
          this.uploadNextFile();
        }
      },
      error: err => {
        console.error(`Yükleme hatası (${file.name}):`, err);
        this.failedUploads++;
        this.currentUploadIndex++;

        // Continue with next file even if this one failed
        this.uploadNextFile();
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
    this.uploadQueue = [];
    this.currentUploadIndex = 0;
    this.totalFilesToUpload = 0;
    this.completedUploads = 0;
    this.failedUploads = 0;
    this.fileInput.nativeElement.value = '';
  }

  open(id: number) {
    this.router.navigate(['/annotate', id]);
  }

  /** Image silme işlemi */
  async deleteImage(image: ImageOverview, event: Event) {
    event.stopPropagation();

    const confirmed = await this.confirmDialog.delete(image.name);
    if (confirmed) {
      this.imageService.deleteImage(image.id).subscribe({
        next: () => {
          this.toastService.success('Görüntü başarıyla silindi');
          this.loadListOnce();
        },
        error: (err) => {
          console.error('Image silinirken hata:', err);
          this.toastService.error('Görüntü silinirken bir hata oluştu');
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

  /** Şifre değiştirme modalını aç */
  openChangePasswordModal(): void {
    this.showUserMenu = false;
    this.changePasswordModal.open();
  }

  /** User menu toggle */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /** Dışarı tıklandığında user menu'yü kapat */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userDropdown = target.closest('.user-dropdown');
    if (!userDropdown && this.showUserMenu) {
      this.showUserMenu = false;
    }
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
    this.loadLabelingStats();
  }

  /** Etiketleme durumunu değiştir (toggle) */
  toggleLabelingStatus(image: ImageOverview, event: Event): void {
    event.stopPropagation();

    // Durumu döngüsel olarak değiştir: null/IN_PROGRESS -> COMPLETED -> IN_PROGRESS
    let newStatus: LabelingStatus;

    switch (image.labelingStatus) {
      case 'IN_PROGRESS':
        newStatus = 'COMPLETED';
        break;
      case 'COMPLETED':
        newStatus = 'IN_PROGRESS';
        break;
      default:
        newStatus = 'IN_PROGRESS';
    }

    this.updateLabelingStatus(image, newStatus);
  }

  /** Etiketleme durumunu belirli bir değere güncelle */
  updateLabelingStatus(image: ImageOverview, newStatus: LabelingStatus): void {
    if (!newStatus) return; // null durumu göndermiyoruz

    this.imageService.updateLabelingStatus(image.id, newStatus).subscribe({
      next: (response) => {
        // Lokal listeyi güncelle
        const index = this.allImages.findIndex(img => img.id === image.id);
        if (index !== -1) {
          this.allImages[index].labelingStatus = newStatus;
        }

        // İstatistikleri güncelle
        this.loadLabelingStats();

        const statusMessages: { [key: string]: string } = {
          'IN_PROGRESS': 'Devam ediyor olarak işaretlendi',
          'COMPLETED': 'Tamamlandı olarak işaretlendi'
        };
        this.toastService.success(statusMessages[newStatus] || 'Durum güncellendi');
      },
      error: (err) => {
        console.error('Etiketleme durumu güncellenirken hata:', err);
        this.toastService.error('Etiketleme durumu güncellenirken bir hata oluştu');
      }
    });
  }

  /** Görüntüyü tamamlandı olarak işaretle */
  markAsCompleted(image: ImageOverview, event: Event): void {
    event.stopPropagation();
    this.updateLabelingStatus(image, 'COMPLETED');
  }

  /** Görüntüyü devam ediyor olarak işaretle */
  markAsInProgress(image: ImageOverview, event: Event): void {
    event.stopPropagation();
    this.updateLabelingStatus(image, 'IN_PROGRESS');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
