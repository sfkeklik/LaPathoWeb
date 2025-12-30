import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container">
      <!-- Card Skeleton -->
      <ng-container *ngIf="type === 'card'">
        <div class="skeleton-card" *ngFor="let item of items">
          <div class="skeleton-header">
            <div class="skeleton skeleton-badge"></div>
          </div>
          <div class="skeleton skeleton-image"></div>
          <div class="skeleton-footer">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-meta"></div>
          </div>
        </div>
      </ng-container>

      <!-- List Skeleton -->
      <ng-container *ngIf="type === 'list'">
        <div class="skeleton-list-item" *ngFor="let item of items">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-list-content">
            <div class="skeleton skeleton-line-title"></div>
            <div class="skeleton skeleton-line-subtitle"></div>
          </div>
        </div>
      </ng-container>

      <!-- Table Row Skeleton -->
      <ng-container *ngIf="type === 'table'">
        <div class="skeleton-table-row" *ngFor="let item of items">
          <div class="skeleton skeleton-cell" *ngFor="let col of [1,2,3,4,5]"></div>
        </div>
      </ng-container>

      <!-- Text Skeleton -->
      <ng-container *ngIf="type === 'text'">
        <div class="skeleton skeleton-text" *ngFor="let item of items" [style.width.%]="getRandomWidth()"></div>
      </ng-container>
    </div>
  `,
  styles: [`
    .skeleton-container {
      width: 100%;
    }

    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Card Skeleton */
    .skeleton-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }

    .skeleton-header {
      padding: 12px 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .skeleton-badge {
      width: 80px;
      height: 24px;
      border-radius: 20px;
    }

    .skeleton-image {
      width: 100%;
      height: 200px;
    }

    .skeleton-footer {
      padding: 16px;
    }

    .skeleton-title {
      width: 70%;
      height: 20px;
      margin-bottom: 12px;
    }

    .skeleton-meta {
      width: 50%;
      height: 14px;
    }

    /* List Skeleton */
    .skeleton-list-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .skeleton-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .skeleton-list-content {
      flex: 1;
    }

    .skeleton-line-title {
      width: 60%;
      height: 16px;
      margin-bottom: 8px;
    }

    .skeleton-line-subtitle {
      width: 40%;
      height: 12px;
    }

    /* Table Skeleton */
    .skeleton-table-row {
      display: flex;
      gap: 16px;
      padding: 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .skeleton-cell {
      flex: 1;
      height: 16px;
    }

    /* Text Skeleton */
    .skeleton-text {
      height: 14px;
      margin-bottom: 10px;
    }
  `]
})
export class SkeletonComponent {
  @Input() type: 'card' | 'list' | 'table' | 'text' = 'card';
  @Input() count: number = 3;

  get items(): number[] {
    return Array(this.count).fill(0);
  }

  getRandomWidth(): number {
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }
}

