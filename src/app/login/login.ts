import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { EscenariosService } from '../escenarios.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../login.service';
import { FormBuilder, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  providers: [EscenariosService],
  templateUrl: './login.html',
  styleUrl: './login.css'
})

export class Login implements OnInit {

  loginError: string | null = null;
  returnTo: '/home' | '/compra' = '/home';
  ticketToken: string = '';
  email = '';
  password = '';
  
  ngOnInit(){
    const returnToParam = this.route.snapshot.queryParamMap.get('returnTo');
    if (returnToParam === '/compra')
      this.returnTo = '/compra';
    this.ticketToken = this.route.snapshot.queryParamMap.get('ticketToken') ?? '';

    this.userToken = sessionStorage.getItem(this.authTokenStorageKey);
    if(this.userToken)
      this.redirectAfterLogin(this.userToken);
  }

  userToken: string | null = null;
  readonly authTokenStorageKey: string = 'authToken';

  constructor(
    private loginService: LoginService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  submitLogin(event?: Event) {
    event?.preventDefault();

    const email = this.email.trim();
    const password = this.password;

    this.loginError = null;
    if (!this.isEmailValid()) {
      this.loginError = 'Introduce un email válido antes de continuar.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.isPasswordValid()) {
      this.loginError = 'La contraseña no cumple los requisitos mínimos.';
      this.cdr.detectChanges();
      return;
    }
    this.loginService.login({ mail: email, pwd: password }).subscribe(
      (sessionToken: any) => {
        console.log('Login exitoso, token de sesión:', sessionToken);
        sessionStorage.setItem('authToken', sessionToken);
        this.redirectAfterLogin(sessionToken);
      },
      (error: any) => {
        console.error('Error: Invalid Credentials:', error);
        this.loginError = 'El mail o la contraseña son incorrectos. Por favor vuelva a intentarlo.';
        this.password = '';
        this.cdr.detectChanges();
      }
    );
  }
  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }
  isPasswordValid(): boolean {
    return this.getPasswordRequirements().every((requirement) => requirement.met);
  }
  getPasswordRequirements(): Array<{ label: string; met: boolean }> {
    const value = this.password;
    return [
      { label: 'Debe tener al menos 8 caracteres',
        met: value.length >= 8, },
      { label: 'Debe incluir mayúsculas y minúsculas',
        met: /[A-Z]/.test(value) && /[a-z]/.test(value), },
      { label: 'Debe incluir al menos un número',
        met: /\d/.test(value), },
      { label: 'Debe incluir al menos un carácter especial (@!\-... )',
        met: /[\^$*+?.()|[\]{}\\/@!\-_,:;#%&=<>~]/.test(value), }, ];
  }

  private redirectAfterLogin(sessionToken: string): void {
    if (this.returnTo === '/compra') {
      this.router.navigate(['/compra'], {
        queryParams: {
          sessionToken: sessionToken,
          ticketToken: this.ticketToken
        }
      });
      return;
    }
    this.router.navigate(['/'], {
      queryParams: { sessionToken: sessionToken },
    });
  }
}
