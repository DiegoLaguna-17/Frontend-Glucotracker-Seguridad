import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// 🔹 1. Interfaz para las respuestas estandarizadas
export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private fb = new FormBuilder();
  loading = signal(false);

  // Variables para los modales
  showVerificationModal = signal(false);
  showSuccessModal = signal(false);
  showErrorModal = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  forgotPassword() {
    this.showRecoverEmailModal.set(true);
  }

  // Variables para la recuperación de contraseña
  showRecoverEmailModal = signal(false);
  showRecoverCodeModal = signal(false);
  showRecoverPasswordModal = signal(false);
  recoverEmail = '';
  recoverJwtToken = '';

  recoverForm = this.fb.group({
    nueva_contrasena: ['', [Validators.required, Validators.minLength(12)]],
    confirmar_contrasena: ['', [Validators.required]]
  });

  get rf() { return this.recoverForm.controls; }

  // Variable para guardar las credenciales temporalmente
  private loginCredentials: { id_usuario?: number, correo: string, contrasena: string } | null = null;

  constructor(private router: Router, private http: HttpClient) { }

  form = this.fb.group({
    usuario: ['', [Validators.required, Validators.minLength(3)]],
    contrasena: ['', [Validators.required, Validators.minLength(3)]],
  });

  canSubmit() {
    return this.form.valid && !this.loading();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const credentials = {
      correo: this.form.value.usuario || '',
      contrasena: this.form.value.contrasena || ''
    };

    // Llamada al endpoint que envía OTP
    this.http.post<ApiResponse<any>>( // 🔹 2. Tipamos la respuesta
      environment.apiUrl + '/login',
      credentials,
      { withCredentials: true }
    )
      .subscribe({
        next: (res) => {
          console.log('Respuesta login:', res);
          this.loginCredentials = {
            correo: credentials.correo,
            contrasena: credentials.contrasena,
            // 🔹 3. Extraemos el ID desde res.data
            id_usuario: res.data.id_usuario
          };

          this.showVerificationModal.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error de login:', err);

            this.showErrorModal.set(true);
          // 🔹 4. Extraemos el mensaje de error estandarizado del backend
            this.errorMessage.set(err.error?.message || 'Error al conectar con el servidor');
            this.loading.set(false);
          }
        });
    }

  // Método para verificar el código y hacer el login real
  verifyAndLogin(codeInput: HTMLInputElement) {
    const codigo = codeInput.value.trim();

    if (!this.loginCredentials || !this.loginCredentials.id_usuario) {
      console.error('No hay credenciales guardadas');
      this.showErrorModal.set(true);
      this.errorMessage.set('Error interno: credenciales no encontradas');
      return;
    }

      if (!codigo || codigo.length !== 6) {
        this.showErrorModal.set(true);
        this.errorMessage.set('Ingresa un código válido de 6 dígitos');
        return;
      }

    this.loading.set(true);

    this.http.post<ApiResponse<any>>(environment.apiUrl + '/verify-otp', {
      id_usuario: this.loginCredentials.id_usuario,
      codigo
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        console.log('Login completado con OTP:', res);

        // 🔹 5. Ajuste flexible para leer los datos del usuario (asumiendo que verify-otp también está estandarizado)
        // Si tu backend manda res.data.usuario, usa ese, si manda las propiedades directo en res.data, usa res.data
        const usuarioData = res.data.usuario || res.data;
        console.log(usuarioData)
        localStorage.setItem('id_usuario', usuarioData.id_usuario);
        localStorage.setItem('id_rol', usuarioData.id_rol);
        localStorage.setItem('rol', usuarioData.rol);

        if (usuarioData.rol == "administrador" && usuarioData.cargo) {
          localStorage.setItem('cargo', usuarioData.cargo);
        }

        if (usuarioData.permisos) {
          localStorage.setItem('permisos', JSON.stringify(usuarioData.permisos));
        }

        this.showVerificationModal.set(false);
        this.showSuccessModal.set(true);

        setTimeout(() => {
          if (usuarioData.cargo === 'soporte') {
            this.router.navigate(['/administrador']);
          } else if (usuarioData.cargo === 'admin') {
            this.router.navigate(['/osi']);
          } else if (usuarioData.rol === 'medico') {
            this.router.navigate(['/medico']);
          } else {
            this.router.navigate(['/paciente']);
          }
        }, 2000);

          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error de verificación OTP:', err);
          this.showErrorModal.set(true);
        // 🔹 6. Manejo del error para el OTP
          this.errorMessage.set(err.error?.message || 'Código incorrecto o expirado');
          this.loading.set(false);
        }
      });
    }

  // --- MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA ---

  solicitarRecuperacion(emailInput: HTMLInputElement) {
    const correo = emailInput.value.trim();
    if (!correo) {
      this.showErrorModal.set(true);
      this.errorMessage.set('Ingresa tu correo electrónico');
      return;
    }
    this.loading.set(true);
    console.log(environment.apiUrl + '/seguridad/recuperar-contrasena');
    this.http.post<any>(environment.apiUrl + '/seguridad/recuperar-contrasena', { correo }).subscribe({
      next: (res) => {
        this.recoverEmail = correo;
        this.showRecoverEmailModal.set(false);
        this.showRecoverCodeModal.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('ERROR COMPLETO:', err);
        console.error('STATUS:', err.status);
        console.error('BODY:', err.error);

        this.showErrorModal.set(true);
        this.errorMessage.set(err.error?.error || 'Error al solicitar recuperación');
        this.loading.set(false);
      }
    });
  }

  verificarCodigoRecuperacion(codeInput: HTMLInputElement) {
    const codigo = codeInput.value.trim();
    if (!codigo || codigo.length !== 6) {
      this.showErrorModal.set(true);
      this.errorMessage.set('Ingresa un código válido de 6 dígitos');
      return;
    }
    this.loading.set(true);
    this.http.post<any>(environment.apiUrl + '/seguridad/verificar-codigo-recuperacion', {
      correo: this.recoverEmail,
      codigo
    }).subscribe({
      next: (res) => {
        this.recoverJwtToken = res.token;
        this.showRecoverCodeModal.set(false);
        this.showRecoverPasswordModal.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('ERROR COMPLETO:', err);
        console.error('STATUS:', err.status);
        console.error('BODY:', err.error);

        this.showErrorModal.set(true);
        this.errorMessage.set(err.error?.error || 'Código incorrecto o expirado');
        this.loading.set(false);
      }
    });
  }

  restablecerContrasena() {
    if (this.recoverForm.invalid) {
      this.recoverForm.markAllAsTouched();
      return;
    }
    const nueva = this.recoverForm.value.nueva_contrasena;
    const confirm = this.recoverForm.value.confirmar_contrasena;
    if (nueva !== confirm) {
      this.showErrorModal.set(true);
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }
    this.loading.set(true);
    this.http.post<any>(environment.apiUrl + '/seguridad/cambiar-contrasena',
      { nueva_contrasena: nueva },
      { headers: { Authorization: 'Bearer ' + this.recoverJwtToken } }
    ).subscribe({
      next: (res) => {
        this.showRecoverPasswordModal.set(false);
        this.showSuccessModal.set(true);
        this.recoverForm.reset();
        this.recoverJwtToken = '';
        this.recoverEmail = '';
        setTimeout(() => this.showSuccessModal.set(false), 3000);
        this.loading.set(false);
      },
      error: (err) => {
        this.showErrorModal.set(true);
        this.errorMessage.set(err.error?.error || 'Error al cambiar contraseña');
        this.loading.set(false);
      }
    });
  }

  cancelarRecuperacion() {
    this.showRecoverEmailModal.set(false);
    this.showRecoverCodeModal.set(false);
    this.showRecoverPasswordModal.set(false);
    this.recoverEmail = '';
    this.recoverJwtToken = '';
    this.recoverForm.reset();
  }

  // Método para cancelar y limpiar credenciales
  cancelVerification() {
    this.showVerificationModal.set(false);
    this.loginCredentials = null;
  }

  // Método para cerrar modal de éxito inmediatamente
  closeSuccessModal() {
    this.showSuccessModal.set(false);
  }

  // Método para cerrar modal de error
  closeErrorModal() {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
  }

  // Métodos para redirección a registros
  irARegistroPaciente() {
    this.router.navigate(['/solicitar-acceso']);
  }

  irARegistroMedico() {
    this.router.navigate(['/solicitar-medico']);
  }

  get f() { return this.form.controls; }

  ngOnInit(): void {
    localStorage.clear();
  }
}