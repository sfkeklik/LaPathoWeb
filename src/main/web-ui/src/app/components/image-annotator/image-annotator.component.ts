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
import { AnnotationService } from '../../services/annotation.service';
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

// Sidebar Panel Interfaces
interface AnnotationItem {
  id: string;
  type: string;
  creator: string;
  notes?: string;
  color?: string;
  area?: number;
  created?: Date;
  updated?: Date;
  geometry?: any;
}

interface LayerItem {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  count: number;
  type: string;
}

interface ActivityItem {
  action: 'create' | 'update' | 'delete';
  description: string;
  timestamp: Date;
  annotationId?: string;
}

interface Statistics {
  total: number;
  totalArea: number;
  averageArea: number;
  byType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
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
  isSidebarCollapsed = true;
  showSettings = false;

  // Zoom and Magnification Properties
  currentMagnification: number = 1;
  customMagnificationInput: string = '';
  showMagnificationInput: boolean = false;
  baseMagnification: number = 1; // Base magnification level (1x = fit to screen)
  maxMagnification: number = 100; // Maximum allowed magnification (100x)
  minMagnification: number = 0.1; // Minimum magnification (0.1x)

  // Predefined magnification levels (zoom multipliers)
  predefinedMagnifications: number[] = [0.5, 1, 2, 5, 10, 20, 40, 60, 80, 100];

  // Sidebar State
  activeTab: 'annotations' | 'properties' | 'layers' | 'stats' | 'insights' = 'annotations';

  insights: any = null;

  // Sidebar Data
  annotations: AnnotationItem[] = [];
  selectedAnnotation: AnnotationItem | null = null;
  annotationLayers: LayerItem[] = [
    { id: 'nucleus', name: 'Nucleus', visible: true, color: '#ff0000', count: 0, type: 'Nucleus' },
    { id: 'tumor', name: 'Tumor', visible: true, color: '#00ff00', count: 0, type: 'Tumor' },
    { id: 'necrosis', name: 'Necrosis', visible: true, color: '#0000ff', count: 0, type: 'Necrosis' },
    { id: 'stroma', name: 'Stroma', visible: true, color: '#ffff00', count: 0, type: 'Stroma' }
  ];

  statistics: Statistics = {
    total: 0,
    totalArea: 0,
    averageArea: 0,
    byType: []
  };

  recentActivity: ActivityItem[] = [];

