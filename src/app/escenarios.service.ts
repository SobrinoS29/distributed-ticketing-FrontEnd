import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EscenariosService {
  constructor(private http: HttpClient) {}

  getEscenarios() {
    return this.http.get('http://localhost:8080/busqueda/getEscenarios');
  }
}
