import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface ColaStatus {
  queueToken: string;
  espectaculoId: number;
  status: string;
  position: number | null;
  aheadCount: number;
  canProceed: boolean;
  turnExpiresAt: number | null;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ColaService {
  constructor(private http: HttpClient) {}

  unirse(espectaculoId: number, userToken: string | null) {
    return this.http.post<ColaStatus>('/cola/unirse', { espectaculoId, userToken });
  }

  obtenerEstado(queueToken: string) {
    return this.http.get<ColaStatus>('/cola/estado', { params: { queueToken } });
  }

  salir(queueToken: string) {
    return this.http.post<ColaStatus>('/cola/salir', { queueToken });
  }
}