import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface LogDetalle {
  tipo: string;
  campo: string;
  valor_anterior: string | null;
  valor_entrante: string | null;
}

export interface LogAplicacion {
  id: number;
  correo: string; // 🛑 Reemplazado id_usuario por correo
  modulo: string;
  entidad: string;
  accion: string;
  id_registro: number;
  descripcion: string;
  endpoint: string;
  metodo: string;
  codigo_http: number;
  ip_origen: string;
  user_agent: string;
  fecha: string;
  detalles: LogDetalle[];
}

export interface LogsResponse {
  success: boolean;
  message: string;
  total: number;
  data: LogAplicacion[];
}

@Component({
  selector: 'app-logs-aplicacion',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './logs-aplicacion.html',
  styleUrls: ['./logs-aplicacion.scss'],
})
export class LogsAplicacion implements OnInit {
  private http = inject(HttpClient);

  logs: LogAplicacion[] = [];
  paginaActual = 1;
  registrosPorPagina = 15;

  // Variables para el Modal
  modalVisible = false;
  logSeleccionado: LogAplicacion | null = null;

  ngOnInit() {
    this.obtenerLogs();
  }
  
  obtenerLogs() {
    const url = `${environment.apiUrl}/administradores/logs/aplicacion`; 
    
    this.http.get<LogsResponse>(url).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.logs = response.data.sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
        }
      },
      error: (err) => {
        console.error("Error al obtener logs de aplicación", err);
      }
    });
  }

  // Paginación
  get logsPaginados(): LogAplicacion[] {
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
  abrirModal(log: LogAplicacion) {
    this.logSeleccionado = log;
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.logSeleccionado = null;
  }
  
  // Verifica si hay valores anteriores para mostrar u ocultar la columna en el modal
  tieneValoresAnteriores(): boolean {
    if (!this.logSeleccionado || !this.logSeleccionado.detalles) {
      return false;
    }
    return this.logSeleccionado.detalles.some(det => det.valor_anterior !== null);
  }
}