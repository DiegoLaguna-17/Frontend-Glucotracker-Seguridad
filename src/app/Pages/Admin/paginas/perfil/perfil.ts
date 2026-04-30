import { Component, inject, OnInit } from '@angular/core';
import { PerfilAdmin } from '../componentes/card-admin-a/card-admin-a';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [HttpClientModule, CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.scss'],
})
export class Perfil implements OnInit {

  administrador!: PerfilAdmin;
  idUsuario = localStorage.getItem('id_usuario');

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  showPasswordModal = false;
  loadingPassword = false;
  passwordError = '';
  passwordSuccess = '';

  passwordForm = this.fb.group({
    nueva_contrasena: ['', [Validators.required, Validators.minLength(12)]],
    confirmar_contrasena: ['', [Validators.required]]
  });

  get pf() {
    return this.passwordForm.controls;
  }

  ngOnInit(): void {
    if (this.idUsuario) {
      this.cargarPerfil();
    } else {
      console.error('No se encontró el ID del usuario en sesión.');
    }
  }

  cargarPerfil(): void {

    this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/administradores/perfilAdmin/${this.idUsuario}`,
      { withCredentials: true }
    ).subscribe({

      next: (res: ApiResponse<any>) => {

        const data = res.data;

        this.administrador = {
          id: data.id.toString(),
          nombre: data.nombre,
          correo: data.correo,
          fechaNac: data.fechaNac,
          telefono: data.telefono,
          cargo: data.cargo,
          fechain: data.fechaIn,
          admitidopor: data.admitidoPor
        };

        console.log('Administrador cargado correctamente:', this.administrador);
      },

      error: (err: any) => {

        const mensajeError =
          err.error?.message ||
          'Ocurrió un error inesperado al conectar con el servidor';

        console.error('Error al obtener administrador:', mensajeError);
      }
    });
  }

  abrirModalPassword(): void {
    this.showPasswordModal = true;
    this.passwordError = '';
    this.passwordSuccess = '';
    this.passwordForm.reset();
  }

  cerrarModalPassword(): void {
    this.showPasswordModal = false;
  }

  cambiarPassword(): void {

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const nueva = this.passwordForm.value.nueva_contrasena;
    const confirm = this.passwordForm.value.confirmar_contrasena;

    if (nueva !== confirm) {
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }

    this.loadingPassword = true;
    this.passwordError = '';

    const id = localStorage.getItem('id_usuario');

    this.http.put<any>(
      `${environment.apiUrl}/usuario/${id}/password`,
      { contrasena: nueva }
    ).subscribe({

      next: (res: any) => {

        this.passwordSuccess =
          'Contraseña actualizada correctamente';

        this.loadingPassword = false;

        setTimeout(() => {
          this.cerrarModalPassword();
        }, 2000);
      },

      error: (err: any) => {

        this.passwordError =
          err.error?.message ||
          err.error?.error ||
          'Error al cambiar la contraseña';

        this.loadingPassword = false;
      }
    });
  }
}