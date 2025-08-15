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
  private defaultPosition = { latitude: 19.4326, longitude: -99.1332 };

  // Variables para manejar simulación
  private routeLines: { [key: number]: L.Polyline } = {};
  private destinationMarkers: { [key: number]: L.Marker } = {};
  private simulationInProgress = false;

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

    // 🔧 CÓDIGO MOVIDO AQUÍ: Suscribirse a actualizaciones de simulación de ruta
    this.subscriptions.push(
      this.socketService.onRouteSimulationUpdated().subscribe(data => {
        // Verificar que la simulación sea para este delivery
        const currentUserId = this.authService.currentUserValue?.id;
        if (data.deliveryId === currentUserId) {
          this.handleRouteSimulation(data);
        }
      })
    );
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
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
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
          console.log('Coordenadas obtenidas:', { latitude, longitude });
          this.currentPosition = { latitude, longitude };
          
          this.updateMapPosition(latitude, longitude);
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
    this.map.setView([latitude, longitude], 15);
    
    if (this.marker) {
      this.marker.setLatLng([latitude, longitude]);
    } else {
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
    
    this.deliveryService.updateLocation(latitude, longitude).subscribe();
    this.socketService.updateLocation({ userId, latitude, longitude });
  }

  updatePackageStatus(packageId: number, status: 'en_transito' | 'entregado' | 'regresado'): void {
    this.packageService.updatePackageStatus(packageId, status).subscribe({
      next: (updatedPackage) => {
        const index = this.packages.findIndex(p => p.id === packageId);
        if (index !== -1) {
          this.packages[index].status = updatedPackage.status;
        }
        
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

  // 🔧 MÉTODOS MOVIDOS DENTRO DE LA CLASE:

  // Manejar actualizaciones de simulación de ruta
  private handleRouteSimulation(data: any): void {
    const { route, destination, address, currentStep, totalSteps, status, packageId } = data;

    // Si es inicio de simulación, crear línea de ruta y marcador de destino
    if (status === 'start') {
      // Limpiar simulaciones anteriores
      this.clearSimulation();

      // Marcar que hay una simulación en progreso
      this.simulationInProgress = true;

      // Crear línea de ruta
      const routeLine = L.polyline(route.map((point: any) => [point.lat, point.lng]), {
        color: '#ff6b35',
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 12'
      }).addTo(this.map);

      this.routeLines[1] = routeLine;

      // Crear marcador de destino
      const destinationIcon = L.divIcon({
        html: `
          <div style="
            background-color: #FF4444;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">
            📍
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      this.destinationMarkers[1] = L.marker([destination.lat, destination.lng], {
        icon: destinationIcon
      })
      .bindPopup(`<b>Destino:</b><br>${address}`)
      .addTo(this.map);

      // Centrar mapa para ver toda la ruta
      this.map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

      this.messageService.add({
        severity: 'info',
        summary: '🚀 Simulación Iniciada',
        detail: `En camino a ${address}`,
        life: 3000
      });
    }
    // Si es actualización, mover el marcador del delivery
    else if (status === 'update' && this.simulationInProgress) {
      const currentPosition = route[currentStep];

      // Actualizar posición del marcador con transición suave
      if (this.marker) {
        // Agregar clase CSS para transición suave
        const markerElement = this.marker.getElement();
        if (markerElement) {
          markerElement.style.transition = 'all 0.3s ease-out';
        }

        this.marker.setLatLng([currentPosition.lat, currentPosition.lng]);

        // Actualizar popup con progreso
        const progress = Math.round((currentStep / totalSteps) * 100);
        this.marker.bindPopup(`
          <div style="text-align: center;">
            <b>🚚 En ruta</b><br>
            <small>Destino: ${address}</small><br>
            <div style="background: #e0e0e0; border-radius: 10px; padding: 2px; margin: 5px 0;">
              <div style="background: #4caf50; height: 8px; border-radius: 8px; width: ${progress}%;"></div>
            </div>
            <small>${progress}% completado</small>
          </div>
        `);
      }
    }
    // Si es finalización, limpiar la simulación y actualizar el estado del paquete
    else if (status === 'complete') {
      this.clearSimulation();

      // Actualizar el estado del paquete a entregado si se proporciona el ID del paquete
      if (packageId) {
        this.updatePackageStatus(packageId, 'entregado');
      }

      this.messageService.add({
        severity: 'success',
        summary: '✅ Entrega Completada',
        detail: `Paquete entregado en ${address}`,
        life: 5000
      });

      // Recargar la lista de paquetes para mostrar el estado actualizado
      this.loadPackages();
    }
  }

  // Limpiar simulación
  private clearSimulation(): void {
    this.simulationInProgress = false;

    // Limpiar línea de ruta
    if (this.routeLines[1]) {
      this.map.removeLayer(this.routeLines[1]);
      delete this.routeLines[1];
    }

    // Limpiar marcador de destino
    if (this.destinationMarkers[1]) {
      this.map.removeLayer(this.destinationMarkers[1]);
      delete this.destinationMarkers[1];
    }
  }
}