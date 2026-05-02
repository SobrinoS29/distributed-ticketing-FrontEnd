import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EscenariosService {
  constructor(private http: HttpClient) {}

  getEscenarios(): Observable<any[]> {
    return this.http.get<any[]>('/busqueda/getEscenarios');
  }

  getEspectaculos(escenario: any) {
    return this.http.get(`/busqueda/getEspectaculos/${escenario.id}`);
  }

  /*
  getNumeroDeEntradas(espectaculo: any) {
    return this.http.get(`/busqueda/getNumeroDeEntradas?espectaculoId=${espectaculo.id}`);
  }

  getEntradasLibres(espectaculo: any) {
    return this.http.get(`/busqueda/getEntradasLibres?espectaculoId=${espectaculo.id}`);
  }
  */

  getNumeroDeEntradasComoDto(espectaculo: any) {
    return this.http.get(`/busqueda/getNumeroDeEntradasComoDto?espectaculoId=${espectaculo.id}`);
  }
}
