// annotorious-integration.ts
import SelectorPack from '@recogito/annotorious-selector-pack';
import BetterPolygon from '@recogito/annotorious-better-polygon';
import { AnnotationService } from '../../services/annotation.service';
import { BehaviorSubject } from 'rxjs';

// Global Annotorious (UMD) için
declare const OpenSeadragon: any;

export interface AnnotationData {
  id: string;
  databaseId?: number;
  type: string;
  creator: string;
  notes?: string;
  color?: string;
  area?: number;
  created?: Date;
  updated?: Date;
  geometry?: any;
  layerType?: string;
}

export interface Layer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  color: string;
}

export class AnnotoriousIntegration {
  private annotorious: any;
  private viewer: any;
  private imageId: number | null = null;
  private annotationService: AnnotationService | null = null;

  // Layer management
  private layers: Map<string, Layer> = new Map();
  private layerVisibility: Map<string, boolean> = new Map();
  private layerColors: Map<string, string> = new Map();

  // Annotation storage with metadata
  private annotationsMap: Map<string, AnnotationData> = new Map();

  // Observable for annotation changes
  public annotationsChanged$ = new BehaviorSubject<AnnotationData[]>([]);

  // UI state
  private tagVocabulary: string[] = ['Nucleus', 'Tumor', 'Necrosis', 'Stroma', 'Muscle'];
  private defaultColors: Record<string, string> = {
    'Nucleus': '#ff0000',
    'Tumor': '#00ff00',
    'Necrosis': '#0000ff',
    'Stroma': '#ffff00',
    'Muscle': '#800080'
  };

  // Custom widget for grade and tag selection
  private GradeWidget = (args: any) => {
    const grades = ['G1', 'G2', 'G3'];
    const tags = this.tagVocabulary;

    const currentGrade = args.annotation?.bodies?.find((b: any) => b.purpose === 'grading');
    const currentTag = args.annotation?.bodies?.find((b: any) => b.purpose === 'tagging');

    // Main container
    const container = document.createElement('div');
    container.className = 'a9s-custom-widget-container';

    // Grade selection section
    const gradeSection = document.createElement('div');
    gradeSection.className = 'a9s-grade-section';

    const gradeLabel = document.createElement('label');
    gradeLabel.textContent = 'Grade:';
    gradeLabel.className = 'a9s-widget-label';

    // Grade buttons
    const gradeButtons = document.createElement('div');
    gradeButtons.className = 'a9s-grade-buttons';

    grades.forEach(grade => {
      const button = document.createElement('button');
      button.textContent = grade;
      button.className = `a9s-grade-button ${currentGrade?.value === grade ? 'active' : ''}`;
      button.type = 'button';

      button.addEventListener('click', () => {
        // Remove active class from all buttons
        gradeButtons.querySelectorAll('.a9s-grade-button').forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Update annotation
        const gradeBody = args.annotation?.bodies?.find((b: any) => b.purpose === 'grading');
        if (gradeBody) {
          args.onUpdateBody(gradeBody, { type: 'TextualBody', purpose: 'grading', value: grade });
        } else {
          args.onAppendBody({ type: 'TextualBody', purpose: 'grading', value: grade });
        }
      });

      gradeButtons.appendChild(button);
    });

    gradeSection.appendChild(gradeLabel);
    gradeSection.appendChild(gradeButtons);

    // Tag selection section
    const tagSection = document.createElement('div');
    tagSection.className = 'a9s-tag-section';

    const tagLabel = document.createElement('label');
    tagLabel.textContent = 'Tag:';
    tagLabel.className = 'a9s-widget-label';

    // Tag buttons
    const tagButtons = document.createElement('div');
    tagButtons.className = 'a9s-tag-buttons';

    tags.forEach(tag => {
      const button = document.createElement('button');
      button.textContent = tag;
      button.className = `a9s-tag-button ${currentTag?.value === tag ? 'active' : ''}`;
      button.setAttribute('data-tag', tag); // Add data attribute for CSS styling
      button.type = 'button';

      button.addEventListener('click', () => {
        // Remove active class from all buttons
        tagButtons.querySelectorAll('.a9s-tag-button').forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Update annotation
        const tagBody = args.annotation?.bodies?.find((b: any) => b.purpose === 'tagging');
        if (tagBody) {
          args.onUpdateBody(tagBody, { type: 'TextualBody', purpose: 'tagging', value: tag });
        } else {
          args.onAppendBody({ type: 'TextualBody', purpose: 'tagging', value: tag });
        }
      });

      tagButtons.appendChild(button);
    });

    tagSection.appendChild(tagLabel);
    tagSection.appendChild(tagButtons);

    // Assemble the widget
    container.appendChild(gradeSection);
    container.appendChild(tagSection);

    return container;
  };

