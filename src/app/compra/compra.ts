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

  constructor(private pagosService: PagosService) {}

  irAlPago() {  // Redirigir al componente de prepararPago() del backend
    let infoPago = {
      centimos : Math.floor(this.importe.valueOf() * 100),  // Convertir el importe a céntimos (Stripe trabaja con la unidad más pequeña)
      // Aquí puedes agregar más información relevante para el pago, como detalles de la compra, usuario, etc.
    };
    this.pagosService.prepararPago(infoPago).subscribe(
      (response) => {
        this.client_secret = response;  // Almacenar el client_secret recibido del backend
        this.showForm();
      // Aquí puedes manejar la respuesta del backend, como redirigir a una página de confirmación o mostrar un mensaje al usuario.
    }, (error) => {
      console.error('Error al preparar el pago:', error);
      // Aquí puedes manejar errores, como mostrar un mensaje de error al usuario.
    });
  }

  showForm() {
    let elements = this.stripe.elements()
    let style = {
      base: {
        color: "#32325d", fontFamily: 'Arial, sans-serif',
        fontSmoothing: "antialiased", fontSize: "16px",
        "::placeholder": {
          color: "#32325d"
        }
      },
      invalid: {
        fontFamily: 'Arial, sans-serif', color: "#fa755a",
        iconColor: "#fa755a"
      }
    }
    let card = elements.create("card", { style: style })
    card.mount("#card-element")
    card.on("change", function (event: any) {
      document.querySelector("button")!.disabled = event.empty;
      document.querySelector("#card-error")!.textContent =
        event.error ? event.error.message : "";
    });
    let self = this
    let form = document.getElementById("payment-form");
    form!.addEventListener("submit", function (event) {
      event.preventDefault();
      self.payWithCard(card);
    });
    form!.style.display = "block"
  }

  payWithCard(card: any) {
    this.stripe.confirmCardPayment(this.client_secret, {
      payment_method: {
        card: card
      }
    }).then((result: any) => {
      if (result.error) {
        console.error('Payment failed:', result.error.message);
      } else {
        console.log('Payment successful:', result.paymentIntent);
        //////////////////////////////////que hacer cuando es correcto
        this.pagosService.confirmarPago(result.paymentIntent).subscribe(
        (response) => {
          console.log('Pago confirmado en el backend:', response);
          // Aquí puedes manejar la respuesta del backend, como redirigir a una página de confirmación o mostrar un mensaje al usuario.
        }, (error) => {
          console.error('Error al confirmar el pago en el backend:', error);
          // Aquí puedes manejar errores, como mostrar un mensaje de error al usuario.
        });
      }
    });
  }

}