import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardMedicoA, PerfilModelo } from '../../componentes/card-medico-a/card-medico-a';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

// 🔹 1. Interfaz de respuesta estandarizada
export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

@Component({
  selector: 'app-medicos-activos',
  standalone: true,
  imports: [CardMedicoA, CommonModule],
  templateUrl: './medicos-activos.html',
  styleUrls: ['./medicos-activos.scss'],
})
export class MedicosActivos implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  loading = false;
  error = '';
  medicos = signal<PerfilModelo[]>([]);
  q = signal<string>('');

  medicosFiltrados = computed(() => {
    const query = this.q().toLowerCase();
    return this.medicos().filter(
      (p) =>
        p.nombre.toLowerCase().includes(query) ||
        // 🔹 Prevención de errores: Convertimos el ID a string por si viene como number
        String(p.id).toLowerCase().includes(query)
    );
  });

  verMedico(m: PerfilModelo) {
    this.router.navigate(['administrador/medicos/activo/detalle'], { state: { medico: m } });
  }

  ngOnInit() {
    this.cargarMedicos();
  }

  cargarMedicos() {
    const medicosUrl = `${environment.apiUrl}/administradores/medicos/activos`;
    this.loading = true;

    // 🔹 2. Tipamos la petición esperando nuestra ApiResponse con un arreglo de PerfilModelo
    this.http.get<ApiResponse<PerfilModelo[]>>(medicosUrl, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        // 🔹 3. Extraemos los datos reales del atributo 'data'
        const data = res.data;

        this.medicos.set(Array.isArray(data) ? data : []);
        console.log('Médicos cargados:', this.medicos());
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar médicos:', err);
        // 🔹 4. Intentamos mostrar el mensaje limpio que manda tu backend
        this.error = err.error?.message || 'No se pudieron cargar los médicos.';
        this.loading = false;
      },
    });
  }
}