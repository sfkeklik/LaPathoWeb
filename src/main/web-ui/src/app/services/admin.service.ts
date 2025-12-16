import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, RegisterRequest } from './auth.service';

export interface Project {
  id: number;
  name: string;
  description: string;
  assignedDoctorIds: number[];
  assignedDoctorNames: string[];
  imageIds: number[];
  imageCount: number;
  doctorCount: number;
  active: boolean;
  createdAt: string;
  createdByName: string;
}

export interface Label {
  id: number;
  projectId: number;
  name: string;
  color: string;
  description?: string;
}

export interface CreateLabelRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  doctorIds?: number[];
  imageIds?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly API_URL = '/api/admin';
  private readonly PROJECT_URL = '/api/projects';

  constructor(private http: HttpClient) {}

  // User Management
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/users`);
  }

  getAllDoctors(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/doctors`);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/users/${id}`);
  }

  createUser(user: RegisterRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/users`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/users/${id}`);
  }

  updateUserStatus(id: number, enabled: boolean): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/users/${id}/status?enabled=${enabled}`, {});
  }

  // Project Management
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.PROJECT_URL);
  }

  getProject(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.PROJECT_URL}/${id}`);
  }

  createProject(project: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.PROJECT_URL, project);
  }

  updateProject(id: number, project: CreateProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${this.PROJECT_URL}/${id}`, project);
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.PROJECT_URL}/${id}`);
  }

  addDoctorToProject(projectId: number, doctorId: number): Observable<Project> {
    return this.http.post<Project>(`${this.PROJECT_URL}/${projectId}/doctors/${doctorId}`, {});
  }

  removeDoctorFromProject(projectId: number, doctorId: number): Observable<Project> {
    return this.http.delete<Project>(`${this.PROJECT_URL}/${projectId}/doctors/${doctorId}`);
  }

  addImageToProject(projectId: number, imageId: number): Observable<Project> {
    return this.http.post<Project>(`${this.PROJECT_URL}/${projectId}/images/${imageId}`, {});
  }

  removeImageFromProject(projectId: number, imageId: number): Observable<Project> {
    return this.http.delete<Project>(`${this.PROJECT_URL}/${projectId}/images/${imageId}`);
  }

  // Label Management
  getLabelsForProject(projectId: number): Observable<Label[]> {
    return this.http.get<Label[]>(`${this.PROJECT_URL}/${projectId}/labels`);
  }

  createLabel(projectId: number, label: CreateLabelRequest): Observable<Label> {
    return this.http.post<Label>(`${this.PROJECT_URL}/${projectId}/labels`, label);
  }

  updateLabel(projectId: number, labelId: number, label: CreateLabelRequest): Observable<Label> {
    return this.http.put<Label>(`${this.PROJECT_URL}/${projectId}/labels/${labelId}`, label);
  }

  deleteLabel(projectId: number, labelId: number): Observable<void> {
    return this.http.delete<void>(`${this.PROJECT_URL}/${projectId}/labels/${labelId}`);
  }

  createDefaultLabels(projectId: number): Observable<Label[]> {
    return this.http.post<Label[]>(`${this.PROJECT_URL}/${projectId}/labels/defaults`, {});
  }

  // Get projects containing a specific image
  getProjectsByImage(imageId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.PROJECT_URL}/by-image/${imageId}`);
  }
}

