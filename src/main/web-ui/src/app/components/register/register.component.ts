import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, LanguageSwitcherComponent],
  template: `
    <div class="register-container">
      <div class="language-selector">
        <app-language-switcher></app-language-switcher>
      </div>
      <div class="register-card">
        <div class="register-header">
          <h1>🦷 {{ 'app.title' | translate }}</h1>
          <p>{{ 'auth.register' | translate }}</p>
        </div>

        <form (ngSubmit)="onSubmit()" #registerForm="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">{{ 'auth.firstName' | translate }}</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                [(ngModel)]="registerData.firstName"
                required
                placeholder="John"
              />
            </div>

            <div class="form-group">
              <label for="lastName">{{ 'auth.lastName' | translate }}</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                [(ngModel)]="registerData.lastName"
                required
                placeholder="Doe"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="email">{{ 'auth.email' | translate }}</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="registerData.email"
              required
              placeholder="john.doe@example.com"
            />
          </div>

          <div class="form-group">
            <label for="username">{{ 'auth.username' | translate }}</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="registerData.username"
              required
              minlength="3"
              placeholder="johndoe"
            />
          </div>

          <div class="form-group">
            <label for="password">{{ 'auth.password' | translate }}</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="registerData.password"
              required
              minlength="6"
              [placeholder]="'auth.enterPassword' | translate"
            />
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" [disabled]="loading || !registerForm.valid" class="btn-register">
            <span *ngIf="!loading">{{ 'auth.register' | translate }}</span>
            <span *ngIf="loading">{{ 'common.loading' | translate }}</span>
          </button>
        </form>

        <div class="register-footer">
          <p>{{ 'auth.haveAccount' | translate }} <a routerLink="/login">{{ 'auth.login' | translate }}</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .language-selector {
      position: absolute;
      top: 20px;
      right: 20px;
    }

    .register-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .register-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .register-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }

    .register-header p {
      color: #6B7280;
      font-size: 0.875rem;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row .form-group {
      flex: 1;
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
      font-family: inherit;
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

    .error-message {
      background: #FEE2E2;
      color: #DC2626;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
      font-size: 0.875rem;
    }

    .btn-register {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.2s;
    }

    .btn-register:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-register:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .register-footer {
      text-align: center;
      margin-top: 24px;
      color: #6B7280;
      font-size: 0.875rem;
    }

    .register-footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .register-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  registerData: RegisterRequest = {
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: ''
  };

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}