  // Settings
  tagVocabInput = 'Nucleus,Tumor,Necrosis,Stroma';

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
    private annotationService: AnnotationService,
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


// Additional features and improvements for the sidebar
// Add these to your ImageAnnotatorComponent class

// ========== NEW PROPERTIES ==========

// Search and filter
annotationSearchQuery = '';
selectedTypes: string[] = [];
dateRange = { start: null as Date | null, end: null as Date | null };

// Batch operations
selectedAnnotationIds: Set<string> = new Set();
batchSelectionMode = false;

// Export options
exportFormat: 'json' | 'csv' | 'xml' = 'json';

// View options
annotationSortBy: 'date' | 'type' | 'area' | 'creator' = 'date';
annotationSortOrder: 'asc' | 'desc' = 'desc';

// ========== NEW METHODS ==========

// Search and Filter Methods
get filteredAnnotations(): AnnotationItem[] {
  let filtered = [...this.annotations];

  // Text search
  if (this.annotationSearchQuery) {
    const query = this.annotationSearchQuery.toLowerCase();
    filtered = filtered.filter(ann =>
      ann.type.toLowerCase().includes(query) ||
      ann.creator.toLowerCase().includes(query) ||
      (ann.notes && ann.notes.toLowerCase().includes(query))
    );
  }

  // Type filter
  if (this.selectedTypes.length > 0) {
    filtered = filtered.filter(ann =>
      this.selectedTypes.includes(ann.type)
    );
  }

  // Date range filter
  if (this.dateRange.start || this.dateRange.end) {
    filtered = filtered.filter(ann => {
      if (!ann.created) return false;
      const date = ann.created.getTime();
      const start = this.dateRange.start ? this.dateRange.start.getTime() : 0;
      const end = this.dateRange.end ? this.dateRange.end.getTime() : Date.now();
      return date >= start && date <= end;
    });
  }

  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;

    switch (this.annotationSortBy) {
      case 'date':
        comparison = (a.created?.getTime() || 0) - (b.created?.getTime() || 0);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'area':
        comparison = (a.area || 0) - (b.area || 0);
        break;
      case 'creator':
        comparison = a.creator.localeCompare(b.creator);
        break;
    }

    return this.annotationSortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
}

clearFilters(): void {
  this.annotationSearchQuery = '';
  this.selectedTypes = [];
  this.dateRange = { start: null, end: null };
  this.addActivity('update', 'Filtreler temizlendi');
}

toggleTypeFilter(type: string): void {
  const index = this.selectedTypes.indexOf(type);
  if (index > -1) {
    this.selectedTypes.splice(index, 1);
  } else {
    this.selectedTypes.push(type);
  }
}

// Batch Operations
toggleBatchSelection(): void {
  this.batchSelectionMode = !this.batchSelectionMode;
  if (!this.batchSelectionMode) {
    this.selectedAnnotationIds.clear();
  }
}

toggleAnnotationSelection(annotation: AnnotationItem): void {
  if (!this.batchSelectionMode) {
    this.selectAnnotation(annotation);
    return;
  }

  if (this.selectedAnnotationIds.has(annotation.id)) {
    this.selectedAnnotationIds.delete(annotation.id);
  } else {
    this.selectedAnnotationIds.add(annotation.id);
  }
}

selectAllAnnotations(): void {
  if (!this.batchSelectionMode) return;

  const filtered = this.filteredAnnotations;
  if (this.selectedAnnotationIds.size === filtered.length) {
    this.selectedAnnotationIds.clear();
  } else {
    filtered.forEach(ann => this.selectedAnnotationIds.add(ann.id));
  }
}

deleteBatchAnnotations(): void {
  if (this.selectedAnnotationIds.size === 0) return;

  const count = this.selectedAnnotationIds.size;
  if (confirm(`${count} anotasyonu silmek istediğinize emin misiniz?`)) {
    const deletePromises = Array.from(this.selectedAnnotationIds).map(id =>
      this.annotationService.deleteAnnotation(this.imageId, parseInt(id, 10)).toPromise()
    );

    Promise.all(deletePromises).then(() => {
      this.annotations = this.annotations.filter(ann =>
        !this.selectedAnnotationIds.has(ann.id)
      );
      this.addActivity('delete', `${count} anotasyon toplu silindi`);
      this.selectedAnnotationIds.clear();
      this.batchSelectionMode = false;
      this.updateLayerCounts();
      this.calculateStats();
    }).catch(error => {
      console.error('Toplu silme hatası:', error);
      alert('Bazı anotasyonlar silinemedi!');
    });
  }
}

updateBatchAnnotationType(event: Event): void {
  const selectElement = event.target as HTMLSelectElement;
  const newType = selectElement.value;

  if (!newType || this.selectedAnnotationIds.size === 0) return;

  const updatePromises = Array.from(this.selectedAnnotationIds).map(id => {
    const ann = this.annotations.find(a => a.id === id);
    if (ann) {
      ann.type = newType;
      return this.annotationService.updateAnnotation(
        this.imageId,
        parseInt(id, 10),
        { type: newType }
      ).toPromise();
    }
    return Promise.resolve();
  });

  Promise.all(updatePromises).then(() => {
    this.addActivity('update', `${this.selectedAnnotationIds.size} anotasyon tipi güncellendi`);
    this.updateLayerCounts();
    this.calculateStats();
    this.cdr.detectChanges();
  });
}

// Advanced Export Methods
exportAnnotationsAdvanced(): void {
  const data = this.prepareExportData();

  switch (this.exportFormat) {
    case 'json':
      this.downloadAsJSON(data);
      break;
    case 'csv':
      this.downloadAsCSV(data);
      break;
    case 'xml':
      this.downloadAsXML(data);
      break;
  }

  this.addActivity('create', `Anotasyonlar ${this.exportFormat.toUpperCase()} formatında dışa aktarıldı`);
}

private prepareExportData(): any {
  const filtered = this.filteredAnnotations;
  return {
    metadata: {
      imageId: this.imageId,
      exportDate: new Date().toISOString(),
      totalAnnotations: filtered.length,
      filters: {
        search: this.annotationSearchQuery,
        types: this.selectedTypes,
        dateRange: this.dateRange
      }
    },
    annotations: filtered.map(ann => ({
      id: ann.id,
      type: ann.type,
      creator: ann.creator,
      notes: ann.notes,
      color: ann.color,
      area: ann.area,
      created: ann.created?.toISOString(),
      updated: ann.updated?.toISOString(),
      geometry: ann.geometry
    }))
  };
}

private downloadAsJSON(data: any): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  this.downloadBlob(blob, `annotations-${this.imageId}-${Date.now()}.json`);
}

