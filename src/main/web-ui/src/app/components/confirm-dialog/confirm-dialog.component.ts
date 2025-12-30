import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConfirmDialogService, ConfirmDialogData } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="dialog" [ngClass]="'dialog-' + data?.type" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <div class="dialog-icon">
            <i class="fas" [ngClass]="{
              'fa-trash-alt': data?.type === 'danger',
              'fa-exclamation-triangle': data?.type === 'warning',
              'fa-info-circle': data?.type === 'info'
            }"></i>
          </div>
          <h3 class="dialog-title">{{ data?.title }}</h3>
        </div>
        <div class="dialog-body">
          <p class="dialog-message">{{ data?.message }}</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-cancel" (click)="onCancel()">
            {{ data?.cancelText }}
          </button>
          <button class="btn btn-confirm" [ngClass]="'btn-' + data?.type" (click)="onConfirm()">
            {{ data?.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog {
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
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

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .dialog-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .dialog-danger .dialog-icon {
      background: #FEE2E2;
      color: #EF4444;
    }

    .dialog-warning .dialog-icon {
      background: #FEF3C7;
      color: #F59E0B;
    }

    .dialog-info .dialog-icon {
      background: #DBEAFE;
      color: #3B82F6;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1F2937;
    }

    .dialog-body {
      margin-bottom: 24px;
    }

    .dialog-message {
      margin: 0;
      color: #6B7280;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    .dialog-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-cancel {
      background: #F3F4F6;
      color: #4B5563;
    }

    .btn-cancel:hover {
      background: #E5E7EB;
    }

    .btn-confirm.btn-danger {
      background: #EF4444;
      color: white;
    }

    .btn-confirm.btn-danger:hover {
      background: #DC2626;
    }

    .btn-confirm.btn-warning {
      background: #F59E0B;
      color: white;
    }

    .btn-confirm.btn-warning:hover {
      background: #D97706;
    }

    .btn-confirm.btn-info {
      background: #3B82F6;
      color: white;
    }

    .btn-confirm.btn-info:hover {
      background: #2563EB;
    }
  `]
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  isOpen = false;
  data: ConfirmDialogData | null = null;
  private subscription!: Subscription;

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    this.subscription = this.confirmDialogService.getState().subscribe(state => {
      this.isOpen = state.isOpen;
      this.data = state.data;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onConfirm(): void {
    this.confirmDialogService.respond(true);
  }

  onCancel(): void {
    this.confirmDialogService.respond(false);
  }
}

