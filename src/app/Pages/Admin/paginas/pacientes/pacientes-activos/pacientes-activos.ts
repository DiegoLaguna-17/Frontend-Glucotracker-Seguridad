import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardPacienteA, PacienteResumen } from '../../componentes/card-paciente-a/card-paciente-a';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-pacientes-activos',
  standalone: true, // Si usas standalone
  imports: [CardPacienteA, CommonModule, HttpClientModule],
  templateUrl: './pacientes-activos.html',
  styleUrl: './pacientes-activos.scss',
})
export class PacientesActivos implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);

  loading = false;
  error = '';
  
  pacientes = signal<PacienteResumen[]>([]);
  q = signal<string>('');

  // --- NUEVA LÓGICA DE PERMISOS (RBAC) ---
  permisosRol = signal<string[]>([]);
  permisosOriginales: string[] = []; // Respaldo para detectar cambios

  // Computed que revisa si el arreglo actual es distinto al original
  hayCambiosPermisos = computed(() => {
    const actuales = [...this.permisosRol()].sort();
    const originales = [...this.permisosOriginales].sort();
    return JSON.stringify(actuales) !== JSON.stringify(originales);
  });
  // ---------------------------------------

  pacientesFiltrados = computed(() => {
    const query = this.q().toLowerCase();
    return this.pacientes().filter(
      (p) =>
        p.nombre.toLowerCase().includes(query) ||
        p.id.toString().includes(query)
    );
  });

  verPaciente(p: PacienteResumen) {
    this.router.navigate(['administrador/pacientes/activo/detalle'], { state: { paciente: p } });
  }

  cargarPacientes() {
    const pacientesUrl = `${environment.apiUrl}/administradores/pacientes/activos`;
    this.loading = true;
    this.http.get<PacienteResumen[]>(pacientesUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        this.pacientes.set(Array.isArray(data) ? data : []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar pacientes:', err);
        this.error = 'No se pudieron cargar los pacientes.';
        this.loading = false;
      },
    });
  }

  // --- MÉTODOS PARA PERMISOS ---
  cargarPermisosRol() {
    // Aquí a futuro harás un this.http.get() a tu endpoint que trae los permisos del Rol Paciente.
    // Por ahora simulamos que vienen estos 3 permisos desde la Base de Datos:
    const permisosBD = ['registrar_glucosa', 'ver_historial_glucosa', 'editar_paciente'];
    
    this.permisosRol.set(permisosBD);
    this.permisosOriginales = [...permisosBD]; // Guardamos la "foto" original
  }

  togglePermiso(permiso: string) {
    const actuales = this.permisosRol();
    if (actuales.includes(permiso)) {
      // Si lo tiene, lo quitamos
      this.permisosRol.set(actuales.filter(p => p !== permiso));
    } else {
      // Si no lo tiene, lo agregamos
      this.permisosRol.set([...actuales, permiso]);
    }
  }

  guardarPermisosRol() {
    // Aquí enviarás el arreglo al Backend para actualizar la tabla rol_permiso
    const payload = {
      rol: 'Paciente',
      permisos: this.permisosRol()
    };
    
    console.log('Enviando a BD:', payload);
    
    // Simulamos éxito
    alert('Permisos globales del rol Paciente actualizados.');
    this.permisosOriginales = [...this.permisosRol()]; // Actualizamos la "foto" original
  }

  ngOnInit() {
    this.cargarPacientes();
    this.cargarPermisosRol(); // Cargamos los permisos al abrir la pantalla
  }
}