  constructor() {
    // Initialize default layers
    this.initializeDefaultLayers();
  }

  private initializeDefaultLayers() {
    const defaultLayers = [
      { id: 'nucleus', name: 'Nucleus', type: 'Nucleus', visible: true, color: '#ff0000' },
      { id: 'tumor', name: 'Tumor', type: 'Tumor', visible: true, color: '#00ff00' },
      { id: 'necrosis', name: 'Necrosis', type: 'Necrosis', visible: true, color: '#0000ff' },
      { id: 'stroma', name: 'Stroma', type: 'Stroma', visible: true, color: '#ffff00' },
      { id: 'muscle', name: 'Muscle', type: 'Muscle', visible: true, color: '#800080' }
    ];

    defaultLayers.forEach(layer => {
      this.layers.set(layer.type, layer);
      this.layerVisibility.set(layer.type, layer.visible);
      this.layerColors.set(layer.type, layer.color);
    });
  }

  async initAnnotorious(viewer: any, imageId: number, annotationService: AnnotationService) {
    this.viewer = viewer;
    this.imageId = imageId;
    this.annotationService = annotationService;
    // Disable gestures that conflict with drawing
    this.viewer.gestureSettingsMouse.clickToZoom = false;
    this.viewer.gestureSettingsMouse.dblClickToZoom = false;

    try {
      if (typeof OpenSeadragon?.Annotorious === 'undefined') {
        console.error('Annotorious is not loaded globally');
        return false;
      }

      this.annotorious = OpenSeadragon.Annotorious(this.viewer, {
        readOnly: false,
        drawingEnabled: false, // ⚠️ DEĞİŞTİ: false ile başlıyor
        hotkey: { key: 'Shift', inverted: true },
        drawOnSingleClick: false, // ⚠️ DEĞİŞTİ: false yapıldı
        widgets: [
          'COMMENT',
          { widget: 'TAG', vocabulary: this.tagVocabulary },
          this.GradeWidget
        ],
        locale: 'tr'
      });

      // Add extra drawing tools
      SelectorPack(this.annotorious, { tools: ['point','circle','ellipse','freehand'] });
      BetterPolygon(this.annotorious);

      this.setupEventListeners();
      this.loadExistingAnnotations();

      console.log('✅ Annotorious successfully initialized');
      return true;
    } catch (e) {
      console.error('Annotorious init error:', e);
      return false;
    }
  }

