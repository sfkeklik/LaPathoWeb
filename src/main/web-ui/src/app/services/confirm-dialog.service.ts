import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { first, filter } from 'rxjs/operators';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmDialogState {
  isOpen: boolean;
  data: ConfirmDialogData | null;
  resolve: ((value: boolean) => void) | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private state$ = new BehaviorSubject<ConfirmDialogState>({
    isOpen: false,
    data: null,
    resolve: null
  });

  getState() {
    return this.state$.asObservable();
  }

  confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise((resolve) => {
      this.state$.next({
        isOpen: true,
        data: {
          confirmText: 'Evet',
          cancelText: 'İptal',
          type: 'danger',
          ...data
        },
        resolve
      });
    });
  }

  respond(result: boolean): void {
    const currentState = this.state$.value;
    if (currentState.resolve) {
      currentState.resolve(result);
    }
    this.state$.next({
      isOpen: false,
      data: null,
      resolve: null
    });
  }

  // Shortcut methods
  delete(itemName: string): Promise<boolean> {
    return this.confirm({
      title: 'Silme Onayı',
      message: `"${itemName}" öğesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Evet, Sil',
      cancelText: 'İptal',
      type: 'danger'
    });
  }

  warning(title: string, message: string): Promise<boolean> {
    return this.confirm({
      title,
      message,
      type: 'warning'
    });
  }
}

