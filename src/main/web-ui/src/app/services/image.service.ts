import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ImagesApi } from '../app-const/api-gateway';

/**
 * Sunucuya POST ile yollayacağımız veri
 */
export interface CreateImageDTO {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  maxLevel: number;
  path: string;
}

/**
 * Sunucudan yanıt olarak dönen tüm alanlar
 */
export interface ImageDTO {
  id: number;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  maxLevel: number;
  path: string;
  status?: 'PENDING'|'PROCESSING'|'READY'|'ERROR';
  created?: string;
  updated?: string;
}

/**
 * Enhanced metadata interface matching the backend ImageMetadataDTO
 */
export interface ImageMetadata {
  // ID
  id: number;
  name: string;

  // Basic image properties
  width: number;
  height: number;
  tileSize: number;
  maxLevel: number;

  // File information
  fileName?: string;
  fileSize?: number;
  format?: string;
  path?: string;

  // Technical details
  pixelSizeX?: number;
  pixelSizeY?: number;
  bitDepth?: number;
  channels?: number;
  colorSpace?: string;
  compression?: string;

  // Microscopy-specific metadata
  magnification?: number;
  objective?: string;
  scanner?: string;
  scanDate?: string;

  // Timestamps and status
  created?: string;
  updated?: string;
  status?: string;

  // Calculated properties
  totalArea?: number; // in square pixels
  physicalWidth?: number; // in micrometers
  physicalHeight?: number; // in micrometers
}

export type LabelingStatus = 'IN_PROGRESS' | 'COMPLETED' | null;

export interface ImageOverview {
  id: number;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  previewUrl?: string;
  created?: string;
  updated?: string;
  labelingStatus?: LabelingStatus;
}

export interface LabelingStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}


@Injectable({
  providedIn: 'root'
})
export class ImageService {


  constructor(private http: HttpClient) {}

  /**
   * Yeni bir Image kaydı oluşturur.
   * Sunucudan dönen ImageDTO içinde id, path, maxLevel vb. gelir.
   */
  createImage(dto: CreateImageDTO): Observable<ImageDTO> {
    return this.http.post<ImageDTO>(ImagesApi.uploadImage, dto);
  }

  /**
   * Var olan imageId için metadata bilgisini çeker.
   */
  getImageMetadata(imageId: number): Observable<ImageMetadata> {
    return this.http.get<ImageMetadata>(
      `${ImagesApi.getImageMetadata}${imageId}`
    );
  }

  getImages(): Observable<ImageOverview[]> {
    return this.http.get<ImageOverview[]>(`${ImagesApi.getImagesList}`);
  }

  /**
   * Image'ı ID ile getirir
   */
  getImageById(imageId: number): Observable<ImageDTO> {
    return this.http.get<ImageDTO>(`${ImagesApi.getImageById}${imageId}`);
  }

  /**
   * Image günceller
   */
  updateImage(imageId: number, imageData: Partial<ImageDTO>): Observable<ImageDTO> {
    return this.http.put<ImageDTO>(`${ImagesApi.updateImage}${imageId}`, imageData);
  }

  /**
   * Image siler
   */
  deleteImage(imageId: number): Observable<void> {
    return this.http.delete<void>(`${ImagesApi.deleteImage}${imageId}`);
  }

  /**
   * Tüm görüntüleri metadata ile birlikte getirir
   */
  getAllImages(): Observable<ImageMetadata[]> {
    return this.http.get<ImageMetadata[]>('/api/images');
  }

  /**
   * Belirli bir görüntü için kullanıcının etiketleme durumunu günceller
   */
  updateLabelingStatus(imageId: number, status: LabelingStatus): Observable<any> {
    return this.http.patch(`/api/images/${imageId}/labeling-status`, { status });
  }

  /**
   * Belirli bir görüntü için kullanıcının etiketleme durumunu getirir
   */
  getLabelingStatus(imageId: number): Observable<{ imageId: number; userId: number; status: LabelingStatus }> {
    return this.http.get<{ imageId: number; userId: number; status: LabelingStatus }>(`/api/images/${imageId}/labeling-status`);
  }

  /**
   * Kullanıcının etiketleme istatistiklerini getirir
   */
  getLabelingStats(): Observable<LabelingStats> {
    return this.http.get<LabelingStats>('/api/images/labeling-stats');
  }
}
