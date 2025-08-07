import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
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
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="flex align-items-center justify-content-center h-screen">
      <p-toast></p-toast>
      <p-card header="Iniciar Sesión" styleClass="w-full max-w-30rem shadow-5">
        <div class="flex flex-column gap-3">
          <div class="flex flex-column gap-2">
            <label for="username">Usuario</label>
            <input pInputText id="username" [(ngModel)]="username" />
          </div>
          <div class="flex flex-column gap-2">
            <label for="password">Contraseña</label>
            <p-password id="password" [(ngModel)]="password" [feedback]="false" [toggleMask]="true"></p-password>
          </div>
          <p-button label="Ingresar" (onClick)="login()" [loading]="loading"></p-button>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background-color: var(--surface-ground);
    }
  `]
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

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