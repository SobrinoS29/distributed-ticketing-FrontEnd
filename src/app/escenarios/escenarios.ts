import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { EscenariosService } from '../escenarios.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-escenarios',
  imports: [CommonModule],
  providers: [EscenariosService],
  templateUrl: './escenarios.html',
  styleUrl: './escenarios.css'
})

export class Escenarios implements OnInit {

  escenarios: any = [];  // Any se usa para unificar el tipo de datos, ya que no se ha definido un modelo específico para escenarios, espectaculos o entradas
  terminoBusqueda: string = '';
  escenarioSeleccionado: any = null;  // Almacena el escenario seleccionado para mostrarlo centrado
  cargandoEspectaculos: boolean = false;  // Indica si se están cargando los espectáculos

  get escenariosFiltrados(): any[] {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    if (!termino) {
      return this.escenarios;
    }

    return this.escenarios.filter((escenario: any) =>
      String(escenario?.nombre ?? '').toLowerCase().includes(termino)
    );
  }
  
  ngOnInit(){  // El método ngOnInit se ejecuta una vez que el componente ha sido inicializado, es decir, después de que se han cargado los datos y se han renderizado los elementos en la vista, por lo que es un buen lugar para hacer la llamada a la API para obtener los escenarios, ya que así nos aseguramos de que la vista esté lista para mostrar los datos obtenidos de la API.
    this.getEscenarios();
  }

  constructor(
    private escenariosService: EscenariosService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  abrirEscenario(escenario:any, $event?: Event){
    // Evita que el evento de clic se propague a los elementos padre
    if($event) {
      $event.stopPropagation();
    }
    // Establecer el escenario seleccionado y centrarlo
    this.escenarioSeleccionado = { ...escenario, espectaculos: [] };
    this.cargandoEspectaculos = true;
    this.cdr.detectChanges();

    this.getEspectaculos(this.escenarioSeleccionado);
  }

  cerrarEscenario(){
    this.cargandoEspectaculos = false;
    this.escenarioSeleccionado = null;
  }

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

  actualizarBusqueda(event: Event) {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda = input?.value ?? '';
  }

  getImagenEscenario(escenario: any): string {
    const nombre = String(escenario?.nombre ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-'); // reemplaza espacios por guiones

    return `/assets/${nombre}.jpg`;
  }

  getEspectaculos(escenario: any) {
    this.escenariosService.getEspectaculos(escenario).subscribe(
      (response: any) => {
        const espectaculos = this.normalizarEspectaculos(response);

        // Mantener 1 segundo el mensaje de carga y luego mostrar lista.
        setTimeout(() => {
          if (this.escenarioSeleccionado?.id !== escenario.id) {
            return;
          }
          this.escenarioSeleccionado.espectaculos = [...espectaculos];
          this.cargandoEspectaculos = false;
          this.cdr.detectChanges();
        }, 1000);
      },
      (error: any) => {
        console.error('Error fetching espectaculos:', error);
        setTimeout(() => {
          if (this.escenarioSeleccionado?.id !== escenario.id) {
            return;
          }
          this.escenarioSeleccionado.espectaculos = [];
          this.cargandoEspectaculos = false;
          this.cdr.detectChanges();
        }, 1000);
      }
    );
  }

  private normalizarEspectaculos(response: any): any[] {
    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response);
        return this.normalizarEspectaculos(parsed);
      } catch {
        return [];
      }
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.espectaculos)) {
      return response.espectaculos;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (response && typeof response === 'object') {
      const values = Object.values(response);
      if (Array.isArray(values) && values.every((v) => typeof v === 'object')) {
        return values as any[];
      }
    }

    return [];
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

  irASeleccionarEntradas(espectaculo: any, escenario: any) {
    this.router.navigate(['/seleccionarEntradas'], {
      queryParams: { espectaculo: encodeURIComponent(JSON.stringify(espectaculo)), escenario: encodeURIComponent(JSON.stringify(escenario)) }
    });
  }

}

