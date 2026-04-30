import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- Necesario para usar [ngClass]
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog'; // <-- IMPORTAMOS MatDialogModule AQUÍ

interface ModalData {
  tipo: 'success' | 'update' | 'delete';
  mensaje: string;
}

@Component({
  selector: 'app-modal-generico',
  standalone: true, // <-- IMPORTANTE: Dile que es standalone
  imports: [CommonModule, MatDialogModule], // <-- ¡AQUÍ ESTÁ LA SOLUCIÓN AL ERROR!
  templateUrl: './success.html',
  styleUrls: ['./success.scss'] 
})
export class ModalGenericoComponent {

  constructor(
    public dialogRef: MatDialogRef<ModalGenericoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalData
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}