import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';

export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

interface PerfilAdmin {
  id_admin: string;
  id_usuario: string;
  nombre: string;
  correo: string;
  fechaNac: string;
  telefono: string;
  cargo: string;
  fechaIn: string;
  admitidoPor: string;
  estado: boolean;
}

@Component({
  selector: 'app-admin-detalle',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './admin-detalle.html',
  styleUrl: './admin-detalle.scss',
})
export class AdminDetalle implements OnInit {
  private http = inject(HttpClient);
  administrador!: PerfilAdmin;
  loading = false;

  // --- NUEVO: Lógica de Modales de Alerta ---
  showSuccessModal = signal(false);
  showErrorModal = signal(false);
  modalMessage = signal('');

  ngOnInit() {
    // Recuperamos el objeto enviado por el state del router
    this.administrador = history.state.admin as PerfilAdmin;
  }

  // Método único para gestionar el cambio de estado
  toggleEstado() {
    if (!this.administrador) return;

    this.loading = true;
    const id = this.administrador.id_usuario;

    // Determinamos la acción y el endpoint según el estado actual
    const accion = this.administrador.estado ? 'suspender' : 'reactivar';
    const url = `${environment.apiUrl}/administradores/${accion}/${id}`;

    this.http.patch<ApiResponse<any>>(url, {}, { withCredentials: true }).subscribe({
      next: (res) => {
        console.log(res.message);
        // Actualizamos el estado localmente para que la vista cambie de inmediato
        this.administrador.estado = !this.administrador.estado;
        this.loading = false;
        
        // Reemplazamos el alert() nativo por nuestro modal de éxito
        this.abrirModalExito(res.message);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || 'Error al procesar la solicitud';
        
        // Reemplazamos el alert() nativo por nuestro modal de error
        this.abrirModalError(msg);
      }
    });
  }

  // --- Controladores de Modales de Alerta ---
  abrirModalExito(mensaje: string) {
    this.modalMessage.set(mensaje);
    this.showSuccessModal.set(true);
    
    // Auto cerrar el modal de éxito después de 3 segundos
    setTimeout(() => {
      this.showSuccessModal.set(false);
    }, 3000);
  }

  abrirModalError(mensaje: string) {
    this.modalMessage.set(mensaje);
    this.showErrorModal.set(true);
  }

  cerrarModalAlerta() {
    this.showSuccessModal.set(false);
    this.showErrorModal.set(false);
  }
}