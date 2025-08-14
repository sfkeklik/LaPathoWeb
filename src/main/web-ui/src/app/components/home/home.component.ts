import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { interval, Subject, switchMap, takeUntil, startWith } from 'rxjs';
import { ImageOverview, ImageService } from '../../services/image.service';
import { ImageUploadService } from '../../services/image-upload.service';
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

  // Image edit modal için
  showEditModal = false;
  selectedImage: ImageOverview | null = null;

  // destroy sinyali
  private destroy$ = new Subject<void>();

  // Hazır görüntü sayısı için getter
  get readyImagesCount(): number {
    return this.images.filter(img => img.status === 'READY').length;
  }

  constructor(
    private imageService: ImageService,
    private uploadService: ImageUploadService,
    private router: Router
  ) {}

  ngOnInit() {
    // hemen çağır, sonra her 60 saniyede bir tekrar
    interval(60_000).pipe(
      startWith(0),                      // hemen bir kere tetiklesin
      switchMap(() => this.imageService.getImages()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: list => this.images = list,
      error: err => console.error('Liste yüklenirken hata:', err)
    });
  }

  /**
     * Dosya boyutunu formatla
     */
    formatFileSize(bytes: number): string {
      if (!bytes || bytes === 0) return '0 Bytes';

      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Görüntüyü filtreleme (opsiyonel)
     */
    filterImages(status: string): void {
      if (status === 'all') {
        // Tüm görüntüleri göster
        this.loadListOnce();
      } else {
        // Status'e göre filtrele
        this.images = this.images.filter(img => img.status === status.toUpperCase());
      }
    }

    /**
     * Görüntüleri sıralama (opsiyonel)
     */
    sortImages(sortBy: string): void {
      switch(sortBy) {
        case 'date-desc':
          this.images.sort((a, b) => new Date(b.created || '').getTime() - new Date(a.created || '').getTime());
          break;
        case 'date-asc':
          this.images.sort((a, b) => new Date(a.created || '').getTime() - new Date(b.created || '').getTime());
          break;
        case 'name-asc':
          this.images.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          this.images.sort((a, b) => b.name.localeCompare(a.name));
          break;
      }
    }

    /**
     * Arama fonksiyonu (opsiyonel)
     */
    searchImages(searchTerm: string): void {
      if (!searchTerm) {
        this.loadListOnce();
      } else {
        this.images = this.images.filter(img =>
          img.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    }

  startUpload() {
    const files = this.fileInput.nativeElement.files;
    if (!files?.length) return;

    this.uploading = true;
    this.uploadService.upload(files[0]).subscribe({
      next: dto => {
        this.uploading = false;
        if (dto.id != null) {
          // yüklendikten sonra liste otomatik yenilensin
          this.loadListOnce();
        } else {
          console.error('Image ID boş:', dto);
        }
      },
      error: err => {
        console.error('Yükleme hatası', err);
        this.uploading = false;
      }
    });
  }

  open(id: number) {
    this.router.navigate(['/annotate', id]);
  }

  /** Image silme işlemi */
  deleteImage(image: ImageOverview, event: Event) {
    event.stopPropagation(); // Kartın tıklanmasını engelle

    if (confirm(`"${image.name}" isimli görüntüyü silmek istediğinizden emin misiniz?`)) {
      this.imageService.deleteImage(image.id).subscribe({
        next: () => {
          console.log('Image başarıyla silindi');
          this.loadListOnce(); // Listeyi yenile
        },
        error: (err) => {
          console.error('Image silinirken hata:', err);
          alert('Image silinirken bir hata oluştu!');
        }
      });
    }
  }

  /** Image düzenleme sayfasına git */
  editImage(image: ImageOverview, event: Event) {
    event.stopPropagation(); // Kartın tıklanmasını engelle
    this.selectedImage = image;
    this.showEditModal = true;
  }

  /** Image güncelleme sonrası callback */
  onImageUpdated(updatedImage: ImageOverview) {
    // Listede güncellenen image'ı bul ve değiştir
    const index = this.images.findIndex(img => img.id === updatedImage.id);
    if (index !== -1) {
      this.images[index] = updatedImage;
    }
    this.showEditModal = false;
    this.selectedImage = null;
  }

  /** Modal kapatıldığında */
  onModalClosed() {
    this.showEditModal = false;
    this.selectedImage = null;
  }

  /** upload sonrası tek seferlik liste yenileme */
  private loadListOnce() {
    this.imageService.getImages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => this.images = list,
        error: err => console.error('Liste yüklenirken hata:', err)
      });
  }

  ngOnDestroy() {
    // interval aboneliğini iptal et
    this.destroy$.next();
    this.destroy$.complete();
  }
}
