// annotorious-integration.ts
import SelectorPack from '@recogito/annotorious-selector-pack';
import BetterPolygon from '@recogito/annotorious-better-polygon';
import { AnnotationService } from '../../services/annotation.service';

// Global Annotorious (UMD) için
declare const OpenSeadragon: any;

export class AnnotoriousIntegration {
  private annotorious: any;
  private viewer: any;
  private imageId: number | null = null;

  // AnnotationService'i constructor'da alacağız
  private annotationService: AnnotationService | null = null;

  // UI'dan güncelleyebilmek için state
  private tagVocabulary: string[] = ['Nucleus', 'Tumor', 'Necrosis', 'Stroma'];

  // Örnek custom widget: Grade seçici
  private GradeWidget = (args: any) => {
    const grades = ['G1', 'G2', 'G3'];
    const current = args.annotation?.bodies?.find((b: any) => b.purpose === 'grading');

    const select = document.createElement('select');
    select.className = 'a9s-widget a9s-grade';
    select.innerHTML = [
      `<option value="">Grade seçin</option>`,
      ...grades.map(g => `<option ${current?.value===g?'selected':''}>${g}</option>`)
    ].join('');

    select.addEventListener('change', () => {
      const value = select.value || null;
      if (current) {
        args.onUpdateBody(current, { type: 'TextualBody', purpose: 'grading', value });
      } else if (value) {
        args.onAppendBody({ type: 'TextualBody', purpose: 'grading', value });
      }
    });

    const wrap = document.createElement('div');
    wrap.appendChild(select);
    return wrap;
  };

  setImageId(imageId: number) {
    this.imageId = imageId;
  }

