import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

// 🔹 1. Agregamos la interfaz genérica para manejar tus nuevas respuestas del backend
export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

export interface PerfilModelo {
  id: string;
  nombre: string;
  fechaNac: string;
  telefono: string;
  correo: string;
  matricula: string;
  departamento: string;
  carnet: string;
  admin: string;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private fb = inject(FormBuilder);

  pdf?: SafeResourceUrl;
  medico?: PerfilModelo;

  // Variables para modales
  showCarnetModal = false;
  showMatriculaModal = false;

  showPasswordModal = false;
  loadingPassword = false;
  passwordError = '';
  passwordSuccess = '';

  passwordForm = this.fb.group({
    nueva_contrasena: ['', [Validators.required, Validators.minLength(12)]],
    confirmar_contrasena: ['', [Validators.required]]
  });

  get pf() { return this.passwordForm.controls; }

  // IDs de usuario
  idUsuario = localStorage.getItem('id_usuario');
  rol = localStorage.getItem('rol');
  idRol = localStorage.getItem('id_rol');

  ngOnInit() {
    this.cargarPerfil();
  }

  cargarPerfil() {
    console.log('Cargando perfil médico, ID:', this.idUsuario);

    // 🔹 2. Tipamos el get indicando que recibiremos un ApiResponse que contiene un PerfilModelo
    this.http.get<ApiResponse<PerfilModelo>>(`${environment.apiUrl}/medicos/perfil/${this.idUsuario}`, { withCredentials: true })
      .subscribe({
        next: (response) => {
          // 🔹 3. Extraemos el objeto del médico desde response.data
          this.medico = response.data;
          console.log('Médico cargado:', this.medico);

          if (this.medico && this.medico.matricula) {
            this.pdf = this.sanitizer.bypassSecurityTrustResourceUrl(this.medico.matricula);
          }
        },
        error: (err) => {
          console.error('Error al obtener médico:', err);
        }
      });
  }

  // Método para redirigir a editar perfil
  editarPerfil() {
    console.log('Redirigiendo a editar perfil médico...');
    this.router.navigate(['/medico/editar-medico']);
  }

  // Métodos para modales
  verCarnet() {
    if (this.medico?.carnet) {
      this.showCarnetModal = true;
    }
  }

  cerrarCarnetModal() {
    this.showCarnetModal = false;
  }

  abrirMatricula() {
    if (this.pdf) {
      this.showMatriculaModal = true;
    }
  }

  cerrarMatriculaModal() {
    this.showMatriculaModal = false;
  }

  abrirModalPassword() {
    this.showPasswordModal = true;
    this.passwordError = '';
    this.passwordSuccess = '';
    this.passwordForm.reset();
  }

  cerrarModalPassword() {
    this.showPasswordModal = false;
  }

  cambiarPassword() {
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
    
    this.http.put<any>(`${environment.apiUrl}/usuario/${id}/password`, { contrasena: nueva }).subscribe({
      next: (res) => {
        this.passwordSuccess = 'Contraseña actualizada correctamente';
        this.loadingPassword = false;
        setTimeout(() => {
          this.cerrarModalPassword();
        }, 2000);
      },
      error: (err) => {
        this.passwordError = err.error?.message || err.error?.error || 'Error al cambiar la contraseña';
        this.loadingPassword = false;
      }
    });
  }
}