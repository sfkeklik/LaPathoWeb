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
 * Sadece metadata için kullandığımız tip
 */
export interface ImageMetadata {
  width: number;
  height: number;
  tileSize: number;
  maxLevel: number;
}

export interface ImageOverview {
  id: number;
    name: string;
    status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
    previewUrl?: string;
    created?: string;
    updated?: string;
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
}
