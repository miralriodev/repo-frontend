import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private socketService: SocketService,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    // Verificar la ruta actual para determinar qué usuario cargar
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/admin')) {
    // Si estamos en la ruta admin, intentar cargar el usuario admin de sessionStorage
    const adminUserJson = sessionStorage.getItem('adminUser');
    if (adminUserJson) {
      const adminUser = JSON.parse(adminUserJson);
      this.currentUserSubject.next(adminUser);
      return; // Importante: salir del método después de cargar el usuario correcto
    }
    } else if (currentPath.includes('/delivery')) {
    // Si estamos en la ruta delivery, intentar cargar el usuario delivery de sessionStorage
    const deliveryUserJson = sessionStorage.getItem('deliveryUser');
    if (deliveryUserJson) {
      const deliveryUser = JSON.parse(deliveryUserJson);
      this.currentUserSubject.next(deliveryUser);
      return; // Importante: salir del método después de cargar el usuario correcto
    }
    }
    
    // Si no se encontró un usuario específico para la ruta en sessionStorage,
    // intentar cargar desde localStorage como respaldo
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      const user = JSON.parse(userJson);
      this.currentUserSubject.next(user);
    }
  }

  login(username: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(user => {
          localStorage.setItem('currentUser', JSON.stringify(user));
          
          // Guardar también en sessionStorage según el rol
          if (user.role === 'admin') {
            sessionStorage.setItem('adminUser', JSON.stringify(user));
          } else if (user.role === 'delivery') {
            sessionStorage.setItem('deliveryUser', JSON.stringify(user));
          }
          
          this.currentUserSubject.next(user);
          
          // Si es delivery, notificar al socket que se conectó
          if (user.role === 'delivery') {
            this.socketService.notifyDeliveryLogin(user);
          }
        })
      );
  }

  logout(): void {
    const currentUser = this.currentUserValue;
    
    // Si es delivery, notificar desconexión
    if (currentUser?.role === 'delivery') {
      this.socketService.notifyDeliveryLogout(currentUser.id);
    }
    
    localStorage.removeItem('currentUser');
    
    // Limpiar también sessionStorage según la ruta actual
    const currentPath = window.location.pathname;
    if (currentPath.includes('/admin')) {
      sessionStorage.removeItem('adminUser');
    } else if (currentPath.includes('/delivery')) {
      sessionStorage.removeItem('deliveryUser');
    }
    
    this.currentUserSubject.next(null);
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }

  get isAdmin(): boolean {
    return this.currentUserValue?.role === 'admin';
  }

  get isDelivery(): boolean {
    return this.currentUserValue?.role === 'delivery';
  }

  get token(): string | undefined {
    return this.currentUserValue?.token;
  }
}