import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SeleccionarEntradasService } from '../seleccionar-entradas.service';

type Zona = 'Pista' | 'Zona Norte' | 'Zona Sur';

interface ZonaInfo {
  nombreVisible: string;
  disponibles: number;
  precioUnitario: number;
}

interface EntradaDisponibleTicket {
  entradaId: number;
  precioCentimos: number;
  espectaculoId: number;
  zona: number;
  seleccionada: boolean;
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
  private static readonly MAX_ENTRADAS_SELECCIONABLES = 10;

  espectaculo: Espectaculo | null = null;
  escenario: Escenario | null = null;
  mostrarSelectorZona = false;
  zonaSeleccionada: number | null = 0;
  cantidadEntradas = 1;
  cargandoEntradasZona = false;

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

  entradasDisponiblesByZona: Array<[number, number, number, number]> = []; // [entradaId, precioCentimos, espectaculoId, zona]
  ticketsDisponibles: EntradaDisponibleTicket[] = [];

  constructor(
    private route: ActivatedRoute,
    private seleccionarEntradasService: SeleccionarEntradasService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

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

  seleccionarZona(zona: number): void {
    this.zonaSeleccionada = zona;
    this.cantidadEntradas = Math.max(1, this.cantidadEntradas);

    const espectaculoId = this.getEspectaculoIdNumerico();
    if (espectaculoId === null) {
      this.entradasDisponiblesByZona = [];
      this.ticketsDisponibles = [];
      return;
    }

    this.getEntradasDisponiblesByZona(espectaculoId, zona);
  }

  getEntradasDisponiblesByZona(espectaculoId: number, zona: number): void {
    this.cargandoEntradasZona = true;
    this.seleccionarEntradasService.getEntradasDisponiblesByZona(espectaculoId, zona).subscribe(
      (response: any) => {
        this.entradasDisponiblesByZona = this.normalizarFilas(response);
        this.ticketsDisponibles = this.entradasDisponiblesByZona.map((fila) => ({
          entradaId: fila[0],
          precioCentimos: fila[1],
          espectaculoId: fila[2],
          zona: fila[3],
          seleccionada: false,
        }));
        this.cargandoEntradasZona = false;
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Error fetching entradas:', error);
        this.entradasDisponiblesByZona = [];
        this.ticketsDisponibles = [];
        this.cargandoEntradasZona = false;
      }
    );
  }

  get zonaInfoActual(): ZonaInfo | null {
    if (this.zonaSeleccionada === 1) {
      return this.zonasInfo.Pista;
    }
    if (this.zonaSeleccionada === 2) {
      return this.zonasInfo['Zona Norte'];
    }
    if (this.zonaSeleccionada === 3) {
      return this.zonasInfo['Zona Sur'];
    }
    return null;
  }

  get entradasDisponiblesEnZonaActual(): number {
    return this.ticketsDisponibles.length;
  }

  get maxEntradasSeleccionables(): number {
    return Math.max(1, Math.min(SeleccionarEntradas.MAX_ENTRADAS_SELECCIONABLES, this.entradasDisponiblesEnZonaActual));
  }

  get precioTotalEstimado(): string {
    const totalCentimos = this.ticketsDisponibles
      .filter((ticket) => ticket.seleccionada)
      .reduce((acumulado, ticket) => acumulado + ticket.precioCentimos, 0);

    return (totalCentimos / 100).toFixed(2);
  }

  get entradasSeleccionadasCount(): number {
    return this.ticketsDisponibles.filter((ticket) => ticket.seleccionada).length;
  }

  getZonaNombrePorId(zonaId: number | null): string {
    if (zonaId === 1) {
      return this.zonasInfo.Pista.nombreVisible;
    }
    if (zonaId === 2) {
      return this.zonasInfo['Zona Norte'].nombreVisible;
    }
    if (zonaId === 3) {
      return this.zonasInfo['Zona Sur'].nombreVisible;
    }
    return 'Zona no definida';
  }

  toggleSeleccionEntrada(ticket: EntradaDisponibleTicket): void {
    if (!ticket.seleccionada && this.entradasSeleccionadasCount >= SeleccionarEntradas.MAX_ENTRADAS_SELECCIONABLES) {
      return;
    }

    ticket.seleccionada = !ticket.seleccionada;
  }

  estaBloqueadaSeleccion(ticket: EntradaDisponibleTicket): boolean {
    return !ticket.seleccionada && this.entradasSeleccionadasCount >= SeleccionarEntradas.MAX_ENTRADAS_SELECCIONABLES;
  }

  trackByEntradaId(_: number, ticket: EntradaDisponibleTicket): number {
    return ticket.entradaId;
  }

  formatearPrecioEuros(precioCentimos: number): string {
    return (precioCentimos / 100).toFixed(2);
  }

  obtenerEntradasSeleccionadas(): any[] {
    return this.ticketsDisponibles
      .filter((ticket) => ticket.seleccionada)
      .map((ticket) => ({
        entradaId: ticket.entradaId,
        precioCentimos: ticket.precioCentimos,
        espectaculoId: ticket.espectaculoId,
        zona: ticket.zona,
      }));
  }

  irAComprar(entradasSeleccionadas: any): void {
    if (!Array.isArray(entradasSeleccionadas) || entradasSeleccionadas.length === 0) {
      return;
    }

    this.router.navigate(['/compra'], {
      queryParams: {
        entradasSeleccionadas: encodeURIComponent(JSON.stringify(entradasSeleccionadas))
      }
    });
  }

  private getEspectaculoIdNumerico(): number | null {
    const rawId = this.espectaculo?.id;
    if (typeof rawId === 'number' && Number.isFinite(rawId)) {
      return rawId;
    }
    if (typeof rawId === 'string') {
      const parsedId = Number(rawId);
      return Number.isFinite(parsedId) ? parsedId : null;
    }
    return null;
  }

  private normalizarFilas(response: unknown): Array<[number, number, number, number]> {
    if (!Array.isArray(response)) {
      return [];
    }

    return response
      .filter((fila): fila is unknown[] => Array.isArray(fila) && fila.length >= 4)
      .map((fila) => [
        Number(fila[0]) || 0,
        Number(fila[1]) || 0,
        Number(fila[2]) || 0,
        Number(fila[3]) || 0,
      ] as [number, number, number, number]);
  }
}
