import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColaService, ColaStatus } from './cola.service';

interface EspectaculoCola {
  id?: number | string;
  artista?: string;
  fecha?: string;
}

interface EscenarioCola {
  id?: number | string;
  nombre?: string;
  descripcion?: string;
}

@Component({
  selector: 'app-cola',
  imports: [CommonModule],
  templateUrl: './cola.html',
  styleUrl: './cola.css',
})
export class Cola implements OnInit, OnDestroy {
  private static readonly POLLING_MS = 4000;

  espectaculo: EspectaculoCola | null = null;
  escenario: EscenarioCola | null = null;
  userToken: string | null = null;
  queueToken: string = '';
  estado: ColaStatus | null = null;
  cargando = true;
  error: string = '';

  private pollingId: any = null;
  private readonly authTokenStorageKey = 'authToken';

  constructor(
    private route: ActivatedRoute,
    private colaService: ColaService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.userToken = sessionStorage.getItem(this.authTokenStorageKey)?.trim() || null;
      this.espectaculo = this.parseParam<EspectaculoCola>(params.get('espectaculo'));
      this.escenario = this.parseParam<EscenarioCola>(params.get('escenario'));

      if (!this.espectaculo || !this.escenario) {
        this.error = 'No se pudo cargar el evento seleccionado.';
        this.cargando = false;
        this.cdr.detectChanges();
        return;
      }

      const espectaculoId = this.getEspectaculoId();
      if (espectaculoId === null) {
        this.error = 'El espectáculo seleccionado no es válido.';
        this.cargando = false;
        this.cdr.detectChanges();
        return;
      }

      const queueTokenParam = params.get('queueToken') ?? this.getStoredQueueToken(espectaculoId);
      if (queueTokenParam) {
        this.queueToken = queueTokenParam;
        this.validarColaExistente(espectaculoId);
      } else {
        this.entrarEnCola(espectaculoId);
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  volverAEventos(): void {
    this.detenerPolling();
    this.router.navigate(['/']);
  }

  salirDeLaCola(): void {
    if (!this.queueToken) {
      this.volverAEventos();
      return;
    }

    this.colaService.salir(this.queueToken).subscribe({
      next: () => {
        this.limpiarPersistenciaCola();
        this.volverAEventos();
      },
      error: () => {
        this.limpiarPersistenciaCola();
        this.volverAEventos();
      }
    });
  }

  get personasDelante(): number {
    return this.estado?.aheadCount ?? 0;
  }

  get estaListo(): boolean {
    return this.estado?.canProceed ?? false;
  }

  get turnoExpiraTexto(): string {
    if (!this.estado?.turnExpiresAt) return 'Pendiente';

    const d = new Date(this.estado.turnExpiresAt);
    const fecha = d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} ${hora}`;
  }

  get turnoFechaLabel(): string {
    if (this.estado?.status === 'PREOPEN') {
      return 'Apertura de cola';
    }
    return 'Turno expira';
  }

  get progresoVisual(): number {
    if (!this.estado || this.estado.position === null || this.estado.position === undefined) {
      return 0;
    }

    if (this.estado.canProceed) {
      return 100;
    }

    const delante = Math.max(this.estado.aheadCount, 0);
    const base = delante + 1;
    return Math.max(10, Math.min(92, 100 - (base * 12)));
  }

  private entrarEnCola(espectaculoId: number): void {
    this.cargando = true;
    this.error = '';

    this.colaService.unirse(espectaculoId, this.userToken).subscribe({
      next: (estado) => {
        this.queueToken = estado.queueToken;
        this.estado = estado;
        this.persistirQueueToken(espectaculoId, estado.queueToken);
        this.cargando = false;
        this.cdr.detectChanges();
        this.iniciarPolling();
        this.comprobarSiPuedeAvanzar();
      },
      error: () => {
        this.error = 'No se ha podido entrar en la cola.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private validarColaExistente(espectaculoId: number): void {
    this.cargando = true;
    this.error = '';

    this.colaService.obtenerEstado(this.queueToken).subscribe({
      next: (estado) => {
        if (estado.status === 'TOKEN_NOT_FOUND') {
          this.limpiarPersistenciaCola();
          this.queueToken = '';
          this.entrarEnCola(espectaculoId);
          return;
        }

        if (estado.espectaculoId !== espectaculoId) {
          this.limpiarPersistenciaCola();
          this.entrarEnCola(espectaculoId);
          return;
        }

        this.estado = estado;
        this.cargando = false;
        this.persistirQueueToken(espectaculoId, estado.queueToken);
        this.cdr.detectChanges();
        this.iniciarPolling();
        this.comprobarSiPuedeAvanzar();
      },
      error: () => {
        this.limpiarPersistenciaCola();
        this.entrarEnCola(espectaculoId);
      }
    });
  }

  private comprobarSiPuedeAvanzar(): void {
    if (!this.estado?.canProceed) {
      return;
    }

    this.detenerPolling();
    this.router.navigate(['/seleccionarEntradas'], {
      queryParams: {
        espectaculo: encodeURIComponent(JSON.stringify(this.espectaculo)),
        escenario: encodeURIComponent(JSON.stringify(this.escenario)),
        queueToken: this.queueToken,
      },
      replaceUrl: true,
    });
  }

  private iniciarPolling(): void {
    this.detenerPolling();
    this.pollingId = window.setInterval(() => {
      this.refrescarEstado();
    }, Cola.POLLING_MS);
  }

  private refrescarEstado(): void {
    if (!this.queueToken) {
      return;
    }

    this.colaService.obtenerEstado(this.queueToken).subscribe({
      next: (estado) => {
        if (estado.status === 'TOKEN_NOT_FOUND') {
          const espectaculoId = this.getEspectaculoId();
          if (espectaculoId !== null) {
            this.detenerPolling();
            this.limpiarPersistenciaCola();
            this.queueToken = '';
            this.entrarEnCola(espectaculoId);
            return;
          }
        }

        this.estado = estado;
        this.cdr.detectChanges();
        this.comprobarSiPuedeAvanzar();
      },
      error: () => {
        this.error = 'La cola ya no está disponible. Vuelve a intentarlo.';
        this.detenerPolling();
        this.cdr.detectChanges();
      }
    });
  }

  private detenerPolling(): void {
    if (this.pollingId !== null) {
      clearInterval(this.pollingId);
      this.pollingId = null;
    }
  }

  private persistirQueueToken(espectaculoId: number, queueToken: string): void {
    try {
      sessionStorage.setItem(this.getQueueStorageKey(espectaculoId), queueToken);
    } catch {
      // No bloqueamos el flujo si sessionStorage no está disponible.
    }
  }

  private getStoredQueueToken(espectaculoId: number): string {
    try {
      return sessionStorage.getItem(this.getQueueStorageKey(espectaculoId)) ?? '';
    } catch {
      return '';
    }
  }

  private limpiarPersistenciaCola(): void {
    const espectaculoId = this.getEspectaculoId();
    if (espectaculoId === null) {
      return;
    }

    try {
      sessionStorage.removeItem(this.getQueueStorageKey(espectaculoId));
    } catch {
      // Ignoramos errores de almacenamiento local.
    }
  }

  private getQueueStorageKey(espectaculoId: number): string {
    return `queueToken:${espectaculoId}`;
  }

  private getEspectaculoId(): number | null {
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

  private parseParam<T>(param: string | null): T | null {
    if (!param) {
      return null;
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
      
      return JSON.parse(decoded) as T;
    } catch {
      return null;
    }
  }
}