private downloadAsCSV(data: any): void {
  const headers = ['ID', 'Type', 'Creator', 'Notes', 'Color', 'Area', 'Created', 'Updated'];
  const rows = data.annotations.map((ann: any) => [
    ann.id,
    ann.type,
    ann.creator,
    ann.notes || '',
    ann.color || '',
    ann.area || 0,
    ann.created || '',
    ann.updated || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  this.downloadBlob(blob, `annotations-${this.imageId}-${Date.now()}.csv`);
}

private downloadAsXML(data: any): void {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<annotations>\n';
  xml += `  <metadata>\n`;
  xml += `    <imageId>${data.metadata.imageId}</imageId>\n`;
  xml += `    <exportDate>${data.metadata.exportDate}</exportDate>\n`;
  xml += `    <totalAnnotations>${data.metadata.totalAnnotations}</totalAnnotations>\n`;
  xml += `  </metadata>\n`;
  xml += `  <items>\n`;

  data.annotations.forEach((ann: any) => {
    xml += `    <annotation>\n`;
    xml += `      <id>${ann.id}</id>\n`;
    xml += `      <type>${ann.type}</type>\n`;
    xml += `      <creator>${ann.creator}</creator>\n`;
    xml += `      <notes>${ann.notes || ''}</notes>\n`;
    xml += `      <color>${ann.color || ''}</color>\n`;
    xml += `      <area>${ann.area || 0}</area>\n`;
    xml += `      <created>${ann.created || ''}</created>\n`;
    xml += `      <updated>${ann.updated || ''}</updated>\n`;
    xml += `    </annotation>\n`;
  });

  xml += `  </items>\n</annotations>`;

  const blob = new Blob([xml], { type: 'text/xml' });
  this.downloadBlob(blob, `annotations-${this.imageId}-${Date.now()}.xml`);
}

private downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

// Annotation Templates
applyAnnotationTemplate(template: 'medical' | 'research' | 'education'): void {
  const templates = {
    medical: ['Tumor', 'Necrosis', 'Inflammation', 'Normal', 'Artifact'],
    research: ['Sample A', 'Sample B', 'Control', 'Test', 'Reference'],
    education: ['Example 1', 'Example 2', 'Important', 'Note', 'Question']
  };

  this.tagVocabInput = templates[template].join(',');
  this.applySettings();
  this.addActivity('update', `${template} şablonu uygulandı`);
}

// Annotation Comparison
compareAnnotations(ann1: AnnotationItem, ann2: AnnotationItem): void {
  const comparison = {
    areaDiff: (ann1.area || 0) - (ann2.area || 0),
    sameType: ann1.type === ann2.type,
    sameCreator: ann1.creator === ann2.creator,
    timeDiff: (ann1.created?.getTime() || 0) - (ann2.created?.getTime() || 0)
  };

  console.log('Annotation Comparison:', comparison);
  // You can display this in a modal or panel
}

// Undo/Redo functionality (simplified)
private actionHistory: Array<{ action: string, data: any }> = [];
private currentHistoryIndex = -1;

recordAction(action: string, data: any): void {
  this.actionHistory = this.actionHistory.slice(0, this.currentHistoryIndex + 1);
  this.actionHistory.push({ action, data });
  this.currentHistoryIndex++;

  // Keep only last 50 actions
  if (this.actionHistory.length > 50) {
    this.actionHistory.shift();
    this.currentHistoryIndex--;
  }
}

undo(): void {
  if (this.currentHistoryIndex > 0) {
    this.currentHistoryIndex--;
    // Implement undo logic based on action type
    console.log('Undo:', this.actionHistory[this.currentHistoryIndex]);
  }
}

redo(): void {
  if (this.currentHistoryIndex < this.actionHistory.length - 1) {
    this.currentHistoryIndex++;
    // Implement redo logic based on action type
    console.log('Redo:', this.actionHistory[this.currentHistoryIndex]);
  }
}

// Get annotation insights
getAnnotationInsights(): any {
  const insights = {
    mostActiveCreator: this.getMostActiveCreator(),
    peakActivityTime: this.getPeakActivityTime(),
    averageAnnotationsPerDay: this.getAverageAnnotationsPerDay(),
    coveragePercentage: this.getCoveragePercentage(),
    annotationDensity: this.getAnnotationDensity()
  };

  return insights;
}

// Calculate insights (called from UI)
calculateInsights(): void {
  this.insights = this.getAnnotationInsights();
  this.cdr.detectChanges();
}

private getMostActiveCreator(): string {
  const creatorCounts = this.annotations.reduce((acc, ann) => {
    acc[ann.creator] = (acc[ann.creator] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(creatorCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
}

private getPeakActivityTime(): string {
  const hourCounts = new Array(24).fill(0);
  this.annotations.forEach(ann => {
    if (ann.created) {
      hourCounts[ann.created.getHours()]++;
    }
  });

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  return `${peakHour}:00 - ${peakHour + 1}:00`;
}

private getAverageAnnotationsPerDay(): number {
  if (this.annotations.length === 0) return 0;

  const dates = this.annotations
    .filter(ann => ann.created)
    .map(ann => ann.created!.toDateString());

  const uniqueDates = new Set(dates);
  return Math.round(this.annotations.length / uniqueDates.size);
}

private getCoveragePercentage(): number {
  // Estimate based on total area
  const totalArea = this.statistics.totalArea;
  const imageArea = 1000000; // You should get actual image dimensions
  return Math.min(100, Math.round((totalArea / imageArea) * 100));
}

private getAnnotationDensity(): string {
  const density = this.annotations.length / 100; // Per 100 square units
  if (density < 1) return 'Low';
  if (density < 5) return 'Medium';
  return 'High';
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

    // Add zoom tracking event handlers
    this.viewer.addHandler('zoom', () => {
      this.updateViewerState();
      this.cdr.detectChanges();
    });

    this.viewer.addHandler('pan', () => {
      this.updateViewerState();
    });

    this.viewer.addHandler('rotate', () => {
      this.updateViewerState();
    });
  }

  private async onViewerReady() {
    console.log('🔧 onViewerReady çağrıldı');
    this.loadingMessage = 'Viewer hazır...';

    // ⬇️ Annotorious'u burada başlat
    try {
      await this.anno.initAnnotorious(this.viewer, this.imageId, this.annotationService);
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

  // Ayarları uygula
  applySettings(): void {
    const list = this.tagVocabInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    this.anno.setTagVocabulary(list);
    console.log('✅ TAG vocabulary güncellendi:', list);
  }

  // ========== SIDEBAR PANEL METHODS ==========

  // Annotations Panel Methods
  refreshAnnotations(): void {
    this.annotationService.getAnnotations(this.imageId.toString()).subscribe({
      next: (annotations) => {
        this.annotations = annotations.map(ann => ({
          id: String(ann.databaseId || ann.id),
          type: ann.annotation?.body?.purpose || ann.type || 'Unknown',
          creator: ann.annotation?.creator || ann.creator || 'Unknown',
          notes: ann.annotation?.body?.value || ann.notes || '',
          color: ann.annotation?.body?.style?.fill || '#ff0000',
          area: this.calculateAnnotationArea(ann.annotation?.target?.selector),
          created: ann.created ? new Date(ann.created) : new Date(),
          updated: ann.updated ? new Date(ann.updated) : new Date(),
          geometry: ann.annotation
        }));
        this.updateLayerCounts();
        this.calculateStats();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Anotasyonlar yüklenemedi:', error);
      }
    });
  }

  selectAnnotation(annotation: AnnotationItem): void {
    this.selectedAnnotation = annotation;
    // Highlight annotation in viewer (if method exists)
    if (this.anno && typeof (this.anno as any).highlightAnnotation === 'function') {
      (this.anno as any).highlightAnnotation(annotation.id);
    }
    // Switch to properties tab
    this.activeTab = 'properties';
  }

  zoomToAnnotation(annotation: AnnotationItem): void {
    if (annotation.geometry?.target?.selector) {
      // Zoom to annotation if method exists
      if (this.anno && typeof (this.anno as any).zoomToAnnotation === 'function') {
        (this.anno as any).zoomToAnnotation(annotation.id);
      }
    }
  }

  deleteAnnotation(annotation: AnnotationItem): void {
    if (confirm(`"${annotation.type}" anotasyonunu silmek istediğinize emin misiniz?`)) {
      const annotationId = parseInt(annotation.id, 10);
      this.annotationService.deleteAnnotation(this.imageId, annotationId).subscribe({
        next: () => {
          this.annotations = this.annotations.filter(a => a.id !== annotation.id);
          this.addActivity('delete', `${annotation.type} anotasyonu silindi`, annotation.id);
          this.updateLayerCounts();
          this.calculateStats();
          if (this.selectedAnnotation?.id === annotation.id) {
            this.selectedAnnotation = null;
          }
        },
        error: (error) => {
          console.error('Anotasyon silinemedi:', error);
          alert('Anotasyon silinemedi!');
        }
      });
    }
  }

  // Properties Panel Methods
  updateAnnotationProperty(property: string, event: any): void {
    if (!this.selectedAnnotation) return;

    const value = event.target ? event.target.value : event;
    (this.selectedAnnotation as any)[property] = value;

    this.addActivity('update', `${this.selectedAnnotation.type} özellikleri güncellendi`);
  }

  saveAnnotationProperties(): void {
    if (!this.selectedAnnotation) return;

    const annotationId = parseInt(this.selectedAnnotation.id, 10);
    this.annotationService.updateAnnotation(this.imageId, annotationId, {
      type: this.selectedAnnotation.type,
      creator: this.selectedAnnotation.creator,
      notes: this.selectedAnnotation.notes,
      color: this.selectedAnnotation.color
    }).subscribe({
      next: () => {
        this.addActivity('update', `${this.selectedAnnotation?.type} özellikleri kaydedildi`);
        alert('Özellikler kaydedildi!');
      },
      error: (error) => {
        console.error('Özellikler kaydedilemedi:', error);
        alert('Özellikler kaydedilemedi!');
      }
    });
  }

  resetAnnotationProperties(): void {
    if (!this.selectedAnnotation) return;

    // Restore original values from database
    this.refreshAnnotations();
    alert('Özellikler sıfırlandı!');
  }

  // Layer Management Methods
  toggleLayerVisibility(layer: LayerItem): void {
    layer.visible = !layer.visible;
    // Use safe method call for layer visibility
    if (this.anno && typeof (this.anno as any).toggleLayerVisibility === 'function') {
      (this.anno as any).toggleLayerVisibility(layer.type, layer.visible);
    }
    this.addActivity('update', `${layer.name} katmanı ${layer.visible ? 'görünür' : 'gizli'} yapıldı`);
  }

  toggleAllLayers(): void {
    const allVisible = this.annotationLayers.every(layer => layer.visible);
    this.annotationLayers.forEach(layer => {
      layer.visible = !allVisible;
      // Use safe method call for layer visibility
      if (this.anno && typeof (this.anno as any).toggleLayerVisibility === 'function') {
        (this.anno as any).toggleLayerVisibility(layer.type, layer.visible);
      }
    });
    this.addActivity('update', `Tüm katmanlar ${!allVisible ? 'görünür' : 'gizli'} yapıldı`);
  }

  updateLayerColor(layer: LayerItem, event: any): void {
    layer.color = event.target.value;
    // Use safe method call for layer color update
    if (this.anno && typeof (this.anno as any).updateLayerColor === 'function') {
      (this.anno as any).updateLayerColor(layer.type, layer.color);
    }
    this.addActivity('update', `${layer.name} katman rengi değiştirildi`);
  }

  createNewLayer(): void {
    const name = prompt('Yeni katman adı:');
    if (name && name.trim()) {
      const newLayer: LayerItem = {
        id: 'custom_' + Date.now(),
        name: name.trim(),
        visible: true,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        count: 0,
        type: name.trim()
      };
      this.annotationLayers.push(newLayer);
      this.addActivity('create', `${newLayer.name} katmanı oluşturuldu`);
    }
  }

  // Statistics Methods
  calculateStats(): void {
    this.statistics.total = this.annotations.length;
    this.statistics.totalArea = this.annotations.reduce((sum, ann) => sum + (ann.area || 0), 0);
    this.statistics.averageArea = this.statistics.total > 0 ? this.statistics.totalArea / this.statistics.total : 0;

    // Calculate by type
    const typeGroups = this.annotations.reduce((groups, ann) => {
      groups[ann.type] = (groups[ann.type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    this.statistics.byType = Object.entries(typeGroups).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / this.statistics.total) * 100)
    }));

    this.updateLayerCounts();
  }

  exportStatsReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      imageId: this.imageId,
      statistics: this.statistics,
      annotations: this.annotations.map(ann => ({
        type: ann.type,
        creator: ann.creator,
        area: ann.area,
        created: ann.created
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotation-stats-${this.imageId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.addActivity('create', 'İstatistik raporu dışa aktarıldı');
  }

  // Helper Methods
  private updateLayerCounts(): void {
    this.annotationLayers.forEach(layer => {
      layer.count = this.annotations.filter(ann => ann.type === layer.type).length;
    });
  }

  private calculateAnnotationArea(selector: any): number {
    if (!selector) return 0;

    // Basic area calculation for different shapes
    if (selector.type === 'FragmentSelector' && selector.conformsTo) {
      const coords = selector.value;
      if (coords?.includes('rect')) {
        // Rectangle area calculation
        const match = coords.match(/rect\((\d+),(\d+),(\d+),(\d+)\)/);
        if (match) {
          const [, x, y, w, h] = match.map(Number);
          return w * h;
        }
      } else if (coords?.includes('circle')) {
        // Circle area calculation
        const match = coords.match(/circle\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const [, cx, cy, r] = match.map(Number);
          return Math.PI * r * r;
        }
      } else if (coords?.includes('polygon')) {
        // Polygon area calculation using Shoelace formula
        const match = coords.match(/polygon\(([\d,\s]+)\)/);
        if (match) {
          const points = match[1].split(',').map(Number);
          let area = 0;
          const n = points.length / 2;

          for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const xi = points[i * 2];
            const yi = points[i * 2 + 1];
            const xj = points[j * 2];
            const yj = points[j * 2 + 1];
            area += xi * yj - xj * yi;
          }

          return Math.abs(area / 2);
        }
      }
    }

    // For W3C annotation format
    if (selector.type === 'SvgSelector' && selector.value) {
      // Parse SVG path and calculate area
      const svgMatch = selector.value.match(/<(rect|circle|polygon|path)[^>]*>/);
      if (svgMatch) {
        const shape = svgMatch[1];
        const svgContent = svgMatch[0];

        if (shape === 'rect') {
          const width = parseFloat(svgContent.match(/width="([^"]+)"/)?.[1] || '0');
          const height = parseFloat(svgContent.match(/height="([^"]+)"/)?.[1] || '0');
          return width * height;
        } else if (shape === 'circle') {
          const r = parseFloat(svgContent.match(/r="([^"]+)"/)?.[1] || '0');
          return Math.PI * r * r;
        } else if (shape === 'polygon') {
          const pointsMatch = svgContent.match(/points="([^"]+)"/);
          if (pointsMatch) {
            const points = pointsMatch[1].split(/[\s,]+/).map(Number);
            let area = 0;
            const n = points.length / 2;

            for (let i = 0; i < n; i++) {
              const j = (i + 1) % n;
              const xi = points[i * 2];
              const yi = points[i * 2 + 1];
              const xj = points[j * 2];
              const yj = points[j * 2 + 1];
              area += xi * yj - xj * yi;
            }

            return Math.abs(area / 2);
          }
        }
      }
    }

    // For rectangles in a different format
    if (selector.type === 'RectangleSelector') {
      const x = selector.x || 0;
      const y = selector.y || 0;
      const w = selector.width || 0;
      const h = selector.height || 0;
      return w * h;
    }

    return 0; // Default for complex or unknown shapes
  }

  private addActivity(action: ActivityItem['action'], description: string, annotationId?: string): void {
    this.recentActivity.unshift({
      action,
      description,
      timestamp: new Date(),
      annotationId
    });

    // Keep only last 10 activities
    if (this.recentActivity.length > 10) {
      this.recentActivity = this.recentActivity.slice(0, 10);
    }
  }

  // Formatting Methods
  formatArea(area: number): string {
    if (area === 0) return `0 px²`;
    if (area > 1000000) return `${(area / 1000000).toFixed(2)} MP²`;
    if (area > 1000) return `${(area / 1000).toFixed(1)} K px²`;
    return `${area.toFixed(0)} px²`;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} saat önce`;
    return this.formatDate(timestamp);
  }

  // Zoom and Magnification Methods
  get magnificationDisplay(): string {
    return `${this.currentMagnification.toFixed(1)}x`;
  }

  isActiveMagnification(mag: number): boolean {
    return Math.abs(this.currentMagnification - mag) < 0.1;
  }

  zoomIn(): void {
    const currentIndex = this.predefinedMagnifications.findIndex(mag => mag >= this.currentMagnification);
    if (currentIndex < this.predefinedMagnifications.length - 1) {
      this.setMagnification(this.predefinedMagnifications[currentIndex + 1]);
    } else {
      // If not in predefined list, increase by 50%
      this.setMagnification(Math.min(this.currentMagnification * 1.5, this.maxMagnification));
    }
  }

  zoomOut(): void {
    // Find the largest predefined magnification that is smaller than current
    const smallerMagnifications = this.predefinedMagnifications.filter(mag => mag < this.currentMagnification);

    if (smallerMagnifications.length > 0) {
      // Get the largest one among smaller magnifications
      const targetMagnification = Math.max(...smallerMagnifications);
      this.setMagnification(targetMagnification);
    } else {
      // If current is smaller than all predefined values, decrease by 33%
      this.setMagnification(Math.max(this.currentMagnification * 0.67, this.minMagnification));
    }
  }

  setMagnification(magnification: number): void {
    // Clamp magnification to valid range
    magnification = Math.max(this.minMagnification, Math.min(magnification, this.maxMagnification));

    if (this.viewer && this.viewer.viewport) {
      try {
        // Calculate zoom level for OpenSeadragon
        // OpenSeadragon zoom is relative to home/fit zoom
        const homeZoom = this.viewer.viewport.getHomeZoom();
        const targetZoom = homeZoom * magnification;

        this.viewer.viewport.zoomTo(targetZoom, undefined, true);
        this.currentMagnification = magnification;

        console.log(`Magnification set to: ${magnification}x (OpenSeadragon zoom: ${targetZoom})`);
      } catch (error) {
        console.error('Magnification ayarlanırken hata:', error);
      }
    }
  }

  setMagnificationFromPredefined(magnification: number): void {
    this.setMagnification(magnification);
    this.showMagnificationInput = false;
  }

  toggleMagnificationInput(): void {
    this.showMagnificationInput = !this.showMagnificationInput;
    if (this.showMagnificationInput) {
      this.customMagnificationInput = this.currentMagnification.toString();
      // Focus input after a short delay
      setTimeout(() => {
        const input = document.querySelector('.custom-magnification-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    }
  }

  applyCustomMagnification(): void {
    const magnification = parseFloat(this.customMagnificationInput);
    if (!isNaN(magnification) && magnification > 0) {
      this.setMagnification(magnification);
      this.showMagnificationInput = false;
    } else {
      alert('Geçerli bir zoom değeri girin (örn: 40 = 40x zoom)');
    }
  }

  onMagnificationInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.applyCustomMagnification();
    } else if (event.key === 'Escape') {
      this.showMagnificationInput = false;
    }
  }

  resetView(): void {
    if (this.viewer && this.viewer.viewport) {
      this.viewer.viewport.goHome(true);
      this.currentMagnification = 1;
    }
  }

  // Update viewer state tracking for magnification
  private updateViewerState(): void {
    if (!this.viewer || !this.viewer.viewport) return;

    try {
      const center = this.viewer.viewport.getCenter();
      const zoom = this.viewer.viewport.getZoom();
      const rotation = this.viewer.viewport.getRotation();
      const homeZoom = this.viewer.viewport.getHomeZoom();

      // Calculate current magnification
      if (homeZoom && homeZoom > 0) {
        this.currentMagnification = zoom / homeZoom;
      }

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

  // Navigation and UI Control Methods
  navigateHome(): void {
    this.router.navigate(['/']);
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }
}
