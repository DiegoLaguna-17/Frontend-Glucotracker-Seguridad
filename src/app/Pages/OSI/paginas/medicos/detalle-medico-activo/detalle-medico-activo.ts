import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SafeUrlPipe } from '../../../../../pipes/safe-url.pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../../../environments/environment';

export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

export interface PerfilModelo {
  id: string;          
  id_usuario: string;  
  nombre: string;
  fechaNac: string;
  telefono: string;
  correo: string;
  matricula: string;
  departamento: string;
  carnet: string;
  admitidoPor: string | null;
  estado: boolean;     
}

@Component({
  selector: 'app-detalle-medico-activo',
  standalone: true,
  imports: [CommonModule, SafeUrlPipe, FormsModule],
  templateUrl: './detalle-medico-activo.html',
  styleUrl: './detalle-medico-activo.scss',
})
export class DetalleMedicoActivo implements OnInit {
  medico!: PerfilModelo;
  pdf!: SafeResourceUrl;

  private http = inject(HttpClient);
  loading = false;

  // --- NUEVO: Lógica de Modales de Alerta ---
  showSuccessModal = signal(false);
  showErrorModal = signal(false);
  modalMessage = signal('');

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.medico = history.state.medico as PerfilModelo;
    console.log('Médico completo:', this.medico);

    if (this.medico && this.medico.matricula) {
      const pdfUrl = this.medico.matricula;
      this.pdf = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } else {
      console.warn('No se encontró la matrícula o el médico');
    }
  }

  toggleEstado() {
    if (!this.medico) return;

    this.loading = true;
    const id = this.medico.id_usuario; 

    // Decidimos qué endpoint usar según el estado actual
    const accion = this.medico.estado ? 'suspender' : 'reactivar';
    const url = `${environment.apiUrl}/administradores/${accion}/${id}`;

    this.http.patch<ApiResponse<any>>(url, {}, { withCredentials: true }).subscribe({
      next: (res) => {
        console.log(res.message);
        // Actualizamos la vista localmente
        this.medico.estado = !this.medico.estado;
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