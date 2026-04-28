import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
  
@Injectable({
  providedIn: 'root',
})
export class CompraService {
  constructor(private http: HttpClient) {}

  getTicketsFromToken(token: string) {
    return this.http.get('http://localhost:8080/reservas/getTicketsFromToken', { params: { token }, responseType: 'json' });  // Queremos recibir un .json con el ticket formado desde la BD
    // Quería enviarlo con get, debido a que no voy a modificar nada en la BD, sin embargo, get me obliga a enviar
    // el token como parametro de la url y no como body, y lo quiero enviar con body porque me parece más seguro
  }

  enviarEmailCompra(sessionToken: string | null, ticketsSeleccionados: any[]) {
    return this.http.post('http://localhost:8080/compra/enviarEmailCompra', { sessionToken, ticketsSeleccionados });
  }
}