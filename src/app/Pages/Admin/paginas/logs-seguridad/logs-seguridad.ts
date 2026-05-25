import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface LogSeguridad {
  id: number;
  id_usuario: number | null;
  nombre_usuario: string;
  rol: string;
  email_intento: string;
  evento: string;
  descripcion: string;
  ip_origen: string;
  user_agent: string;
  exito: boolean;
  fecha: string;
}

export interface LogsSeguridadResponse {
  success: boolean;
  message: string;
  total: number;
  data: LogSeguridad[];
}

@Component({
  selector: 'app-logs-seguridad',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './logs-seguridad.html',
  styleUrls: ['./logs-seguridad.scss'],
})
export class LogsSeguridad implements OnInit {
  private http = inject(HttpClient);

  logs: LogSeguridad[] = [];
  paginaActual = 1;
  registrosPorPagina = 15;

  // Variables para el Modal
  modalVisible = false;
  logSeleccionado: LogSeguridad | null = null;

  ngOnInit() {
    this.obtenerLogsSeguridad();
  }
  
  obtenerLogsSeguridad() {
    const url = `${environment.apiUrl}/administradores/logs/seguridad`; 
    
    this.http.get<LogsSeguridadResponse>(url).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.logs = response.data.sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
        }
      },
      error: (err) => {
        console.error("Error al obtener logs de seguridad", err);
      }
    });
  }

  // Paginación
  get logsPaginados(): LogSeguridad[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    return this.logs.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.logs.length / this.registrosPorPagina);
  }

  siguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }

  anterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  // Lógica del Modal
  abrirModal(log: LogSeguridad) {
    this.logSeleccionado = log;
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.logSeleccionado = null;
  }
}