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

  requestPasswordReset(email: string, frontendUrl: string = window.location.origin): Observable<any> {
    return this.http.post('/users/forgot-password', { email, frontendUrl });
  }

  validateResetToken(token: string): Observable<any> {
    return this.http.get(`/users/reset-password/validate?token=${token}`);
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post('/users/reset-password', { token, newPassword });
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get(`/users/verify-email?token=${token}`);
  }
}
