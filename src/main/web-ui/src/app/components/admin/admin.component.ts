import { Component, OnInit, HostListener } from '@angular/core';
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
          <a routerLink="/" class="logo-link">
            <h1>🦷 {{ 'admin.title' | translate }}</h1>
          </a>
          <span class="subtitle">{{ 'admin.subtitle' | translate }}</span>
        </div>
        <div class="header-right">
          <app-language-switcher></app-language-switcher>

          <a routerLink="/" class="btn-nav">
            <i class="fas fa-home"></i>
            <span class="btn-text">{{ 'admin.home' | translate }}</span>
          </a>

          <!-- User Dropdown Menu -->
          <div class="user-dropdown">
            <button class="user-dropdown-trigger" (click)="toggleUserMenu()">
              <div class="user-avatar">
                <i class="fas fa-user-shield"></i>
              </div>
              <div class="user-info-text">
                <span class="user-name">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
                <span class="user-role">Admin</span>
              </div>
              <i class="fas fa-chevron-down dropdown-icon" [class.rotated]="showUserMenu"></i>
            </button>

            <div class="user-dropdown-menu" *ngIf="showUserMenu" (click)="$event.stopPropagation()">
              <div class="dropdown-header">
                <div class="dropdown-avatar">
                  <i class="fas fa-user-shield"></i>
                </div>
                <div class="dropdown-user-info">
                  <span class="dropdown-name">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
                  <span class="dropdown-email">{{ currentUser?.email }}</span>
                </div>
              </div>

              <div class="dropdown-divider"></div>

              <button class="dropdown-item danger" (click)="logout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>{{ 'auth.logout' | translate }}</span>
              </button>
            </div>
          </div>
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
        <div class="modal modal-labels" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="modal-header-custom">
            <div class="modal-title-section">
              <h2>🏷️ {{ 'admin.manageLabels' | translate }}</h2>
              <span class="project-badge">{{ selectedProjectForLabels?.name }}</span>
            </div>
            <button class="modal-close-btn" (click)="showLabelsModal = false">×</button>
          </div>

          <!-- Tab Navigation -->
          <div class="labels-tabs">
            <button class="tab-btn" [class.active]="labelsModalTab === 'labels'" (click)="labelsModalTab = 'labels'">
              <i class="tab-icon">🏷️</i>
              <span>Etiketler</span>
              <span class="tab-count">{{ projectLabels.length }}</span>
            </button>
            <button class="tab-btn" [class.active]="labelsModalTab === 'settings'" (click)="labelsModalTab = 'settings'">
              <i class="tab-icon">⚙️</i>
              <span>Ayarlar</span>
            </button>
          </div>

          <!-- Tab Content: Labels -->
          <div class="tab-content" *ngIf="labelsModalTab === 'labels'">
            <!-- Quick Template Buttons -->
            <div class="template-section">
              <div class="template-header">
                <span class="section-label">Hızlı Şablonlar</span>
              </div>
              <div class="template-buttons-row">
                <button class="btn-template-modern btn-dental" (click)="createDentalLabels()" [disabled]="loadingLabels">
                  <span class="template-icon">🦷</span>
                  <span class="template-text">
                    <strong>Dental Şablonu</strong>
                    <small>10 bölge + 11 bulgu</small>
                  </span>
                </button>
                <button class="btn-template-modern" (click)="createDefaultLabels()" [disabled]="loadingLabels">
                  <span class="template-icon">🔬</span>
                  <span class="template-text">
                    <strong>Varsayılan Şablon</strong>
                    <small>Temel etiketler</small>
                  </span>
                </button>
              </div>
            </div>

            <!-- Labels Content -->
            <div class="labels-content">
              <!-- Labels List -->
              <div class="labels-panel">
                <div class="panel-header">
                  <h4>Mevcut Etiketler</h4>
                  <span class="label-count-badge">{{ projectLabels.length }} etiket</span>
                </div>

                <div class="labels-scroll-area">
                  <!-- Region Labels -->
                  <div class="label-group" *ngIf="getRegionLabels().length > 0">
                    <div class="group-header">
                      <span class="group-icon">📍</span>
                      <span class="group-title">Bölgeler</span>
                      <span class="group-count">{{ getRegionLabels().length }}</span>
                    </div>
                    <div class="label-card" *ngFor="let label of getRegionLabels()" [class.editing]="editingLabel?.id === label.id">
                      <div class="label-color-indicator" [style.background-color]="label.color"></div>
                      <div class="label-content">
                        <div class="label-main-info">
                          <strong class="label-name">{{ label.name }}</strong>
                          <span class="label-badge region">BÖLGE</span>
                        </div>
                        <div class="label-meta" *ngIf="label.options && label.options.length > 0">
                          <span class="meta-label">Alt seçenekler:</span>
                          <span class="meta-value">{{ label.options.join(', ') }}</span>
                        </div>
                      </div>
                      <div class="label-actions-compact">
                        <button class="btn-icon" (click)="editLabel(label)" title="Düzenle">
                          <i>✏️</i>
                        </button>
                        <button class="btn-icon btn-icon-danger" (click)="deleteLabel(label)" title="Sil">
                          <i>🗑️</i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Finding Labels -->
                  <div class="label-group" *ngIf="getFindingLabels().length > 0">
                    <div class="group-header">
                      <span class="group-icon">🔬</span>
                      <span class="group-title">Radyografik Bulgular</span>
                      <span class="group-count">{{ getFindingLabels().length }}</span>
                    </div>
                    <div class="label-card" *ngFor="let label of getFindingLabels()" [class.editing]="editingLabel?.id === label.id">
                      <div class="label-color-indicator" [style.background-color]="label.color"></div>
                      <div class="label-content">
                        <div class="label-main-info">
                          <strong class="label-name">{{ label.name }}</strong>
                          <span class="label-badge finding">{{ label.inputType === 'SELECT' ? 'SEÇİM' : label.inputType === 'BOOLEAN' ? 'VAR/YOK' : 'BULGU' }}</span>
                        </div>
                        <div class="label-meta" *ngIf="label.options && label.options.length > 0">
                          <span class="meta-label">Seçenekler:</span>
                          <span class="meta-value">{{ label.options.join(', ') }}</span>
                        </div>
                      </div>
                      <div class="label-actions-compact">
                        <button class="btn-icon" (click)="editLabel(label)" title="Düzenle">
                          <i>✏️</i>
                        </button>
                        <button class="btn-icon btn-icon-danger" (click)="deleteLabel(label)" title="Sil">
                          <i>🗑️</i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Simple Labels -->
                  <div class="label-group" *ngIf="getSimpleLabels().length > 0">
                    <div class="group-header">
                      <span class="group-icon">🏷️</span>
                      <span class="group-title">Basit Etiketler</span>
                      <span class="group-count">{{ getSimpleLabels().length }}</span>
                    </div>
                    <div class="label-card" *ngFor="let label of getSimpleLabels()" [class.editing]="editingLabel?.id === label.id">
                      <div class="label-color-indicator" [style.background-color]="label.color"></div>
                      <div class="label-content">
                        <div class="label-main-info">
                          <strong class="label-name">{{ label.name }}</strong>
                          <span class="label-badge simple">BASİT</span>
                        </div>
                        <div class="label-meta" *ngIf="label.description">
                          <span class="meta-value">{{ label.description }}</span>
                        </div>
                      </div>
                      <div class="label-actions-compact">
                        <button class="btn-icon" (click)="editLabel(label)" title="Düzenle">
                          <i>✏️</i>
                        </button>
                        <button class="btn-icon btn-icon-danger" (click)="deleteLabel(label)" title="Sil">
                          <i>🗑️</i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Empty State -->
                  <div *ngIf="projectLabels.length === 0" class="empty-state">
                    <div class="empty-icon">🏷️</div>
                    <h4>Henüz etiket yok</h4>
                    <p>Yukarıdaki şablonlardan birini kullanarak hızlıca etiket ekleyebilir veya sağdaki formdan manuel oluşturabilirsiniz.</p>
                  </div>
                </div>
              </div>

              <!-- Add/Edit Label Form -->
              <div class="form-panel" [class.editing-mode]="editingLabel">
                <div class="panel-header">
                  <h4>{{ editingLabel ? '✏️ Etiket Düzenle' : '➕ Yeni Etiket' }}</h4>
                </div>

                <form class="label-form" (ngSubmit)="saveLabel()">
                  <div class="form-group">
                    <label class="form-label">Etiket Adı <span class="required">*</span></label>
                    <input type="text" class="form-input" [(ngModel)]="newLabel.name" name="labelName" required placeholder="Örn: Mandibula" />
                  </div>

                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label">Renk</label>
                      <div class="color-picker-wrapper">
                        <input type="color" [(ngModel)]="newLabel.color" name="labelColor" class="color-input" />
                        <span class="color-preview" [style.background-color]="newLabel.color"></span>
                        <span class="color-value">{{ newLabel.color }}</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Etiket Türü</label>
                      <select class="form-select" [(ngModel)]="newLabel.labelType" name="labelType">
                        <option value="SIMPLE">Basit</option>
                        <option value="REGION">Bölge</option>
                        <option value="FINDING">Bulgu</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group" *ngIf="newLabel.labelType !== 'SIMPLE'">
                    <label class="form-label">Giriş Türü</label>
                    <select class="form-select" [(ngModel)]="newLabel.inputType" name="inputType">
                      <option value="NONE">Yok</option>
                      <option value="SELECT">Seçim (Dropdown)</option>
                      <option value="BOOLEAN">Var/Yok</option>
                    </select>
                  </div>

                  <div class="form-group" *ngIf="newLabel.inputType === 'SELECT' || newLabel.inputType === 'BOOLEAN'">
                    <label class="form-label">Alt Seçenekler</label>
                    <input type="text" class="form-input" [(ngModel)]="newLabelOptionsText" name="labelOptions"
                           placeholder="Örn: Localized, Extended, Advanced" />
                    <small class="form-hint">Virgülle ayırarak birden fazla seçenek girin</small>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Açıklama <span class="optional">(opsiyonel)</span></label>
                    <input type="text" class="form-input" [(ngModel)]="newLabel.description" name="labelDescription" placeholder="Kısa bir açıklama..." />
                  </div>

                  <div class="form-actions-sticky">
                    <button type="button" class="btn-cancel" *ngIf="editingLabel" (click)="cancelEditLabel()">İptal</button>
                    <button type="submit" class="btn-submit">
                      {{ editingLabel ? 'Güncelle' : 'Ekle' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- Tab Content: Settings -->
          <div class="tab-content" *ngIf="labelsModalTab === 'settings'">
            <div class="settings-grid">
              <!-- Grade Level Setting -->
              <div class="setting-card">
                <div class="setting-icon">📊</div>
                <div class="setting-content">
                  <h4>Grade Seviyesi</h4>
                  <p>Anotasyonlarda kullanılacak maksimum grade değeri</p>
                  <div class="setting-control">
                    <select class="form-select" [(ngModel)]="selectedProjectGradeLevel" (change)="updateProjectGradeLevel()">
                      <option *ngFor="let level of gradeLevelOptions" [value]="level">{{ level }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Show Grade Toggle -->
              <div class="setting-card">
                <div class="setting-icon">🎯</div>
                <div class="setting-content">
                  <h4>Grade Alanını Göster</h4>
                  <p>Anotasyon popup'ında grade seçeneğini göster/gizle</p>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="projectShowGrade" (change)="updateProjectSettings()">
                      <span class="toggle-slider"></span>
                      <span class="toggle-label">{{ projectShowGrade ? 'Açık' : 'Kapalı' }}</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Show Notes Toggle -->
              <div class="setting-card">
                <div class="setting-icon">📝</div>
                <div class="setting-content">
                  <h4>Notlar Alanını Göster</h4>
                  <p>Anotasyon popup'ında not yazma alanını göster/gizle</p>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="projectShowNotes" (change)="updateProjectSettings()">
                      <span class="toggle-slider"></span>
                      <span class="toggle-label">{{ projectShowNotes ? 'Açık' : 'Kapalı' }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer-custom">
            <button type="button" class="btn-close-modal" (click)="showLabelsModal = false">Kapat</button>
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

    .logo-link {
      text-decoration: none;
      color: inherit;
    }

    .logo-link:hover h1 {
      opacity: 0.9;
    }

    .btn-nav {
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

    .btn-nav:hover {
      background: rgba(255,255,255,0.3);
    }

    .btn-nav .btn-text {
      display: inline;
    }

    @media (max-width: 768px) {
      .btn-nav .btn-text {
        display: none;
      }
    }

    /* User Dropdown */
    .user-dropdown {
      position: relative;
    }

    .user-dropdown-trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
    }

    .user-dropdown-trigger:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .user-info-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.2;
    }

    .user-name {
      font-weight: 600;
      font-size: 13px;
    }

    .user-role {
      font-size: 11px;
      opacity: 0.8;
    }

    .dropdown-icon {
      font-size: 10px;
      opacity: 0.8;
      transition: transform 0.2s;
    }

    .dropdown-icon.rotated {
      transform: rotate(180deg);
    }

    .user-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      min-width: 240px;
      z-index: 1000;
      overflow: hidden;
      animation: dropdownFadeIn 0.2s ease;
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-header {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .dropdown-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .dropdown-user-info {
      display: flex;
      flex-direction: column;
    }

    .dropdown-name {
      font-weight: 600;
      font-size: 14px;
    }

    .dropdown-email {
      font-size: 12px;
      opacity: 0.85;
    }

    .dropdown-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 4px 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      width: 100%;
      border: none;
      background: none;
      color: #374151;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
    }

    .dropdown-item:hover {
      background: #f3f4f6;
    }

    .dropdown-item i {
      width: 18px;
      text-align: center;
      color: #6b7280;
    }

    .dropdown-item.danger {
      color: #dc2626;
    }

    .dropdown-item.danger i {
      color: #dc2626;
    }

    .dropdown-item.danger:hover {
      background: #fef2f2;
    }

    @media (max-width: 768px) {
      .user-info-text {
        display: none;
      }

      .user-dropdown-trigger {
        padding: 6px;
      }
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

    .no-labels .hint {
      font-size: 0.85rem;
      color: #999;
      margin-top: 8px;
    }

    /* Template Buttons */
    .template-buttons {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .btn-template {
      padding: 12px 20px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-template:hover:not(:disabled) {
      border-color: #667eea;
      background: #f0f4ff;
    }

    .btn-template:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-template.btn-dental {
      border-color: #17a2b8;
      background: #e8f7fa;
    }

    .btn-template.btn-dental:hover:not(:disabled) {
      background: #d4f1f7;
      border-color: #138496;
    }

    /* Label Categories */
    .label-category {
      margin-bottom: 20px;
    }

    .label-category h5 {
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #eee;
      color: #333;
      font-size: 1rem;
    }

    .label-item.hierarchical {
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 6px;
      margin-bottom: 8px;
      padding: 10px 12px;
    }

    .label-type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
      margin-left: 8px;
    }

    .label-type-badge.region {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .label-type-badge.finding {
      background: #e3f2fd;
      color: #1565c0;
    }

    .label-options {
      display: block;
      font-size: 0.8rem;
      color: #666;
      margin-top: 4px;
      font-style: italic;
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

    /* ===== NEW LABELS MODAL STYLES ===== */
    .modal-labels {
      max-width: 900px;
      width: 95%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }

    .modal-header-custom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modal-title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-title-section h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .project-badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
    }

    .modal-close-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .modal-close-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    /* Tabs */
    .labels-tabs {
      display: flex;
      gap: 0;
      background: #f8f9fa;
      border-bottom: 1px solid #e5e7eb;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 0.9rem;
      color: #6b7280;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .tab-btn.active {
      color: #667eea;
      border-bottom-color: #667eea;
      background: white;
    }

    .tab-icon {
      font-style: normal;
    }

    .tab-count {
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .tab-btn.active .tab-count {
      background: #667eea;
      color: white;
    }

    /* Tab Content */
    .tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
    }

    /* Template Section */
    .template-section {
      margin-bottom: 20px;
    }

    .template-header {
      margin-bottom: 12px;
    }

    .section-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .template-buttons-row {
      display: flex;
      gap: 12px;
    }

    .btn-template-modern {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border: 2px dashed #d1d5db;
      border-radius: 10px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-template-modern:hover:not(:disabled) {
      border-color: #667eea;
      background: #f5f3ff;
    }

    .btn-template-modern.btn-dental {
      border-color: #0891b2;
      background: #ecfeff;
    }

    .btn-template-modern.btn-dental:hover:not(:disabled) {
      border-color: #0e7490;
      background: #cffafe;
    }

    .btn-template-modern:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .template-icon {
      font-size: 1.5rem;
    }

    .template-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .template-text strong {
      font-size: 0.9rem;
      color: #374151;
    }

    .template-text small {
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* Labels Content Grid */
    .labels-content {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
    }

    @media (max-width: 768px) {
      .labels-content {
        grid-template-columns: 1fr;
      }
    }

    /* Labels Panel */
    .labels-panel, .form-panel {
      background: #f9fafb;
      border-radius: 10px;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
    }

    .panel-header h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #374151;
    }

    .label-count-badge {
      background: #e5e7eb;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .labels-scroll-area {
      max-height: 350px;
      overflow-y: auto;
      padding: 12px;
    }

    /* Label Groups */
    .label-group {
      margin-bottom: 16px;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #e5e7eb;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .group-icon {
      font-size: 1rem;
    }

    .group-title {
      flex: 1;
      font-size: 0.85rem;
      font-weight: 600;
      color: #374151;
    }

    .group-count {
      background: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      color: #6b7280;
    }

    /* Label Cards */
    .label-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 6px;
      transition: all 0.2s;
    }

    .label-card:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
    }

    .label-card.editing {
      border-color: #667eea;
      background: #f5f3ff;
    }

    .label-color-indicator {
      width: 12px;
      height: 32px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .label-content {
      flex: 1;
      min-width: 0;
    }

    .label-main-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }

    .label-name {
      font-size: 0.9rem;
      color: #1f2937;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .label-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .label-badge.region {
      background: #d1fae5;
      color: #065f46;
    }

    .label-badge.finding {
      background: #dbeafe;
      color: #1e40af;
    }

    .label-badge.simple {
      background: #f3e8ff;
      color: #6b21a8;
    }

    .label-meta {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .meta-label {
      margin-right: 4px;
    }

    .label-actions-compact {
      display: flex;
      gap: 4px;
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      border: none;
      background: #f3f4f6;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #e5e7eb;
    }

    .btn-icon-danger:hover {
      background: #fee2e2;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state h4 {
      margin: 0 0 8px;
      color: #374151;
    }

    .empty-state p {
      font-size: 0.85rem;
      line-height: 1.5;
    }

    /* Form Panel */
    .form-panel {
      position: sticky;
      top: 0;
    }

    .form-panel.editing-mode .panel-header {
      background: #667eea;
      color: white;
    }

    .label-form {
      padding: 16px;
    }

    .form-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-label .required {
      color: #dc2626;
    }

    .form-label .optional {
      color: #9ca3af;
      font-weight: 400;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .color-picker-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .color-input {
      width: 50px;
      height: 36px;
      padding: 2px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
    }

    .color-preview {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
    }

    .color-value {
      font-size: 0.8rem;
      color: #6b7280;
      font-family: monospace;
    }

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 4px;
    }

    .form-actions-sticky {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .btn-cancel {
      padding: 10px 18px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
    }

    .btn-submit {
      padding: 10px 18px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-submit:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    /* Settings Grid */
    .settings-grid {
      display: grid;
      gap: 16px;
    }

    .setting-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
    }

    .setting-icon {
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      background: #f3f4f6;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .setting-content {
      flex: 1;
    }

    .setting-content h4 {
      margin: 0 0 4px;
      font-size: 1rem;
      color: #1f2937;
    }

    .setting-content p {
      margin: 0 0 12px;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .setting-control .form-select {
      width: auto;
      min-width: 100px;
    }

    /* Toggle Switch */
    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .toggle-switch input {
      display: none;
    }

    .toggle-slider {
      width: 44px;
      height: 24px;
      background: #d1d5db;
      border-radius: 12px;
      position: relative;
      transition: background 0.2s;
    }

    .toggle-slider::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      top: 3px;
      left: 3px;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .toggle-switch input:checked + .toggle-slider {
      background: #667eea;
    }

    .toggle-switch input:checked + .toggle-slider::after {
      transform: translateX(20px);
    }

    .toggle-label {
      font-size: 0.85rem;
      color: #6b7280;
    }

    /* Modal Footer */
    .modal-footer-custom {
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      display: flex;
      justify-content: flex-end;
    }

    .btn-close-modal {
      padding: 10px 24px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-close-modal:hover {
      background: #f3f4f6;
    }
  `]
})
export class AdminComponent implements OnInit {
  activeTab = 'users';
  users: User[] = [];
  doctors: User[] = [];
  projects: Project[] = [];
  currentUser: any;

  // User menu dropdown
  showUserMenu = false;

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
  loadingLabels = false;
  labelsModalTab: 'labels' | 'settings' = 'labels';
  newLabel: CreateLabelRequest = {
    name: '',
    color: '#ff0000',
    description: '',
    labelType: 'SIMPLE',
    inputType: 'NONE',
    options: []
  };
  newLabelOptionsText = ''; // Options input için text field
  selectedProjectGradeLevel: number = 3;
  projectShowGrade = true;
  projectShowNotes = true;

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
    this.showUserMenu = false;
    this.authService.logout();
  }

  /** User menu toggle */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /** Dışarı tıklandığında user menu'yü kapat */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userDropdown = target.closest('.user-dropdown');
    if (!userDropdown && this.showUserMenu) {
      this.showUserMenu = false;
    }
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
    this.projectShowGrade = project.showGrade !== false; // Default true
    this.projectShowNotes = project.showNotes !== false; // Default true
    this.labelsModalTab = 'labels'; // Reset to labels tab
    this.editingLabel = null; // Reset editing state
    this.resetNewLabel(); // Reset form
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

    // Options text'i array'e dönüştür
    if (this.newLabelOptionsText) {
      this.newLabel.options = this.newLabelOptionsText
        .split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0);
    } else {
      this.newLabel.options = [];
    }

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
      description: label.description || '',
      labelType: label.labelType || 'SIMPLE',
      inputType: label.inputType || 'NONE',
      options: label.options || []
    };
    // Options array'i text field'a dönüştür
    this.newLabelOptionsText = (label.options || []).join(', ');
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

    this.loadingLabels = true;
    this.adminService.createDefaultLabels(this.selectedProjectForLabels.id).subscribe({
      next: (labels) => {
        this.projectLabels = labels;
        this.loadingLabels = false;
        this.toastService.success('Varsayılan etiketler oluşturuldu');
      },
      error: (err) => {
        this.loadingLabels = false;
        this.toastService.error(err.error?.message || 'Varsayılan etiketler oluşturulamadı');
      }
    });
  }

  createDentalLabels(): void {
    if (!this.selectedProjectForLabels) return;

    this.loadingLabels = true;
    this.adminService.createDentalLabels(this.selectedProjectForLabels.id).subscribe({
      next: (labels) => {
        this.projectLabels = labels;
        this.loadingLabels = false;
        this.toastService.success('Dental şablonu yüklendi (10 bölge + 11 bulgu)');
      },
      error: (err) => {
        this.loadingLabels = false;
        this.toastService.error(err.error?.message || 'Dental şablonu yüklenemedi');
      }
    });
  }

  // Label helper methods for hierarchical display
  getRegionLabels(): Label[] {
    return this.projectLabels.filter(l => l.labelType === 'REGION');
  }

  getFindingLabels(): Label[] {
    return this.projectLabels.filter(l => l.labelType === 'FINDING');
  }

  getSimpleLabels(): Label[] {
    return this.projectLabels.filter(l => !l.labelType || l.labelType === 'SIMPLE');
  }

  resetNewLabel(): void {
    this.newLabel = {
      name: '',
      color: '#ff0000',
      description: '',
      labelType: 'SIMPLE',
      inputType: 'NONE',
      options: []
    };
    this.newLabelOptionsText = '';
  }

  // Project settings (showGrade, showNotes)
  updateProjectSettings(): void {
    if (!this.selectedProjectForLabels) return;

    const updateRequest = {
      name: this.selectedProjectForLabels.name,
      description: this.selectedProjectForLabels.description,
      gradeLevel: this.selectedProjectGradeLevel,
      showGrade: this.projectShowGrade,
      showNotes: this.projectShowNotes
    };

    this.adminService.updateProject(this.selectedProjectForLabels.id, updateRequest).subscribe({
      next: () => {
        this.toastService.success('Proje ayarları güncellendi');
      },
      error: (err) => this.toastService.error(err.error?.message || 'Ayarlar güncellenemedi')
    });
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

