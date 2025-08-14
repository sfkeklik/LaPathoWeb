// annotorious-integration.ts
import SelectorPack from '@recogito/annotorious-selector-pack';
import BetterPolygon from '@recogito/annotorious-better-polygon';

// Global Annotorious (UMD) için
declare const OpenSeadragon: any;

export class AnnotoriousIntegration {
  private annotorious: any;
  private viewer: any;

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

  async initAnnotorious(viewer: any) {
    this.viewer = viewer;

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
      console.log('✅ Annotorious successfully initialized');
      return true;
    } catch (e) {
      console.error('Annotorious init error:', e);
      return false;
    }
  }

  private setupEventListeners() {
    if (!this.annotorious) return;
    this.annotorious.on('createAnnotation', (a: any) => console.log('create', a));
    this.annotorious.on('updateAnnotation', (a: any) => console.log('update', a));
    this.annotorious.on('selectAnnotation', (a: any) => console.log('select', a));
    this.annotorious.on('deleteAnnotation', (a: any) => console.log('delete', a));
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
