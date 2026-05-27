import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  status: string;
  code: number;
  message: string;
  data: T;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule] ,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, OnDestroy {
  private fb = new FormBuilder();

  // ==================== ESTADOS DE CARGA INDEPENDIENTES ====================
  loadingLogin = signal(false);
  loadingVerify = signal(false);
  loadingRecover = signal(false);
  loadingUnlock = signal(false);

  // ==================== VARIABLES DINÁMICAS PARA MODALES ====================
  showSuccessModal = signal(false);
  successTitle = signal('¡Operación Exitosa!');
  successMessage = signal('');

  showErrorModal = signal(false);
  errorTitle = signal('Error');
  errorMessage = signal('');

  // ==================== VARIABLES PARA RETRASO PROGRESIVO ====================
  private failedLoginAttempts = 0;
  private failedCodeAttemptsInSession = 0;
  private isFirstCodeError = true;
  
  isButtonDisabled = signal(false);
  buttonText = signal('Ingresar');
  private countdownInterval: any;
  
  showCodeErrorModal = signal(false);
  codeErrorMessage = signal('');

  // Modales base
  showVerificationModal = signal(false);
  showPassword = signal(false);

  // Variables para la recuperación de contraseña
  showRecoverEmailModal = signal(false);
  showRecoverCodeModal = signal(false);
  showRecoverPasswordModal = signal(false);
  recoverEmail = '';
  recoverJwtToken = '';

  // Variables para desbloqueo de cuenta
  showUnlockPromptModal = signal(false);
  showUnlockCodeModal = signal(false);
  unlockEmail = '';

  recoverForm = this.fb.group({
    nueva_contrasena: ['', [Validators.required, Validators.minLength(12)]],
    confirmar_contrasena: ['', [Validators.required]]
  });

  get rf() { return this.recoverForm.controls; }

  private loginCredentials: { id_usuario?: number, correo: string, contrasena: string } | null = null;

  constructor(private router: Router, private http: HttpClient) { }

  form = this.fb.group({
    usuario: ['', [Validators.required, Validators.minLength(3)]],
    contrasena: ['', [Validators.required, Validators.minLength(3)]],
  });

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  forgotPassword() {
    this.showRecoverEmailModal.set(true);
  }

  // ==================== MÉTODOS PARA RETRASO PROGRESIVO ====================
  private getDelaySeconds(): number {
    if (this.failedLoginAttempts === 1) return 5;
    if (this.failedLoginAttempts === 2) return 7;
    return 10;
  }

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

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.isButtonDisabled.set(false);
    this.buttonText.set('Ingresar');
  }

  private resetAllFailedAttempts() {
    this.failedLoginAttempts = 0;
    this.failedCodeAttemptsInSession = 0;
    this.isFirstCodeError = true;
  }

  private handleCodeVerificationError(errorMsg: string) {
    this.failedCodeAttemptsInSession++;
    
    if (this.failedCodeAttemptsInSession === 1) {
      this.codeErrorMessage.set(errorMsg);
      this.showCodeErrorModal.set(true);
      this.loadingVerify.set(false);
      
      setTimeout(() => {
        this.showCodeErrorModal.set(false);
      }, 2000);
      
    } else {
      this.failedLoginAttempts++;
      this.errorTitle.set('Error de Verificación');
      this.errorMessage.set(`Código incorrecto repetido. ${errorMsg}`);
      this.showErrorModal.set(true);
      
      this.showVerificationModal.set(false);
      this.loginCredentials = null;
      this.loadingVerify.set(false);
      
      this.failedCodeAttemptsInSession = 0;
      this.isFirstCodeError = true;
    }
  }

  canSubmit() {
    return this.form.valid && !this.loadingLogin() && !this.isButtonDisabled();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.clearCountdown();
    this.loadingLogin.set(true);

    const credentials = {
      correo: this.form.value.usuario || '',
      contrasena: this.form.value.contrasena || ''
    };

    this.http.post<ApiResponse<any>>(
      environment.apiUrl + '/login',
      credentials,
      { withCredentials: true }
    )
      .subscribe({
        next: (res) => {
          this.resetAllFailedAttempts();
          
          this.loginCredentials = {
            correo: credentials.correo,
            contrasena: credentials.contrasena,
            id_usuario: res.data.id_usuario
          };
          
          this.failedCodeAttemptsInSession = 0;
          this.isFirstCodeError = true;

          this.showVerificationModal.set(true);
          this.loadingLogin.set(false);
        },
        error: (err) => {
          this.failedLoginAttempts++;

          if (err.error?.code === 'PASSWORD_EXPIRED') {
            this.recoverEmail = credentials.correo;
            this.http.post<any>(environment.apiUrl + '/seguridad/recuperar-contrasena', { correo: this.recoverEmail }).subscribe({
              next: () => {
                this.errorTitle.set('Contraseña Expirada');
                this.errorMessage.set(err.error?.error || 'Tu contraseña ha expirado. Te hemos enviado un código para cambiarla.');
                this.showErrorModal.set(true);

                setTimeout(() => {
                  this.showErrorModal.set(false);
                  this.showRecoverCodeModal.set(true);
                }, 2500);

                this.loadingLogin.set(false);
              },
              error: (recoveryErr) => {
                this.errorTitle.set('Error de Recuperación');
                this.errorMessage.set('Error al solicitar cambio de contraseña: ' + (recoveryErr.error?.error || ''));
                this.showErrorModal.set(true);
                this.loadingLogin.set(false);
              }
            });
            return;
          }

          if (err.error?.data?.code === 'UNLOCK_REQUIRED') {
            this.unlockEmail = credentials.correo;
            this.showUnlockPromptModal.set(true);
            this.loadingLogin.set(false);
            return;
          }

          if (err.error?.data?.code === 'ACCOUNT_BLOCKED_NOW') {
            this.errorTitle.set('Cuenta Bloqueada');
            this.errorMessage.set('Tu cuenta ha sido bloqueada por múltiples intentos fallidos.');
            this.showErrorModal.set(true);
            this.loadingLogin.set(false);
            return;
          }

          this.errorTitle.set('Error de Inicio de Sesión');
          this.errorMessage.set(err.error?.message || 'Error al conectar con el servidor');
          this.showErrorModal.set(true);
          this.loadingLogin.set(false);
        }
      });
  }

  verifyAndLogin(codeInput: HTMLInputElement) {
    const codigo = codeInput.value.trim();

    if (!this.loginCredentials || !this.loginCredentials.id_usuario) {
      this.errorTitle.set('Error Interno');
      this.errorMessage.set('Credenciales no encontradas');
      this.showErrorModal.set(true);
      return;
    }

    if (!codigo || codigo.length !== 6) {
      this.handleCodeVerificationError('Ingresa un código válido de 6 dígitos');
      return;
    }

    this.loadingVerify.set(true);

    this.http.post<ApiResponse<any>>(environment.apiUrl + '/verify-otp', {
      id_usuario: this.loginCredentials.id_usuario,
      codigo
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        this.resetAllFailedAttempts();

        const usuarioData = res.data.usuario || res.data;
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
        
        // Configuramos modal dinámico de éxito
        this.successTitle.set('¡Inicio de Sesión Exitoso!');
        this.successMessage.set('Serás redirigido a tu panel');
        this.showSuccessModal.set(true);

        setTimeout(() => {
          if (usuarioData.cargo === 'soporte') {
            this.router.navigate(['/administrador']);
          } else if (usuarioData.cargo === 'admin') {
            this.router.navigate(['/osi']);
          } else if (usuarioData.rol === 'medico'|| usuarioData.rol === 'auditor_medico') {
            this.router.navigate(['/medico']);
          }
          else if (usuarioData.rol.includes('supervisor')) {
            this.router.navigate(['/medico/pacientes/activos']);
          }
          else if(usuarioData.rol === 'paciente'|| usuarioData.rol === 'auditor_paciente'){
            this.router.navigate(['/paciente']);
          }
        }, 2000);

        this.loadingVerify.set(false);
      },
      error: (err) => {
        this.handleCodeVerificationError(err.error?.message || 'Código incorrecto o expirado');
      }
    });
  }

  // --- MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA ---

  solicitarRecuperacion(emailInput: HTMLInputElement) {
    const correo = emailInput.value.trim();
    if (!correo) {
      this.errorTitle.set('Campos Incompletos');
      this.errorMessage.set('Ingresa tu correo electrónico');
      this.showErrorModal.set(true);
      return;
    }
    
    this.loadingRecover.set(true);
    
    this.http.post<any>(environment.apiUrl + '/seguridad/recuperar-contrasena', { correo }).subscribe({
      next: (res) => {
        this.recoverEmail = correo;
        this.showRecoverEmailModal.set(false);
        this.showRecoverCodeModal.set(true);
        this.loadingRecover.set(false);
      },
      error: (err) => {
        this.errorTitle.set('Error de Recuperación');
        this.errorMessage.set(err.error?.error || 'Error al solicitar recuperación');
        this.showErrorModal.set(true);
        this.loadingRecover.set(false);
      }
    });
  }

  verificarCodigoRecuperacion(codeInput: HTMLInputElement) {
    const codigo = codeInput.value.trim();
    if (!codigo || codigo.length !== 6) {
      this.errorTitle.set('Código Inválido');
      this.errorMessage.set('Ingresa un código válido de 6 dígitos');
      this.showErrorModal.set(true);
      return;
    }
    
    this.loadingRecover.set(true);
    
    this.http.post<any>(environment.apiUrl + '/seguridad/verificar-codigo-recuperacion', {
      correo: this.recoverEmail,
      codigo
    }).subscribe({
      next: (res) => {
        this.recoverJwtToken = res.token;
        this.showRecoverCodeModal.set(false);
        this.showRecoverPasswordModal.set(true);
        this.loadingRecover.set(false);
      },
      error: (err) => {
        this.errorTitle.set('Error de Verificación');
        this.errorMessage.set(err.error?.error || 'Código incorrecto o expirado');
        this.showErrorModal.set(true);
        this.loadingRecover.set(false);
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
      this.errorTitle.set('Error de Validación');
      this.errorMessage.set('Las contraseñas no coinciden');
      this.showErrorModal.set(true);
      return;
    }
    
    this.loadingRecover.set(true);
    
    this.http.post<any>(environment.apiUrl + '/seguridad/cambiar-contrasena',
      { nueva_contrasena: nueva },
      { headers: { Authorization: 'Bearer ' + this.recoverJwtToken } }
    ).subscribe({
      next: (res) => {
        this.showRecoverPasswordModal.set(false);
        
        this.successTitle.set('¡Contraseña Actualizada!');
        this.successMessage.set('Tu contraseña ha sido cambiada con éxito. Ya puedes iniciar sesión.');
        this.showSuccessModal.set(true);
        
        this.recoverForm.reset();
        this.recoverJwtToken = '';
        this.recoverEmail = '';
        setTimeout(() => this.showSuccessModal.set(false), 3000);
        this.loadingRecover.set(false);
      },
      error: (err) => {
        this.errorTitle.set('Error al Cambiar Contraseña');
        this.errorMessage.set(err.error?.error || 'Error al cambiar contraseña');
        this.showErrorModal.set(true);
        this.loadingRecover.set(false);
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

  cancelVerification() {
    this.showVerificationModal.set(false);
    this.loginCredentials = null;
    this.clearCountdown();
    this.failedCodeAttemptsInSession = 0;
    this.isFirstCodeError = true;
  }

  closeSuccessModal() {
    this.showSuccessModal.set(false);
  }

  closeErrorModal() {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
    
    const delaySeconds = this.getDelaySeconds();
    this.startCountdown(delaySeconds);
  }
  
  closeCodeErrorModal() {
    this.showCodeErrorModal.set(false);
    this.codeErrorMessage.set('');
  }

  // --- MÉTODOS DE DESBLOQUEO DE CUENTA ---

  solicitarDesbloqueo() {
    this.loadingUnlock.set(true);
    
    this.http.post<any>(environment.apiUrl + '/seguridad/solicitar-desbloqueo', { correo: this.unlockEmail }).subscribe({
      next: (res) => {
        this.showUnlockPromptModal.set(false);
        this.showUnlockCodeModal.set(true);
        this.loadingUnlock.set(false);
      },
      error: (err) => {
        this.showUnlockPromptModal.set(false);
        this.errorTitle.set('Error al Solicitar Desbloqueo');
        this.errorMessage.set(err.error?.error || err.error?.message || 'Error al solicitar desbloqueo');
        this.showErrorModal.set(true);
        this.loadingUnlock.set(false);
      }
    });
  }

  confirmarDesbloqueo(codeInput: HTMLInputElement) {
    const codigo = codeInput.value.trim();
    if (!codigo || codigo.length !== 6) {
      this.errorTitle.set('Código Inválido');
      this.errorMessage.set('Ingresa un código válido de 6 dígitos');
      this.showErrorModal.set(true);
      return;
    }
    
    this.loadingUnlock.set(true);
    
    this.http.post<any>(environment.apiUrl + '/seguridad/confirmar-desbloqueo', {
      correo: this.unlockEmail,
      codigo
    }).subscribe({
      next: (res) => {
        this.showUnlockCodeModal.set(false);
        this.successTitle.set('¡Cuenta Desbloqueada!');
        this.successMessage.set('Tu cuenta ha sido reactivada. Ya puedes ingresar.');
        this.showSuccessModal.set(true);
        setTimeout(() => this.showSuccessModal.set(false), 3000);
        this.loadingUnlock.set(false);
      },
      error: (err) => {
        this.errorTitle.set('Error de Desbloqueo');
        this.errorMessage.set(err.error?.error || err.error?.message || 'Código incorrecto o expirado');
        this.showErrorModal.set(true);
        this.loadingUnlock.set(false);
      }
    });
  }

  cancelarDesbloqueo() {
    this.showUnlockPromptModal.set(false);
    this.showUnlockCodeModal.set(false);
    this.unlockEmail = '';
  }

  irARegistroPaciente() {
    this.router.navigate(['/solicitar-acceso']);
  }

  irARegistroMedico() {
    this.router.navigate(['/solicitar-medico']);
  }

  get f() { return this.form.controls; }

  ngOnInit(): void {
    localStorage.clear();
    this.failedLoginAttempts = 0;
    this.failedCodeAttemptsInSession = 0;
    this.isFirstCodeError = true;
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }
}