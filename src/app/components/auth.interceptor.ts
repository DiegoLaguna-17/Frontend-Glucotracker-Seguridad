import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, NgZone } from '@angular/core'; // <-- Importa NgZone
import { catchError, throwError } from 'rxjs';
import { AuthErrorService } from './auth-error.service';
export const authInterceptorError: HttpInterceptorFn = (req, next) => {
  const authErrorService = inject(AuthErrorService);
  const zone = inject(NgZone);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      
      console.log('🚨 INTERCEPTOR DE ERRORES ESCUCHÓ UN ESTADO:', error.status);

      if (error.status === 403) {
        console.log('✅ 403 DETECTADO: Intentando abrir el modal...');
        zone.run(() => {
          authErrorService.showModal();
        });
      }
      
      return throwError(() => error);
    })
  );
};