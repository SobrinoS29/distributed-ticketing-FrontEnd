import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../login.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verify-email-container">
      <div class="verify-email-card">
        <div *ngIf="isVerifying" class="verifying">
          <h2>Verificando tu email...</h2>
          <p>Por favor espera mientras verificamos tu dirección de correo.</p>
        </div>

        <div *ngIf="!isVerifying && verifySuccess" class="success">
          <div class="success-icon">✓</div>
          <h2>¡Email verificado con éxito!</h2>
          <p>Tu cuenta ha sido activada correctamente.</p>
          <p>Redirigiendo al login en 3 segundos...</p>
        </div>

        <div *ngIf="!isVerifying && verifyError" class="error">
          <div class="error-icon">✗</div>
          <h2>Error en la verificación</h2>
          <p>{{ verifyError }}</p>
          <a href="/login" class="btn-back">Volver al login</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verify-email-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: Arial, sans-serif;
    }

    .verify-email-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 40px;
      text-align: center;
      max-width: 400px;
      width: 100%;
    }

    h2 {
      color: #333;
      margin: 20px 0;
      font-size: 24px;
    }

    p {
      color: #666;
      margin: 10px 0;
      font-size: 14px;
    }

    .verifying {
      animation: fadeIn 0.3s ease-in;
    }

    .success {
      animation: slideIn 0.5s ease-out;
    }

    .success-icon {
      width: 60px;
      height: 60px;
      background: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
      margin: 0 auto;
    }

    .error {
      animation: slideIn 0.5s ease-out;
    }

    .error-icon {
      width: 60px;
      height: 60px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
      margin: 0 auto;
    }

    .btn-back {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    }

    .btn-back:hover {
      background: #2563eb;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class VerifyEmail implements OnInit {
  token: string = '';
  isVerifying: boolean = true;
  verifySuccess: boolean = false;
  verifyError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.isVerifying = false;
      this.verifyError = 'Token de verificación inválido o expirado.';
      this.cdr.detectChanges();
      return;
    }

    // Verificar el email
    this.loginService.verifyEmail(this.token).subscribe(
      (response: any) => {
        this.isVerifying = false;
        this.verifySuccess = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      (error: any) => {
        this.isVerifying = false;
        this.verifyError = 'El token de verificación ha expirado o es inválido. Por favor, solicita un nuevo email de confirmación.';
        this.cdr.detectChanges();
      }
    );
  }
}
