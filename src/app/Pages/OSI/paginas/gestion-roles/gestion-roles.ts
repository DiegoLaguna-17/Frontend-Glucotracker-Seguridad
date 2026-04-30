import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface PermisoInfo {
  id_permiso: number;
  nombre: string;
  activo: boolean;
}

export interface Rol {
  id_rol: number;
  nombre_rol: string;
  permisos: PermisoInfo[];
}

@Component({
  selector: 'app-gestion-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-roles.html',
  styleUrl: './gestion-roles.scss'
})
export class GestionRoles implements OnInit {
  http = inject(HttpClient);
  
  roles = signal<Rol[]>([]);
  private rolesOriginales = signal<string>('');
  loadingGuardar = signal(false); // Para mostrar estado de carga al guardar
  
  // --- Lógica del Modal Crear Rol ---
  mostrarModal = signal(false);
  nuevoRolNombre = '';

  // --- NUEVO: Lógica de Modales de Alerta ---
  showSuccessModal = signal(false);
  showErrorModal = signal(false);
  modalMessage = signal('');

  permisosDisponibles = computed(() => {
    const listaRoles = this.roles();
    if (listaRoles.length === 0) return [];
    return listaRoles[0].permisos.map(p => ({ 
      id_permiso: p.id_permiso, 
      nombre: p.nombre 
    }));
  });

  hayCambios = computed(() => {
    return JSON.stringify(this.roles()) !== this.rolesOriginales();
  });

  ngOnInit() {
    this.cargarMatriz();
  }

  cargarMatriz() {
    this.http.get<Rol[]>(`${environment.apiUrl}/administradores/matriz`, { withCredentials: true })
      .subscribe({
        next: (datosBD) => {
          this.roles.set(datosBD);
          this.rolesOriginales.set(JSON.stringify(datosBD));
        },
        error: (err) => {
          console.error('Error cargando matriz:', err);
          this.abrirModalError('No se pudo cargar la matriz de roles. Verifica tu conexión.');
        }
      });
  }

  togglePermiso(idRol: number, idPermiso: number, event: any) {
    const isChecked = event.target.checked;
    
    this.roles.update(rolesActuales => {
      return rolesActuales.map(rol => {
        if (rol.id_rol === idRol) {
          const nuevosPermisos = rol.permisos.map(p => {
            if (p.id_permiso === idPermiso) {
              return { ...p, activo: isChecked };
            }
            return p;
          });
          return { ...rol, permisos: nuevosPermisos };
        }
        return rol;
      });
    });
  }

  hasPermiso(idRol: number, idPermiso: number): boolean {
    const rol = this.roles().find(r => r.id_rol === idRol);
    if (!rol) return false;
    
    const permiso = rol.permisos.find(p => p.id_permiso === idPermiso);
    return permiso ? permiso.activo : false;
  }

  obtenerCambios(): Rol[] {
    const actuales = this.roles();
    const originales: Rol[] = JSON.parse(this.rolesOriginales());
    const payloadCambios: Rol[] = [];

    actuales.forEach(rolActual => {
      const rolOriginal = originales.find(r => r.id_rol === rolActual.id_rol);

      if (!rolOriginal) {
        payloadCambios.push(rolActual);
      } else {
        const permisosModificados = rolActual.permisos.filter(pActual => {
          const pOriginal = rolOriginal.permisos.find(p => p.id_permiso === pActual.id_permiso);
          return pOriginal ? pOriginal.activo !== pActual.activo : true;
        });

        if (permisosModificados.length > 0) {
          payloadCambios.push({
            id_rol: rolActual.id_rol,
            nombre_rol: rolActual.nombre_rol,
            permisos: permisosModificados
          });
        }
      }
    });

    return payloadCambios;
  }

  guardarCambios() {
    const url = `${environment.apiUrl}/administradores/actualizarMatriz`;
    const payload = this.obtenerCambios();

    if (payload.length === 0) return;

    this.loadingGuardar.set(true); // Iniciamos el estado de carga

    this.http.put(url, payload, { withCredentials: true }).subscribe({
      next: () => {
        this.loadingGuardar.set(false);
        this.rolesOriginales.set(JSON.stringify(this.roles()));
        this.abrirModalExito('Configuración de seguridad guardada correctamente.');
      },
      error: (err) => {
        this.loadingGuardar.set(false);
        const errorMsg = err.error?.message || err.error?.error || 'Error al guardar la configuración en el servidor.';
        this.abrirModalError(errorMsg);
      }
    });
  }

  // --- Modal de Crear Rol ---
  abrirModal() {
    this.nuevoRolNombre = '';
    this.mostrarModal.set(true);
  }

  cerrarModal() { this.mostrarModal.set(false); }

  confirmarAgregarRol() {
    if (!this.nuevoRolNombre.trim()) return;

    const nuevoId = this.roles().length > 0 
      ? Math.max(...this.roles().map(r => r.id_rol)) + 1 
      : 1;

    const nuevoRol: Rol = {
      id_rol: nuevoId,
      nombre_rol: this.nuevoRolNombre,
      permisos: this.permisosDisponibles().map(p => ({
        id_permiso: p.id_permiso,
        nombre: p.nombre,
        activo: false
      }))
    };

    this.roles.update(actuales => [...actuales, nuevoRol]);
    this.cerrarModal();
    this.abrirModalExito(`El rol "${this.nuevoRolNombre}" fue agregado. Recuerda hacer clic en "Guardar cambios" para aplicarlo.`);
  }

  // --- NUEVO: Controladores de Modales de Alerta ---
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