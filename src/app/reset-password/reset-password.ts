import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../login.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  resetError: string | null = null;
  resetSuccess: string | null = null;
  isValidating: boolean = true;
  isTokenValid: boolean = false;
  passwordsMatch: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Obtener el token de la URL
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.resetError = 'Token de recuperación inválido o expirado.';
      this.isValidating = false;
      this.cdr.detectChanges();
      return;
    }

    // Validar el token
    this.loginService.validateResetToken(this.token).subscribe(
      (response: any) => {
        this.isTokenValid = response.valid;
        this.isValidating = false;
        if (!this.isTokenValid) {
          this.resetError = 'El token de recuperación ha expirado. Por favor, solicita uno nuevo.';
        }
        this.cdr.detectChanges();
      },
      (error: any) => {
        this.isValidating = false;
        this.resetError = 'Error al validar el token. Por favor, intenta de nuevo.';
        this.cdr.detectChanges();
      }
    );
  }

  submitReset(event?: Event) {
    event?.preventDefault();

    this.resetError = null;
    this.passwordsMatch = true;

    if (!this.newPassword || !this.confirmPassword) {
      this.resetError = 'Por favor, completa todos los campos.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordsMatch = false;
      this.resetError = 'Las contraseñas no coinciden.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isPasswordValid(this.newPassword)) {
      this.resetError = 'La contraseña no cumple los requisitos mínimos.';
      this.cdr.detectChanges();
      return;
    }

    this.loginService.resetPassword(this.token, this.newPassword).subscribe(
      (response: any) => {
        this.resetSuccess = 'Contraseña actualizada con éxito. Redirigiendo al login...';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      (error: any) => {
        console.error('Error al resetear contraseña:', error);
        this.resetError = 'Error al actualizar la contraseña. Por favor, intenta de nuevo.';
        this.cdr.detectChanges();
      }
    );
  }

  isPasswordValid(password: string = this.newPassword): boolean {
    return this.getPasswordRequirements(password).every((requirement) => requirement.met);
  }

  getPasswordRequirements(password: string = this.newPassword): Array<{ label: string; met: boolean }> {
    const value = password;
    return [
      { label: 'Debe tener al menos 8 caracteres',
        met: value.length >= 8, },
      { label: 'Debe incluir mayúsculas y minúsculas',
        met: /[A-Z]/.test(value) && /[a-z]/.test(value), },
      { label: 'Debe incluir al menos un número',
        met: /\d/.test(value), },
      { label: 'Debe incluir al menos un carácter especial (@!-... )',
        met: /[\^$*+?.()|[\]{}\\/@!\-_,:;#%&=<>~]/.test(value), }, ];
  }
}
