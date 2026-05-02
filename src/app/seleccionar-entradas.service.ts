import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SeleccionarEntradasService {

  constructor(private http: HttpClient) {}

  getEntradasDisponiblesByZona(espectaculoId: number, zona: number) {
    return this.http.get(`/busqueda/getEntradasLibresByZona?espectaculoId=${espectaculoId}&zona=${zona}`);
  }

  reservarEntrada(entradaId: number, tokenReserva: string, userTokenReserva: string | null) {
    return this.http.put(`/reservas/reservar`, { entradaId, tokenReserva, userTokenReserva: userTokenReserva }, { responseType: 'text' });  // Devolvemos el ticketToken de reserva como String
  }

  liberarEntrada(entradaId: number, tokenReserva: string) {
    return this.http.put(`/reservas/liberar`, { entradaId, tokenReserva}, { responseType: 'text' });  // Devolvemos el ticketToken de reserva como String
  }

  cleanupExpiredReservations(tokenReserva: string) {
    return this.http.put(`/reservas/cleanupExpiredReservations`, { ticketToken: tokenReserva }, { responseType: 'text' });
  }

}