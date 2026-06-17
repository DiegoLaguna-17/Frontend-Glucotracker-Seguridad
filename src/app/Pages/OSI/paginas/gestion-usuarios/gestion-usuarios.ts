import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

export interface PerfilUsuario {
  id_usuario: string;
  estado: boolean;
  nombre_completo: string;
  correo: string;
  fecha_nac: string;
  telefono: string;
  cargo: string;
  fecha_registro: string;
}

@Component({
  selector: 'app-gestion-usuarios',
  imports: [CommonModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.scss',
})

export class GestionUsuarios {
  private router = inject(Router);
    private http = inject(HttpClient);
  
    usuarios = signal<PerfilUsuario[]>([]);
    q = signal<string>('');
  
    ngOnInit() {
      this.cargarUsuarios();
    }
    filtroEstado = signal<'todos' | 'activo' | 'inactivo'>('todos');
    usuariosFiltrados = computed(() => {
      const query = this.q().toLowerCase();
      const estado = this.filtroEstado();

      return this.usuarios().filter(p => {

        // 🔍 filtro búsqueda
        const coincideBusqueda =
          p.nombre_completo?.toLowerCase().includes(query) ||
          p.id_usuario?.toString().includes(query) ||
          p.correo?.toLowerCase().includes(query);

        // 🔥 filtro estado
        const coincideEstado =
          estado === 'todos' ||
          (estado === 'activo' && p.estado === true) ||
          (estado === 'inactivo' && p.estado === false);

        return coincideBusqueda && coincideEstado;
      });
    });

  verAdmin(m: PerfilUsuario) {
      //this.router.navigate(['/osi/administradores/activos/detalle'], { state: { admin: m } });
    }
  
    usuariosOriginales: any[] = [];
  
    cargarUsuarios() {
      const url = `${environment.apiUrl}/usuarios/listar`;
  
      // 🔹 3. Tipamos la petición con ApiResponse
      this.http.get<ApiResponse<PerfilUsuario[]>>(url, { withCredentials: true }).subscribe({
        next: (res) => {
          // 🔹 4. Extraemos la data (el arreglo de administradores)
          const data = res.data;
  
          // Asignamos directamente la data al signal
          this.usuarios.set(data);
  
          // Guardamos una copia para detectar cambios
          this.usuariosOriginales = JSON.parse(JSON.stringify(data));
  
          console.log('Usuarios cargados:', this.usuarios());
        },
        error: (err) => {
          // 🔹 5. Manejo de errores con el mensaje del backend
          const mensajeError = err.error?.message || 'Error al conectar con el servidor';
          console.error('Error obteniendo administradores:', mensajeError);
        }
      });
    }
  usuarioSeleccionado = signal<PerfilUsuario | null>(null);
  modalAbierto = signal(false);


  abrirModal(usuario: PerfilUsuario) {
    this.usuarioSeleccionado.set(usuario);
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }    
  

  modalAbiertoEliminar = signal(false);

  abrirModalEliminar(usuario: PerfilUsuario) {
    this.usuarioSeleccionado.set(usuario);
    this.modalAbiertoEliminar.set(true);
  }

  cerrarModalEliminar() {
    this.modalAbiertoEliminar.set(false);
  }    
  confirmarEliminar() {
    const usuario = this.usuarioSeleccionado();

    if (!usuario) return;

    const url = `${environment.apiUrl}/usuarios/eliminar/${usuario.id_usuario}`;

    this.http.delete(url, { withCredentials: true }).subscribe({
      next: () => {
        this.cerrarModalEliminar();
        this.abrirModalExito(
          "Usuario eliminado",
          "El usuario fue eliminado correctamente"
        );

        this.cargarUsuarios();
      },
      error: (err) => {
        this.cerrarModalEliminar();
        this.abrirModalError(
          "Error al eliminar",
          "No se pudo eliminar el usuario"
        );
        console.error('Error eliminando:', err);
      }
    });
  }

  modalAbiertoReactivar = signal(false);

  abrirModalReactivar(usuario: PerfilUsuario) {
    this.usuarioSeleccionado.set(usuario);
    this.modalAbiertoReactivar.set(true);
  }

  cerrarModalReactivar() {
    this.modalAbiertoReactivar.set(false);
  }    
  confirmarReactivar() {
    const usuario = this.usuarioSeleccionado();

    if (!usuario) return;

    const url = `${environment.apiUrl}/usuarios/reactivar/${usuario.id_usuario}`;

    this.http.patch(url, { withCredentials: true }).subscribe({
      next: () => {
        this.cerrarModalReactivar();
        this.abrirModalExito(
          "Usuario reactivado",
          "El usuario fue reactivado correctamente"
        );
        this.cargarUsuarios();      },
      error: (err) => {
        this.cerrarModalReactivar();
        this.abrirModalError(
          "Error al reactivar",
          "No se pudo reactivar el usuario"
        );
        console.error('Error reactivando:', err);
      }
    });
  }
    
    

  modalAbiertoEditar = signal(false);

  // valores editables
  formEditar = signal({
    nombre_completo: '',
    telefono: ''
  });

  // copia original (para detectar cambios)
  formOriginal = signal({
    nombre_completo: '',
    telefono: ''
  });
  abrirModalEditar(usuario: PerfilUsuario) {
    this.usuarioSeleccionado.set(usuario);

    const data = {
      nombre_completo: usuario.nombre_completo ?? '',
      telefono: usuario.telefono ?? ''
    };

    this.formEditar.set(data);
    this.formOriginal.set(data);

    this.modalAbiertoEditar.set(true);
  }
  cerrarModalEditar() {
  this.modalAbiertoEditar.set(false);
  this.usuarioSeleccionado.set(null);

  // opcional: limpiar el formulario
  this.formEditar.set({
    nombre_completo: '',
    telefono: ''
  });

  this.formOriginal.set({
    nombre_completo: '',
    telefono: ''
  });
}
  // solo letras y al menos 2 palabras
  nombreValido = computed(() => {
    const nombre = this.formEditar().nombre_completo.trim();
    const regex = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/;

    return (
      regex.test(nombre) &&
      nombre.split(' ').filter(p => p.length > 0).length >= 2
    );
  });

  // solo números y mínimo 8 dígitos
  telefonoValido = computed(() => {
    const tel = this.formEditar().telefono.trim();
    return /^\d{8,}$/.test(tel);
  });
  hayCambios = computed(() => {
    const f = this.formEditar();
    const o = this.formOriginal();

    return (
      f.nombre_completo !== o.nombre_completo ||
      f.telefono !== o.telefono
    );
  });
  formValido = computed(() => {
    return this.nombreValido() && this.telefonoValido() && this.hayCambios();
  });
  confirmarEditar() {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return;

    const f = this.formEditar();
    const o = this.formOriginal();

    const body: any = {};

    if (f.nombre_completo !== o.nombre_completo) {
      body.nombre_completo = f.nombre_completo;
    }

    if (f.telefono !== o.telefono) {
      body.teléfono = f.telefono;
    }

    console.log('BODY A ENVIAR:', body);
    
    const url = `${environment.apiUrl}/usuarios/editar/${usuario.id_usuario}`;

    this.http.patch(url, body, { withCredentials: true }).subscribe({
      next: () => {
        this.cerrarModalEditar();
        this.abrirModalExito(
          "Usuario editado",
          "El usuario fue actualizado correctamente"
        );
        this.cargarUsuarios();
      },
      error: (err) => {
        this.cerrarModalEditar();
        this.abrirModalError(
          "Error al editar",
          "No se pudo actualizar el usuario"
        );

        console.error(err);
      }
    });
    
  }
  actualizarNombre(valor: string) {
    this.formEditar.update(f => ({
      ...f,
      nombre_completo: valor
    }));
  }

  actualizarTelefono(valor: string) {
    this.formEditar.update(f => ({
      ...f,
      telefono: valor
    }));
  }

  modalAbiertoExito = signal(false);
  modalAbiertoError = signal(false);

  accionExitosa: string = "";
  mensajeExitoso: string = "";

  accionError: string = "";
  mensajeError: string = "";

  abrirModalExito(accion: string, mensaje: string) {
    this.accionExitosa = accion;
    this.mensajeExitoso = mensaje;
    this.modalAbiertoExito.set(true);
  }

  cerrarModalExito() {
    this.modalAbiertoExito.set(false);
  }

  abrirModalError(accion: string, mensaje: string) {
    this.accionError = accion;
    this.mensajeError = mensaje;
    this.modalAbiertoError.set(true);
  }

  cerrarModalError() {
    this.modalAbiertoError.set(false);
  }



}