  private loadExistingAnnotations() {
    if (!this.imageId || !this.annotationService) return;

    this.annotationService.getAnnotations(this.imageId.toString()).subscribe({
      next: (annotations) => {
        console.log('📥 Loading existing annotations:', annotations.length);

        const annotoriousFormat = annotations.map(ann => {
          const annotationData = ann.annotation;

          // Add database ID
          if (ann.databaseId) {
            annotationData.databaseId = ann.databaseId;
          }

          // Extract metadata and store in our map
          const metadata: AnnotationData = {
            id: annotationData.id || String(ann.databaseId),
            databaseId: ann.databaseId,
            type: this.extractAnnotationType(annotationData),
            creator: ann.creator || 'Unknown',
            notes: this.extractAnnotationNotes(annotationData),
            color: this.extractAnnotationColor(annotationData),
            created: ann.created ? new Date(ann.created) : new Date(),
            updated: ann.updated ? new Date(ann.updated) : undefined,
            geometry: annotationData,
            layerType: this.extractAnnotationType(annotationData)
          };

          this.annotationsMap.set(metadata.id, metadata);

          // Apply layer color if exists
          const layerColor = this.layerColors.get(metadata.type);
          if (layerColor) {
            this.applyColorToAnnotation(annotationData, layerColor);
          }

          return annotationData;
        });

        if (this.annotorious?.setAnnotations) {
          this.annotorious.setAnnotations(annotoriousFormat);
        }

        this.notifyAnnotationChanges();
        this.applyLayerVisibility();
      },
      error: (error) => {
        console.error('❌ Failed to load annotations:', error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.annotorious) return;

    this.annotorious.on('createAnnotation', (annotation: any) => {
      console.log('🆕 Annotation created:', annotation);

      // Extract type and apply layer color
      const type = this.extractAnnotationType(annotation);
      const layerColor = this.layerColors.get(type);

      if (layerColor) {
        this.applyColorToAnnotation(annotation, layerColor);
        // Update the annotation with the new color
        this.annotorious.removeAnnotation(annotation);
        this.annotorious.addAnnotation(annotation);
      }

      const metadata: AnnotationData = {
        id: annotation.id,
        type: type,
        creator: 'Current User',
        notes: this.extractAnnotationNotes(annotation),
        color: layerColor || '#ff0000',
        created: new Date(),
        geometry: annotation,
        layerType: type
      };

      this.annotationsMap.set(annotation.id, metadata);
      this.saveAnnotationToBackend(annotation, metadata);
      this.notifyAnnotationChanges();
    });

    this.annotorious.on('updateAnnotation', (annotation: any, previous: any) => {
      console.log('🔄 Annotation updated:', annotation);

      const metadata = this.annotationsMap.get(annotation.id) || this.createMetadataFromAnnotation(annotation);
      metadata.type = this.extractAnnotationType(annotation);
      metadata.notes = this.extractAnnotationNotes(annotation);
      metadata.updated = new Date();
      metadata.geometry = annotation;

      // ⚠️ YENİ: Apply layer color after update
      const layerColor = this.layerColors.get(metadata.type);
      if (layerColor) {
        this.applyColorToAnnotation(annotation, layerColor);
      }

      this.annotationsMap.set(annotation.id, metadata);
      this.updateAnnotationInBackend(annotation, metadata);
      this.notifyAnnotationChanges();
    });

    this.annotorious.on('deleteAnnotation', (annotation: any) => {
      console.log('🗑️ Annotation deleted:', annotation);

      this.annotationsMap.delete(annotation.id);
      this.deleteAnnotationFromBackend(annotation);
      this.notifyAnnotationChanges();
    });

    this.annotorious.on('selectAnnotation', (annotation: any) => {
      console.log('Selected annotation:', annotation);
    });
  }

  // Layer Management Methods
  public toggleLayerVisibility(layerType: string, visible: boolean) {
      this.layerVisibility.set(layerType, visible);

      const layer = this.layers.get(layerType);
      if (layer) {
        layer.visible = visible;
      }

      // Re-apply visibility to all annotations
      this.restoreAndFilterAnnotations();
    }

    private restoreAndFilterAnnotations() {
      if (!this.annotorious) return;

      // Get all annotations from our map (includes hidden ones)
      const allAnnotations: any[] = [];

      this.annotationsMap.forEach((metadata) => {
        if (metadata.geometry) {
          const type = metadata.type;
          const isVisible = this.layerVisibility.get(type) !== false;

          if (isVisible) {
            // Clean up any hidden markers
            delete metadata.geometry.hidden;
            allAnnotations.push(metadata.geometry);
          }
        }
      });

      // Clear and re-add only visible annotations
      this.annotorious.clearAnnotations();
      allAnnotations.forEach(ann => {
        this.annotorious.addAnnotation(ann);
      });
    }

  private applyLayerVisibility() {
      if (!this.annotorious) return;

      const allAnnotations = this.annotorious.getAnnotations();
      const visibleAnnotations: any[] = [];
      const hiddenAnnotations: any[] = [];

      allAnnotations.forEach((annotation: any) => {
        const type = this.extractAnnotationType(annotation);
        const isVisible = this.layerVisibility.get(type) !== false;

        if (isVisible) {
          // Remove any hidden markers from visible annotations
          delete annotation.hidden;
          if (annotation.target?.selector?.value) {
            // Clean up any display:none styles
            annotation.target.selector.value = annotation.target.selector.value.replace(
              /<style[^>]*>.*?display:\s*none.*?<\/style>/gi,
              ''
            );
          }
          visibleAnnotations.push(annotation);
        } else {
          // Mark as hidden
          annotation.hidden = true;
          hiddenAnnotations.push(annotation);
        }
      });

      // Clear all annotations first
      this.annotorious.clearAnnotations();

      // Only add back visible annotations
      visibleAnnotations.forEach(ann => {
        this.annotorious.addAnnotation(ann);
      });

      // Store hidden annotations in our map for later restoration
      hiddenAnnotations.forEach(ann => {
        const metadata = this.annotationsMap.get(ann.id);
        if (metadata) {
          metadata.geometry = ann;
        }
      });
    }

  public updateLayerColor(layerType: string, color: string) {
    this.layerColors.set(layerType, color);

    const layer = this.layers.get(layerType);
    if (layer) {
      layer.color = color;
    }

    // Update all annotations of this type
    this.updateAnnotationColors(layerType, color);
  }

  private updateAnnotationColors(layerType: string, color: string) {
    if (!this.annotorious) return;

    const allAnnotations = this.annotorious.getAnnotations();
    let updated = false;

    allAnnotations.forEach((annotation: any) => {
      const type = this.extractAnnotationType(annotation);

      if (type === layerType) {
        this.applyColorToAnnotation(annotation, color);

        // Update metadata
        const metadata = this.annotationsMap.get(annotation.id);
        if (metadata) {
          metadata.color = color;
        }

        updated = true;
      }
    });

    if (updated) {
      // Refresh all annotations to apply color changes
      this.annotorious.setAnnotations(allAnnotations);
      this.notifyAnnotationChanges();
    }
  }

  private applyColorToAnnotation(annotation: any, color: string) {
    // Update SVG style in the annotation
    if (annotation.target?.selector?.value) {
      let svgValue = annotation.target.selector.value;

      // Update fill color
      svgValue = svgValue.replace(/fill="[^"]*"/g, `fill="${color}"`);
      svgValue = svgValue.replace(/fill-opacity="[^"]*"/g, 'fill-opacity="0.25"');

      // Update stroke color
      svgValue = svgValue.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
      svgValue = svgValue.replace(/stroke-width="[^"]*"/g, 'stroke-width="2"');

      // If no color attributes exist, add them
      if (!svgValue.includes('fill=')) {
        svgValue = svgValue.replace(/<(rect|circle|ellipse|polygon|path)/g, `<$1 fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2"`);
      }

      annotation.target.selector.value = svgValue;
    }

    // Also update the body style if it exists
    const styleBody = annotation.body?.find((b: any) => b.purpose === 'style');
    if (styleBody) {
      styleBody.value = { fill: color, stroke: color, strokeWidth: 2, fillOpacity: 0.25 };
    } else if (Array.isArray(annotation.body)) {
      annotation.body.push({
        type: 'TextualBody',
        purpose: 'style',
        value: { fill: color, stroke: color, strokeWidth: 2, fillOpacity: 0.25 }
      });
    }
  }

  // Annotation property update methods
  public updateAnnotationProperties(annotationId: string, updates: Partial<AnnotationData>) {
    const metadata = this.annotationsMap.get(annotationId);
    if (!metadata) return;

    // Update metadata
    Object.assign(metadata, updates);
    metadata.updated = new Date();

    // Get the actual annotation
    const annotation = this.getAnnotationById(annotationId);
    if (!annotation) return;

    // Update annotation bodies based on property changes
    if (updates.type) {
      this.updateAnnotationType(annotation, updates.type);
    }

    if (updates.notes) {
      this.updateAnnotationNotes(annotation, updates.notes);
    }

    if (updates.color) {
      this.applyColorToAnnotation(annotation, updates.color);
    }

    // ⚠️ DEĞİŞTİ: updateAnnotation yerine remove/add kullanılıyor
    if (this.annotorious) {
      // Instead of updateAnnotation, remove and re-add
      this.annotorious.removeAnnotation(annotation);
      this.annotorious.addAnnotation(annotation);
    }

    // Save to backend
    this.updateAnnotationInBackend(annotation, metadata);
    this.notifyAnnotationChanges();
  }

  private updateAnnotationType(annotation: any, type: string) {
    // Find or create TAG body
    if (!annotation.body) {
      annotation.body = [];
    }

    if (!Array.isArray(annotation.body)) {
      annotation.body = [annotation.body];
    }

    let tagBody = annotation.body.find((b: any) => b.purpose === 'tagging');

    if (tagBody) {
      tagBody.value = type;
    } else {
      annotation.body.push({
        type: 'TextualBody',
        purpose: 'tagging',
        value: type
      });
    }
  }

  private updateAnnotationNotes(annotation: any, notes: string) {
    // Find or create COMMENT body
    if (!annotation.body) {
      annotation.body = [];
    }

    if (!Array.isArray(annotation.body)) {
      annotation.body = [annotation.body];
    }

    let commentBody = annotation.body.find((b: any) => b.purpose === 'commenting');

    if (commentBody) {
      commentBody.value = notes;
    } else {
      annotation.body.push({
        type: 'TextualBody',
        purpose: 'commenting',
        value: notes
      });
    }
  }

  // Helper methods
  private extractAnnotationType(annotation: any): string {
    if (annotation.body) {
      const bodies = Array.isArray(annotation.body) ? annotation.body : [annotation.body];
      const tagBody = bodies.find((b: any) => b.purpose === 'tagging');
      if (tagBody?.value) return tagBody.value;
    }
    return 'Unknown';
  }

  private extractAnnotationNotes(annotation: any): string {
    if (annotation.body) {
      const bodies = Array.isArray(annotation.body) ? annotation.body : [annotation.body];
      const commentBody = bodies.find((b: any) => b.purpose === 'commenting');
      if (commentBody?.value) return commentBody.value;
    }
    return '';
  }

  private extractAnnotationColor(annotation: any): string {
    // Try to extract from SVG
    if (annotation.target?.selector?.value) {
      const fillMatch = annotation.target.selector.value.match(/fill="([^"]*)"/);
      if (fillMatch) return fillMatch[1];
    }

    // Try to extract from style body
    if (annotation.body) {
      const bodies = Array.isArray(annotation.body) ? annotation.body : [annotation.body];
      const styleBody = bodies.find((b: any) => b.purpose === 'style');
      if (styleBody?.value?.fill) return styleBody.value.fill;
    }

    return '#ff0000';
  }

  private createMetadataFromAnnotation(annotation: any): AnnotationData {
    const type = this.extractAnnotationType(annotation);
    return {
      id: annotation.id,
      databaseId: annotation.databaseId,
      type: type,
      creator: 'Unknown',
      notes: this.extractAnnotationNotes(annotation),
      color: this.extractAnnotationColor(annotation),
      created: new Date(),
      geometry: annotation,
      layerType: type
    };
  }

  private getAnnotationById(id: string): any {
    if (!this.annotorious) return null;

    const allAnnotations = this.annotorious.getAnnotations();
    return allAnnotations.find((a: any) => a.id === id);
  }

  // Navigation methods
  public zoomToAnnotation(annotationId: string) {
    const annotation = this.getAnnotationById(annotationId);
    if (!annotation || !this.viewer) return;

    // Extract bounds from annotation
    const bounds = this.getAnnotationBounds(annotation);
    if (!bounds) return;

    // Convert to viewport coordinates and zoom
    const viewportBounds = this.viewer.viewport.imageToViewportRectangle(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );

    this.viewer.viewport.fitBounds(viewportBounds, true);
  }

  private getAnnotationBounds(annotation: any): any {
    if (!annotation.target?.selector?.value) return null;

    const svgValue = annotation.target.selector.value;

    // Try to extract bounds based on shape type
    if (svgValue.includes('<rect')) {
      const xMatch = svgValue.match(/x="([^"]*)"/);
      const yMatch = svgValue.match(/y="([^"]*)"/);
      const widthMatch = svgValue.match(/width="([^"]*)"/);
      const heightMatch = svgValue.match(/height="([^"]*)"/);

