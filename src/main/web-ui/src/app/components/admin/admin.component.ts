import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService, Project, CreateProjectRequest, Label, CreateLabelRequest } from '../../services/admin.service';
import { AuthService, User, RegisterRequest } from '../../services/auth.service';
import { ImageService, ImageMetadata } from '../../services/image.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

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
          <a routerLink="/" class="btn-viewer">
            <i class="fas fa-images"></i> {{ 'admin.goToImageViewer' | translate }}
          </a>
          <span class="user-info">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
          <button class="btn-logout" (click)="logout()">{{ 'auth.logout' | translate }}</button>
        </div>
      </header>

      <nav class="admin-nav">
        <button
          [class.active]="activeTab === 'users'"
          (click)="activeTab = 'users'; selectedProject = null">
          👥 {{ 'admin.users' | translate }}
        </button>
        <button
          [class.active]="activeTab === 'projects'"
          (click)="activeTab = 'projects'">
          📁 {{ 'admin.projects' | translate }}
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
                  <button class="btn-small btn-password" (click)="openChangeUserPasswordModal(user)" [title]="'auth.changePassword' | translate">
                    <i class="fas fa-key"></i>
                  </button>
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
          <!-- Project List View -->
          <div *ngIf="!selectedProject">
            <div class="tab-header">
              <h2>{{ 'admin.projectManagement' | translate }}</h2>
              <button class="btn-primary" (click)="showCreateProjectModal = true">{{ 'admin.addProject' | translate }}</button>
            </div>

            <div class="projects-grid">
              <div class="project-card clickable" *ngFor="let project of projects" (click)="selectProject(project)">
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
                    <button class="btn-small" (click)="editProject(project); $event.stopPropagation()">{{ 'common.edit' | translate }}</button>
                    <button class="btn-small btn-labels" (click)="openLabelsModal(project); $event.stopPropagation()">🏷️ {{ 'admin.labels' | translate }}</button>
                    <button class="btn-small btn-report" (click)="downloadReport(project); $event.stopPropagation()" [disabled]="reportDownloading === project.id">
                      <span *ngIf="reportDownloading !== project.id">📊 {{ 'admin.downloadReport' | translate }}</span>
                      <span *ngIf="reportDownloading === project.id" class="spinner">⏳</span>
                    </button>
                    <button class="btn-small btn-danger" (click)="deleteProject(project); $event.stopPropagation()">{{ 'common.delete' | translate }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Detail View (Images) -->
          <div *ngIf="selectedProject" class="project-detail-view">
            <div class="tab-header">
              <div class="back-header">
                <button class="btn-back" (click)="backToProjects()">
                  <i class="fas fa-arrow-left"></i> {{ 'common.back' | translate }}
                </button>
                <h2>{{ selectedProject.name }}</h2>
              </div>
              <div class="project-info-badge">
                <span class="badge-item">🖼️ {{ selectedProject.imageCount }} {{ 'admin.imageCount' | translate }}</span>
                <span class="badge-item">👨‍⚕️ {{ selectedProject.doctorCount }} {{ 'admin.doctorCount' | translate }}</span>
              </div>
            </div>

            <!-- Sub Navigation Tabs -->
            <div class="project-sub-nav">
              <button
                [class.active]="projectImageTab === 'assigned'"
                (click)="projectImageTab = 'assigned'">
                <i class="fas fa-folder-open"></i>
                {{ 'admin.projectImages' | translate }}
                <span class="count-badge">{{ getProjectImages().length }}</span>
              </button>
              <button
                [class.active]="projectImageTab === 'available'"
                (click)="projectImageTab = 'available'">
                <i class="fas fa-plus-circle"></i>
                {{ 'admin.availableImages' | translate }}
                <span class="count-badge">{{ getAvailableImages().length }}</span>
              </button>
            </div>

            <!-- Project Images Tab -->
            <div class="project-images-section" *ngIf="projectImageTab === 'assigned'">
              <div *ngIf="getProjectImages().length === 0" class="no-images-message">
                <i class="fas fa-images"></i>
                <p>{{ 'admin.noImagesInProject' | translate }}</p>
                <button class="btn-primary" (click)="projectImageTab = 'available'">
                  <i class="fas fa-plus"></i> {{ 'admin.addImages' | translate }}
                </button>
              </div>

              <!-- Bulk Remove Action -->
              <div class="bulk-actions" *ngIf="getProjectImages().length > 0">
                <button class="btn-small btn-danger" (click)="removeAllImagesFromProject()">
                  <i class="fas fa-trash"></i> {{ 'admin.removeAllImages' | translate }}
                </button>
              </div>

              <div class="images-grid" *ngIf="getProjectImages().length > 0">
                <div class="image-card assigned" *ngFor="let image of getProjectImages()">
                  <div class="image-preview" (click)="openImageInAnnotator(image)">
                    <img
                      *ngIf="image.status === 'READY'"
                      [src]="getImageThumbnail(image.id)"
                      [alt]="image.name"
                      (error)="onThumbnailError($event)"
                      class="thumbnail-img">
                    <span *ngIf="image.status !== 'READY'" class="placeholder-icon">
                      {{ image.status === 'PROCESSING' ? '⏳' : image.status === 'ERROR' ? '❌' : '🖼️' }}
                    </span>
                    <div class="image-overlay" *ngIf="image.status === 'READY'">
                      <i class="fas fa-search-plus"></i>
                      <span>{{ 'admin.openInAnnotator' | translate }}</span>
                    </div>
                  </div>
                  <div class="image-info">
                    <strong>{{ image.name || image.fileName || 'Unnamed' }}</strong>
                    <span class="image-size">{{ image.width }}x{{ image.height }}</span>
                    <span class="image-status" [class]="image.status?.toLowerCase()">{{ image.status }}</span>
                  </div>
                  <div class="image-actions">
                    <button
                      class="btn-small btn-danger"
                      (click)="removeImageFromProject(image); $event.stopPropagation()">
                      <i class="fas fa-times"></i> {{ 'common.remove' | translate }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Available Images Tab -->
            <div class="project-images-section" *ngIf="projectImageTab === 'available'">
              <div *ngIf="getAvailableImages().length === 0" class="no-images-message">
                <i class="fas fa-check-circle"></i>
                <p>{{ 'admin.allImagesAssigned' | translate }}</p>
                <button class="btn-secondary" (click)="projectImageTab = 'assigned'">
                  <i class="fas fa-arrow-left"></i> {{ 'admin.backToProjectImages' | translate }}
                </button>
              </div>

              <!-- Bulk Actions -->
              <div class="bulk-actions" *ngIf="getAvailableImages().length > 0">
                <button class="btn-small" [class.active]="isSelectingImages" (click)="toggleSelectMode()">
                  <i class="fas" [class.fa-check-square]="isSelectingImages" [class.fa-square]="!isSelectingImages"></i>
                  {{ isSelectingImages ? ('admin.cancelSelection' | translate) : ('admin.multiSelect' | translate) }}
                </button>
                <button class="btn-small btn-primary" *ngIf="selectedAvailableImages.size > 0" (click)="addSelectedImagesToProject()">
                  <i class="fas fa-plus"></i> {{ 'admin.addSelected' | translate }} ({{ selectedAvailableImages.size }})
                </button>
                <button class="btn-small btn-success" (click)="addAllImagesToProject()">
                  <i class="fas fa-plus-circle"></i> {{ 'admin.addAllImages' | translate }}
                </button>
              </div>

              <div class="images-grid" *ngIf="getAvailableImages().length > 0">
                <div class="image-card available"
                     *ngFor="let image of getAvailableImages()"
                     [class.selected]="selectedAvailableImages.has(image.id)"
                     (click)="isSelectingImages ? toggleImageSelection(image.id) : null">
                  <div class="selection-checkbox" *ngIf="isSelectingImages">
                    <input type="checkbox"
                      [checked]="selectedAvailableImages.has(image.id)"
                      (change)="toggleImageSelection(image.id)"
                      (click)="$event.stopPropagation()">
                  </div>
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
                  <div class="image-actions" *ngIf="!isSelectingImages">
                    <button
                      class="btn-small btn-success"
                      (click)="addImageToProject(image)">
                      <i class="fas fa-plus"></i> {{ 'common.assign' | translate }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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

      <!-- Change User Password Modal -->
      <div class="modal-overlay" *ngIf="showChangePasswordModal" (click)="closeChangePasswordModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ 'auth.changePassword' | translate }}</h2>
          <p class="modal-subtitle" *ngIf="selectedUserForPassword">
            {{ selectedUserForPassword.firstName }} {{ selectedUserForPassword.lastName }} ({{ selectedUserForPassword.username }})
          </p>
          <form (ngSubmit)="changeUserPassword()">
            <div class="form-group">
              <label>{{ 'auth.newPassword' | translate }}</label>
              <input type="password" [(ngModel)]="newPasswordForUser" name="newPassword" required minlength="6"
                     [placeholder]="'auth.enterNewPassword' | translate" />
            </div>
            <div class="form-group">
              <label>{{ 'auth.confirmNewPassword' | translate }}</label>
              <input type="password" [(ngModel)]="confirmNewPasswordForUser" name="confirmPassword" required minlength="6"
                     [placeholder]="'auth.enterConfirmPassword' | translate" />
              <div class="password-mismatch" *ngIf="confirmNewPasswordForUser && newPasswordForUser !== confirmNewPasswordForUser">
                {{ 'auth.passwordsDoNotMatch' | translate }}
              </div>
            </div>
            <div class="error-message" *ngIf="passwordChangeError">
              {{ passwordChangeError }}
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeChangePasswordModal()">{{ 'common.cancel' | translate }}</button>
              <button type="submit" class="btn-primary" [disabled]="passwordChangeLoading || newPasswordForUser !== confirmNewPasswordForUser || !newPasswordForUser">
                <span *ngIf="!passwordChangeLoading">{{ 'auth.changePassword' | translate }}</span>
                <span *ngIf="passwordChangeLoading">{{ 'common.loading' | translate }}</span>
              </button>
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

          <!-- Grade Level Section -->
          <div class="grade-level-section">
            <h4>📊 {{ 'admin.gradeLevel' | translate }}</h4>
            <div class="grade-level-control">
              <select [(ngModel)]="selectedProjectGradeLevel" (change)="updateProjectGradeLevel()">
                <option *ngFor="let level of gradeLevelOptions" [value]="level">{{ level }}</option>
              </select>
              <small class="form-hint">{{ 'admin.gradeLevelHint' | translate }}</small>
            </div>
          </div>

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

    .btn-viewer {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
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

    .btn-viewer:hover {
      background: rgba(255,255,255,0.25);
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

    .btn-small.btn-success {
      background: #e8f5e9;
      color: #388e3c;
    }

    .btn-small.btn-password {
      background: #fff3e0;
      color: #f57c00;
    }

    .btn-small.btn-password:hover {
      background: #ffe0b2;
    }

    .btn-small:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-subtitle {
      color: #64748B;
      font-size: 0.875rem;
      margin-bottom: 20px;
    }

    .password-mismatch {
      color: #DC2626;
      font-size: 0.75rem;
      margin-top: 6px;
    }

    .error-message {
      background: #FEE2E2;
      color: #DC2626;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      text-align: center;
      font-size: 0.875rem;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    @media (max-width: 768px) {
      .projects-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (min-width: 1400px) {
      .projects-grid {
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      }
    }

    .project-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }

    .project-card.clickable {
      cursor: pointer;
    }

    .project-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .project-thumbnail {
      width: 100%;
      height: 160px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
    }

    @media (min-width: 1200px) {
      .project-thumbnail {
        height: 180px;
      }
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
      display: flex;
      flex-direction: column;
      flex: 1;
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
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
      color: #6B7280;
      font-size: 0.85rem;
    }

    .project-stats span {
      white-space: nowrap;
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
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      gap: 6px;
      padding-top: 12px;
      border-top: 1px solid #E5E7EB;
      margin-top: auto;
    }

    .project-actions .btn-small {
      text-align: center;
      justify-content: center;
      font-size: 0.72rem;
      padding: 6px 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 500px) {
      .project-actions {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 400px) {
      .project-actions {
        grid-template-columns: 1fr 1fr;
        gap: 4px;
      }

      .project-actions .btn-small {
        font-size: 0.68rem;
        padding: 5px 3px;
      }
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

    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 0.8rem;
      color: #6b7280;
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

    .grade-level-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      border: 1px solid #e9ecef;
    }

    .grade-level-section h4 {
      margin: 0 0 12px 0;
      font-size: 1rem;
      color: #495057;
    }

    .grade-level-control {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .grade-level-control select {
      width: 120px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
    }

    .bulk-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      flex-wrap: wrap;
    }

    .bulk-actions .btn-small.active {
      background: #e3f2fd;
      color: #1565c0;
    }

    .image-card.selected {
      border: 2px solid #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    .selection-checkbox {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 10;
    }

    .selection-checkbox input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .image-card {
      position: relative;
    }

    .btn-small.btn-labels {
      background: #fff3e0;
      color: #e65100;
    }

    .btn-small.btn-report {
      background: #e3f2fd;
      color: #1565c0;
    }

    .btn-small.btn-report:hover:not(:disabled) {
      background: #bbdefb;
    }

    .btn-small.btn-report:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-small.btn-report .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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

    /* Project Detail View Styles */
    .project-detail-view {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .back-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-back {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      color: #374151;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e5e7eb;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .project-info-badge {
      display: flex;
      gap: 16px;
      margin-left: auto;
    }

    .badge-item {
      background: #f3f4f6;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      color: #4B5563;
    }

    .project-sub-nav {
      display: flex;
      gap: 8px;
      margin-top: 20px;
      padding: 4px;
      background: #f3f4f6;
      border-radius: 10px;
      width: fit-content;
    }

    .project-sub-nav button {
      background: transparent;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      color: #6B7280;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .project-sub-nav button:hover {
      color: #374151;
    }

    .project-sub-nav button.active {
      background: white;
      color: #667eea;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .count-badge {
      background: #E5E7EB;
      color: #4B5563;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .project-sub-nav button.active .count-badge {
      background: #667eea;
      color: white;
    }

    .project-images-section {
      margin-top: 20px;
    }

    .image-card.available {
      border: 2px dashed #D1D5DB;
    }

    .image-card.available:hover {
      border-color: #667eea;
    }

    .no-images-message {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .no-images-message i {
      font-size: 48px;
      color: #9CA3AF;
      margin-bottom: 16px;
    }

    .no-images-message i.fa-check-circle {
      color: #10B981;
    }

    .no-images-message p {
      color: #6B7280;
      margin-bottom: 20px;
      font-size: 1rem;
    }

    .image-preview {
      position: relative;
      cursor: pointer;
    }

    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(102, 126, 234, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      color: white;
      gap: 8px;
    }

    .image-overlay i {
      font-size: 24px;
    }

    .image-overlay span {
      font-size: 0.75rem;
      text-align: center;
    }

    .image-preview:hover .image-overlay {
      opacity: 1;
    }

    .available-images-section {
      max-height: 400px;
      overflow-y: auto;
    }

    .available-images-section .images-grid {
      padding: 8px;
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

  // Password change modal
  showChangePasswordModal = false;
  selectedUserForPassword: User | null = null;
  newPasswordForUser = '';
  confirmNewPasswordForUser = '';
  passwordChangeLoading = false;
  passwordChangeError = '';

  // Image assignment properties
  allImages: ImageMetadata[] = [];

  // Project detail view properties
  selectedProject: Project | null = null;
  showAddImagesModal = false;
  projectImageTab: 'assigned' | 'available' = 'assigned';

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
  selectedProjectGradeLevel: number = 3;

  // Bulk image selection properties
  selectedAvailableImages: Set<number> = new Set();
  isSelectingImages = false;

  // Report download state
  reportDownloading: number | null = null;

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
    imageIds: [],
    gradeLevel: 3
  };

  // Grade level options for dropdown (1-10)
  gradeLevelOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private imageService: ImageService,
    private router: Router,
    private toastService: ToastService,
    private confirmDialog: ConfirmDialogService,
    private translate: TranslateService
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
        this.toastService.success('Kullanıcı başarıyla oluşturuldu');
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Kullanıcı oluşturulamadı');
      }
    });
  }

  toggleUserStatus(user: User): void {
    this.adminService.updateUserStatus(user.id, !user.enabled).subscribe({
      next: () => {
        this.loadUsers();
        this.toastService.success(user.enabled ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktifleştirildi');
      },
      error: () => {
        this.toastService.error('İşlem başarısız oldu');
      }
    });
  }

  openChangeUserPasswordModal(user: User): void {
    this.selectedUserForPassword = user;
    this.newPasswordForUser = '';
    this.confirmNewPasswordForUser = '';
    this.passwordChangeError = '';
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
    this.selectedUserForPassword = null;
    this.newPasswordForUser = '';
    this.confirmNewPasswordForUser = '';
    this.passwordChangeError = '';
    this.passwordChangeLoading = false;
  }

  changeUserPassword(): void {
    if (!this.selectedUserForPassword || this.newPasswordForUser !== this.confirmNewPasswordForUser) return;

    this.passwordChangeLoading = true;
    this.passwordChangeError = '';

    this.adminService.changeUserPassword(this.selectedUserForPassword.id, this.newPasswordForUser).subscribe({
      next: () => {
        this.passwordChangeLoading = false;
        this.toastService.success('Şifre başarıyla değiştirildi');
        this.closeChangePasswordModal();
      },
      error: (err) => {
        this.passwordChangeLoading = false;
        this.passwordChangeError = err.error?.message || 'Şifre değiştirme başarısız';
      }
    });
  }

  async deleteUser(user: User): Promise<void> {
    const confirmed = await this.confirmDialog.delete(user.username);
    if (confirmed) {
      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadUsers();
          this.toastService.success('Kullanıcı silindi');
        },
        error: () => {
          this.toastService.error('Kullanıcı silinemedi');
        }
      });
    }
  }

  saveProject(): void {
    if (this.editingProject) {
      this.adminService.updateProject(this.editingProject.id, this.newProject).subscribe({
        next: () => {
          this.closeProjectModal();
          this.loadProjects();
          this.toastService.success('Proje güncellendi');
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Proje güncellenemedi');
        }
      });
    } else {
      this.adminService.createProject(this.newProject).subscribe({
        next: () => {
          this.closeProjectModal();
          this.loadProjects();
          this.toastService.success('Proje oluşturuldu');
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Proje oluşturulamadı');
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
      imageIds: [...project.imageIds],
      gradeLevel: project.gradeLevel || 3
    };
    this.showCreateProjectModal = true;
  }

  async deleteProject(project: Project): Promise<void> {
    const confirmed = await this.confirmDialog.delete(project.name);
    if (confirmed) {
      this.adminService.deleteProject(project.id).subscribe({
        next: () => {
          this.loadProjects();
          this.toastService.success('Proje silindi');
        },
        error: () => {
          this.toastService.error('Proje silinemedi');
        }
      });
    }
  }

  downloadReport(project: Project): void {
    this.reportDownloading = project.id;
    this.toastService.info('Rapor hazırlanıyor...');

    // Use setTimeout to show spinner for at least 500ms for better UX
    const startTime = Date.now();

    this.adminService.downloadAnnotationReportWithCallback(
      project.id,
      project.name,
      () => {
        const elapsed = Date.now() - startTime;
        const minDelay = 500;
        const remainingDelay = Math.max(0, minDelay - elapsed);

        setTimeout(() => {
          this.reportDownloading = null;
          this.toastService.success('Rapor indirildi');
        }, remainingDelay);
      },
      (error) => {
        console.error('Report download failed:', error);
        this.reportDownloading = null;
        this.toastService.error('Rapor indirilemedi');
      }
    );
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
      imageIds: [],
      gradeLevel: 3
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


  // Label Management Methods
  openLabelsModal(project: Project): void {
    this.selectedProjectForLabels = project;
    this.selectedProjectGradeLevel = project.gradeLevel || 3;
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

  updateProjectGradeLevel(): void {
    if (this.selectedProjectForLabels) {
      this.adminService.updateProject(this.selectedProjectForLabels.id, {
        name: this.selectedProjectForLabels.name,
        description: this.selectedProjectForLabels.description,
        gradeLevel: this.selectedProjectGradeLevel
      }).subscribe({
        next: (updatedProject) => {
          this.selectedProjectForLabels = updatedProject;
          this.loadProjects();
          this.toastService.success('Grade seviyesi güncellendi');
        },
        error: () => this.toastService.error('Grade seviyesi güncellenemedi')
      });
    }
  }

  // Bulk Image Selection Methods
  toggleSelectMode(): void {
    this.isSelectingImages = !this.isSelectingImages;
    if (!this.isSelectingImages) {
      this.selectedAvailableImages.clear();
    }
  }

  toggleImageSelection(imageId: number): void {
    if (this.selectedAvailableImages.has(imageId)) {
      this.selectedAvailableImages.delete(imageId);
    } else {
      this.selectedAvailableImages.add(imageId);
    }
  }

  addSelectedImagesToProject(): void {
    if (!this.selectedProject) return;

    const imageIds = Array.from(this.selectedAvailableImages);
    let completed = 0;

    imageIds.forEach(imageId => {
      this.adminService.addImageToProject(this.selectedProject!.id, imageId).subscribe({
        next: () => {
          completed++;
          if (completed === imageIds.length) {
            this.selectedAvailableImages.clear();
            this.isSelectingImages = false;
            this.loadProjects();
            this.refreshSelectedProject();
            this.toastService.success(`${imageIds.length} görüntü projeye eklendi`);
          }
        },
        error: () => {
          this.toastService.error('Bazı görüntüler eklenemedi');
        }
      });
    });
  }

  addAllImagesToProject(): void {
    if (!this.selectedProject) return;

    const images = this.getAvailableImages();
    if (images.length === 0) return;

    let completed = 0;

    images.forEach(image => {
      this.adminService.addImageToProject(this.selectedProject!.id, image.id).subscribe({
        next: () => {
          completed++;
          if (completed === images.length) {
            this.loadProjects();
            this.refreshSelectedProject();
            this.toastService.success(`${images.length} görüntü projeye eklendi`);
          }
        },
        error: () => {
          this.toastService.error('Bazı görüntüler eklenemedi');
        }
      });
    });
  }

  async removeAllImagesFromProject(): Promise<void> {
    if (!this.selectedProject) return;

    const images = this.getProjectImages();
    if (images.length === 0) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Tüm Görüntüleri Çıkar',
      message: `Bu projeden ${images.length} görüntüyü çıkarmak istediğinize emin misiniz?`,
      confirmText: 'Evet, Çıkar',
      cancelText: 'İptal',
      type: 'warning'
    });

    if (!confirmed) return;

    let completed = 0;

    images.forEach(image => {
      this.adminService.removeImageFromProject(this.selectedProject!.id, image.id).subscribe({
        next: () => {
          completed++;
          if (completed === images.length) {
            this.loadProjects();
            this.refreshSelectedProject();
            this.toastService.success(`${images.length} görüntü projeden çıkarıldı`);
          }
        },
        error: () => {
          this.toastService.error('Bazı görüntüler çıkarılamadı');
        }
      });
    });
  }

  private refreshSelectedProject(): void {
    if (this.selectedProject) {
      this.adminService.getProject(this.selectedProject.id).subscribe(project => {
        this.selectedProject = project;
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
          this.toastService.success('Etiket güncellendi');
        },
        error: (err) => this.toastService.error(err.error?.message || 'Etiket güncellenemedi')
      });
    } else {
      this.adminService.createLabel(projectId, this.newLabel).subscribe({
        next: () => {
          this.loadProjectLabels();
          this.resetNewLabel();
          this.toastService.success('Etiket oluşturuldu');
        },
        error: (err) => this.toastService.error(err.error?.message || 'Etiket oluşturulamadı')
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

  async deleteLabel(label: Label): Promise<void> {
    if (!this.selectedProjectForLabels) return;

    const confirmed = await this.confirmDialog.delete(label.name);
    if (confirmed) {
      this.adminService.deleteLabel(this.selectedProjectForLabels.id, label.id).subscribe({
        next: () => {
          this.loadProjectLabels();
          this.toastService.success('Etiket silindi');
        },
        error: (err) => this.toastService.error(err.error?.message || 'Etiket silinemedi')
      });
    }
  }

  createDefaultLabels(): void {
    if (!this.selectedProjectForLabels) return;

    this.adminService.createDefaultLabels(this.selectedProjectForLabels.id).subscribe({
      next: (labels) => {
        this.projectLabels = labels;
        this.toastService.success('Varsayılan etiketler oluşturuldu');
      },
      error: (err) => this.toastService.error(err.error?.message || 'Varsayılan etiketler oluşturulamadı')
    });
  }

  resetNewLabel(): void {
    this.newLabel = {
      name: '',
      color: '#ff0000',
      description: ''
    };
  }

  // Project Detail View Methods
  selectProject(project: Project): void {
    this.selectedProject = project;
    this.projectImageTab = 'assigned'; // Reset to assigned tab
    // Refresh the project to get latest data
    this.adminService.getProject(project.id).subscribe({
      next: (updatedProject) => {
        this.selectedProject = updatedProject;
      },
      error: (err) => console.error('Failed to load project details:', err)
    });
  }

  backToProjects(): void {
    this.selectedProject = null;
    this.projectImageTab = 'assigned'; // Reset tab
    this.selectedAvailableImages.clear(); // Clear selections
    this.isSelectingImages = false; // Reset selection mode
    this.loadProjects(); // Refresh projects list
  }

  getProjectImages(): ImageMetadata[] {
    if (!this.selectedProject || !this.selectedProject.imageIds) {
      return [];
    }
    return this.allImages.filter(img => this.selectedProject!.imageIds.includes(img.id));
  }

  getAvailableImages(): ImageMetadata[] {
    if (!this.selectedProject || !this.selectedProject.imageIds) {
      return this.allImages;
    }
    return this.allImages.filter(img => !this.selectedProject!.imageIds.includes(img.id));
  }

  addImageToProject(image: ImageMetadata): void {
    if (!this.selectedProject) return;

    this.adminService.addImageToProject(this.selectedProject.id, image.id).subscribe({
      next: (updatedProject) => {
        this.selectedProject = updatedProject;
        this.loadProjects();
        this.toastService.success('Görüntü projeye eklendi');
      },
      error: (err) => this.toastService.error(err.error?.message || 'Görüntü eklenemedi')
    });
  }

  removeImageFromProject(image: ImageMetadata): void {
    if (!this.selectedProject) return;

    this.adminService.removeImageFromProject(this.selectedProject.id, image.id).subscribe({
      next: (updatedProject) => {
        this.selectedProject = updatedProject;
        this.loadProjects();
        this.toastService.success('Görüntü projeden kaldırıldı');
      },
      error: (err) => this.toastService.error(err.error?.message || 'Görüntü kaldırılamadı')
    });
  }

  openImageInAnnotator(image: ImageMetadata): void {
    if (image.status === 'READY') {
      this.router.navigate(['/annotate', image.id]);
    }
  }
}