  async initAnnotorious(viewer: any, imageId: number, annotationService: AnnotationService) {
    this.viewer = viewer;
    this.imageId = imageId;
    this.annotationService = annotationService;

    // Çizim jestleri ile çatışmasın
    this.viewer.gestureSettingsMouse.clickToZoom = false;
    this.viewer.gestureSettingsMouse.dblClickToZoom = false; // kapalı olsun  :contentReference[oaicite:2]{index=2}

    try {
      if (typeof OpenSeadragon?.Annotorious === 'undefined') {
        console.error('Annotorious is not loaded globally');
        return false;
      }

      this.annotorious = OpenSeadragon.Annotorious(this.viewer, {
        readOnly: false,
        drawingEnabled: true,

        // Çizim hep açık; pan/zoom için Shift'e bas (tersine çevirdik)
        hotkey: { key: 'Shift', inverted: true },
        drawOnSingleClick: true,

        // Popup içeriği
        widgets: [
          'COMMENT',
          { widget: 'TAG', vocabulary: this.tagVocabulary },
          this.GradeWidget
        ],
        locale: 'tr'
      });

      // Ek çizim araçları
      SelectorPack(this.annotorious, { tools: ['point','circle','ellipse','freehand'] });
      BetterPolygon(this.annotorious);

      console.log('Desteklenen araçlar:', this.annotorious.listDrawingTools?.());
      this.setupEventListeners();

      // Mevcut anotasyonları yükle
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
        console.log('📥 Mevcut anotasyonlar yüklendi:', annotations.length);
        const annotoriousFormat = annotations.map(ann => {
          const annotationData = ann.annotation;
          // Database ID'sini annotation objesine ekle
          if (ann.databaseId) {
            annotationData.databaseId = ann.databaseId;
          }
          return annotationData;
        });
        if (this.annotorious?.setAnnotations) {
          this.annotorious.setAnnotations(annotoriousFormat);
        }
      },
      error: (error) => {
        console.error('❌ Anotasyonlar yüklenemedi:', error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.annotorious) return;

    this.annotorious.on('createAnnotation', (annotation: any) => {
      console.log('🆕 Yeni anotasyon oluşturuldu:', annotation);
      this.saveAnnotationToBackend(annotation);
    });

    this.annotorious.on('updateAnnotation', (annotation: any, previous: any) => {
      console.log('🔄 Anotasyon güncellendi:', annotation);
      this.updateAnnotationInBackend(annotation);
    });

    this.annotorious.on('deleteAnnotation', (annotation: any) => {
      console.log('🗑️ Anotasyon silindi:', annotation);
      this.deleteAnnotationFromBackend(annotation);
    });

    this.annotorious.on('selectAnnotation', (a: any) => console.log('select', a));
  }

  private saveAnnotationToBackend(annotation: any) {
    if (!this.imageId || !this.annotationService) {
      console.error('❌ Image ID veya AnnotationService bulunamadı, anotasyon kaydedilemedi');
      return;
    }

    const annotationEntity = {
      creator: 'default_user', // Bu değeri gerçek kullanıcı bilgisine göre değiştirin
      type: 'annotation',
      geometry: JSON.stringify(annotation)
    };

    this.annotationService.saveAnnotation(this.imageId.toString(), annotationEntity).subscribe({
      next: (result) => {
        console.log('✅ Anotasyon backend\'e kaydedildi:', result);
        // Annotation'a database ID'sini ekle
        if (result.id && annotation.id !== result.id) {
          annotation.databaseId = result.id;
        }
      },
      error: (error) => {
        console.error('❌ Anotasyon backend\'e kaydedilemedi:', error);
        // Hata durumunda anotasyonu frontend'den de kaldır
        if (this.annotorious?.removeAnnotation) {
          this.annotorious.removeAnnotation(annotation);
        }
      }
    });
  }

  private updateAnnotationInBackend(annotation: any) {
    if (!this.imageId || !this.annotationService || !annotation.databaseId) {
      console.warn('❌ Update için gerekli bilgiler eksik:', {
        imageId: this.imageId,
        hasAnnotationService: !!this.annotationService,
        databaseId: annotation.databaseId
      });
      return;
    }

    const annotationEntity = {
      creator: 'default_user',
      type: 'annotation',
      geometry: JSON.stringify(annotation)
    };

    this.annotationService.updateAnnotation(this.imageId, annotation.databaseId, annotationEntity).subscribe({
      next: (result) => {
        console.log('✅ Anotasyon güncellendi:', result);
      },
      error: (error) => {
        console.error('❌ Anotasyon güncellenemedi:', error);
      }
    });
  }

  private deleteAnnotationFromBackend(annotation: any) {
    if (!this.imageId || !this.annotationService || !annotation.databaseId) {
      console.warn('❌ Delete için gerekli bilgiler eksik:', {
        imageId: this.imageId,
        hasAnnotationService: !!this.annotationService,
        databaseId: annotation.databaseId
      });
      return;
    }

    // DELETE API call'u yap
    this.annotationService.deleteAnnotation(this.imageId, annotation.databaseId).subscribe({
      next: () => {
        console.log('✅ Anotasyon backend\'den silindi:', annotation.databaseId);
      },
      error: (error) => {
        console.error('❌ Anotasyon backend\'den silinemedi:', error);
        // Hata durumunda anotasyonu tekrar ekle
        if (this.annotorious?.addAnnotation) {
          this.annotorious.addAnnotation(annotation);
        }
      }
    });
  }

  // Toolbar’dan çağrılıyor (mevcutta kullanıyorsun)
  setTool(toolId: string | null) {
    if (!this.annotorious) return;
    if (toolId === null) {
      this.annotorious.setDrawingTool(null);
      return;
    }
    this.annotorious.setDrawingTool(toolId);
  }

  // --- Ayarlar için public API ---
  setTagVocabulary(vocab: string[]) {
    this.tagVocabulary = vocab;
    this.reinitPreservingAnnotations(); // değişiklikleri uygulamak için yeniden yarat
  }

  // Re-init (anotasyonları koruyarak)
  private reinitPreservingAnnotations() {
    if (!this.viewer) return;
    const existing = (this.annotorious?.getAnnotations?.() || []).slice();
    this.annotorious?.destroy?.();

    this.annotorious = OpenSeadragon.Annotorious(this.viewer, {
      readOnly: false,
      drawingEnabled: true,
      hotkey: { key: 'Shift', inverted: true },
      drawOnSingleClick: true,
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

  exportAnnotations() { return this.annotorious ? this.annotorious.getAnnotations() : []; }
  loadAnnotations(annotations: any[]) { if (this.annotorious?.setAnnotations) this.annotorious.setAnnotations(annotations); }
  clearAnnotations() { if (this.annotorious?.setAnnotations) this.annotorious.setAnnotations([]); }
  getAnnotationCount(): number { return this.annotorious ? this.annotorious.getAnnotations().length : 0; }
  destroy() { if (this.annotorious?.destroy) this.annotorious.destroy(); }
}
