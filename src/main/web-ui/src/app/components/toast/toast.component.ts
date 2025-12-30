import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Toast, ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts"
        class="toast"
        [ngClass]="'toast-' + toast.type"
        (click)="removeToast(toast.id)">
        <div class="toast-icon">
          <i class="fas" [ngClass]="{
            'fa-check-circle': toast.type === 'success',
            'fa-times-circle': toast.type === 'error',
            'fa-exclamation-triangle': toast.type === 'warning',
            'fa-info-circle': toast.type === 'info'
          }"></i>
        </div>
        <div class="toast-content">
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button class="toast-close" (click)="removeToast(toast.id); $event.stopPropagation()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      backdrop-filter: blur(10px);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-success {
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      border-left: 4px solid #10B981;
    }

    .toast-success .toast-icon {
      color: #10B981;
    }

    .toast-error {
      background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
      border-left: 4px solid #EF4444;
    }

    .toast-error .toast-icon {
      color: #EF4444;
    }

    .toast-warning {
      background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
      border-left: 4px solid #F59E0B;
    }

    .toast-warning .toast-icon {
      color: #F59E0B;
    }

    .toast-info {
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border-left: 4px solid #3B82F6;
    }

    .toast-info .toast-icon {
      color: #3B82F6;
    }

    .toast-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .toast-content {
      flex: 1;
    }

    .toast-message {
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .toast-close:hover {
      color: #6B7280;
      background: rgba(0, 0, 0, 0.05);
    }

    @media (max-width: 480px) {
      .toast-container {
        left: 10px;
        right: 10px;
        max-width: none;
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.getToasts().subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeToast(id: number): void {
    this.toastService.remove(id);
  }
}

