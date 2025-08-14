import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageDTO } from './image.service';
import { ImagesApi } from '../app-const/api-gateway';

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

  getStatus(id: number): Observable<string> {
    return this.http.get<string>(`${ImagesApi.getImageStatus}${id}`);
  }
}
