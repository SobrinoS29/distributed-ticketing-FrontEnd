import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

type Zona = 'Pista' | 'Zona Norte' | 'Zona Sur';

interface ZonaInfo {
  nombreVisible: string;
  disponibles: number;
  precioUnitario: number;
}

interface Espectaculo {
  id?: number | string;
  artista?: string;
  fecha?: string;
  id_escenario?: string;
  entradas?: {
    total?: number;
    libres?: number;
    reservadas?: number;
    vendidas?: number;
  }
};

interface Escenario {
  id?: number | string;
  nombre?: string;
  descripcion?: string;
  espectaculos?: Espectaculo[];
}

@Component({
  selector: 'app-seleccionar-entradas',
  imports: [CommonModule],
  templateUrl: './seleccionar-entradas.html',
  styleUrl: './seleccionar-entradas.css',
})
export class SeleccionarEntradas implements OnInit {
  espectaculo: Espectaculo | null = null;
  escenario: Escenario | null = null;
  mostrarSelectorZona = false;
  zonaSeleccionada: Zona | null = null;
  cantidadEntradas = 1;

  private readonly zonasInfo: Record<Zona, ZonaInfo> = {
    Pista: {
      nombreVisible: 'Pista',
      disponibles: 120,
      precioUnitario: 48,
    },
    'Zona Norte': {
      nombreVisible: 'Grada Norte',
      disponibles: 64,
      precioUnitario: 35,
    },
    'Zona Sur': {
      nombreVisible: 'Grada Sur',
      disponibles: 72,
      precioUnitario: 33,
    }
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const espectaculoParam = params.get('espectaculo');
      if (espectaculoParam) {
        try {
          this.espectaculo = JSON.parse(decodeURIComponent(espectaculoParam));
        } catch (error) {
          console.error('Error al parsear el espectaculo:', error);
          this.espectaculo = null;
        }
      } else {
        console.warn('No se recibió el parámetro de espectaculo.');
        this.espectaculo = null;
      }

      const escenarioParam = params.get('escenario');
      if (escenarioParam) {
        try {
          this.escenario = JSON.parse(decodeURIComponent(escenarioParam));
        } catch (error) {
          console.error('Error al parsear el escenario:', error);
          this.escenario = null;
        }
      } else {
        console.warn('No se recibió el parámetro de escenario.');
        this.escenario = null;
      }
    });
  }

  toggleSelectorZona(): void {
    this.mostrarSelectorZona = !this.mostrarSelectorZona;
  }

  //////////////Eliminar codigo puesto de postureo////////////////////
  seleccionarZona(zona: Zona): void {
    this.zonaSeleccionada = zona;
    this.cantidadEntradas = 1;
  }

  get zonaInfoActual(): ZonaInfo | null {
    if (!this.zonaSeleccionada) {
      return null;
    }
    return this.zonasInfo[this.zonaSeleccionada];
  }

  get maxEntradasSeleccionables(): number {
    const disponibles = this.zonaInfoActual?.disponibles ?? 0;
    return Math.max(1, Math.min(10, disponibles));
  }

  get precioTotalEstimado(): number {
    return this.cantidadEntradas * (this.zonaInfoActual?.precioUnitario ?? 0);
  }

  incrementarCantidad(): void {
    if (this.cantidadEntradas < this.maxEntradasSeleccionables) {
      this.cantidadEntradas += 1;
    }
  }

  decrementarCantidad(): void {
    if (this.cantidadEntradas > 1) {
      this.cantidadEntradas -= 1;
    }
  }

}
