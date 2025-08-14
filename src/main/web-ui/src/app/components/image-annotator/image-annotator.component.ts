import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  OnInit,
  HostListener,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import OpenSeadragon from 'openseadragon';
import { ImageService } from '../../services/image.service';
import { TilesApi } from '../../app-const/api-gateway';
import { AnnotoriousIntegration } from './annotorious-integration'; // yolu konumuna göre düzelt
// Basic Interfaces
interface Point {
  x: number;
  y: number;
}

interface ViewerState {
  zoom: number;
  center: Point;
  rotation: number;
}

@Component({
  selector: 'app-image-annotator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-annotator.component.html',
  styleUrls: ['./image-annotator.component.scss']
})
export class ImageAnnotatorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('viewerContainer', { static: true }) viewerContainer!: ElementRef;

  // Core Properties
  imageId!: number;
  viewer!: OpenSeadragon.Viewer;
  private anno = new AnnotoriousIntegration();
  currentTool: string | null = null;

  // UI State
  isLoading = false;
  loadingMessage = '';
  isSidebarCollapsed = false;
  showSettings = false;

  // Viewer State
  viewerState: ViewerState = {
    zoom: 1,
    center: { x: 0.5, y: 0.5 },
    rotation: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private imageService: ImageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        this.imageId = Number(idStr);
        if (!isNaN(this.imageId)) {
          this.initializeViewer();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Canvas setup is now handled in OpenSeadragon initialization
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.anno.destroy(); // ⬅️ ekle
  }

  private cleanup(): void {
    if (this.viewer) {
      this.viewer.destroy();
    }
  }

  private initializeViewer(): void {
    this.isLoading = true;
    this.loadingMessage = 'Görüntü yükleniyor...';

    console.log('initializeViewer çağrıldı, imageId:', this.imageId);

    this.imageService.getImageMetadata(this.imageId).subscribe({
      next: (metadata) => {
        console.log('Metadata yüklendi:', metadata);
        this.setupOpenSeadragon(metadata);
      },
      error: (error) => {
        console.error('Metadata yüklenemedi:', error);
        this.isLoading = false;
        this.loadingMessage = 'Görüntü yüklenemedi! Hata: ' + error.message;
      }
    });
  }

  private setupOpenSeadragon(metadata: any): void {
    const { width, height, tileSize, maxLevel } = metadata;

    console.log('setupOpenSeadragon çağrıldı:');
    console.log('- width:', width, 'height:', height);
    console.log('- tileSize:', tileSize, 'maxLevel:', maxLevel);

    const container = this.viewerContainer.nativeElement;

    setTimeout(() => {
      this.ensureContainerDimensions(container);
      this.createViewer(metadata, width, height, tileSize, maxLevel);
    }, 100);
  }

  private ensureContainerDimensions(container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    console.log('Container boyutları:', {
      width: rect.width,
      height: rect.height
    });

    if (rect.width === 0 || rect.height === 0) {
      console.warn('Container boyutu 0! CSS ile düzeltiliyor...');

      const viewerWrapper = container.closest('.viewer-wrapper');
      if (viewerWrapper) {
        (viewerWrapper as HTMLElement).style.width = '100%';
        (viewerWrapper as HTMLElement).style.height = '100%';
        (viewerWrapper as HTMLElement).style.minHeight = '600px';
      }

      container.style.width = '100%';
      container.style.height = '100%';
      container.style.minHeight = '600px';
      container.style.position = 'relative';

      container.offsetHeight; // Trigger reflow
    }
  }

  private createViewer(metadata: any, width: number, height: number, tileSize: number, maxLevel: number): void {
    try {
      this.viewer = OpenSeadragon({
        element: this.viewerContainer.nativeElement,
        prefixUrl: '/assets/openseadragon-images/',
        showNavigationControl: false,
        showZoomControl: false,
        showHomeControl: false,
        showFullPageControl: false,
        showRotationControl: false,
        debugMode: false,
        timeout: 30000,
        panHorizontal: true,
        panVertical: true,
        constrainDuringPan: false,
        wrapHorizontal: false,
        wrapVertical: false,
        visibilityRatio: 1.0,
        minZoomLevel: 0.1,
        maxZoomLevel: 100,
        zoomPerClick: 2.0,
        zoomPerScroll: 1.2,
        animationTime: 0.5,
        blendTime: 0.1,
        alwaysBlend: false,
        autoHideControls: true,
        immediateRender: false,
        defaultZoomLevel: 0,
        opacity: 1.0,
        minPixelRatio: 0.5,
        smoothTileEdgesMinZoom: 1.1,
        crossOriginPolicy: false,
        ajaxWithCredentials: false,
        loadTilesWithAjax: false,
        tileSources: {
          width: width,
          height: height,
          tileSize: tileSize,
          maxLevel: maxLevel,
          getTileUrl: (level: number, x: number, y: number) => {
            const tileUrl = `${TilesApi.getTileByIdLevel}${this.imageId}/${level}/${x}_${y}.jpg`;
            console.log('Tile isteniyor:', level, x, y, '->', tileUrl);
            return tileUrl;
          }
        }
      });

      console.log('OpenSeadragon instance oluşturuldu');
      this.setupViewerEventHandlers();

    } catch (error) {
      console.error('OpenSeadragon oluşturulurken hata:', error);
      this.isLoading = false;
      this.loadingMessage = 'Görüntü yükleyici başlatılamadı!';
    }
  }

  private setupViewerEventHandlers(): void {
    this.viewer.addHandler('open', (event: any) => {
      console.log('✅ OpenSeadragon AÇILDI - Görüntü yüklendi!');
      this.isLoading = false;

      setTimeout(() => {
        if (this.viewer && this.viewer.viewport) {
          try {
            if (this.viewer.viewport.getHomeBounds && this.viewer.viewport.getHomeBounds()) {
              console.log('🔍 Viewport home bounds mevcut, goHome çağrılıyor');
              this.viewer.viewport.goHome(true);

              setTimeout(() => {
                try {
                  const currentZoom = this.viewer.viewport.getZoom();
                  if (currentZoom && currentZoom > 0) {
                    this.viewer.viewport.zoomTo(currentZoom * 0.95);
                  }
                } catch (zoomError) {
                  console.warn('Zoom ayarlanırken hata:', zoomError);
                }
              }, 100);
            } else {
              console.warn('🚫 Viewport home bounds henüz hazır değil');
            }

            this.onViewerReady();
          } catch (error) {
            console.error('Viewport ayarlanırken hata:', error);
            this.onViewerReady();
          }
        } else {
          console.warn('Viewer or viewport not ready, calling onViewerReady anyway');
          this.onViewerReady();
        }
      }, 300);
    });

    this.viewer.addHandler('open-failed', (event: any) => {
      console.error('❌ OpenSeadragon açılamadı:', event);
      this.isLoading = false;
      this.loadingMessage = 'Görüntü açılamadı!';
    });

    this.viewer.addHandler('tile-load-failed', (event: any) => {
      console.error('❌ Tile yüklenemedi:', event.tile?.url);
    });
  }

  private async onViewerReady() {
    console.log('🔧 onViewerReady çağrıldı');
    this.loadingMessage = 'Viewer hazır...';

    // ⬇️ Annotorious’u burada başlat
    try {
      await this.anno.initAnnotorious(this.viewer);
      console.log('✅ Annotorious hazır');
    } catch (e) {
      console.error('Annotorious başlatılamadı', e);
    }

    setTimeout(() => {
      this.isLoading = false;
      console.log('✅ Viewer hazır, loading kapatıldı');
      this.cdr.detectChanges();
    }, 500);
  }

  private updateViewerState(): void {
    if (!this.viewer || !this.viewer.viewport) return;

    try {
      const center = this.viewer.viewport.getCenter();
      const zoom = this.viewer.viewport.getZoom();
      const rotation = this.viewer.viewport.getRotation();

      if (center && typeof center.x === 'number' && typeof center.y === 'number') {
        this.viewerState = {
          zoom: zoom || 1,
          center: {
            x: center.x,
            y: center.y
          },
          rotation: rotation || 0
        };
      } else {
        console.warn('Viewport center undefined, using fallback values');
        this.viewerState = {
          zoom: zoom || 1,
          center: { x: 0.5, y: 0.5 },
          rotation: rotation || 0
        };
      }
    } catch (error) {
      console.warn('Viewport not ready for state update:', error);
      this.viewerState = {
        zoom: 1,
        center: { x: 0.5, y: 0.5 },
        rotation: 0
      };
    }
  }

  // Viewer Controls
  zoomIn(): void {
    this.viewer.viewport.zoomBy(1.2);
  }

  zoomOut(): void {
    this.viewer.viewport.zoomBy(0.8);
  }

  resetView(): void {
    this.viewer.viewport.goHome();
  }

  rotateLeft(): void {
    this.viewer.viewport.setRotation(this.viewer.viewport.getRotation() - 90);
  }

  rotateRight(): void {
    this.viewer.viewport.setRotation(this.viewer.viewport.getRotation() + 90);
  }

  // Keyboard Shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case '+':
      case '=':
        this.zoomIn();
        break;

      case '-':
        this.zoomOut();
        break;

      case '0':
        this.resetView();
        break;
    }
  }

  // Getters for template
  get zoomPercentage(): number {
    if (!this.viewer || !this.viewer.viewport) return 100;
    const homeZoom = this.viewer.viewport.getHomeZoom();
    const currentZoom = this.viewer.viewport.getZoom();
    return Math.round((currentZoom / homeZoom) * 100) || 100;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  navigateHome(): void {
    this.router.navigate(['/']);
  }

  setTool(tool: string | null) {
    this.currentTool = tool;
    this.anno.setTool(tool);
  }

  exportAnnotations() {
    const data = this.anno.exportAnnotations();
    console.log('Exported', data);
    // burada JSON olarak indirtebilir ya da backend’e POST edebilirsin
  }

  clearAnnotations() {
    this.anno.clearAnnotations();
  }

  // sınıf alanlarına ekle
  tagVocabInput = 'Nucleus,Tumor,Necrosis,Stroma';

  // Ayarları uygula
  applySettings(): void {
    const list = this.tagVocabInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    this.anno.setTagVocabulary(list);
    console.log('✅ TAG vocabulary güncellendi:', list);
  }

}
