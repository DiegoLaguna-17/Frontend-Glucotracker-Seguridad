// import { Component } from '@angular/core';
// import { PacienteResumen } from '../../componentes/card-paciente-a/card-paciente-a';
// import { CommonModule } from '@angular/common';


// @Component({
//   selector: 'app-detalle-paciente-activo',
//   imports: [CommonModule],
//   templateUrl: './detalle-paciente-activo.html',
//   styleUrl: './detalle-paciente-activo.scss',
// })
// export class DetallePacienteActivo {
//    paciente!: PacienteResumen;
//    ngOnInit() {
//     // vienes navegando con: this.router.navigate(['...'], { state: { paciente }})
//     this.paciente = history.state.paciente as PacienteResumen;
//     console.log('Paciente completo:', this.paciente);
//   }
// }

import { Component } from '@angular/core';
import { PacienteResumen } from '../../componentes/card-paciente-a/card-paciente-a';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-detalle-paciente-activo',
  imports: [CommonModule],
  templateUrl: './detalle-paciente-activo.html',
  styleUrl: './detalle-paciente-activo.scss',
})
export class DetallePacienteActivo {
   paciente!: PacienteResumen;

   // Variables de estado para los permisos (inician en false/denegados por defecto)
   permisoRegistrarGlucosa: boolean = false;
   permisoVerHistorial: boolean = false;
   permisoEditarPerfil: boolean = false;

   ngOnInit() {
    // vienes navegando con: this.router.navigate(['...'], { state: { paciente }})
    this.paciente = history.state.paciente as PacienteResumen;
    console.log('Paciente completo:', this.paciente);
  }

  // Métodos para cambiar el estado de cada permiso
  toggleRegistrarGlucosa() {
    this.permisoRegistrarGlucosa = !this.permisoRegistrarGlucosa;
  }

  toggleVerHistorial() {
    this.permisoVerHistorial = !this.permisoVerHistorial;
  }

  toggleEditarPerfil() {
    this.permisoEditarPerfil = !this.permisoEditarPerfil;
  }
}