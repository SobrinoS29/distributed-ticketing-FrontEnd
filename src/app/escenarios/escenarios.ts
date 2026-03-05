import { ChangeDetectorRef, Component } from '@angular/core';
import { EscenariosService } from '../escenarios.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
    private cdr: ChangeDetectorRef,
    private router: Router
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

  /* Ejemplo de una llamdada anidada, primero obtenemos el número total de entradas y luego el número de entradas libres, así evitamos hacer dos llamadas a la API para cada espectaculo, una para obtener el número total de entradas y otra para obtener el número de entradas libres, lo hacemos en una sola llamada a la API que nos devuelve ambos datos.
  getNumeroDeEntradas(espectaculo: any) {
    this.escenariosService.getNumeroDeEntradas(espectaculo).subscribe(
      (response: any) => {
        espectaculo.entradasTotales = response;
        this.cdr.detectChanges();
        this.getEntradasLibres(espectaculo);
      },
      (error: any) => {
        console.error('Error fetching entradas:', error);
      }
    );
  }

  getEntradasLibres(espectaculo: any) {
    this.escenariosService.getEntradasLibres(espectaculo).subscribe(
      (response: any) => {
        espectaculo.entradasLibres = response;
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Error fetching entradas:', error);
      }
    );
  }
  */

  // Objeto de transferencia de datos (DTO) para obtener el número total de entradas y el número de entradas libres en una sola llamada a la API, evitando así hacer dos llamadas a la API para cada espectaculo, una para obtener el número total de entradas y otra para obtener el número de entradas libres, lo hacemos en una sola llamada a la API que nos devuelve ambos datos.
  getNumeroDeEntradas(espectaculo: any) {
    this.escenariosService.getNumeroDeEntradasComoDto(espectaculo).subscribe(
      (response: any) => {
        espectaculo.entradas = response;
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Error fetching entradas:', error);
      }
    );
  }

  irAComprarEntradas() {
    // Aquí iría la lógica para redirigir a la página de compra de entradas, por ejemplo usando el router de Angular
    this.router.navigate(['/compra']);
  }

}

