import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    TableModule
  ],
  providers: [MessageService],
  template: `
    <div class="login-container">
      <p-toast></p-toast>
      
      <div class="grid m-0 h-full">
        <!-- Hero Section (Left Side) -->
        <div class="col-12 md:col-6 hero-section">
          <div class="hero-content">
            <h1 class="hero-title">Plataforma Logística</h1>
            <p class="hero-subtitle">Optimiza tus operaciones con nuestra solución integral de gestión logística</p>
            <div class="hero-features">
              <div class="feature-item">
                <i class="pi pi-map-marker"></i>
                <span>Monitoreo GPS avanzado</span>
              </div>
              <div class="feature-item">
                <i class="pi pi-chart-line"></i>
                <span>Análisis de rendimiento</span>
              </div>
              <div class="feature-item">
                <i class="pi pi-shield"></i>
                <span>Seguridad garantizada</span>
              </div>
              <div class="feature-item">
                <i class="pi pi-bolt"></i>
                <span>Respuesta en tiempo real</span>
              </div>
            </div>
            <div class="hero-image">
              <img src="assets/hero-map.svg" alt="Mapa de seguimiento" />
            </div>
          </div>
        </div>
        
        <!-- Login Form (Right Side) -->
        <div class="col-12 md:col-6 form-section">
          <div class="form-container">
            <div class="form-header">
              <h2>Acceso al Sistema</h2>
              <p>Ingresa tus credenciales corporativas</p>
            </div>
            
            <div class="login-form">
              <div class="form-field">
                <label for="username">Identificador de Usuario</label>
                <div class="p-input-icon-left w-full">
                  <i class="pi pi-user"></i>
                  <input pInputText id="username" [(ngModel)]="username" class="w-full" placeholder="Ingresa tu ID de usuario" />
                </div>
              </div>
              
              <div class="form-field">
                <label for="password">Clave de Acceso</label>
                <div class="p-input-icon-left w-full">
                  <i class="pi pi-lock"></i>
                  <p-password id="password" [(ngModel)]="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="Ingresa tu clave de acceso"></p-password>
                </div>
              </div>
              
              <div class="remember-me mb-3">
                <input type="checkbox" id="remember" class="mr-2" />
                <label for="remember">Recordar sesión en este dispositivo</label>
              </div>
              
              <p-button label="Ingresar al Sistema" icon="pi pi-sign-in" styleClass="w-full" (onClick)="login()" [loading]="loading"></p-button>
              
              <div class="login-footer mt-3 text-center">
                <a href="#" class="forgot-password mr-3">¿Olvidaste tu contraseña?</a>
                <a href="#" class="help-link">Ayuda y soporte técnico</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
    
    .login-container {
      height: 100vh;
      overflow: hidden;
    }
    
    .hero-section {
      background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      height: 100%;
    }
    
    .hero-content {
      max-width: 500px;
    }
    
    .hero-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    
    .hero-subtitle {
      font-size: 1.1rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    
    .hero-features {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .hero-image {
      display: flex;
      justify-content: center;
      margin-top: 1rem;
    }
    
    .hero-image img {
      max-width: 100%;
      height: auto;
      opacity: 0.9;
    }
    
    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.1rem;
    }
    
    .feature-item i {
      font-size: 1.25rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .form-section {
      background-color: var(--surface-card);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      height: 100%;
    }
    
    .form-container {
      width: 100%;
      max-width: 450px;
    }
    
    .form-header {
      margin-bottom: 2rem;
      text-align: center;
    }
    
    .form-header h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 0.5rem;
    }
    
    .form-header p {
      color: var(--text-color-secondary);
    }
    
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .remember-me {
      display: flex;
      align-items: center;
      font-size: 0.9rem;
      color: var(--text-color-secondary);
    }
    
    .login-footer {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.5rem;
      font-size: 0.9rem;
    }
    
    .login-footer a {
      color: var(--primary-color);
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .login-footer a:hover {
      color: var(--primary-600);
      text-decoration: underline;
    }
    
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .form-field label {
      font-weight: 500;
      color: var(--text-color);
    }
    
    .demo-users {
      margin-top: 1rem;
    }
    
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      display: inline-block;
      text-transform: capitalize;
    }
    
    .status-admin {
      background-color: #3B82F6;
      color: white;
    }
    
    .status-delivery {
      background-color: #10B981;
      color: white;
    }
    
    /* Responsive adjustments */
    @media screen and (max-width: 768px) {
      .hero-section {
        padding: 2rem 1rem;
      }
      
      .hero-title {
        font-size: 2rem;
      }
      
      .form-section {
        padding: 2rem 1rem;
      }
    }
  `]
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  loading: boolean = false;
  
  // Usuarios de demostración
  demoUsers = [
    { role: 'admin', username: 'admin', password: 'admin123' },
    { role: 'delivery', username: 'delivery1', password: 'delivery123' },
    { role: 'delivery', username: 'delivery2', password: 'delivery123' },
    { role: 'delivery', username: 'delivery3', password: 'delivery123' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  // Método para autocompletar credenciales
  autofill(user: any): void {
    this.username = user.username;
    this.password = user.password;
  }

  login(): void {
    if (!this.username || !this.password) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor ingrese usuario y contraseña'
      });
      return;
    }

    this.loading = true;
    this.authService.login(this.username, this.password).subscribe({
      next: (user) => {
        this.loading = false;
        if (user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/delivery']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error de autenticación',
          detail: err.error?.message || 'Credenciales inválidas'
        });
      }
    });
  }
}