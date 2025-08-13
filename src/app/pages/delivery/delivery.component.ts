import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription, interval } from 'rxjs';
import * as L from 'leaflet';

import { AuthService } from '../../services/auth.service';
import { DeliveryService } from '../../services/delivery.service';
import { PackageService } from '../../services/package.service';
import { SocketService } from '../../services/socket.service';
import { Package } from '../../interfaces/package.interface';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="grid">
      <div class="col-12">
        <div class="flex justify-content-between align-items-center mb-3">
          <h1>Panel de Delivery</h1>
          <p-button icon="pi pi-sign-out" label="Cerrar Sesión" (onClick)="logout()"></p-button>
        </div>
      </div>
      
      <div class="col-12">
        <div class="card" style="height: 400px;">
          <h2>Mi Ubicación</h2>
          <div id="map" style="height: 300px;"></div>
          <div class="mt-2">
            <p-button icon="pi pi-map-marker" label="Actualizar Ubicación" (onClick)="getCurrentPosition()"></p-button>
          </div>
        </div>
      </div>
      
      <div class="col-12">
        <div class="card">
          <h2>Mis Paquetes</h2>
          <p-table [value]="packages" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>ID</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-pkg>
              <tr>
                <td>{{ pkg.id }}</td>
                <td>{{ pkg.delivery_address }}</td>
                <td>
                  <span [ngClass]="{
                    'bg-blue-500': pkg.status === 'asignado',
                    'bg-orange-500': pkg.status === 'en_transito',
                    'bg-green-500': pkg.status === 'entregado',
                    'bg-red-500': pkg.status === 'regresado'
                  }" class="text-white px-2 py-1 border-round">
                    {{ pkg.status }}
                  </span>
                </td>
                <td>
                  <p-button *ngIf="pkg.status === 'asignado'" 
                    label="En Tránsito" 
                    styleClass="p-button-warning p-button-sm mr-2"
                    (onClick)="updatePackageStatus(pkg.id, 'en_transito')"></p-button>
                  <p-button *ngIf="pkg.status === 'en_transito'" 
                    label="Entregado" 
                    styleClass="p-button-success p-button-sm mr-2"
                    (onClick)="updatePackageStatus(pkg.id, 'entregado')"></p-button>
                  <p-button *ngIf="pkg.status === 'en_transito'" 
                    label="Regresado" 
                    styleClass="p-button-danger p-button-sm"
                    (onClick)="updatePackageStatus(pkg.id, 'regresado')"></p-button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </div>
    
    <p-toast></p-toast>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1rem;
    }
    
    .delivery-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
  `]
})
export class DeliveryComponent implements OnInit, OnDestroy {
  packages: Package[] = [];
  map!: L.Map;
  marker: L.Marker | null = null;
  currentPosition: { latitude: number, longitude: number } | null = null;
  private subscriptions: Subscription[] = [];
  private defaultPosition = { latitude: 19.4326, longitude: -99.1332 }; // Ciudad de México como posición por defecto

  constructor(
    private authService: AuthService,
    private deliveryService: DeliveryService,
    private packageService: PackageService,
    private socketService: SocketService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Primero intentamos obtener la ubicación antes de inicializar el mapa
    this.tryGetInitialPosition();
    this.loadPackages();
  
    // Notificar al servidor que el delivery está activo al cargar la página
    if (this.authService.currentUserValue && this.authService.isDelivery) {
      this.socketService.notifyDeliveryLogin(this.authService.currentUserValue);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.map) {
      this.map.remove();
    }
  }

  tryGetInitialPosition(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.currentPosition = { latitude, longitude };
          this.initMap(latitude, longitude);
          this.startLocationTracking();
        },
        (error) => {
          console.error('Error getting initial location', error);
          // Si falla, inicializamos con la posición por defecto
          this.initMap(this.defaultPosition.latitude, this.defaultPosition.longitude);
          this.startLocationTracking();
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudo obtener tu ubicación inicial. Usando ubicación por defecto.'
          });
        },
        { timeout: 5000, enableHighAccuracy: true } // Timeout de 5 segundos para evitar esperas largas
      );
    } else {
      // Si no hay geolocalización, inicializamos con la posición por defecto
      this.initMap(this.defaultPosition.latitude, this.defaultPosition.longitude);
      this.startLocationTracking();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Geolocalización no soportada en este navegador'
      });
    }
  }

  initMap(latitude: number, longitude: number): void {
    if (this.map) {
      this.map.remove();
    }
    
    this.map = L.map('map').setView([latitude, longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    
    // Crear el marcador inicial
    this.updateMapPosition(latitude, longitude);
  }

  loadPackages(): void {
    this.packageService.getPackagesByDelivery().subscribe({
      next: (data) => {
        this.packages = data;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los paquetes'
        });
      }
    });
  }

  startLocationTracking(): void {
    // Actualizar la ubicación cada 10 segundos
    this.subscriptions.push(
      interval(10000).subscribe(() => {
        this.getCurrentPosition();
      })
    );
  }

  getCurrentPosition(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Coordenadas obtenidas:', { latitude, longitude }); // Agregar este log
          this.currentPosition = { latitude, longitude };
          
          // Actualizar el mapa
          this.updateMapPosition(latitude, longitude);
          
          // Enviar la ubicación al servidor
          this.sendLocationUpdate(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo obtener la ubicación'
          });
        },
        { enableHighAccuracy: true }
      );
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Geolocalización no soportada en este navegador'
      });
    }
  }

  updateMapPosition(latitude: number, longitude: number): void {
    // Centrar el mapa en la posición actual
    this.map.setView([latitude, longitude], 15);
    
    // Actualizar o crear el marcador
    if (this.marker) {
      this.marker.setLatLng([latitude, longitude]);
    } else {
      // Crear un icono personalizado con emoji de moto
      const customIcon = L.divIcon({
        className: 'delivery-icon',
        html: '<div style="font-size: 30px; text-shadow: 0px 0px 3px white, 0px 0px 5px white;">🏍️</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      
      this.marker = L.marker([latitude, longitude], {
        icon: customIcon
      }).addTo(this.map);
      
      this.marker.bindPopup('Mi ubicación actual').openPopup();
    }
  }

  sendLocationUpdate(latitude: number, longitude: number): void {
    const userId = this.authService.currentUserValue?.id;
    if (!userId) return;
    
    // Actualizar en la base de datos
    this.deliveryService.updateLocation(latitude, longitude).subscribe();
    
    // Emitir a través de socket.io
    this.socketService.updateLocation({ userId, latitude, longitude });
  }

  updatePackageStatus(packageId: number, status: 'en_transito' | 'entregado' | 'regresado'): void {
    this.packageService.updatePackageStatus(packageId, status).subscribe({
      next: (updatedPackage) => {
        // Actualizar el paquete en la lista local
        const index = this.packages.findIndex(p => p.id === packageId);
        if (index !== -1) {
          this.packages[index].status = updatedPackage.status;
        }
        
        // Emitir a través de socket.io
        this.socketService.updatePackageStatus({ packageId, status });
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Estado del paquete actualizado'
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudo actualizar el estado'
        });
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}