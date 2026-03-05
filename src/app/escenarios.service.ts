import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EscenariosService {
  constructor(private http: HttpClient) {}

  getEscenarios(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/busqueda/getEscenarios');
  }

  getEspectaculos(escenario: any) {
    return this.http.get(`http://localhost:8080/busqueda/getEspectaculos/${escenario.id}`);
  }

  /*
  getNumeroDeEntradas(espectaculo: any) {
    return this.http.get(`http://localhost:8080/busqueda/getNumeroDeEntradas?espectaculoId=${espectaculo.id}`);
  }

  getEntradasLibres(espectaculo: any) {
    return this.http.get(`http://localhost:8080/busqueda/getEntradasLibres?espectaculoId=${espectaculo.id}`);
  }
  */

  getNumeroDeEntradasComoDto(espectaculo: any) {
    return this.http.get(`http://localhost:8080/busqueda/getNumeroDeEntradasComoDto?espectaculoId=${espectaculo.id}`);
  }
}
