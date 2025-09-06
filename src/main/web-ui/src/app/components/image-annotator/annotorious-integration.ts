// annotorious-integration.ts
// Removed ESM imports to avoid duplicate/mismatched instances
// import SelectorPack from '@recogito/annotorious-selector-pack';
// import BetterPolygon from '@recogito/annotorious-better-polygon';
import { AnnotationService } from '../../services/annotation.service';
import { BehaviorSubject } from 'rxjs';

// Global Annotorious (UMD) için
declare const OpenSeadragon: any;
declare const Annotorious: any;

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
  grade?: string; // Add grade property
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
  // Deletion guard to avoid duplicate backend calls
  private deletingIds: Set<string> = new Set();

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
  // Custom formatter for displaying annotation metadata
    private createCustomFormatter() {
      return (annotation: any): string => {
        const bodies = Array.isArray(annotation.body) ? annotation.body : [annotation.body];

        // Extract grade and tag values
        const gradeBody = bodies.find((b: any) => b.purpose === 'grading');
        const tagBody = bodies.find((b: any) => b.purpose === 'tagging');
        const commentBody = bodies.find((b: any) => b.purpose === 'commenting');

        let formattedText = '';

        if (gradeBody?.value) {
          formattedText += `Grade: ${gradeBody.value}\n`;
        }

        if (tagBody?.value) {
          formattedText += `Type: ${tagBody.value}\n`;
        }

        if (commentBody?.value) {
          formattedText += `Notes: ${commentBody.value}`;
        }

        return formattedText || 'Click to add details';
      };
    }

    // Simple widget for adding tags from vocabulary
    private createTagWidget() {
      const vocab = this.tagVocabulary;

      return {
        widget: 'TAG',
        vocabulary: vocab
      };
    }

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
  // Setup custom popup for annotations
    private setupCustomPopup() {
      if (!this.annotorious) return;

      // Yeni anotasyon oluşturulurken popup göster
      this.annotorious.on('createSelection', (selection: any) => {
        // Selection tamamlandığında popup aç
        this.closeCustomPopup();
        setTimeout(() => {
          // Geçici bir annotation objesi oluştur
          const tempAnnotation = {
            ...selection,
            id: 'temp-' + Date.now(),
            body: []
          };
          this.showCustomPopup(tempAnnotation, true); // true = yeni anotasyon
        }, 50);
      });

      // Mevcut anotasyon seçildiğinde popup göster
      this.annotorious.on('selectAnnotation', (annotation: any) => {
        this.closeCustomPopup();
        setTimeout(() => {
          this.showCustomPopup(annotation, false); // false = mevcut anotasyon
        }, 50);
      });

      // Selection iptal edildiğinde popup kapat
      this.annotorious.on('cancelSelected', () => {
        this.closeCustomPopup();
      });
    }

    private showCustomPopup(annotation: any, isNew: boolean = false) {
      const popup = document.createElement('div');
      popup.className = 'custom-annotation-popup';
      popup.id = 'custom-popup-' + annotation.id;

      const metadata = isNew
        ? {
            id: annotation.id,
            type: this.tagVocabulary[0],
            creator: 'Current User',
            notes: '',
            color: this.defaultColors[this.tagVocabulary[0]] || '#ff0000',
            created: new Date(),
            geometry: annotation
          }
        : (this.annotationsMap.get(annotation.id) || this.createMetadataFromAnnotation(annotation));

      popup.innerHTML = `
        <div class="popup-header">
          <h4>${isNew ? 'Yeni Anotasyon' : 'Anotasyon Detayları'}</h4>
          <button class="popup-close">×</button>
        </div>
        <div class="popup-body compact">
          <div class="popup-section inline">
            <label>Tip</label>
            <select class="popup-select" id="type-select">
              ${this.tagVocabulary.map(tag =>
                `<option value="${tag}" ${metadata.type === tag ? 'selected' : ''}>${tag}</option>`
              ).join('')}
            </select>
          </div>

          <div class="popup-section">
            <label>Grade</label>
            <div class="grade-buttons">
              <button class="grade-btn" data-grade="G1">G1</button>
              <button class="grade-btn" data-grade="G2">G2</button>
              <button class="grade-btn" data-grade="G3">G3</button>
            </div>
          </div>

          <div class="popup-section">
            <label>Notlar</label>
            <textarea class="popup-textarea" id="notes-textarea" rows="2" placeholder="Notlarınızı yazın...">${metadata.notes || ''}</textarea>
          </div>

          <div class="popup-actions">
            ${isNew
              ? `<button class="popup-btn save-btn">Oluştur</button>
                 <button class="popup-btn cancel-btn">İptal</button>`
              : `<button class="popup-btn save-btn">Kaydet</button>
                 <button class="popup-btn delete-btn">Sil</button>`
            }
          </div>
        </div>
      `;

      this.addPopupStyles();

      const viewerElement = (this.viewer && (this.viewer.container || this.viewer.element)) ? (this.viewer.container || this.viewer.element) : (document.querySelector('.viewer-container') as HTMLElement) || document.body;
      viewerElement.appendChild(popup);

      // Close button handler
      const closeBtn = popup.querySelector('.popup-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          if (isNew) {
            this.annotorious.cancelSelected();
          }
          this.closeCustomPopup();
        });
      }

      this.setupPopupEventHandlers(popup, annotation, metadata, isNew);
      this.positionPopup(popup, annotation);
    }

    private setupPopupEventHandlers(popup: HTMLElement, annotation: any, metadata: AnnotationData, isNew: boolean) {
      const typeSelect = popup.querySelector('#type-select') as HTMLSelectElement;
      if (typeSelect) {
        typeSelect.addEventListener('change', () => {
          metadata.type = typeSelect.value;
          // Otomatik katman rengi uygula (UI'da renk seçimi yok)
          const newColor = this.defaultColors[typeSelect.value] || metadata.color || '#ff0000';
          metadata.color = newColor;
        });
      }

      const gradeButtons = popup.querySelectorAll('.grade-btn');
      gradeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const grade = target.dataset['grade'];

          gradeButtons.forEach(b => b.classList.remove('active'));
          target.classList.add('active');

          if (!isNew) {
            this.updateAnnotationGrade(annotation, grade || '');
          } else {
            // Yeni anotasyon için metadata'ya kaydet
            metadata.grade = grade;
          }
        });
      });

      const notesTextarea = popup.querySelector('#notes-textarea') as HTMLTextAreaElement;
      if (notesTextarea) {
        notesTextarea.addEventListener('input', () => {
          metadata.notes = notesTextarea.value;
        });
      }

      if (isNew) {
        // Yeni anotasyon için butonlar
        const saveBtn = popup.querySelector('.save-btn');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            this.createAnnotationFromPopup(annotation, metadata);
            this.closeCustomPopup();
          });
        }

        const cancelBtn = popup.querySelector('.cancel-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            this.annotorious.cancelSelected();
            this.closeCustomPopup();
          });
        }
      } else {
        // Mevcut anotasyon için butonlar
        const saveBtn = popup.querySelector('.save-btn');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            this.savePopupChanges(annotation, metadata);
            this.closeCustomPopup();
          });
        }

        const deleteBtn = popup.querySelector('.delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => {
            if (confirm('Bu anotasyonu silmek istediğinize emin misiniz?')) {
              // Persist delete to backend and then remove from viewer
              this.deleteByAnnotation(annotation);
              this.closeCustomPopup();
            }
          });
        }
      }
    }
  private createAnnotationFromPopup(selection: any, metadata: any) {
    // Yeni anotasyon objesi oluştur
    const newAnnotation = {
      ...selection,
      id: 'annotation-' + Date.now(),
      body: [
        {
          type: 'TextualBody',
          purpose: 'tagging',
          value: metadata.type
        }
      ]
    };

    // Grade ekle
    if (metadata.grade) {
      newAnnotation.body.push({
        type: 'TextualBody',
        purpose: 'grading',
        value: metadata.grade
      });
    }

    // Notlar ekle
    if (metadata.notes) {
      newAnnotation.body.push({
        type: 'TextualBody',
        purpose: 'commenting',
        value: metadata.notes
      });
    }

    // Renk uygula
    if (metadata.color) {
      this.applyColorToAnnotation(newAnnotation, metadata.color);
    }

    // Annotorious'a ekle
    this.annotorious.cancelSelected(); // Önce selection'ı kapat
    this.annotorious.addAnnotation(newAnnotation);

    // Metadata'yı kaydet
    metadata.id = newAnnotation.id;
    metadata.geometry = newAnnotation;
    this.annotationsMap.set(newAnnotation.id, metadata);

    // Backend'e kaydet
    this.saveAnnotationToBackend(newAnnotation, metadata);
    this.notifyAnnotationChanges();
  }
    private positionPopup(popup: HTMLElement, annotation: any) {
      try {
        if (!this.viewer || !this.viewer.viewport) {
          popup.style.position = 'absolute';
          popup.style.left = '50%';
          popup.style.top = '30%';
          popup.style.transform = 'translate(-50%, -50%)';
          return;
        }

        const bounds = this.getAnnotationBounds(annotation);
        if (bounds) {
          const vp = this.viewer.viewport.imageToViewportCoordinates(
            bounds.x + bounds.width / 2,
            bounds.y
          );
          if (vp) {
            const winPt = this.viewer.viewport.viewportToWindowCoordinates(vp);
            if (winPt) {
              popup.style.position = 'absolute';
              popup.style.left = `${winPt.x}px`;
              popup.style.top = `${winPt.y - 10}px`;
              popup.style.transform = 'translateX(-50%) translateY(-100%)';
              return;
            }
          }
        }

        // Fallback
        popup.style.position = 'absolute';
        popup.style.left = '50%';
        popup.style.top = '30%';
        popup.style.transform = 'translate(-50%, -50%)';
      } catch {
        popup.style.position = 'absolute';
        popup.style.left = '50%';
        popup.style.top = '30%';
        popup.style.transform = 'translate(-50%, -50%)';
      }
    }

    private closeCustomPopup() {
      const popups = document.querySelectorAll('.custom-annotation-popup');
      popups.forEach(popup => popup.remove());
    }

    private savePopupChanges(annotation: any, metadata: AnnotationData) {
      // Update annotation properties
      this.updateAnnotationProperties(annotation.id, metadata);
    }

    private updateAnnotationGrade(annotation: any, grade: string) {
      if (!annotation.body) {
        annotation.body = [];
      }

      if (!Array.isArray(annotation.body)) {
        annotation.body = [annotation.body];
      }

      let gradeBody = annotation.body.find((b: any) => b.purpose === 'grading');

      if (gradeBody) {
        gradeBody.value = grade;
      } else {
        annotation.body.push({
          type: 'TextualBody',
          purpose: 'grading',
          value: grade
        });
      }
    }

    private addPopupStyles() {
      // Check if styles already exist
      if (document.getElementById('custom-popup-styles')) return;

      const style = document.createElement('style');
      style.id = 'custom-popup-styles';
      style.textContent = `
        .custom-annotation-popup {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          padding: 0;
          min-width: 240px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Ensure children don't overflow due to padding/borders */
        .custom-annotation-popup, .custom-annotation-popup * { box-sizing: border-box; }

        .popup-header {
          background: #f8fafc;
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 8px 8px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .popup-header h4 {
          margin: 0;
          font-size: 13px;
          color: #111827;
          font-weight: 600;
        }

        .popup-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .popup-close:hover { color: #111827; }

        .popup-body.compact { padding: 12px; }

        .popup-section { margin-bottom: 8px; }
        .popup-section.inline { display: flex; align-items: center; gap: 8px; }
        .popup-section label {
          display: block;
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .popup-select,
        .popup-textarea {
          width: 100%;
          max-width: 100%;
          padding: 6px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 12px;
          background: #fff;
          /* Make sure padding/border don't cause overflow */
          box-sizing: border-box;
          display: block;
        }
        .popup-textarea { resize: vertical; min-height: 40px; max-height: 160px; overflow: auto; }

        .grade-buttons { display: flex; gap: 6px; }
        .grade-btn {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.15s;
        }
        .grade-btn:hover { background: #f3f4f6; }
        .grade-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }

        .popup-actions { display: flex; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
        .popup-btn {
          flex: 1;
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .popup-btn:hover { opacity: 0.95; }
        .save-btn { background: #10b981; color: white; }
        .delete-btn { background: #ef4444; color: white; }
        .cancel-btn { background: #e5e7eb; color: #111827; }
      `;

      document.head.appendChild(style);
    }


  async initAnnotorious(viewer: any, imageId: number, annotationService: AnnotationService) {
      this.viewer = viewer;
      this.imageId = imageId;
      this.annotationService = annotationService;
      // Disable gestures that conflict with drawing
      this.viewer.gestureSettingsMouse.clickToZoom = false;
      this.viewer.gestureSettingsMouse.dblClickToZoom = false;

      try {
        if (typeof OpenSeadragon?.Annotorious === 'undefined' && typeof (window as any).Annotorious === 'undefined') {
          console.error('Annotorious is not loaded globally');
          return false;
        }

        // Initialize with basic configuration first
        this.annotorious = OpenSeadragon.Annotorious(this.viewer, {
          readOnly: false,
          drawingEnabled: false,
          hotkey: { key: 'Shift', inverted: true },
          drawOnSingleClick: false,
          widgets: [
            'COMMENT',
            { widget: 'TAG', vocabulary: this.tagVocabulary }
          ],
          formatters: [this.createCustomFormatter()],
          locale: 'auto'
        });

        // Add extra drawing tools using global UMD plugins
        if (typeof Annotorious?.SelectorPack === 'function') {
          Annotorious.SelectorPack(this.annotorious, { tools: ['point','circle','ellipse','freehand'] });
        }
        if (typeof Annotorious?.BetterPolygon === 'function') {
          Annotorious.BetterPolygon(this.annotorious);
        }

        // Setup custom popup for annotations
        this.setupCustomPopup();

        this.setupEventListeners();
        this.loadExistingAnnotations();

        console.log('�� Annotorious successfully initialized');
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

   // Default popup'ı devre dışı bırak
   this.annotorious.disableEditor = true;

   // Var olan event listener'ları override et
   this.annotorious.off('createAnnotation');
   this.annotorious.off('updateAnnotation');
   this.annotorious.off('deleteAnnotation');

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

     // If this deletion is triggered programmatically after successful backend delete, skip backend call
     if (this.deletingIds.has(annotation.id)) {
       this.deletingIds.delete(annotation.id);
       // Ensure local store is clean (it should already be updated by caller)
       this.annotationsMap.delete(annotation.id);
       this.notifyAnnotationChanges();
       return;
     }

     // Attempt backend deletion using databaseId from annotation or metadata map
     const meta = this.annotationsMap.get(annotation.id);
     const databaseId = annotation.databaseId || meta?.databaseId;

     if (!this.imageId || !this.annotationService || !databaseId) {
       console.warn('❌ Cannot delete annotation - missing data (imageId or databaseId)');
       // Still remove locally to reflect UI change
       this.annotationsMap.delete(annotation.id);
       this.notifyAnnotationChanges();
       return;
     }

     // Call backend; on success update local store
     this.annotationService.deleteAnnotation(this.imageId, databaseId).subscribe({
       next: () => {
         console.log('✅ Annotation deleted from backend:', databaseId);
         this.annotationsMap.delete(annotation.id);
         this.notifyAnnotationChanges();
       },
       error: (error) => {
         console.error('❌ Failed to delete annotation:', error);
         // Re-add annotation to viewer to keep UI consistent with backend
         if (this.annotorious?.addAnnotation) {
           this.annotorious.addAnnotation(annotation);
         }
       }
    });
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
    // Önce annotationsMap'ten al
    const metadata = this.annotationsMap.get(annotationId);
    if (!metadata || !metadata.geometry || !this.viewer) return;

    const annotation = metadata.geometry;

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

    // Anotasyonu da seç
    if (this.annotorious) {
      const allAnnotations = this.annotorious.getAnnotations();
      const targetAnnotation = allAnnotations.find((a: any) => a.id === annotationId);
      if (targetAnnotation) {
        this.annotorious.selectAnnotation(targetAnnotation);
      }
    }
  }

  private getAnnotationBounds(annotation: any): any {
    if (!annotation?.target?.selector?.value) return null;

    const svgValue: string = annotation.target.selector.value;

    const toNum = (v: any): number => {
      const n = parseFloat(String(v ?? ''));
      return isFinite(n) ? n : 0;
    };

    // rect
    if (svgValue.includes('<rect')) {
      const x = toNum(svgValue.match(/x="([^"]*)"/)?.[1]);
      const y = toNum(svgValue.match(/y="([^"]*)"/)?.[1]);
      const w = toNum(svgValue.match(/width="([^"]*)"/)?.[1]);
      const h = toNum(svgValue.match(/height="([^"]*)"/)?.[1]);
      if (w > 0 && h > 0) return { x, y, width: w, height: h };
    }

    // circle
    if (svgValue.includes('<circle')) {
      const cx = toNum(svgValue.match(/cx="([^"]*)"/)?.[1]);
      const cy = toNum(svgValue.match(/cy="([^"]*)"/)?.[1]);
      const r = toNum(svgValue.match(/r="([^"]*)"/)?.[1]);
      if (r > 0) return { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r };
    }

    // ellipse
    if (svgValue.includes('<ellipse')) {
      const cx = toNum(svgValue.match(/cx="([^"]*)"/)?.[1]);
      const cy = toNum(svgValue.match(/cy="([^"]*)"/)?.[1]);
      const rx = toNum(svgValue.match(/rx="([^"]*)"/)?.[1]);
      const ry = toNum(svgValue.match(/ry="([^"]*)"/)?.[1]);
      if (rx > 0 && ry > 0) return { x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry };
    }

    // polygon
    if (svgValue.includes('<polygon')) {
      const points = svgValue.match(/points="([^"]*)"/)?.[1];
      if (points) {
        const nums = points.trim().split(/\s+|,/).map(n => parseFloat(n)).filter(n => isFinite(n));
        if (nums.length >= 4) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < nums.length; i += 2) {
            const x = nums[i];
            const y = nums[i + 1];
            if (!isFinite(x) || !isFinite(y)) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          }
        }
      }
    }

    // path (approximate)
    if (svgValue.includes('<path')) {
      const d = svgValue.match(/d="([^"]*)"/i)?.[1];
      if (d) {
        const nums = (d.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(n => parseFloat(n)).filter(n => isFinite(n));
        if (nums.length >= 4) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < nums.length - 1; i += 2) {
            const x = nums[i];
            const y = nums[i + 1];
            if (!isFinite(x) || !isFinite(y)) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          }
        }
      }
    }

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

  // Perform backend delete for a given annotation object, then update UI/map
  private deleteByAnnotation(annotation: any) {
    const meta = this.annotationsMap.get(annotation.id);
    const databaseId = annotation.databaseId || meta?.databaseId;

    if (!this.imageId || !this.annotationService) {
      console.warn('❌ Cannot delete annotation - missing imageId or service');
      // Fallback: remove locally
      if (this.annotorious) this.annotorious.removeAnnotation(annotation);
      this.annotationsMap.delete(annotation.id);
      this.notifyAnnotationChanges();
      return;
    }

    if (!databaseId) {
      // No DB id means nothing to delete on server; remove locally
      if (this.annotorious) this.annotorious.removeAnnotation(annotation);
      this.annotationsMap.delete(annotation.id);
      this.notifyAnnotationChanges();
      return;
    }

    this.annotationService.deleteAnnotation(this.imageId, databaseId).subscribe({
      next: () => {
        // Mark as programmatic deletion to skip backend call in delete event
        this.deletingIds.add(annotation.id);
        // Remove from viewer and map on success
        if (this.annotorious) this.annotorious.removeAnnotation(annotation);
        // Map will be cleaned via delete event guard, but ensure cleanup here too in case event is suppressed
        this.annotationsMap.delete(annotation.id);
        this.notifyAnnotationChanges();
        console.log('✅ Annotation deleted from backend:', databaseId);
      },
      error: (error) => {
        console.error('❌ Failed to delete annotation:', error);
        // Keep annotation visible since backend failed
      }
    });
  }

  private deleteAnnotationFromBackend(annotation: any) {
    // Kept for backward compatibility; prefer inline delete in event handler
    const meta = this.annotationsMap.get(annotation.id);
    const databaseId = annotation.databaseId || meta?.databaseId;
    if (!this.imageId || !this.annotationService || !databaseId) {
      console.warn('❌ Cannot delete annotation - missing data');
      return;
    }

    this.annotationService.deleteAnnotation(this.imageId, databaseId).subscribe({
      next: () => {
        console.log('✅ Annotation deleted from backend:', databaseId);
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
    if (!annotation) return;
    // Use persistent delete to ensure backend is updated
    this.deleteByAnnotation(annotation);
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
      widgets: [], // Widget'ları boş bırak
      formatters: [this.createCustomFormatter()],
      locale: 'auto',
      allowEmpty: false
    });

    // Re-register tools via global UMD
    if (typeof Annotorious?.SelectorPack === 'function') {
      Annotorious.SelectorPack(this.annotorious, { tools: ['point','circle','ellipse','freehand'] });
    }
    if (typeof Annotorious?.BetterPolygon === 'function') {
      Annotorious.BetterPolygon(this.annotorious);
    }

    this.setupCustomPopup();
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

  // Debugging methods for Docker environment
  public debugEnvironment() {
    console.log('🔍 Environment Debug Info:');
    console.log('- OpenSeadragon available:', typeof OpenSeadragon !== 'undefined');
    console.log('- Annotorious available:', typeof OpenSeadragon?.Annotorious !== 'undefined');
    console.log('- Viewer initialized:', !!this.viewer);
    console.log('- Annotorious initialized:', !!this.annotorious);
    console.log('- ImageId:', this.imageId);
    console.log('- Tag vocabulary:', this.tagVocabulary);
    console.log('- Current URL:', window.location.href);
    console.log('- User agent:', navigator.userAgent);
  }

  public logAnnotoriousConfig() {
    if (!this.annotorious) {
      console.log('❌ Annotorious not initialized');
      return;
    }

    console.log('🔧 Annotorious Configuration:');
    console.log('- Drawing enabled:', this.annotorious.getDrawingEnabled?.());
    console.log('- Current tool:', this.annotorious.getDrawingTool?.());
    console.log('- Annotation count:', this.annotorious.getAnnotations?.().length);

    // Check if widgets are properly registered
    try {
      const testAnnotation = {
        id: 'test-' + Date.now(),
        body: [],
        target: { selector: { value: '<rect x="0" y="0" width="100" height="100"/>' } }
      };

      console.log('- Test annotation structure:', testAnnotation);
    } catch (error) {
      console.error('- Error testing annotation structure:', error);
    }
  }
}
