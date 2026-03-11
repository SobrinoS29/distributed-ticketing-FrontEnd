import { Component } from '@angular/core';
import { PagosService } from '../pagos.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

declare let Stripe: any;  // Declaramos Stripe para usarlo en el componente

@Component({
  selector: 'app-compra',
  imports: [FormsModule, CommonModule],
  templateUrl: './compra.html',
  styleUrl: './compra.css',
})
export class Compra {

  client_secret? : string = '';  // A lo mejor tiene valor o no (undefined)
  importe : number = 0;  // Variable para almacenar el importe de la compra
  stripe = Stripe("pk_test_51T92b1A0bERckX0t3nSgqPZeWpC5uTSUeKjbX91H2AvRUYI9nKbFtyg8iGQ9GuLlCCSZMIhG1Ow52R3FlOWi4RoR00vIX3R5jG");  // Reemplaza con tu clave pública de Stripe
  private card: any = null;
  private formInitialized: boolean = false;

  private stripeStyles = {  // Configuración de estilos para Stripe
    base: {
      color: '#32325d',
      fontFamily: 'Arial, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#32325d'
      }
    },
    invalid: {
      fontFamily: 'Arial, sans-serif',
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  };

  constructor(private pagosService: PagosService) {}

  get canProceedToPayment(): boolean {
    return this.importe > 0;
  }

  irAlPago(): void {  // Redirigir al componente de prepararPago() del backend
    if (!this.canProceedToPayment) {
      return;
    }

    const infoPago = {
      centimos : Math.floor(this.importe * 100),  // Convertir el importe a céntimos (Stripe trabaja con la unidad más pequeña)
      // Aquí puedes agregar más información relevante para el pago, como detalles de la compra, usuario, etc.
    };
    this.pagosService.prepararPago(infoPago).subscribe({
      next: (response: string) => {
        this.client_secret = response;  // Almacenar el client_secret recibido del backend
        this.initializeStripeForm();
      // Aquí puedes manejar la respuesta del backend, como redirigir a una página de confirmación o mostrar un mensaje al usuario.
    }, error: (error: any) => {
      console.error('Error al preparar el pago:', error);
      // Aquí puedes manejar errores, como mostrar un mensaje de error al usuario.
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
        console.log('Pago confirmado en el backend:', response);
        this.mostrarMensajeExito();
      },
      (error: any) => {
        console.error('Error al confirmar el pago en el backend:', error);
      }
    );
  }

  private mostrarMensajeExito(): void {
    const resultMessage = document.querySelector('.result-message');
    if (resultMessage) {
      resultMessage.classList.remove('hidden');
    }
  }

}