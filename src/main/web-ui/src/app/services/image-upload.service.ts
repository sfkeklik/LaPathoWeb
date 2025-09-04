import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ImageDTO } from './image.service';
import { ImagesApi } from '../app-const/api-gateway';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  result?: ImageDTO;
  error?: any;
}

@Injectable({providedIn:'root'})
export class ImageUploadService {
  constructor(private http: HttpClient) {}

  upload(file: File): Observable<ImageDTO> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ImageDTO>(
      `${ImagesApi.uploadImage}`, fd
    );
  }

  uploadWithProgress(file: File): Observable<UploadProgress> {
    const fd = new FormData();
    fd.append('file', file);

    const req = new HttpRequest('POST', `${ImagesApi.uploadImage}`, fd, {
      reportProgress: true
    });

    return this.http.request<ImageDTO>(req).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            return {
              progress,
              status: 'uploading' as const
            };

          case HttpEventType.Response:
            return {
              progress: 100,
              status: 'completed' as const,
              result: event.body as ImageDTO
            };

          default:
            return {
              progress: 0,
              status: 'uploading' as const
            };
        }
      })
    );
  }

  getStatus(id: number): Observable<string> {
    return this.http.get<string>(`${ImagesApi.getImageStatus}${id}`);
  }
}
