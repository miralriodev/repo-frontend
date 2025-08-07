import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

import { AuthService } from '../../services/auth.service';
import { DeliveryService } from '../../services/delivery.service';
import { PackageService } from '../../services/package.service';
import { SocketService } from '../../services/socket.service';
import { User } from '../../interfaces/user.interface';
import { Package } from '../../interfaces/package.interface';
import { Location } from '../../interfaces/location.interface';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="grid">
      <div class="col-12">
        <div class="flex justify-content-between align-items-center mb-3">
          <h1>Panel de Administración</h1>
          <p-button icon="pi pi-sign-out" label="Cerrar Sesión" (onClick)="logout()"></p-button>
        </div>
      </div>
      
      <div class="col-12 md:col-8">
        <div class="card" style="height: 500px;">
          <div class="flex justify-content-between align-items-center">
            <h2>Mapa de Deliveries</h2>
            <p-button icon="pi pi-map-marker" label="Mi Ubicación" (onClick)="getCurrentPosition()"></p-button>
          </div>
          <div id="map" style="height: 400px;"></div>
        </div>
      </div>
      
      <div class="col-12 md:col-4">
        <div class="card">
          <h2>Deliveries</h2>
          <p-table [value]="deliveries" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-delivery>
              <tr>
                <td>{{ delivery.username }}</td>
                <td>
                  <span [ngClass]="{
                    'bg-green-500': delivery.status === 'working',
                    'bg-red-500': delivery.status === 'off'
                  }" class="text-white px-2 py-1 border-round">
                    {{ delivery.status === 'working' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <p-button icon="pi pi-box" styleClass="p-button-sm mr-2" 
                    (onClick)="openAssignPackageDialog(delivery)"></p-button>
                  <p-button icon="pi pi-power-off" styleClass="p-button-sm"
                    [ngClass]="{
                      'p-button-danger': delivery.status === 'working',
                      'p-button-success': delivery.status === 'off'
                    }"
                    (onClick)="toggleDeliveryStatus(delivery)"></p-button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
      
      <div class="col-12">
        <div class="card">
          <h2>Paquetes</h2>
          <p-table [value]="packages" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>ID</th>
                <th>Dirección</th>
                <th>Delivery</th>
                <th>Estado</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-pkg>
              <tr>
                <td>{{ pkg.id }}</td>
                <td>{{ pkg.delivery_address }}</td>
                <td>{{ pkg.delivery_name }}</td>
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
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </div>
    
    <p-dialog header="Asignar Paquete" [(visible)]="showAssignDialog" [style]="{width: '450px'}">
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="address">Dirección de Entrega</label>
          <input pInputText id="address" [(ngModel)]="newPackage.deliveryAddress" />
        </div>
        <p-button label="Asignar" (onClick)="assignPackage()" [loading]="loading"></p-button>
      </div>
    </p-dialog>
    
    <p-toast></p-toast>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1rem;
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  deliveries: User[] = [];
  packages: Package[] = [];
  locations: Location[] = [];
  map!: L.Map;
  markers: { [key: number]: L.Marker } = {};
  showAssignDialog = false;
  selectedDelivery: User | null = null;
  newPackage = {
    deliveryAddress: ''
  };
  loading = false;
  private subscriptions: Subscription[] = [];
  myLocationMarker: L.Marker | null = null;

  constructor(
    private authService: AuthService,
    private deliveryService: DeliveryService,
    private packageService: PackageService,
    private socketService: SocketService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initMap();
    this.loadDeliveries();
    this.loadPackages();
    this.loadLocations();
    this.getCurrentPosition(); // Añadir esta línea
    
    // Suscribirse a actualizaciones de ubicación
    this.subscriptions.push(
      this.socketService.onLocationUpdated().subscribe(location => {
        this.updateMarker(location);
      })
    );
    
    // Suscribirse a actualizaciones de paquetes
    this.subscriptions.push(
      this.socketService.onPackageUpdated().subscribe(() => {
        this.loadPackages();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initMap(): void {
    this.map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  loadDeliveries(): void {
    this.deliveryService.getAllDeliveries().subscribe({
      next: (data) => {
        this.deliveries = data;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los deliveries'
        });
      }
    });
  }

  loadPackages(): void {
    this.packageService.getAllPackages().subscribe({
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

  loadLocations(): void {
    this.deliveryService.getAllLocations().subscribe({
      next: (data) => {
        this.locations = data;
        this.updateMapWithLocations();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las ubicaciones'
        });
      }
    });
  }

  updateMapWithLocations(): void {
    if (this.locations.length > 0) {
      // Centrar el mapa en la primera ubicación
      const firstLoc = this.locations[0];
      this.map.setView([firstLoc.latitude, firstLoc.longitude], 13);
      
      // Actualizar marcadores para cada ubicación
      this.locations.forEach(location => {
        this.updateMarker(location);
      });
    }
  }

  updateMarker(location: Location): void {
    const { user_id, latitude, longitude, username } = location;
    
    // Si ya existe un marcador para este usuario, actualizarlo
    if (this.markers[user_id]) {
      this.markers[user_id].setLatLng([latitude, longitude]);
    } else {
      // Crear un nuevo marcador
      const marker = L.marker([latitude, longitude], {
        icon: L.icon({
          iconUrl: 'assets/marker-icon.png',
          shadowUrl: 'assets/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(this.map);
      
      marker.bindPopup(`<b>${username || 'Delivery'}</b><br>Lat: ${latitude}<br>Lng: ${longitude}`);
      this.markers[user_id] = marker;
    }
  }

  openAssignPackageDialog(delivery: User): void {
    this.selectedDelivery = delivery;
    this.newPackage.deliveryAddress = '';
    this.showAssignDialog = true;
  }

  assignPackage(): void {
    if (!this.selectedDelivery || !this.newPackage.deliveryAddress) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete todos los campos'
      });
      return;
    }

    this.loading = true;
    this.packageService.createPackage(
      this.newPackage.deliveryAddress,
      this.selectedDelivery.id
    ).subscribe({
      next: () => {
        this.loading = false;
        this.showAssignDialog = false;
        this.loadPackages();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Paquete asignado correctamente'
        });
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudo asignar el paquete'
        });
      }
    });
  }

  toggleDeliveryStatus(delivery: User): void {
    const newStatus = delivery.status === 'working' ? 'off' : 'working';
    
    this.deliveryService.updateDeliveryStatus(delivery.id, newStatus).subscribe({
      next: () => {
        delivery.status = newStatus;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Estado cambiado a ${newStatus === 'working' ? 'Activo' : 'Inactivo'}`
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudo cambiar el estado'
        });
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Añadir este método después de updateMapWithLocations
  getCurrentPosition(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Centrar el mapa en tu ubicación actual
          this.map.setView([latitude, longitude], 13);
          
          // Crear un marcador para tu ubicación con un icono diferente
          if (this.myLocationMarker) {
            this.myLocationMarker.setLatLng([latitude, longitude]);
          } else {
            // Crear un icono personalizado para tu ubicación
            const myIcon = L.divIcon({
              className: 'my-location-icon',
              html: '<div style="background-color: blue; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white;"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            this.myLocationMarker = L.marker([latitude, longitude], {
              icon: myIcon,
              zIndexOffset: 1000 // Para que aparezca por encima de otros marcadores
            }).addTo(this.map);
            
            this.myLocationMarker.bindPopup('<b>Mi ubicación actual</b>').openPopup();
          }
        },
        (error) => {
          console.error('Error getting location', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo obtener la ubicación'
          });
        }
      );
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Geolocalización no soportada en este navegador'
      });
    }
  }
}