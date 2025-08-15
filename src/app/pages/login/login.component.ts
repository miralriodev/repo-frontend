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
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';

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
          
          <p-divider align="center">
            <span class="p-tag">Usuarios de Prueba</span>
          </p-divider>
          
          <div class="demo-users">
            <p-table [value]="demoUsers" styleClass="p-datatable-sm" [tableStyle]="{'min-width': '100%'}">
              <ng-template pTemplate="header">
                <tr>
                  <th>Rol</th>
                  <th>Usuario</th>
                  <th>Contraseña</th>
                  <th>Acción</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-user>
                <tr>
                  <td>
                    <span [ngClass]="{
                      'bg-blue-500 text-white': user.role === 'admin',
                      'bg-green-500 text-white': user.role === 'delivery'
                    }" class="p-1 border-round">
                      {{ user.role }}
                    </span>
                  </td>
                  <td>{{ user.username }}</td>
                  <td>{{ user.password }}</td>
                  <td>
                    <p-button 
                      icon="pi pi-sign-in" 
                      styleClass="p-button-sm p-button-text" 
                      (onClick)="autofill(user)"
                      tooltip="Usar estas credenciales"
                    ></p-button>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
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
    
    .demo-users {
      margin-top: 1rem;
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