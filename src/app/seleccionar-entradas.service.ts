import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SeleccionarEntradasService {

  constructor(private http: HttpClient) {}

  getEntradasDisponiblesByZona(espectaculoId: number, zona: number) {
    return this.http.get(`http://localhost:8080/busqueda/getEntradasLibresByZona?espectaculoId=${espectaculoId}&zona=${zona}`);
  }
}