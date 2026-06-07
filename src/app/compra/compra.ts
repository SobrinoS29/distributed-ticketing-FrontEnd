import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { PagosService } from '../pagos.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CompraService } from '../compra.service';
import { SeleccionarEntradasService } from '../seleccionar-entradas.service';
import { Router } from '@angular/router';

declare let Stripe: any;  // Declaramos Stripe para usarlo en el componente

interface Ticket {
  entradaId: number;
  precio: number;
  zona: number;
  fila: number;
  columna: number;
  planta: number;
  espectaculoId: number;
  escenarioId: number;
}

@Component({
  selector: 'app-compra',
  imports: [FormsModule, CommonModule],
  templateUrl: './compra.html',
  styleUrl: './compra.css',
})
export class Compra implements OnDestroy {

  private static readonly COMPRA_TTL_MS =  5 * 60 * 1000;  // TTL de 5 minutos para la pantalla de compra

  client_secret? : string = '';  // A lo mejor tiene valor o no (undefined)
  importeTotal : number | 0 = 0;
  stripe = Stripe("pk_test_51T92b1A0bERckX0t3nSgqPZeWpC5uTSUeKjbX91H2AvRUYI9nKbFtyg8iGQ9GuLlCCSZMIhG1Ow52R3FlOWi4RoR00vIX3R5jG");  // Reemplaza con tu clave pública de Stripe
  
  userToken: string | null = null;
  ticketToken: string = "";
  ticketsSeleccionados: Ticket[] = [];

  private card: any = null;
  private formInitialized: boolean = false;
  private compraTimeoutId: any = null;
  
  pagoExitoso: boolean = false;
  paymentIntentId: string = '';
  fechaPago: string = '';

  readonly authTokenStorageKey: string = 'authToken';

  private stripeStyles = {  // Configuración de estilos para Stripe
    base: {
      color: '#0b1220',
      fontFamily: 'Inter, system-ui, Arial, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '18px',
      '::placeholder': {
        color: '#64748b'
      },
      iconColor: '#64748b'
    },
    invalid: {
      fontFamily: 'Inter, system-ui, Arial, sans-serif',
      color: '#b91c1c',
      iconColor: '#b91c1c'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private compraService: CompraService,
    private seleccionarEntradasService: SeleccionarEntradasService,
    private pagosService: PagosService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const userTokenParam = sessionStorage.getItem(this.authTokenStorageKey)?.trim();  // Obtenemos el token de sesión del sessionStorage para verificar si el usuario está logeado, si no hay token o es una cadena vacía, consideramos que el usuario no está logeado
      const ticketTokenParam = params.get('ticketToken');
        if (ticketTokenParam) {
          try {
            this.userToken = userTokenParam ? decodeURIComponent(userTokenParam) : null;
            this.ticketToken = JSON.parse(decodeURIComponent(ticketTokenParam ?? 'null'));
          } catch (error) {
            console.error('Error al parsear el token:', error);
            this.ticketToken = "";
          }
          this.adoptReservationsIfLogged();
          this.getEntradasSeleccionadas();
        } else {
          // Fallback: try sessionStorage (token persisted during reserva)
          const stored = sessionStorage.getItem('ticketToken');
          if (stored) {
            this.ticketToken = stored;
            this.userToken = userTokenParam ? decodeURIComponent(userTokenParam) : sessionStorage.getItem('authToken');
            this.adoptReservationsIfLogged();
            this.getEntradasSeleccionadas();
          } else {
            console.warn('No se recibió el token.');
            this.ticketToken = "";
          }
        }
    });

