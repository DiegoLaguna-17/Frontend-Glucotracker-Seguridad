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

  // ==================== NUEVAS VARIABLES PARA RETRASO PROGRESIVO ====================
  // Contador de intentos fallidos de LOGIN (credenciales incorrectas)
  private failedLoginAttempts = 0;
  
  // Contador de intentos fallidos de CÓDIGO DE VERIFICACIÓN dentro de la misma sesión
  private failedCodeAttemptsInSession = 0;
  
  // Bandera para saber si estamos en el primer error de código
  private isFirstCodeError = true;
  
  // Variables para el retraso progresivo del LOGIN
  isButtonDisabled = signal(false);
  buttonText = signal('Ingresar');
  private countdownInterval: any;
  
  // Modal específico para errores de código de verificación
  showCodeErrorModal = signal(false);
  codeErrorMessage = signal('');
  // ==================== FIN NUEVAS VARIABLES ====================

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

  // ==================== MÉTODOS PARA RETRASO PROGRESIVO ====================
  
  // Método para calcular los segundos según intentos fallidos de LOGIN
  private getDelaySeconds(): number {
    if (this.failedLoginAttempts === 1) return 5;      // 1er error: 5 segundos
    if (this.failedLoginAttempts === 2) return 7;      // 2do error: 7 segundos
    return 10;  // 3er error y siguientes: 10 segundos
  }

  // Inicia la cuenta regresiva para el botón de LOGIN
  startCountdown(seconds: number) {
    this.isButtonDisabled.set(true);
    let currentSeconds = seconds;
    this.buttonText.set(`Intentar de nuevo en ${currentSeconds}`);
    
    this.countdownInterval = setInterval(() => {
      currentSeconds--;
      if (currentSeconds > 0) {
        this.buttonText.set(`Intentar de nuevo en ${currentSeconds}`);
      } else {
        this.buttonText.set('Ingresar');
        this.isButtonDisabled.set(false);
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  // Limpia la cuenta regresiva
  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.isButtonDisabled.set(false);
    this.buttonText.set('Ingresar');
  }

  // Reinicia todos los contadores de intentos fallidos
  private resetAllFailedAttempts() {
    this.failedLoginAttempts = 0;
    this.failedCodeAttemptsInSession = 0;
    this.isFirstCodeError = true;
  }

  // Método específico para manejar error de código de verificación
  private handleCodeVerificationError(errorMessage: string) {
    this.failedCodeAttemptsInSession++;
    
    if (this.failedCodeAttemptsInSession === 1) {
      // Primer error de código: solo mostrar modal y esperar 5 segundos
      this.codeErrorMessage.set(errorMessage);
      this.showCodeErrorModal.set(true);
      this.loading.set(false);
      
      // Auto-cerrar el modal después de 2 segundos
      setTimeout(() => {
        this.showCodeErrorModal.set(false);
      }, 2000);
      
    } else {
      // Segundo o más errores de código: cuenta como fallo de login
      this.failedLoginAttempts++;
      console.log(`Código incorrecto por segunda vez. Fallo de login #${this.failedLoginAttempts}`);
      
      // Mostrar modal de error y cerrar el modal de verificación
      this.errorMessage.set(`Código incorrecto repetido. ${errorMessage}`);
      this.showErrorModal.set(true);
      
      // Cerrar el modal de verificación
      this.showVerificationModal.set(false);
      
      // Limpiar credenciales
      this.loginCredentials = null;
      this.loading.set(false);
      
      // Reiniciar el contador de errores de código para la próxima vez
      this.failedCodeAttemptsInSession = 0;
      this.isFirstCodeError = true;
    }
  }
  
  // ==================== FIN MÉTODOS PARA RETRASO PROGRESIVO ====================

  // MODIFICADO: Ahora incluye verificación de isButtonDisabled
  canSubmit() {
    return this.form.valid && !this.loading() && !this.isButtonDisabled();
  }

  // MODIFICADO: Ahora maneja los intentos fallidos y el retraso
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Limpiar cualquier cuenta regresiva previa
    this.clearCountdown();

    this.loading.set(true);

    const credentials = {
      correo: this.form.value.usuario || '',
      contrasena: this.form.value.contrasena || ''
    };

    // Llamada al endpoint que envía OTP
    this.http.post<ApiResponse<any>>(
      environment.apiUrl + '/login',
      credentials,
      { withCredentials: true }
    )
      .subscribe({
        next: (res) => {
          console.log('Respuesta login:', res);
          
          // NUEVO: Login exitoso - Reiniciamos todos los contadores
          this.resetAllFailedAttempts();
          
          this.loginCredentials = {
            correo: credentials.correo,
            contrasena: credentials.contrasena,
            id_usuario: res.data.id_usuario
          };
          
          // Reiniciar contador de errores de código para esta nueva sesión de verificación
          this.failedCodeAttemptsInSession = 0;
          this.isFirstCodeError = true;

          this.showVerificationModal.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error de login:', err);
          
          // NUEVO: Incrementamos el contador de intentos fallidos de LOGIN
          this.failedLoginAttempts++;
          console.log(`Login fallido #${this.failedLoginAttempts}`);

          this.showErrorModal.set(true);
          // Extraemos el mensaje de error estandarizado del backend
          this.errorMessage.set(err.error?.message || 'Error al conectar con el servidor');
          this.loading.set(false);
        }
      });
  }

  // MODIFICADO: Ahora maneja errores de código con el sistema progresivo
  verifyAndLogin(codeInput: HTMLInputElement) {
    const codigo = codeInput.value.trim();

    if (!this.loginCredentials || !this.loginCredentials.id_usuario) {
      console.error('No hay credenciales guardadas');
      this.showErrorModal.set(true);
      this.errorMessage.set('Error interno: credenciales no encontradas');
      return;
    }

    if (!codigo || codigo.length !== 6) {
      // NUEVO: Usar el manejador de errores de código
      this.handleCodeVerificationError('Ingresa un código válido de 6 dígitos');
      return;
    }

    this.loading.set(true);

    this.http.post<ApiResponse<any>>(environment.apiUrl + '/verify-otp', {
      id_usuario: this.loginCredentials.id_usuario,
      codigo
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        console.log('Login completado con OTP:', res);
        
        // NUEVO: Login exitoso - Reiniciamos todos los contadores
        this.resetAllFailedAttempts();

        // Ajuste flexible para leer los datos del usuario
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
        
        // NUEVO: Usar el manejador de errores de código
        this.handleCodeVerificationError(err.error?.message || 'Código incorrecto o expirado');
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

  // MODIFICADO: Ahora limpia las credenciales y reinicia contadores de código
  cancelVerification() {
    this.showVerificationModal.set(false);
    this.loginCredentials = null;
    this.clearCountdown();
    // Reiniciamos solo los contadores de código, no los de login
    this.failedCodeAttemptsInSession = 0;
    this.isFirstCodeError = true;
  }

  // Método para cerrar modal de éxito inmediatamente
  closeSuccessModal() {
    this.showSuccessModal.set(false);
  }

  // MODIFICADO: Cierra modal de error y activa cuenta regresiva progresiva
  closeErrorModal() {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
    
    // Calculamos los segundos según los intentos fallidos de LOGIN
    const delaySeconds = this.getDelaySeconds();
    console.log(`Esperando ${delaySeconds} segundos (intento fallido #${this.failedLoginAttempts})`);
    
    // Iniciar cuenta regresiva para el botón de LOGIN
    this.startCountdown(delaySeconds);
  }
  
  // NUEVO: Método para cerrar el modal de error de código de verificación
  closeCodeErrorModal() {
    this.showCodeErrorModal.set(false);
    this.codeErrorMessage.set('');
    // No hay cuenta regresiva aquí, solo se cierra el modal
  }

  // Métodos para redirección a registros
  irARegistroPaciente() {
    this.router.navigate(['/solicitar-acceso']);
  }

  irARegistroMedico() {
    this.router.navigate(['/solicitar-medico']);
  }

  get f() { return this.form.controls; }

  // MODIFICADO: Inicialización de contadores
  ngOnInit(): void {
    localStorage.clear();
    // Inicializamos todos los contadores
    this.failedLoginAttempts = 0;
    this.failedCodeAttemptsInSession = 0;
    this.isFirstCodeError = true;
  }

  // Limpiar intervalo cuando el componente se destruya
  ngOnDestroy(): void {
    this.clearCountdown();
  }
}