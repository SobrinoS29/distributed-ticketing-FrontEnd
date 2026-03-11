import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/internal/operators/map';

@Injectable({
  providedIn: 'root',
})
export class PagosService {

  constructor(private http: HttpClient) {}

  prepararPago(infoPago: any) {
    return this.http.post('http://localhost:8080/pago/prepararPago', infoPago, { responseType: 'text' });  // Queremos recibir un String client_secret en vez de un .json 
  }

  confirmarPago(paymentIntent: any) {
    return this.http.post('http://localhost:8080/pago/confirmarPago', paymentIntent, { responseType: 'text' }).pipe(map(response => parseInt(response, 10))  // Queremos recibir un int de confirmación
    );
  }

}