      if (xMatch && yMatch && widthMatch && heightMatch) {
        return {
          x: parseFloat(xMatch[1]),
          y: parseFloat(yMatch[1]),
          width: parseFloat(widthMatch[1]),
          height: parseFloat(heightMatch[1])
        };
      }
    }

    // Add more shape types as needed
    return null;
  }

  public highlightAnnotation(annotationId: string) {
    if (!this.annotorious) return;

    const annotation = this.getAnnotationById(annotationId);
    if (annotation) {
      this.annotorious.selectAnnotation(annotation);
    }
  }

  // Backend sync methods
  private saveAnnotationToBackend(annotation: any, metadata: AnnotationData) {
    if (!this.imageId || !this.annotationService) {
      console.error('❌ Cannot save annotation - missing dependencies');
      return;
    }

    const annotationEntity = {
      creator: metadata.creator,
      type: metadata.type,
      geometry: JSON.stringify(annotation)
    };

    this.annotationService.saveAnnotation(this.imageId.toString(), annotationEntity).subscribe({
      next: (result) => {
        console.log('✅ Annotation saved to backend:', result);
        if (result.id) {
          annotation.databaseId = result.id;
          metadata.databaseId = result.id;
        }
      },
      error: (error) => {
        console.error('❌ Failed to save annotation:', error);
        if (this.annotorious?.removeAnnotation) {
          this.annotorious.removeAnnotation(annotation);
        }
        this.annotationsMap.delete(annotation.id);
        this.notifyAnnotationChanges();
      }
    });
  }

  private updateAnnotationInBackend(annotation: any, metadata: AnnotationData) {
    if (!this.imageId || !this.annotationService || !annotation.databaseId) {
      console.warn('❌ Cannot update annotation - missing data');
      return;
    }

    const annotationEntity = {
      creator: metadata.creator,
      type: metadata.type,
      notes: metadata.notes,
      geometry: JSON.stringify(annotation)
    };

    this.annotationService.updateAnnotation(this.imageId, annotation.databaseId, annotationEntity).subscribe({
      next: (result) => {
        console.log('✅ Annotation updated in backend:', result);
      },
      error: (error) => {
        console.error('❌ Failed to update annotation:', error);
      }
    });
  }

  private deleteAnnotationFromBackend(annotation: any) {
    if (!this.imageId || !this.annotationService || !annotation.databaseId) {
      console.warn('❌ Cannot delete annotation - missing data');
      return;
    }

    this.annotationService.deleteAnnotation(this.imageId, annotation.databaseId).subscribe({
      next: () => {
        console.log('✅ Annotation deleted from backend:', annotation.databaseId);
      },
      error: (error) => {
        console.error('❌ Failed to delete annotation:', error);
        if (this.annotorious?.addAnnotation) {
          this.annotorious.addAnnotation(annotation);
        }
      }
    });
  }

  private notifyAnnotationChanges() {
    const annotations = Array.from(this.annotationsMap.values());
    this.annotationsChanged$.next(annotations);
  }

  // Public API
  public getAnnotations(): AnnotationData[] {
    return Array.from(this.annotationsMap.values());
  }

  public deleteAnnotationById(annotationId: string) {
    const annotation = this.getAnnotationById(annotationId);
    if (annotation && this.annotorious) {
      this.annotorious.removeAnnotation(annotation);
    }
  }

  public setTool(toolId: string | null) {
    if (!this.annotorious) return;

    if (toolId === null) {
      // Selection mode - only disable drawing
      this.annotorious.setDrawingEnabled(false);
      // Don't call setDrawingTool with null - just disable drawing is enough
    } else {
      // Drawing mode - enable drawing and set tool
      this.annotorious.setDrawingEnabled(true);
      this.annotorious.setDrawingTool(toolId);
    }
  }

  public setTagVocabulary(vocab: string[]) {
    this.tagVocabulary = vocab;
    this.reinitPreservingAnnotations();
  }

  private reinitPreservingAnnotations() {
    if (!this.viewer) return;

    const existing = (this.annotorious?.getAnnotations?.() || []).slice();
    this.annotorious?.destroy?.();

    this.annotorious = OpenSeadragon.Annotorious(this.viewer, {
      readOnly: false,
      drawingEnabled: false,
      hotkey: { key: 'Shift', inverted: true },
      drawOnSingleClick: false,
      widgets: [
        'COMMENT',
        { widget: 'TAG', vocabulary: this.tagVocabulary },
        this.GradeWidget
      ],
      locale: 'tr'
    });

    SelectorPack(this.annotorious, { tools: ['point','circle','ellipse','freehand'] });
    BetterPolygon(this.annotorious);
    this.setupEventListeners();

    if (existing.length && this.annotorious.setAnnotations) {
      this.annotorious.setAnnotations(existing);
    }
  }

  public exportAnnotations() {
    return this.annotorious ? this.annotorious.getAnnotations() : [];
  }

  public loadAnnotations(annotations: any[]) {
    if (this.annotorious?.setAnnotations) {
      this.annotorious.setAnnotations(annotations);
    }
  }

  public clearAnnotations() {
    if (this.annotorious?.setAnnotations) {
      this.annotorious.setAnnotations([]);
      this.annotationsMap.clear();
      this.notifyAnnotationChanges();
    }
  }

  public getAnnotationCount(): number {
    return this.annotationsMap.size;
  }

  public destroy() {
    if (this.annotorious?.destroy) {
      this.annotorious.destroy();
    }
    this.annotationsMap.clear();
    this.layers.clear();
    this.layerVisibility.clear();
    this.layerColors.clear();
  }
}