    this.iniciarTTLCompra();
  }

  ngOnDestroy(): void {
    this.limpiarTTLCompra();
  }

  private iniciarTTLCompra(): void {
    this.limpiarTTLCompra();
    this.compraTimeoutId = setTimeout(() => {
      this.seleccionarEntradasService.cleanupExpiredReservations(this.ticketToken).subscribe(
      (response: any) => {
        console.warn('TTL de compra expirado. Redirigiendo a escenarios...');
        sessionStorage.removeItem('ticketToken');
        this.router.navigate(['/'], { queryParams: { timeout: 'true' } });
      },
      (error: any) => {
        console.error('Error cleaning up expired reservations:', error);
      }
    )}, Compra.COMPRA_TTL_MS);
  }

  private limpiarTTLCompra(): void {
    if (this.compraTimeoutId !== null) {
      clearTimeout(this.compraTimeoutId);
      this.compraTimeoutId = null;
    }
  }

  private adoptReservationsIfLogged(): void {
    // Si hay userToken y ticketToken, significa que se acaba de logear
    // Llamar a adoptReservations para asociar las reservas anónimas al nuevo usuario logeado
    if (this.userToken && this.ticketToken) {
      // Asegurar que ticketToken es string (puede venir como objeto si fue parseado)
      const ticketTokenStr = typeof this.ticketToken === 'string' ? this.ticketToken : String(this.ticketToken);
      console.log('Adoptando reservas para userToken:', this.userToken, 'ticketToken:', ticketTokenStr);
      this.compraService.adoptReservations(ticketTokenStr, this.userToken).subscribe(
        (response: any) => {
          console.log('Reservas adoptadas exitosamente bajo el nuevo usuario logeado:', response);
        },
        (error: any) => {
          console.error('Error al adoptar las reservas:', error);
          // No bloqueamos el flujo si el adopt falla; continuamos al getEntradasSeleccionadas
        }
      );
    } else {
      console.log('No adoptando reservas: userToken=', this.userToken, 'ticketToken=', this.ticketToken);
    }
  }


  getEntradasSeleccionadas(): void {  // Usaremos el token para obtener cada Ticket (entradaId, precio, zona, fila, columna, planta, espectaculoId, escenarioId)
    if (!this.ticketToken) {
      console.warn('Token no disponible para obtener entradas.');
      this.ticketsSeleccionados = [];
      this.importeTotal = 0;
      return;
    }

    this.compraService.getTicketsFromToken(this.ticketToken).subscribe(
      (response: any) => {  // Vamos a recibir un json con la información de cada ticket seleccionado (entradaId, precio, zona, fila, columna, planta, espectaculoId, escenarioId)
        this.ticketsSeleccionados = response.map((fila: any) => ({ 
          entradaId: fila[0],
          precio: fila[1],
          zona: fila[2],
          fila: fila[3],
          columna: fila[4],
          planta: fila[5],
          espectaculoId: fila[6],
          escenarioId: fila[7]
        }));
        
        this.calcularImporteTotal();
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Error fetching tickets from token:', error);
        this.ticketsSeleccionados = [];
        this.importeTotal = 0;
      }
    );
  }

  calcularImporteTotal(): void {
    this.importeTotal = this.ticketsSeleccionados.reduce((total, ticket) => total + ticket.precio, 0);
  }

  get canProceedToPayment(): boolean {
    return this.importeTotal > 0;
  }

  irAlPago(): void {  // Redirigir al componente de prepararPago() del backend
    if (!this.canProceedToPayment) {
      return;
    }

    const infoPago = {
      centimos : this.importeTotal,  // importeTotal ya está en céntimos (viene del backend)
    };
    this.pagosService.prepararPago(infoPago).subscribe({
      next: (response: string) => {
        this.client_secret = response;  // Almacenar el client_secret recibido del backend
        this.cdr.detectChanges();  // Forzar renderizado del *ngIf antes de montar Stripe
        this.initializeStripeForm();
    }, error: (error: any) => {
      console.error('Error al preparar el pago:', error);
    }});
  }

  private async initializeStripeForm(): Promise<void> {
    const cardElementHost = await this.waitForCardElement();
    if (!cardElementHost) {
      console.error('No se encontro #card-element en el DOM para montar Stripe.');
      return;
    }

    if (!this.card) {
      const elements = this.stripe.elements();
      this.card = elements.create('card', { style: this.stripeStyles });
      this.card.mount(cardElementHost);

      this.card.on('change', (event: any) => {
        const submitButton = document.querySelector('#submit') as HTMLButtonElement;
        const cardError = document.querySelector('#card-error') as HTMLElement;
        if (submitButton) submitButton.disabled = event.empty;
        if (cardError) cardError.textContent = event.error ? event.error.message : '';
      });
    }

    if (!this.formInitialized) {
      const form = document.getElementById('payment-form');
      if (form) {
        form.addEventListener('submit', (event: Event) => {
          event.preventDefault();
          this.payWithCard(this.card);
        });
        this.formInitialized = true;
      }
    }
  }

  private waitForCardElement(maxAttempts: number = 20, delayMs: number = 25): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        const el = document.getElementById('card-element');
        if (el) {
          resolve(el);
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          resolve(null);
          return;
        }
        setTimeout(check, delayMs);
      };
      check();
    });
  }

  payWithCard(card: any): void {
    this.stripe.confirmCardPayment(this.client_secret, {
      payment_method: {
        card: card
      }
    }).then((result: any) => {
      if (result.error) {
        console.error('Pago fallido:', result.error.message);
      } else {
        console.log('Pago exitoso:', result.paymentIntent);
        this.confirmarPagoEnBackend(result.paymentIntent);
      }
    });
  }

  private confirmarPagoEnBackend(paymentIntent: any): void {
    this.pagosService.confirmarPago(paymentIntent).subscribe(
      (response: any) => {
        if(response === 1) {
            this.paymentIntentId = paymentIntent.id ?? '';
            this.fechaPago = new Date().toLocaleString('es-ES');
            this.compraService.updateTicketsAsSold(this.ticketToken).subscribe(
              (updateResponse: any) => {
                this.mostrarMensajeExito();
                this.enviarEmailCompra();
              },
              (updateError: any) => {
                console.error('Error al actualizar los tickets como vendidos:', updateError);
              }
            );
        } else
          console.error('Error al confirmar el pago en el backend. Respuesta no valida:', response);
      },
      (error: any) => {
        console.error('Error al confirmar el pago en el backend:', error);
      }
    );
  }

  private mostrarMensajeExito(): void {
    this.pagoExitoso = true;
    this.cdr.detectChanges();
  }

  private enviarEmailCompra(): void {
    this.compraService.enviarEmailCompra(this.paymentIntentId,this.userToken, this.ticketsSeleccionados).subscribe(
      (response: any) => {        
        this.limpiarTTLCompra();
        window.setTimeout(() => {
          sessionStorage.removeItem('ticketToken');  // Limpiaremos el token de compra para evitar reutilización
          this.router.navigate(['/'], {
            queryParams: { timeout: 'false' },
            replaceUrl: true
          });
        }, 10000);
      },
      (error: any) => {
        console.error('Error al enviar el email de compra:', error);
      }
    );
  }
}