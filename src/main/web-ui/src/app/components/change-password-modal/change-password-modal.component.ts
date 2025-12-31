import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ 'auth.changePassword' | translate }}</h2>
          <button class="close-btn" (click)="close()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" #passwordForm="ngForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="currentPassword">{{ 'auth.currentPassword' | translate }}</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                [(ngModel)]="currentPassword"
                required
                [placeholder]="'auth.enterCurrentPassword' | translate"
              />
            </div>

            <div class="form-group">
              <label for="newPassword">{{ 'auth.newPassword' | translate }}</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                [(ngModel)]="newPassword"
                required
                minlength="6"
                [placeholder]="'auth.enterNewPassword' | translate"
              />
            </div>

            <div class="form-group">
              <label for="confirmNewPassword">{{ 'auth.confirmNewPassword' | translate }}</label>
              <input
                type="password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                [(ngModel)]="confirmNewPassword"
                required
                minlength="6"
                [placeholder]="'auth.enterConfirmPassword' | translate"
              />
              <div class="password-mismatch" *ngIf="confirmNewPassword && newPassword !== confirmNewPassword">
                {{ 'auth.passwordsDoNotMatch' | translate }}
              </div>
            </div>

            <div class="error-message" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>

            <div class="success-message" *ngIf="successMessage">
              {{ successMessage }}
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close()">
              {{ 'common.cancel' | translate }}
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="loading || !passwordForm.valid || newPassword !== confirmNewPassword">
              <span *ngIf="!loading">{{ 'auth.changePassword' | translate }}</span>
              <span *ngIf="loading">{{ 'common.loading' | translate }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #E5E7EB;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1F2937;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #6B7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #F3F4F6;
      color: #1F2937;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      color: #374151;
    }

    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-size: 0.875rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input::placeholder {
      color: #9CA3AF;
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
      text-align: center;
      font-size: 0.875rem;
    }

    .success-message {
      background: #D1FAE5;
      color: #059669;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      font-size: 0.875rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #F3F4F6;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #E5E7EB;
    }
  `]
})
export class ChangePasswordModalComponent {
  isVisible = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService) {}

  open(): void {
    this.isVisible = true;
    this.resetForm();
  }

  close(): void {
    this.isVisible = false;
    this.resetForm();
  }

  resetForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = false;
  }

  onSubmit(): void {
    if (this.loading || this.newPassword !== this.confirmNewPassword) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Şifre başarıyla değiştirildi';
        setTimeout(() => {
          this.close();
        }, 1500);
      },
      error: (error) => {
        this.loading = false;
        if (error.error?.message?.includes('incorrect')) {
          this.errorMessage = 'Mevcut şifre yanlış';
        } else {
          this.errorMessage = error.error?.message || 'Şifre değiştirme başarısız';
        }
      }
    });
  }
}

