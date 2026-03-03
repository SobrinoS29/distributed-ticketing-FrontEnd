import { ChangeDetectorRef, Component } from '@angular/core';
import { EscenariosService } from '../escenarios.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-escenarios',
  imports: [CommonModule],
  providers: [EscenariosService],
  templateUrl: './escenarios.html',
  styleUrl: './escenarios.css',
})
export class Escenarios {
  
  escenarios: any = [];  // Any se usa para unificar el tipo de datos, ya que no se ha definido un modelo específico para escenarios, espectaculos o entradas

  constructor(
    private escenariosService: EscenariosService,
    private cdr: ChangeDetectorRef
  ) {}

  getEscenarios() {  // En una llamada http podemos obtener response (OK) o un error (KO), por eso se usan dos parámetros en el subscribe, uno para cada caso
    this.escenariosService.getEscenarios().subscribe(
      (response) => {
        this.escenarios = response;
        this.cdr.detectChanges();  // Evita dos llamadas a detectChanges() en el mismo ciclo de detección evitando errores
      },
      (error) => {
        console.error('Error fetching escenarios:', error);
      }
    );
  }

  getEspectaculos(escenario: any) {
    this.escenariosService.getEspectaculos(escenario).subscribe(
      (response: any) => {
        escenario.espectaculos = response;
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Error fetching espectaculos:', error);
      }
    );
  }

  getEntradas(espectaculo: any) {
    this.escenariosService.getEntradas(espectaculo).subscribe(
      (response: any) => {
        espectaculo.entradas = response;
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Error fetching entradas:', error);
      }
    );
  }
}

