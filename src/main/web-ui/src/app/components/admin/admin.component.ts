import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService, Project, CreateProjectRequest, Label, CreateLabelRequest } from '../../services/admin.service';
import { AuthService, User, RegisterRequest } from '../../services/auth.service';
import { ImageService, ImageMetadata } from '../../services/image.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, LanguageSwitcherComponent],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <div class="header-left">
          <h1>🦷 {{ 'admin.title' | translate }}</h1>
          <span class="subtitle">{{ 'admin.subtitle' | translate }}</span>
        </div>
        <div class="header-right">
          <app-language-switcher></app-language-switcher>
          <a routerLink="/" class="btn-home">
            <i class="fas fa-home"></i> {{ 'admin.home' | translate }}
          </a>
          <span class="user-info">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
          <button class="btn-logout" (click)="logout()">{{ 'auth.logout' | translate }}</button>
        </div>
      </header>

      <nav class="admin-nav">
        <button
          [class.active]="activeTab === 'users'"
          (click)="activeTab = 'users'">
          👥 {{ 'admin.users' | translate }}
        </button>
        <button
          [class.active]="activeTab === 'projects'"
          (click)="activeTab = 'projects'">
          📁 {{ 'admin.projects' | translate }}
        </button>
        <button
          [class.active]="activeTab === 'images'"
          (click)="activeTab = 'images'">
          🖼️ {{ 'admin.images' | translate }}
        </button>
      </nav>

      <main class="admin-content">
        <!-- Users Tab -->
        <div *ngIf="activeTab === 'users'" class="tab-content">
          <div class="tab-header">
            <h2>{{ 'admin.userManagement' | translate }}</h2>
            <button class="btn-primary" (click)="showCreateUserModal = true">{{ 'admin.addUser' | translate }}</button>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>{{ 'auth.username' | translate }}</th>
                <th>{{ 'common.name' | translate }}</th>
                <th>{{ 'auth.email' | translate }}</th>
                <th>{{ 'admin.role' | translate }}</th>
                <th>{{ 'common.status' | translate }}</th>
                <th>{{ 'common.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users">
                <td>{{ user.username }}</td>
                <td>{{ user.firstName }} {{ user.lastName }}</td>
                <td>{{ user.email }}</td>
                <td><span class="badge" [class.admin]="user.role === 'ADMIN'">{{ user.role === 'ADMIN' ? 'Admin' : ('admin.doctor' | translate) }}</span></td>
                <td>
                  <span class="status" [class.active]="user.enabled">
                    {{ user.enabled ? ('admin.enabled' | translate) : ('admin.disabled' | translate) }}
                  </span>
                </td>
                <td>
                  <button class="btn-small" (click)="toggleUserStatus(user)" [disabled]="user.role === 'ADMIN'">
                    {{ user.enabled ? ('admin.disable' | translate) : ('admin.enable' | translate) }}
                  </button>
                  <button class="btn-small btn-danger" (click)="deleteUser(user)" [disabled]="user.role === 'ADMIN'">
                    {{ 'common.delete' | translate }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Projects Tab -->
        <div *ngIf="activeTab === 'projects'" class="tab-content">
          <div class="tab-header">
            <h2>{{ 'admin.projectManagement' | translate }}</h2>
            <button class="btn-primary" (click)="showCreateProjectModal = true">{{ 'admin.addProject' | translate }}</button>
          </div>

          <div class="projects-grid">
            <div class="project-card" *ngFor="let project of projects">
              <!-- Project Thumbnail -->
              <div class="project-thumbnail">
                <img
                  *ngIf="project.imageIds && project.imageIds.length > 0"
                  [src]="getProjectThumbnail(project)"
                  [alt]="project.name"
                  (error)="onProjectThumbnailError($event)"
                  class="thumbnail-img">
                <div *ngIf="!project.imageIds || project.imageIds.length === 0" class="no-thumbnail">
                  <i class="fas fa-folder-open"></i>
                  <span>{{ 'admin.noImagesAvailable' | translate }}</span>
                </div>
              </div>

              <div class="project-content">
                <div class="project-header">
                  <h3>{{ project.name }}</h3>
                  <span class="project-status" [class.active]="project.active">
                    {{ project.active ? ('common.active' | translate) : ('common.inactive' | translate) }}
                  </span>
                </div>
                <p class="project-desc">{{ project.description || ('admin.noDescription' | translate) }}</p>
                <div class="project-stats">
                  <span>👨‍⚕️ {{ project.doctorCount }} {{ 'admin.doctorCount' | translate }}</span>
                  <span>🖼️ {{ project.imageCount }} {{ 'admin.imageCount' | translate }}</span>
                </div>
                <div class="project-doctors" *ngIf="project.assignedDoctorNames?.length">
                  <strong>{{ 'admin.assigned' | translate }}:</strong> {{ project.assignedDoctorNames.join(', ') }}
                </div>
                <div class="project-actions">
                  <button class="btn-small" (click)="editProject(project)">{{ 'common.edit' | translate }}</button>
                  <button class="btn-small btn-labels" (click)="openLabelsModal(project)">🏷️ {{ 'admin.labels' | translate }}</button>
                  <button class="btn-small btn-danger" (click)="deleteProject(project)">{{ 'common.delete' | translate }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Images Tab -->
        <div *ngIf="activeTab === 'images'" class="tab-content">
          <div class="tab-header">
            <h2>{{ 'admin.imageManagement' | translate }}</h2>
            <a routerLink="/" class="btn-primary">{{ 'admin.goToImageViewer' | translate }}</a>
          </div>

          <div class="image-assignment-section">
            <div class="form-group">
              <label>{{ 'admin.selectProjectToAssign' | translate }}</label>
              <select [(ngModel)]="selectedProjectForImages" (change)="loadProjectImages()">
                <option [ngValue]="null">{{ 'admin.selectAProject' | translate }}</option>
                <option *ngFor="let project of projects" [ngValue]="project">{{ project.name }}</option>
              </select>
            </div>

            <div *ngIf="selectedProjectForImages" class="images-grid">
              <div *ngIf="allImages.length === 0" class="no-images">
                <p>{{ 'admin.noImagesAvailableLong' | translate }}</p>
              </div>
              <div class="image-card" *ngFor="let image of allImages"
                   [class.assigned]="isImageAssignedToProject(image.id)">
                <div class="image-preview">
                  <img
                    *ngIf="image.status === 'READY'"
                    [src]="getImageThumbnail(image.id)"
                    [alt]="image.name"
                    (error)="onThumbnailError($event)"
                    class="thumbnail-img">
                  <span *ngIf="image.status !== 'READY'" class="placeholder-icon">
                    {{ image.status === 'PROCESSING' ? '⏳' : image.status === 'ERROR' ? '❌' : '🖼️' }}
                  </span>
                </div>
                <div class="image-info">
                  <strong>{{ image.name || image.fileName || 'Unnamed' }}</strong>
                  <span class="image-size">{{ image.width }}x{{ image.height }}</span>
                  <span class="image-status" [class]="image.status?.toLowerCase()">{{ image.status }}</span>
                </div>
                <div class="image-actions">
                  <button
                    class="btn-small"
                    [class.btn-danger]="isImageAssignedToProject(image.id)"
                    (click)="toggleImageAssignment(image)">
                    {{ isImageAssignedToProject(image.id) ? ('common.remove' | translate) : ('common.assign' | translate) }}
                  </button>
                </div>
              </div>
            </div>

            <p *ngIf="!selectedProjectForImages" class="info-text">
              {{ 'admin.noProjectSelected' | translate }}
            </p>
          </div>
        </div>
      </main>

      <!-- Create User Modal -->
      <div class="modal-overlay" *ngIf="showCreateUserModal" (click)="showCreateUserModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ 'admin.createNewUser' | translate }}</h2>
          <form (ngSubmit)="createUser()">
            <div class="form-row">
              <div class="form-group">
                <label>{{ 'auth.firstName' | translate }}</label>
                <input type="text" [(ngModel)]="newUser.firstName" name="firstName" required />
              </div>
              <div class="form-group">
                <label>{{ 'auth.lastName' | translate }}</label>
                <input type="text" [(ngModel)]="newUser.lastName" name="lastName" required />
              </div>
            </div>
            <div class="form-group">
              <label>{{ 'auth.email' | translate }}</label>
              <input type="email" [(ngModel)]="newUser.email" name="email" required />
            </div>
            <div class="form-group">
              <label>{{ 'auth.username' | translate }}</label>
              <input type="text" [(ngModel)]="newUser.username" name="username" required />
            </div>
            <div class="form-group">
              <label>{{ 'auth.password' | translate }}</label>
              <input type="password" [(ngModel)]="newUser.password" name="password" required />
            </div>
            <div class="form-group">
              <label>{{ 'admin.role' | translate }}</label>
              <select [(ngModel)]="newUser.role" name="role">
                <option value="DOCTOR">{{ 'admin.doctor' | translate }}</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="showCreateUserModal = false">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn-primary">{{ 'admin.createUser' | translate }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Create Project Modal -->
      <div class="modal-overlay" *ngIf="showCreateProjectModal" (click)="showCreateProjectModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ editingProject ? ('admin.editProject' | translate) : ('admin.createNewProject' | translate) }}</h2>
          <form (ngSubmit)="saveProject()">
            <div class="form-group">
              <label>{{ 'admin.projectName' | translate }}</label>
              <input type="text" [(ngModel)]="newProject.name" name="name" required />
            </div>
            <div class="form-group">
              <label>{{ 'common.description' | translate }}</label>
              <textarea [(ngModel)]="newProject.description" name="description" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>{{ 'admin.assignDoctors' | translate }}</label>
              <div class="checkbox-list">
                <label *ngFor="let doctor of doctors" class="checkbox-item">
                  <input
                    type="checkbox"
                    [checked]="newProject.doctorIds?.includes(doctor.id)"
                    (change)="toggleDoctor(doctor.id, $event)"
                  />
                  {{ doctor.firstName }} {{ doctor.lastName }}
                </label>
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeProjectModal()">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn-primary">{{ editingProject ? ('common.update' | translate) : ('common.create' | translate) }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Labels Modal -->
      <div class="modal-overlay" *ngIf="showLabelsModal" (click)="showLabelsModal = false">
        <div class="modal modal-large" (click)="$event.stopPropagation()">
          <h2>🏷️ {{ 'admin.manageLabels' | translate }} - {{ selectedProjectForLabels?.name }}</h2>

          <div class="labels-section">
            <div class="labels-list">
              <div class="label-item" *ngFor="let label of projectLabels">
                <div class="label-color" [style.background-color]="label.color"></div>
                <div class="label-info">
                  <strong>{{ label.name }}</strong>
                  <span *ngIf="label.description">{{ label.description }}</span>
                </div>
                <div class="label-actions">
                  <button class="btn-small" (click)="editLabel(label)">{{ 'common.edit' | translate }}</button>
                  <button class="btn-small btn-danger" (click)="deleteLabel(label)">{{ 'common.delete' | translate }}</button>
                </div>
              </div>

              <div *ngIf="projectLabels.length === 0" class="no-labels">
                <p>{{ 'admin.noLabels' | translate }}</p>
                <button class="btn-primary" (click)="createDefaultLabels()">{{ 'admin.createDefaultLabels' | translate }}</button>
              </div>
            </div>

            <div class="add-label-form">
              <h4>{{ editingLabel ? ('admin.editLabel' | translate) : ('admin.addNewLabel' | translate) }}</h4>
              <form (ngSubmit)="saveLabel()">
                <div class="form-group">
                  <label>{{ 'admin.labelName' | translate }}</label>
                  <input type="text" [(ngModel)]="newLabel.name" name="labelName" required />
                </div>
                <div class="form-group">
                  <label>{{ 'annotator.color' | translate }}</label>
                  <input type="color" [(ngModel)]="newLabel.color" name="labelColor" />
                </div>
                <div class="form-group">
                  <label>{{ 'common.description' | translate }} ({{ 'common.optional' | translate }})</label>
                  <input type="text" [(ngModel)]="newLabel.description" name="labelDescription" />
                </div>
                <div class="form-actions">
                  <button type="button" class="btn-secondary" *ngIf="editingLabel" (click)="cancelEditLabel()">{{ 'common.cancel' | translate }}</button>
                  <button type="submit" class="btn-primary">{{ editingLabel ? ('common.update' | translate) : ('admin.addLabel' | translate) }}</button>
                </div>
              </form>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="showLabelsModal = false">{{ 'common.close' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      min-height: 100vh;
      background: #f5f7fa;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .admin-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-left h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .header-left .subtitle {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      padding-left: 16px;
      border-left: 1px solid rgba(255, 255, 255, 0.3);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-info {
      color: white;
      font-size: 14px;
    }

    .btn-home {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-home:hover {
      background: rgba(255,255,255,0.3);
    }

    .btn-logout {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.8);
    }

    .admin-nav {
      background: white;
      padding: 0 24px;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #e1e1e1;
    }

    .admin-nav button {
      background: none;
      border: none;
      padding: 16px 24px;
      cursor: pointer;
      font-size: 1rem;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .admin-nav button.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .admin-nav button:hover:not(.active) {
      color: #764ba2;
      background: #f8f9fa;
    }

    .admin-content {
      padding: 24px;
    }

    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .tab-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1F2937;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #e1e1e1;
      color: #333;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .btn-secondary:hover {
      background: #d1d1d1;
    }

    .data-table {
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .data-table th, .data-table td {
      padding: 12px 16px;
      text-align: left;
    }

    .data-table th {
      background: #f8f9fa;
      font-weight: 600;
    }

    .data-table tr:not(:last-child) td {
      border-bottom: 1px solid #eee;
    }

    .badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85rem;
    }

    .badge.admin {
      background: #fce4ec;
      color: #c2185b;
    }

    .status {
      color: #d32f2f;
    }

    .status.active {
      color: #388e3c;
    }

    .btn-small {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      background: #e3f2fd;
      color: #1976d2;
      margin-right: 8px;
    }

    .btn-small.btn-danger {
      background: #ffebee;
      color: #d32f2f;
    }

    .btn-small:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .project-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .project-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .project-thumbnail {
      width: 100%;
      height: 140px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .project-thumbnail .thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .project-thumbnail .no-thumbnail {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #9CA3AF;
    }

    .project-thumbnail .no-thumbnail i {
      font-size: 32px;
    }

    .project-thumbnail .no-thumbnail span {
      font-size: 0.75rem;
      text-align: center;
      max-width: 80%;
    }

    .project-content {
      padding: 16px;
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .project-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1F2937;
    }

    .project-status {
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 4px;
      background: #ffebee;
      color: #d32f2f;
    }

    .project-status.active {
      background: #e8f5e9;
      color: #388e3c;
    }

    .project-desc {
      color: #6B7280;
      font-size: 0.875rem;
      margin-bottom: 12px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .project-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      color: #6B7280;
      font-size: 0.875rem;
    }

    .project-doctors {
      font-size: 0.8rem;
      color: #6B7280;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .project-actions {
      display: flex;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #E5E7EB;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal h2 {
      margin-top: 0;
      margin-bottom: 20px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row .form-group {
      flex: 1;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
    }

    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .checkbox-list {
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }

    .modal-large {
      max-width: 700px;
    }

    .btn-small.btn-labels {
      background: #fff3e0;
      color: #e65100;
    }

    /* Image Assignment Styles */
    .image-assignment-section {
      margin-top: 16px;
    }

    .images-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .image-card {
      background: white;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .image-card.assigned {
      border-color: #4caf50;
      background: #e8f5e9;
    }

    .image-preview {
      text-align: center;
      background: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 8px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .thumbnail-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }

    .placeholder-icon {
      font-size: 2.5rem;
      opacity: 0.6;
    }

    .image-info {
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;
      gap: 2px;
    }

    .image-info strong {
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .image-size {
      font-size: 0.8rem;
      color: #666;
    }

    .image-status {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      width: fit-content;
    }

    .image-status.ready {
      background: #e8f5e9;
      color: #388e3c;
    }

    .image-status.processing {
      background: #fff3e0;
      color: #f57c00;
    }

    .image-status.pending {
      background: #e3f2fd;
      color: #1976d2;
    }

    .image-status.error {
      background: #ffebee;
      color: #d32f2f;
    }

    .image-actions {
      text-align: center;
    }

    .info-text {
      color: #666;
      text-align: center;
      padding: 40px;
    }

    .no-images {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: #666;
      background: #f9f9f9;
      border-radius: 8px;
    }

    /* Labels Styles */
    .labels-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .labels-list {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
    }

    .label-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }

    .label-item:last-child {
      border-bottom: none;
    }

    .label-color {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    .label-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .label-info span {
      font-size: 0.85rem;
      color: #666;
    }

    .label-actions {
      display: flex;
      gap: 4px;
    }

    .label-actions .btn-small {
      margin-right: 0;
      padding: 4px 8px;
      font-size: 0.75rem;
    }

    .no-labels {
      text-align: center;
      padding: 24px;
      color: #666;
    }

    .add-label-form {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 16px;
    }

    .add-label-form h4 {
      margin-top: 0;
      margin-bottom: 16px;
    }

    .add-label-form input[type="color"] {
      width: 100%;
      height: 40px;
      padding: 4px;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  `]
})
export class AdminComponent implements OnInit {
  activeTab = 'users';
  users: User[] = [];
  doctors: User[] = [];
  projects: Project[] = [];
  currentUser: any;

  showCreateUserModal = false;
  showCreateProjectModal = false;
  editingProject: Project | null = null;

  // Image assignment properties
  allImages: ImageMetadata[] = [];
  selectedProjectForImages: Project | null = null;

  // Label management properties
  showLabelsModal = false;
  selectedProjectForLabels: Project | null = null;
  projectLabels: Label[] = [];
  editingLabel: Label | null = null;
  newLabel: CreateLabelRequest = {
    name: '',
    color: '#ff0000',
    description: ''
  };

  newUser: RegisterRequest = {
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'DOCTOR'
  };

  newProject: CreateProjectRequest = {
    name: '',
    description: '',
    doctorIds: [],
    imageIds: []
  };

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private imageService: ImageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadUsers();
    this.loadProjects();
    this.loadAllImages();
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe(users => {
      this.users = users;
      this.doctors = users.filter(u => u.role === 'DOCTOR');
    });
  }

  loadProjects(): void {
    this.adminService.getAllProjects().subscribe(projects => {
      this.projects = projects;
    });
  }

  createUser(): void {
    this.adminService.createUser(this.newUser).subscribe({
      next: () => {
        this.showCreateUserModal = false;
        this.resetNewUser();
        this.loadUsers();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to create user');
      }
    });
  }

  toggleUserStatus(user: User): void {
    this.adminService.updateUserStatus(user.id, !user.enabled).subscribe(() => {
      this.loadUsers();
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete ${user.username}?`)) {
      this.adminService.deleteUser(user.id).subscribe(() => {
        this.loadUsers();
      });
    }
  }

  saveProject(): void {
    if (this.editingProject) {
      this.adminService.updateProject(this.editingProject.id, this.newProject).subscribe({
        next: () => {
          this.closeProjectModal();
          this.loadProjects();
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to update project');
        }
      });
    } else {
      this.adminService.createProject(this.newProject).subscribe({
        next: () => {
          this.closeProjectModal();
          this.loadProjects();
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to create project');
        }
      });
    }
  }

  editProject(project: Project): void {
    this.editingProject = project;
    this.newProject = {
      name: project.name,
      description: project.description,
      doctorIds: [...project.assignedDoctorIds],
      imageIds: [...project.imageIds]
    };
    this.showCreateProjectModal = true;
  }

  deleteProject(project: Project): void {
    if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      this.adminService.deleteProject(project.id).subscribe(() => {
        this.loadProjects();
      });
    }
  }

  toggleDoctor(doctorId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!this.newProject.doctorIds) {
      this.newProject.doctorIds = [];
    }
    if (checked) {
      this.newProject.doctorIds.push(doctorId);
    } else {
      this.newProject.doctorIds = this.newProject.doctorIds.filter(id => id !== doctorId);
    }
  }

  closeProjectModal(): void {
    this.showCreateProjectModal = false;
    this.editingProject = null;
    this.resetNewProject();
  }

  resetNewUser(): void {
    this.newUser = {
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'DOCTOR'
    };
  }

  resetNewProject(): void {
    this.newProject = {
      name: '',
      description: '',
      doctorIds: [],
      imageIds: []
    };
  }

  logout(): void {
    this.authService.logout();
  }

  // Image Management Methods
  loadAllImages(): void {
    this.imageService.getAllImages().subscribe({
      next: (images) => {
        console.log('Loaded images:', images);
        this.allImages = images || [];
      },
      error: (err) => {
        console.error('Failed to load images:', err);
        this.allImages = [];
      }
    });
  }

  getImageThumbnail(imageId: number): string {
    // Return the lowest zoom level tile as thumbnail
    // URL format: /api/tiles/{imageId}/{level}/{tileX}_{tileY}.jpg
    return `/api/tiles/${imageId}/0/0_0.jpg`;
  }

  getProjectThumbnail(project: Project): string {
    // Return thumbnail of the first image in the project
    if (project.imageIds && project.imageIds.length > 0) {
      return `/api/tiles/${project.imageIds[0]}/0/0_0.jpg`;
    }
    return '';
  }

  onProjectThumbnailError(event: Event): void {
    // Hide the broken image and show placeholder
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.no-thumbnail')) {
      const placeholder = document.createElement('div');
      placeholder.className = 'no-thumbnail';
      placeholder.innerHTML = '<i class="fas fa-image"></i><span>Önizleme yok</span>';
      parent.appendChild(placeholder);
    }
  }

  onThumbnailError(event: Event): void {
    // Show placeholder if thumbnail fails to load
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.placeholder-icon')) {
      const placeholder = document.createElement('span');
      placeholder.className = 'placeholder-icon';
      placeholder.textContent = '🖼️';
      placeholder.style.fontSize = '2rem';
      parent.appendChild(placeholder);
    }
  }

  loadProjectImages(): void {
    if (this.selectedProjectForImages) {
      const selectedId = this.selectedProjectForImages.id;
      // Refresh projects and update selected project reference
      this.adminService.getAllProjects().subscribe(projects => {
        this.projects = projects;
        // Update the selected project reference with fresh data
        this.selectedProjectForImages = projects.find(p => p.id === selectedId) || null;
      });
    }
  }

  isImageAssignedToProject(imageId: number): boolean {
    return this.selectedProjectForImages?.imageIds?.includes(imageId) ?? false;
  }

  toggleImageAssignment(image: ImageMetadata): void {
    if (!this.selectedProjectForImages) return;

    const projectId = this.selectedProjectForImages.id;
    const imageId = image.id;

    if (this.isImageAssignedToProject(imageId)) {
      this.adminService.removeImageFromProject(projectId, imageId).subscribe({
        next: (updatedProject) => {
          this.selectedProjectForImages = updatedProject;
          this.loadProjects();
        },
        error: (err) => alert(err.error?.message || 'Failed to remove image')
      });
    } else {
      this.adminService.addImageToProject(projectId, imageId).subscribe({
        next: (updatedProject) => {
          this.selectedProjectForImages = updatedProject;
          this.loadProjects();
        },
        error: (err) => alert(err.error?.message || 'Failed to assign image')
      });
    }
  }

  // Label Management Methods
  openLabelsModal(project: Project): void {
    this.selectedProjectForLabels = project;
    this.loadProjectLabels();
    this.showLabelsModal = true;
  }

  loadProjectLabels(): void {
    if (this.selectedProjectForLabels) {
      this.adminService.getLabelsForProject(this.selectedProjectForLabels.id).subscribe(labels => {
        this.projectLabels = labels;
      });
    }
  }

  saveLabel(): void {
    if (!this.selectedProjectForLabels || !this.newLabel.name) return;

    const projectId = this.selectedProjectForLabels.id;

    if (this.editingLabel) {
      this.adminService.updateLabel(projectId, this.editingLabel.id, this.newLabel).subscribe({
        next: () => {
          this.loadProjectLabels();
          this.cancelEditLabel();
        },
        error: (err) => alert(err.error?.message || 'Failed to update label')
      });
    } else {
      this.adminService.createLabel(projectId, this.newLabel).subscribe({
        next: () => {
          this.loadProjectLabels();
          this.resetNewLabel();
        },
        error: (err) => alert(err.error?.message || 'Failed to create label')
      });
    }
  }

  editLabel(label: Label): void {
    this.editingLabel = label;
    this.newLabel = {
      name: label.name,
      color: label.color,
      description: label.description || ''
    };
  }

  cancelEditLabel(): void {
    this.editingLabel = null;
    this.resetNewLabel();
  }

  deleteLabel(label: Label): void {
    if (!this.selectedProjectForLabels) return;

    if (confirm(`Are you sure you want to delete label "${label.name}"?`)) {
      this.adminService.deleteLabel(this.selectedProjectForLabels.id, label.id).subscribe({
        next: () => this.loadProjectLabels(),
        error: (err) => alert(err.error?.message || 'Failed to delete label')
      });
    }
  }

  createDefaultLabels(): void {
    if (!this.selectedProjectForLabels) return;

    this.adminService.createDefaultLabels(this.selectedProjectForLabels.id).subscribe({
      next: (labels) => {
        this.projectLabels = labels;
      },
      error: (err) => alert(err.error?.message || 'Failed to create default labels')
    });
  }

  resetNewLabel(): void {
    this.newLabel = {
      name: '',
      color: '#ff0000',
      description: ''
    };
  }
}

