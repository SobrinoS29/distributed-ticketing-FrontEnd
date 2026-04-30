import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SeleccionarEntradasService } from '../seleccionar-entradas.service';
import { LoginService } from '../login.service';

interface EntradaDisponibleTicket {
  entradaId: number;
  precioCentimos: number;
  espectaculoId: number;
  zona: number;
  seleccionada: boolean;
  token: string | "";
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
export class SeleccionarEntradas implements OnInit, OnDestroy {
  private static readonly MAX_ENTRADAS_SELECCIONABLES = 10;
  private static readonly RESERVA_TTL_MS = 5 * 60 * 1000;  // TTL de 5 minutos para la sesión de reserva

  userToken: string | null = null;
  espectaculo: Espectaculo | null = null;
  escenario: Escenario | null = null;
  mostrarSelectorZona = false;
  zonaSeleccionada: number | null = 0;
  cantidadEntradas = 1;
  cargandoEntradasZona = false;

  entradasDisponiblesByZona: Array<[number, number, number, number]> = []; // [entradaId, precioCentimos, espectaculoId, zona]
  ticketsDisponibles: EntradaDisponibleTicket[] = [];
  tokenReserva: string = "";  // Variable Token que identifica todas las reservas del mismo cliente en esta sesión

  private reservaTimeoutId: any = null;  // ID del timeout para poder limpiarlo
  readonly authTokenStorageKey: string = 'authToken';

  constructor(
    private route: ActivatedRoute,
    private seleccionarEntradasService: SeleccionarEntradasService,
    private loginService: LoginService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const userTokenParam = sessionStorage.getItem(this.authTokenStorageKey)?.trim();  // Obtenemos el token de sesión del sessionStorage para verificar si el usuario está logeado, si no hay token o es una cadena vacía, consideramos que el usuario no está logeado
      const espectaculoParam = params.get('espectaculo');
      const escenarioParam = params.get('escenario');
      if (espectaculoParam && escenarioParam) {
        try {
          this.userToken = userTokenParam ? decodeURIComponent(userTokenParam) : null;
          this.espectaculo = JSON.parse(decodeURIComponent(espectaculoParam));
          this.escenario = JSON.parse(decodeURIComponent(escenarioParam));
        } catch (error) {
          console.error('Error al parsear los parámetros de espectaculo y escenario:', error);
          this.espectaculo = null;
          this.escenario = null;
        }
      } else {
        console.warn('No se recibieron los parámetros de espectaculo o escenario.');
        this.espectaculo = null;
        this.escenario = null;
      }
    });
    this.iniciarTTLReserva();
  }

  ngOnDestroy(): void {
    this.limpiarTTLReserva();
  }

  private iniciarTTLReserva(): void {
    this.reservaTimeoutId = setTimeout(() => {
      this.seleccionarEntradasService.cleanupExpiredReservations(this.tokenReserva).subscribe(
      (response: any) => {
        console.warn('TTL de reserva expirado. Redirigiendo a escenarios...');
        this.router.navigate(['/'], { queryParams: { timeout: 'true' } });
      },
      (error: any) => {
        console.error('Error cleaning up expired reservations:', error);
      }
    )}, SeleccionarEntradas.RESERVA_TTL_MS);
  }

  private limpiarTTLReserva(): void {
    if(this.reservaTimeoutId !== null) {
      clearTimeout(this.reservaTimeoutId);
      this.reservaTimeoutId = null;
    }
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
          token: ""
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
    switch (zonaId) {
      case 1:
        return 'Pista';
      case 2:
        return 'Grada Norte';
      case 3:
        return 'Grada Sur';
      default:
        return 'Zona no definida';
    }
  }

  toggleSeleccionEntrada(ticket: EntradaDisponibleTicket): void {
    if (!ticket.seleccionada && this.entradasSeleccionadasCount >= SeleccionarEntradas.MAX_ENTRADAS_SELECCIONABLES) {
      return;
    }

    if(!ticket.seleccionada) {  // Comprobaremos si hay token o no en el backend
      this.seleccionarEntradasService.reservarEntrada(ticket.entradaId, this.tokenReserva, this.userToken).subscribe(
        (response: any) => {  // Debemos separar token.getTokenReserva() + "|" + token.getUserToken();
          if (!this.tokenReserva) this.tokenReserva = response.split('|')[0];  // Solo se guarda la primera vez
          try { sessionStorage.setItem('ticketToken', this.tokenReserva); } catch {}
          if (!this.userToken) this.userToken = response.split('|')[1];  // Solo se guarda la primera vez
          ticket.token = response;
          console.log('Entrada reservada con token:', this.tokenReserva);
          console.log('User token asociado a la reserva:', this.userToken);
          ticket.seleccionada = true;
          this.cdr.detectChanges();
        },
        (error: any) => {
          console.error('Error al reservar la entrada:', error);
        }
      );
      return;
    }
    else {  // Deseleccionar o liberar entrada lo haremos global para poder usarlo con el timeout también
      this.seleccionarEntradasService.liberarEntrada(ticket.entradaId, this.tokenReserva).subscribe(
        (response: any) => {
          ticket.token = response;
          console.log('Entrada liberada con token:', this.tokenReserva);
          ticket.seleccionada = !ticket.seleccionada;
          this.cdr.detectChanges();
        },
        (error: any) => {
          console.error('Error al liberar la entrada:', error);
        }
      );
    }
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
        token: ticket.token,
      }));
  }

  irAComprar(entradasSeleccionadas: any): void {
    if (!Array.isArray(entradasSeleccionadas) || entradasSeleccionadas.length === 0) {
      return;
    }

    if (!this.userToken) {  // Iremos a la pagina de login
      this.irALogin();
      return;
    }

    this.loginService.getCheckUserToken(this.userToken).subscribe(  // Comprobaremos primero que el userToken es válido (seguridad)
      (username: string) => {
        this.limpiarTTLReserva();
        this.router.navigate(['/compra'], {
          queryParams: { ticketToken: encodeURIComponent(JSON.stringify(this.tokenReserva)),  // Enviamos el token de reserva para identificar las entradas reservadas por este cliente
          }
        });
      },
      (error: any) => {
        this.irALogin();
      }
    );
  }

  irALogin(): void {
    this.limpiarTTLReserva();
    this.router.navigate(['/login'], {
      queryParams: {
        returnTo: '/compra',
        ticketToken: encodeURIComponent(JSON.stringify(this.tokenReserva)),
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
