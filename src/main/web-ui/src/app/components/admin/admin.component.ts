import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService, Project, CreateProjectRequest } from '../../services/admin.service';
import { AuthService, User, RegisterRequest } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <div class="header-left">
          <h1>🦷 LaPatho Admin</h1>
        </div>
        <div class="header-right">
          <span class="user-info">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
          <button class="btn-logout" (click)="logout()">Logout</button>
        </div>
      </header>

      <nav class="admin-nav">
        <button
          [class.active]="activeTab === 'users'"
          (click)="activeTab = 'users'">
          👥 Users
        </button>
        <button
          [class.active]="activeTab === 'projects'"
          (click)="activeTab = 'projects'">
          📁 Projects
        </button>
        <button
          [class.active]="activeTab === 'images'"
          (click)="activeTab = 'images'">
          🖼️ Images
        </button>
      </nav>

      <main class="admin-content">
        <!-- Users Tab -->
        <div *ngIf="activeTab === 'users'" class="tab-content">
          <div class="tab-header">
            <h2>User Management</h2>
            <button class="btn-primary" (click)="showCreateUserModal = true">+ Add User</button>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users">
                <td>{{ user.username }}</td>
                <td>{{ user.firstName }} {{ user.lastName }}</td>
                <td>{{ user.email }}</td>
                <td><span class="badge" [class.admin]="user.role === 'ADMIN'">{{ user.role }}</span></td>
                <td>
                  <span class="status" [class.active]="user.enabled">
                    {{ user.enabled ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <button class="btn-small" (click)="toggleUserStatus(user)" [disabled]="user.role === 'ADMIN'">
                    {{ user.enabled ? 'Disable' : 'Enable' }}
                  </button>
                  <button class="btn-small btn-danger" (click)="deleteUser(user)" [disabled]="user.role === 'ADMIN'">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Projects Tab -->
        <div *ngIf="activeTab === 'projects'" class="tab-content">
          <div class="tab-header">
            <h2>Project Management</h2>
            <button class="btn-primary" (click)="showCreateProjectModal = true">+ Create Project</button>
          </div>

          <div class="projects-grid">
            <div class="project-card" *ngFor="let project of projects">
              <div class="project-header">
                <h3>{{ project.name }}</h3>
                <span class="project-status" [class.active]="project.active">
                  {{ project.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <p class="project-desc">{{ project.description || 'No description' }}</p>
              <div class="project-stats">
                <span>👨‍⚕️ {{ project.doctorCount }} doctors</span>
                <span>🖼️ {{ project.imageCount }} images</span>
              </div>
              <div class="project-doctors" *ngIf="project.assignedDoctorNames?.length">
                <strong>Assigned:</strong> {{ project.assignedDoctorNames.join(', ') }}
              </div>
              <div class="project-actions">
                <button class="btn-small" (click)="editProject(project)">Edit</button>
                <button class="btn-small btn-danger" (click)="deleteProject(project)">Delete</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Images Tab -->
        <div *ngIf="activeTab === 'images'" class="tab-content">
          <div class="tab-header">
            <h2>Image Management</h2>
            <a routerLink="/" class="btn-primary">Go to Image Viewer</a>
          </div>
          <p>Manage images from the main dashboard.</p>
        </div>
      </main>

      <!-- Create User Modal -->
      <div class="modal-overlay" *ngIf="showCreateUserModal" (click)="showCreateUserModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Create New User</h2>
          <form (ngSubmit)="createUser()">
            <div class="form-row">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" [(ngModel)]="newUser.firstName" name="firstName" required />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" [(ngModel)]="newUser.lastName" name="lastName" required />
              </div>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="newUser.email" name="email" required />
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" [(ngModel)]="newUser.username" name="username" required />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" [(ngModel)]="newUser.password" name="password" required />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select [(ngModel)]="newUser.role" name="role">
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="showCreateUserModal = false">Cancel</button>
              <button type="submit" class="btn-primary">Create User</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Create Project Modal -->
      <div class="modal-overlay" *ngIf="showCreateProjectModal" (click)="showCreateProjectModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ editingProject ? 'Edit Project' : 'Create New Project' }}</h2>
          <form (ngSubmit)="saveProject()">
            <div class="form-group">
              <label>Project Name</label>
              <input type="text" [(ngModel)]="newProject.name" name="name" required />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newProject.description" name="description" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Assign Doctors</label>
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
              <button type="button" class="btn-secondary" (click)="closeProjectModal()">Cancel</button>
              <button type="submit" class="btn-primary">{{ editingProject ? 'Update' : 'Create' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .admin-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .admin-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-logout {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
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
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
    }

    .btn-secondary {
      background: #e1e1e1;
      color: #333;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
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
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .project-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .project-header h3 {
      margin: 0;
    }

    .project-status {
      font-size: 0.8rem;
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
      color: #666;
      margin-bottom: 12px;
    }

    .project-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      color: #888;
    }

    .project-doctors {
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 12px;
    }

    .project-actions {
      display: flex;
      gap: 8px;
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
}

