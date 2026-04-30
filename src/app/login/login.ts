import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { EscenariosService } from '../escenarios.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginService } from '../login.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  providers: [EscenariosService],
  templateUrl: './login.html',
  styleUrl: './login.css'
})

export class Login implements OnInit {

  loginError: string | null = null;
  registerError: string | null = null;
  registerSuccess: string | null = null;
  showRegisterForm = false;
  returnTo: '/home' | '/compra' = '/home';
  ticketToken: string = '';
  email = '';
  password = '';
  registerName = '';
  registerEmail = '';
  registerPassword = '';
  
  ngOnInit(){
    const returnToParam = this.route.snapshot.queryParamMap.get('returnTo');
    if (returnToParam === '/compra')
      this.returnTo = '/compra';
    this.ticketToken = this.route.snapshot.queryParamMap.get('ticketToken') ?? '';

    // If a token was passed in the URL (e.g. after an external login redirect),
    // capture it into sessionStorage and remove it from the visible URL immediately.
    const tokenFromUrl = this.route.snapshot.queryParamMap.get('userToken');
    if (tokenFromUrl) {
      sessionStorage.setItem(this.authTokenStorageKey, tokenFromUrl);
      this.userToken = tokenFromUrl;
      // Remove sensitive query params from the URL so the token is not exposed.
      try {
        const cleanPath = window.location.pathname + window.location.hash;
        history.replaceState(null, '', cleanPath);
      } catch (e) {
        // Fallback: do nothing if replaceState is unavailable.
        console.warn('Could not remove token from URL', e);
      }
    }

    this.userToken = this.userToken ?? sessionStorage.getItem(this.authTokenStorageKey);
    if (this.userToken)
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
    this.loginService.login({ mail: email, pwd: password }).subscribe(
      (userToken: any) => {
        console.log('Login exitoso, token de usuario:', userToken);
        sessionStorage.setItem('authToken', userToken);
        this.redirectAfterLogin(userToken);
      },
      (error: any) => {
        console.error('Error: Invalid Credentials:', error);
        this.loginError = 'El mail o la contraseña son incorrectos. Por favor vuelva a intentarlo.';
        this.password = '';
        this.cdr.detectChanges();
      }
    );
  }

  submitRegister(event?: Event) {
    event?.preventDefault();

    const name = this.registerName.trim();
    const email = this.registerEmail.trim();
    const password = this.registerPassword;

    this.registerError = null;
    if (!this.isNameValid(name)) {
      this.registerError = 'Introduce tu nombre antes de continuar.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.isEmailValid(email)) {
      this.registerError = 'Introduce un email válido antes de continuar.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.isPasswordValid(password)) {
      this.registerError = 'La contraseña no cumple los requisitos mínimos.';
      this.cdr.detectChanges();
      return;
    }

    this.registerSuccess = null;
    this.loginService.register({ name, email, pwd: password }).subscribe(  // Siempre devolverá lo mismo tanto si el registro es exitoso como si el email ya está registrado para evitar revelar información sobre los usuarios registrados
      (response: any) => {
        this.handleRegisterSuccess(email);
      },
      (error: any) => {
        console.error('Error en el registro:', error);
        this.registerError = 'Ha ocurrido un error durante el registro. Por favor, inténtalo de nuevo más tarde.';
        this.cdr.detectChanges();
      }
    );
  }

  openRegisterForm(): void {
    this.showRegisterForm = true;
    this.registerError = null;
    this.registerSuccess = null;
    this.registerName = '';
    this.registerEmail = this.email.trim();
    this.registerPassword = '';
    this.loginError = null;
  }

  closeRegisterForm(): void {
    this.showRegisterForm = false;
    this.registerError = null;
    this.registerSuccess = null;
    this.registerName = '';
    this.registerEmail = '';
    this.registerPassword = '';
  }

  private handleRegisterSuccess(email: string): void {
    this.registerError = null;
    this.registerSuccess = 'Te has registrado con éxito. Se enviará un correo de confirmación a ' + email + '.';
    this.email = email;
    this.password = '';
    this.registerName = '';
    this.registerEmail = email;
    this.registerPassword = '';
    this.cdr.detectChanges();
  }

  isNameValid(name: string = this.registerName): boolean {
    return name.trim().length > 0;
  }

  isEmailValid(email: string = this.email): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  isPasswordValid(password: string = this.password): boolean {
    return this.getPasswordRequirements(password).every((requirement) => requirement.met);
  }

  getPasswordRequirements(password: string = this.password): Array<{ label: string; met: boolean }> {
    const value = password;
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

  private redirectAfterLogin(userToken: string): void {
    if (this.returnTo === '/compra') {
      const ticket = this.ticketToken || sessionStorage.getItem('ticketToken') || '';
      // Do NOT include `userToken` in the URL. Store it in sessionStorage and
      // only pass non-sensitive data (like a ticket identifier) if needed.
      sessionStorage.setItem(this.authTokenStorageKey, userToken);
      this.router.navigate(['/compra'], {
        queryParams: {
          ticketToken: ticket
        }
      });
      return;
    }
    // Store token and navigate without exposing it in the query string.
    sessionStorage.setItem(this.authTokenStorageKey, userToken);
    this.router.navigate(['/']);
  }
}
