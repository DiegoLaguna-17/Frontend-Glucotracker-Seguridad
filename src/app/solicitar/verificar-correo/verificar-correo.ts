import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-verificar-correo',
  templateUrl: './verificar-correo.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./verificar-correo.scss']
})
export class VerificarCorreo implements OnInit {

  estado: 'loading' | 'success' | 'error' = 'loading';
  mensajeError: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.estado = 'error';
      this.mensajeError = 'Token no válido';
      return;
    }

    this.http.get(`${environment.apiUrl}/solicitudes/verificarCorreo?token=${token}`)
      .subscribe({
        next: () => {
          this.estado = 'success';
        },
        error: (err) => {
          this.estado = 'error';
          this.mensajeError = err.error?.message || 'Error al verificar';
        }
      });
  }

  irLogin() {
    this.router.navigate(['/login']);
  }
}