import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AnnotationApi, ImagesApi } from '../app-const/api-gateway';

export interface AnnotationEntity {
  id?: number;
  creator?: string;
  type?: string;
  geometry?: string;
  created?: string;
  updated?: string;
  image?: any;
}

export interface AnnotationCreateRequest {
  imageId: number;
  annotation: AnnotationEntity;
}

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {

  constructor(private http: HttpClient) {}

  getAnnotations(imageId: string): Observable<any[]> {
    console.log('📥 Backend\'den annotations yükleniyor, imageId:', imageId);
    return this.http.get<any[]>(`${AnnotationApi.getAnnotations}${imageId}`).pipe(
      tap(annotations => {
        console.log('📥 Yüklenen annotations sayısı:', annotations.length);
        annotations.forEach((ann, index) => {
          console.log(`📄 Annotation ${index + 1}:`, {
            databaseId: ann.databaseId,
            hasGeometry: !!ann.annotation,
            geometryLength: ann.annotation ? JSON.stringify(ann.annotation).length : 0
          });
        });
      }),
      catchError(error => {
        console.error('❌ Annotations yükleme hatası:', error);
        return throwError(() => error);
      })
    );
  }

  saveAnnotation(imageId: string, annotation: any): Observable<any> {
    // Geometry validation
    if (!annotation.geometry) {
      console.error('❌ Geometry eksik!', annotation);
      return throwError(() => new Error('Geometry is required'));
    }

    // Try to parse geometry to validate JSON format
    try {
      const parsed = JSON.parse(annotation.geometry);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid geometry format');
      }
      console.log('✅ Geometry validation başarılı:', {
        geometryLength: annotation.geometry.length,
        hasShapes: !!parsed.shapes,
        hasTarget: !!parsed.target
      });
    } catch (error) {
      console.error('❌ Geometry JSON parse hatası:', error);
      return throwError(() => new Error('Invalid geometry JSON format'));
    }

    console.log('💾 Backend\'e annotation kaydediliyor:', {
      imageId,
      geometryLength: annotation.geometry?.length,
      creator: annotation.creator,
      type: annotation.type
    });

    return this.http.post(`${AnnotationApi.saveAnnotation}${imageId}`, annotation).pipe(
      tap(response => {
        console.log('✅ Annotation başarıyla kaydedildi:', response);
      }),
      catchError(error => {
        console.error('❌ Annotation kaydetme hatası:', error);
        console.error('❌ Gönderilen data:', annotation);
        return throwError(() => error);
      })
    );
  }

  getImageMetadata(imageId: string): Observable<{ width: number; height: number; tileSize: number; maxLevel: number }> {
    return this.http.get<{ width: number; height: number; tileSize: number; maxLevel: number }>(`${ImagesApi.getImageMetadata}${imageId}`);
  }

  /** Annotation güncelleme (image-scoped) */
  updateAnnotation(imageId: number, annotationId: number, annotation: any): Observable<any> {
    // Geometry validation for updates too
    if (!annotation.geometry) {
      console.error('❌ Update için geometry eksik!', annotation);
      return throwError(() => new Error('Geometry is required for update'));
    }

    console.log('🔄 Annotation güncelleniyor:', {
      imageId,
      annotationId,
      geometryLength: annotation.geometry?.length
    });

    return this.http.put<any>(
      `${AnnotationApi.updateAnnotation}${imageId}/${annotationId}`,
      annotation
    ).pipe(
      tap(response => {
        console.log('✅ Annotation başarıyla güncellendi:', response);
      }),
      catchError(error => {
        console.error('❌ Annotation güncelleme hatası:', error);
        return throwError(() => error);
      })
    );
  }

  /** Annotation silme (image-scoped) */
  deleteAnnotation(imageId: number, annotationId: number): Observable<void> {
    console.log('🗑️ Annotation siliniyor:', { imageId, annotationId });

    return this.http.delete<void>(
      `${AnnotationApi.deleteAnnotation}${imageId}/${annotationId}`
    ).pipe(
      tap(() => {
        console.log('✅ Annotation başarıyla silindi');
      }),
      catchError(error => {
        console.error('❌ Annotation silme hatası:', error);
        return throwError(() => error);
      })
    );
  }

  // Standalone annotation operations
  /** Tüm annotationları getir */
  getAllAnnotations(): Observable<AnnotationEntity[]> {
    return this.http.get<AnnotationEntity[]>(AnnotationApi.getAllAnnotations);
  }

  /** ID ile annotation getir */
  getAnnotationById(annotationId: number): Observable<AnnotationEntity> {
    return this.http.get<AnnotationEntity>(`${AnnotationApi.getAnnotationById}${annotationId}`);
  }

  /** Yeni annotation oluştur (standalone) */
  createAnnotationStandalone(request: AnnotationCreateRequest): Observable<AnnotationEntity> {
    return this.http.post<AnnotationEntity>(AnnotationApi.createAnnotationStandalone, request);
  }

  /** Annotation güncelle (standalone) */
  updateAnnotationStandalone(annotationId: number, annotation: AnnotationEntity): Observable<AnnotationEntity> {
    return this.http.put<AnnotationEntity>(`${AnnotationApi.updateAnnotationStandalone}${annotationId}`, annotation);
  }

  /** Annotation sil (standalone) */
  deleteAnnotationStandalone(annotationId: number): Observable<void> {
    return this.http.delete<void>(`${AnnotationApi.deleteAnnotationStandalone}${annotationId}`);
  }

  /** Image'a ait tüm annotationları sil */
  deleteAnnotationsByImage(imageId: number): Observable<void> {
    return this.http.delete<void>(`${AnnotationApi.getAnnotations}${imageId}`);
  }

  // Helper method to validate annotation data
  validateAnnotationData(annotation: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!annotation.geometry) {
      errors.push('Geometry is required');
    } else {
      try {
        const parsed = JSON.parse(annotation.geometry);
        if (!parsed || typeof parsed !== 'object') {
          errors.push('Geometry must be a valid JSON object');
        }
        // Add more specific geometry validation based on your annotation format
        if (!parsed.shapes && !parsed.target) {
          errors.push('Geometry must contain shapes or target information');
        }
      } catch (e) {
        errors.push('Geometry must be valid JSON');
      }
    }

    if (!annotation.creator) {
      errors.push('Creator is required');
    }

    if (!annotation.type) {
      errors.push('Type is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
