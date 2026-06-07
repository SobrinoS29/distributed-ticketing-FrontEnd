import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SeleccionarEntradasService } from '../seleccionar-entradas.service';
import { LoginService } from '../login.service';
import { ColaService } from '../cola/cola.service';

interface EntradaDisponibleTicket {
  entradaId: number;
  precioCentimos: number;
  espectaculoId: number;
  zona: number;
  seleccionada: boolean;
  token: string | "";
  disponible: boolean;
  mensajeEstado: string | null;
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
  private static readonly ITEMS_PER_PAGE = 5;  // Número de entradas por página

  userToken: string | null = null;
  espectaculo: Espectaculo | null = null;
  escenario: Escenario | null = null;
  queueToken: string = '';
  mostrarSelectorZona = false;
  zonaSeleccionada: number | null = 0;
  cantidadEntradas = 1;
  cargandoEntradasZona = false;

  entradasDisponiblesByZona: Array<[number, number, number, number]> = []; // [entradaId, precioCentimos, espectaculoId, zona]
  ticketsDisponibles: EntradaDisponibleTicket[] = [];
  tokenReserva: string = "";  // Variable Token que identifica todas las reservas del mismo cliente en esta sesión

  // Propiedades de paginación
  currentPage: number = 1;
  Math = Math;  // Hacer disponible Math en el template

  private reservaTimeoutId: any = null;  // ID del timeout para poder limpiarlo
  readonly authTokenStorageKey: string = 'authToken';

  constructor(
    private route: ActivatedRoute,
    private seleccionarEntradasService: SeleccionarEntradasService,
    private loginService: LoginService,
    private colaService: ColaService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const userTokenParam = sessionStorage.getItem(this.authTokenStorageKey)?.trim();  // Obtenemos el token de sesión del sessionStorage para verificar si el usuario está logeado, si no hay token o es una cadena vacía, consideramos que el usuario no está logeado
      const espectaculoParam = params.get('espectaculo');
      const escenarioParam = params.get('escenario');
      const queueTokenParam = params.get('queueToken') ?? this.getStoredQueueToken();
      if (espectaculoParam && escenarioParam) {
        try {
          this.userToken = userTokenParam ? this.decodeParam(userTokenParam) : null;
          this.espectaculo = JSON.parse(this.decodeParam(espectaculoParam));
          this.escenario = JSON.parse(this.decodeParam(escenarioParam));
        } catch (error) {
          console.error('Error al parsear los parámetros de espectaculo y escenario:', error);
          this.espectaculo = null;
          this.escenario = null;
        }
      } else {
        console.warn('No se recibieron los parámetros de espectaculo o escenario.');
        this.espectaculo = null;
        this.escenario = null;
        return;
      }

      if (!this.espectaculo || !this.escenario) {
        return;
      }

      const espectaculoId = this.getEspectaculoIdNumerico();
      if (espectaculoId === null) {
        this.router.navigate(['/']);
        return;
      }

      if (espectaculoId !== 1) {
        this.iniciarTTLReserva();
        return;
      }

      if (!queueTokenParam) {
        this.redirigirACola();
        return;
      }

      this.queueToken = queueTokenParam;
      this.validarAccesoCola(queueTokenParam, espectaculoId);
    });
  }

  ngOnDestroy(): void {
    this.limpiarTTLReserva();
  }

  // ============ Métodos de paginación ============

  get paginatedTickets(): EntradaDisponibleTicket[] {
    const startIndex = (this.currentPage - 1) * SeleccionarEntradas.ITEMS_PER_PAGE;
    const endIndex = startIndex + SeleccionarEntradas.ITEMS_PER_PAGE;
    return this.ticketsDisponibles.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.ticketsDisponibles.length / SeleccionarEntradas.ITEMS_PER_PAGE);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const totalPages = this.totalPages;
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar siempre: primera página, última página, y 3 páginas alrededor de la actual
      const startPage = Math.max(1, this.currentPage - 1);
      const endPage = Math.min(totalPages, this.currentPage + 1);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push(-1); // -1 indica "..." (puntos suspensivos)
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push(-1); // -1 indica "..." (puntos suspensivos)
        }
        pages.push(totalPages);
      }
    }

    return pages;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTicketList();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTicketList();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTicketList();
    }
  }

  private scrollToTicketList(): void {
    const ticketListElement = document.querySelector('.ticket-list-shell');
    if (ticketListElement) {
      ticketListElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ============================================

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

  private validarAccesoCola(queueToken: string, espectaculoId: number): void {
    this.colaService.obtenerEstado(queueToken).subscribe({
      next: (estado) => {
        if (!estado.canProceed || estado.espectaculoId !== espectaculoId) {
          this.redirigirACola();
          return;
        }

        try {
          sessionStorage.setItem(`queueToken:${espectaculoId}`, queueToken);
        } catch {
          // Ignoramos errores de almacenamiento local.
        }

        this.iniciarTTLReserva();
      },
      error: () => {
        this.redirigirACola();
      }
    });
  }

  private redirigirACola(): void {
    if (!this.espectaculo || !this.escenario) {
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate(['/cola'], {
      queryParams: {
        espectaculo: encodeURIComponent(JSON.stringify(this.espectaculo)),
        escenario: encodeURIComponent(JSON.stringify(this.escenario)),
        queueToken: this.queueToken || undefined,
      },
      replaceUrl: true,
    });
  }

  private getStoredQueueToken(): string {
    const espectaculoId = this.getEspectaculoIdNumerico();
    if (espectaculoId === null) {
      return '';
    }

    try {
      return sessionStorage.getItem(`queueToken:${espectaculoId}`) ?? '';
    } catch {
      return '';
    }
  }

  toggleSelectorZona(): void {
    this.mostrarSelectorZona = !this.mostrarSelectorZona;
  }

  seleccionarZona(zona: number): void {
    this.zonaSeleccionada = zona;
    this.cantidadEntradas = Math.max(1, this.cantidadEntradas);
    this.currentPage = 1;  // Reset a la primera página al cambiar de zona

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
          token: "",
          disponible: true,
          mensajeEstado: null,
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
    return this.ticketsDisponibles.filter((ticket) => ticket.disponible).length;
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
    if (!ticket.disponible) {
      return;
    }

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
          ticket.seleccionada = false;
          ticket.token = '';
          ticket.disponible = false;
          ticket.mensajeEstado = 'Entrada ya no disponible';
          this.cdr.detectChanges();
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
    return !ticket.disponible || (!ticket.seleccionada && this.entradasSeleccionadasCount >= SeleccionarEntradas.MAX_ENTRADAS_SELECCIONABLES);
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

  private decodeParam(param: string): string {
    if (!param) {
      return '';
    }

    try {
      // Decodificar múltiples veces en caso de doble encoding
      let decoded = param;
      let previousDecoded = '';
      
      // Intentar decodificar hasta que no cambie más
      while (decoded !== previousDecoded && decoded.includes('%')) {
        try {
          const temp = decodeURIComponent(decoded);
          if (temp === decoded) break;
          previousDecoded = decoded;
          decoded = temp;
        } catch {
          break;
        }
      }
      
      return decoded;
    } catch {
      return param;
    }
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
