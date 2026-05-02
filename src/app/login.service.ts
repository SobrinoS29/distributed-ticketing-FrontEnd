import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {

  constructor(private http: HttpClient) {}

  getCheckUserToken(userToken: string): Observable<string> {
    return this.http.get(`/compra/checkUserToken?userToken=${userToken}`, {responseType: 'text',});
  }

  login(credentials: { mail: string; pwd: string }): Observable<string> {
    return this.http.post('/users/login', credentials, {responseType: 'text',});
  }

  register(credentials: { name: string; email: string; pwd: string }): Observable<string> {
    return this.http.post('/users/register', credentials, {responseType: 'text',});
  }
}
