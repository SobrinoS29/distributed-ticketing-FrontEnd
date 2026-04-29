import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {

  constructor(private http: HttpClient) {}

  getCheckUserToken(userToken: string): Observable<string> {
    return this.http.get(`http://localhost:8080/compra/checkUserToken?userToken=${userToken}`, {responseType: 'text',});
  }

  login(credentials: { mail: string; pwd: string }): Observable<string> {
    return this.http.post('http://localhost:8081/users/login', credentials, {responseType: 'text',});
  }

  register(credentials: { name: string; email: string; pwd: string }): Observable<string> {
    return this.http.post('http://localhost:8081/users/register', credentials, {responseType: 'text',});
  }
}
