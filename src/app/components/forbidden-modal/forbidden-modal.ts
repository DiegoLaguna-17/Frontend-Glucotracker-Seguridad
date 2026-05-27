import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthErrorService } from '../auth-error.service'; 

@Component({
  selector: 'app-forbidden-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './forbidden-modal.html',
  styleUrl: './forbidden-modal.scss'
})
export class ForbiddenModal {
  // Inyectamos el servicio de forma pública para usarlo en el HTML
  public authErrorService = inject(AuthErrorService);

  closeModal() {
    this.authErrorService.closeModal();
  }
}