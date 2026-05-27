import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthErrorService {
  // Signal para controlar la visibilidad del modal de permisos
  showForbiddenModal = signal(false);

  showModal() {
    this.showForbiddenModal.set(true);
  }

  closeModal() {
    this.showForbiddenModal.set(false);
  }
}