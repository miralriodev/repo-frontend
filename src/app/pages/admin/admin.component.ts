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
import { Subscription, interval } from 'rxjs';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
            <div class="flex gap-2">
              <p-button icon="pi pi-map-marker" label="Mi Ubicación" (onClick)="getCurrentPosition()"></p-button>
              <p-button icon="pi pi-users" label="Ver Todos" (onClick)="showAllDeliveryLocations()"></p-button>
            </div>
          </div>
          <div id="map" style="height: 400px;"></div>
        </div>
      </div>
      
      <div class="col-12 md:col-4">
        <div class="card">
          <h2>Deliveries</h2>
          <p-table [value]="activeDeliveries" styleClass="p-datatable-sm">
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
                  <span class="bg-green-500 text-white px-2 py-1 border-round">
                    Activo
                  </span>
                </td>
                <td>
                  <p-button icon="pi pi-box" styleClass="p-button-sm" 
                    (onClick)="openAssignPackageDialog(delivery)"
                    [disabled]="!isDeliveryActive(delivery.id)"></p-button>
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
  showAllDeliveries = false;
  
  // Propiedades para simulación
  private routeAnimations: { [key: number]: any } = {};
  private destinationMarkers: { [key: number]: L.Marker } = {};
  private routeLines: { [key: number]: L.Polyline } = {};
  private activeDeliveryIds: number[] = [];

  constructor(
    private authService: AuthService,
    private deliveryService: DeliveryService,
    private packageService: PackageService,
    private socketService: SocketService,
    private router: Router,
    private messageService: MessageService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initMap();
    this.loadDeliveries();
    this.loadPackages();
    this.loadActiveDeliveries();
    
    // Primero obtener tu posición, luego cargar las ubicaciones
    this.getCurrentPosition(() => {
      this.loadLocations();
    });
    
    // Suscribirse a actualizaciones de ubicación
    this.subscriptions.push(
      this.socketService.onLocationUpdated().subscribe(location => {
        this.updateMarker(location);
        // Añadir la ubicación actualizada a la lista si no existe
        const existingIndex = this.locations.findIndex(loc => loc.user_id === location.user_id);
        if (existingIndex >= 0) {
          this.locations[existingIndex] = location;
        } else {
          this.locations.push(location);
        }
        
        // Notificación muy sutil solo para actualizaciones en tiempo real
        this.messageService.add({
          severity: 'info',
          summary: '📍',
          detail: `${location.username ? location.username : 'Delivery'} actualizado`,
          life: 1000 // Solo 1 segundo
        });
      })
    );
    
    // Suscribirse a actualizaciones de paquetes
    this.subscriptions.push(
      this.socketService.onPackageUpdated().subscribe(() => {
        this.loadPackages();
      })
    );
    
    // Suscribirse a cambios de deliveries activos
    this.subscriptions.push(
      this.socketService.onActiveDeliveriesUpdated().subscribe(activeIds => {
        this.activeDeliveryIds = activeIds;
        this.updateMarkersVisibility();
      })
    );
    
    // Recargar ubicaciones cada 10 segundos para asegurar que tenemos datos actualizados
    this.subscriptions.push(
      interval(10000).subscribe(() => {
        this.loadLocations();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Limpiar todas las animaciones
    Object.keys(this.routeAnimations).forEach(key => {
      clearInterval(this.routeAnimations[parseInt(key)]);
    });
    
    // Limpiar líneas de ruta
    Object.values(this.routeLines).forEach(line => {
      this.map.removeLayer(line);
    });
    
    // Limpiar marcadores de destino
    Object.values(this.destinationMarkers).forEach(marker => {
      this.map.removeLayer(marker);
    });
  }

  initMap(): void {
    this.map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  // Verificar si un delivery está activo (tiene sesión)
  isDeliveryActive(deliveryId: number): boolean {
    return this.activeDeliveryIds.includes(deliveryId);
  }
  
  // Filtrar deliveries para mostrar solo los activos
  get activeDeliveries(): User[] {
    return this.deliveries.filter(delivery => 
      this.isDeliveryActive(delivery.id)
    );
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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
        // Eliminar notificación automática - solo mostrar en consola
        console.log('✅ Ubicaciones sincronizadas:', data.length);
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

  loadActiveDeliveries(): void {
    // Hacer una petición HTTP para obtener los deliveries activos
    this.http.get<{activeDeliveries: number[]}>(`${environment.apiUrl}/api/delivery/active`)
      .subscribe({
        next: (response) => {
          this.activeDeliveryIds = response.activeDeliveries;
          this.updateMarkersVisibility();
          console.log('Deliveries activos cargados:', this.activeDeliveryIds);
        },
        error: (error) => {
          console.error('Error cargando deliveries activos:', error);
        }
      });
  }

  // Modificar getCurrentPosition para aceptar un callback
  getCurrentPosition(callback?: () => void): void {
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
          
          // Ejecutar el callback si existe
          if (callback) callback();
        },
        (error) => {
          console.error('Error getting location', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo obtener la ubicación'
          });
          // Ejecutar el callback incluso si hay error
          if (callback) callback();
        }
      );
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Geolocalización no soportada en este navegador'
      });
      // Ejecutar el callback incluso si no hay soporte
      if (callback) callback();
    }
  }

  updateMapWithLocations(): void {
    console.log('📍 Actualizando mapa - Ubicaciones recibidas:', this.locations.length, 'Marcadores actuales:', Object.keys(this.markers).length);
    
    if (!this.map || !this.locations || this.locations.length === 0) {
      console.log('⚠️ No hay mapa o ubicaciones para actualizar');
      return;
    }
    
    // APLICAR AJUSTE DE UBICACIONES SUPERPUESTAS EN TODAS LAS ACTUALIZACIONES
    const adjustedLocations = this.adjustOverlappingLocations(this.locations);
    console.log('🔧 Ubicaciones ajustadas para evitar superposición:', adjustedLocations.length);
    
    // SOLO actualizar/crear marcadores para las ubicaciones ajustadas
    adjustedLocations.forEach(location => {
      if (location.user_id && location.latitude && location.longitude) {
        this.updateMarker(location);
      }
    });
    
    console.log('✅ Mapa actualizado - Total marcadores:', Object.keys(this.markers).length);
    
    // Ajustar vista solo si se solicita
    if (this.showAllDeliveries) {
      this.adjustMapView();
      this.showAllDeliveries = false;
    }
  }

  updateMarker(location: Location): void {
    const { user_id, latitude, longitude, username } = location;
    
    // Validar coordenadas
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.warn('⚠️ Coordenadas inválidas para:', username, latitude, longitude);
      return;
    }
    
    const existingMarker = this.markers[user_id];
    
    if (existingMarker) {
      const currentPos = existingMarker.getLatLng();
      const latDiff = Math.abs(currentPos.lat - latitude);
      const lngDiff = Math.abs(currentPos.lng - longitude);
      
      // Solo actualizar si la posición cambió significativamente
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        existingMarker.setLatLng([latitude, longitude]);
        console.log('📍 Marcador actualizado para:', username, 'Nueva posición:', latitude, longitude);
        
        // Mostrar notificación sutil solo para movimientos reales
        this.messageService.add({
          severity: 'info',
          summary: `🏍️ ${username ? username : 'Delivery'} #${user_id}`,
          life: 1000
        });
      }
      return;
    }
    
    // Definir colores diferentes para cada moto
    const motoColors = [
      '#FF4444', // Rojo
      '#44AA44', // Verde
      '#4444FF', // Azul
      '#FF8800', // Naranja
      '#AA44AA', // Morado
      '#00AAAA'  // Cian
    ];
    
    const motoColor = motoColors[(user_id - 1) % motoColors.length];
    
    // Crear icono simple con emoji de moto
    const customIcon = L.divIcon({
      html: `
        <div style="
          background-color: ${motoColor};
          border-radius: 50%;
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
        ">
          🏍️
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: white;
            color: ${motoColor};
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          ">${user_id}</div>
        </div>
      `,
      iconSize: [35, 35],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17]
    });
    
    try {
      // Crear marcador con emoji de moto
      const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        title: `${username || 'Delivery'} #${user_id}`,
        riseOnHover: true
      }).addTo(this.map);
      
      marker.bindPopup(`
        <div style="text-align: center;">
          <div style="color: ${motoColor}; font-size: 20px; margin-bottom: 5px;">🏍️</div>
          <b>${username ? username : 'Delivery'} #${user_id}</b><br>
          <small>Lat: ${latitude.toFixed(6)}<br>Lng: ${longitude.toFixed(6)}</small>
        </div>
      `);
      
      this.markers[user_id] = marker;
      
      console.log('✅ Marcador de moto creado exitosamente para:', username, 'Color:', motoColor, 'Total marcadores:', Object.keys(this.markers).length);
      
    } catch (error) {
      console.error('❌ Error creando marcador de moto para', username, ':', error);
    }
  }

  // Actualizar visibilidad de marcadores
  private updateMarkersVisibility(): void {
    Object.keys(this.markers).forEach(key => {
      const userId = parseInt(key);
      const marker = this.markers[userId];
      
      if (this.isDeliveryActive(userId)) {
        // Mostrar marcador si está activo
        if (!this.map.hasLayer(marker)) {
          marker.addTo(this.map);
        }
      } else {
        // Ocultar marcador si no está activo
        if (this.map.hasLayer(marker)) {
          this.map.removeLayer(marker);
        }
      }
    });
  }

  private adjustMapView(): void {
    const points: L.LatLngExpression[] = this.locations
      .filter(loc => loc.latitude && loc.longitude)
      .map(loc => [loc.latitude, loc.longitude] as L.LatLngTuple);
    
    if (this.myLocationMarker) {
      const myPos = this.myLocationMarker.getLatLng();
      points.push([myPos.lat, myPos.lng]);
    }
    
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 15
      });
    }
  }

  // Agregar función para limpiar marcadores manualmente solo cuando sea necesario
  clearAllMarkers(): void {
    console.log('🧹 Limpiando todos los marcadores');
    Object.values(this.markers).forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = {};
    console.log('✅ Todos los marcadores eliminados');
  }

  showAllDeliveryLocations(): void {
    console.log('👀 Mostrando todas las ubicaciones de delivery');
    
    // Limpiar marcadores existentes antes de cargar todos
    this.clearAllMarkers();
    
    // Cargar todas las ubicaciones
    this.deliveryService.getAllLocations().subscribe({
      next: (data) => {
        console.log('📍 Ubicaciones cargadas para mostrar todas:', data.length, data);
        
        // Verificar si hay ubicaciones con coordenadas idénticas y ajustarlas ligeramente
        const adjustedLocations = this.adjustOverlappingLocations(data);
        
        this.locations = adjustedLocations;
        this.showAllDeliveries = true;
        this.updateMapWithLocations();
        
        this.messageService.add({
          severity: 'info',
          summary: 'Mapa actualizado',
          detail: `Mostrando ${data.length} deliveries en el mapa`
        });
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
  
  // Añadir esta nueva función para ajustar ubicaciones superpuestas
  adjustOverlappingLocations(locations: Location[]): Location[] {
    const locationMap = new Map<string, Location[]>();
    
    // Agrupar ubicaciones por coordenadas (con menos precisión para detectar mejor las superposiciones)
    locations.forEach(loc => {
      const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, []);
      }
      locationMap.get(key)?.push(loc);
    });
    
    // Ajustar ubicaciones superpuestas
    const result: Location[] = [];
    locationMap.forEach((locs, key) => {
      if (locs.length === 1) {
        // Si solo hay una ubicación en estas coordenadas, no hay que ajustar
        result.push(locs[0]);
      } else {
        console.log(`🔧 Detectadas ${locs.length} ubicaciones superpuestas en:`, key);
        // Si hay múltiples ubicaciones en las mismas coordenadas, ajustarlas con mayor separación
        locs.forEach((loc, index) => {
          if (index === 0) {
            // La primera ubicación se mantiene igual
            result.push(loc);
          } else {
            // Las demás se desplazan con mayor separación para que sean visibles
            const offset = 0.001 * index; // Desplazamiento más grande (100 metros aprox.)
            const adjustedLoc = { ...loc };
            
            // Crear un patrón circular para distribuir los marcadores
            const angle = (index * 2 * Math.PI) / locs.length;
            adjustedLoc.latitude += offset * Math.cos(angle);
            adjustedLoc.longitude += offset * Math.sin(angle);
            
            result.push(adjustedLoc);
            console.log(`📍 Ajustando ubicación de ${loc.username} (${index}) - Nueva pos:`, adjustedLoc.latitude.toFixed(6), adjustedLoc.longitude.toFixed(6));
          }
        });
      }
    });
    
    return result;
  }

  openAssignPackageDialog(delivery: User): void {
    if (!this.isDeliveryActive(delivery.id)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Este delivery no está activo actualmente'
      });
      return;
    }
    
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
    
    // Primero geocodificar la dirección
    this.geocodeAddress(this.newPackage.deliveryAddress).then((coords) => {
      if (coords) {
        // Crear el paquete con las coordenadas
        this.packageService.createPackage(
          this.newPackage.deliveryAddress,
          this.selectedDelivery!.id
        ).subscribe({
          next: (packageData) => {
            this.loading = false;
            this.showAssignDialog = false;
            this.loadPackages();
            
            // Iniciar simulación de recorrido
            this.startDeliverySimulation(this.selectedDelivery!.id, coords, this.newPackage.deliveryAddress);
            
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Paquete asignado y simulación iniciada'
            });
            
            // Limpiar formulario
            this.newPackage.deliveryAddress = '';
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
      } else {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo encontrar la dirección especificada'
        });
      }
    });
  }

  // Función para geocodificar direcciones
  private async geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Error geocodificando dirección:', error);
      return null;
    }
  }

  // Función principal para iniciar simulación de recorrido
  private startDeliverySimulation(deliveryId: number, destination: {lat: number, lng: number}, address: string): void {
    const currentLocation = this.locations.find(loc => loc.user_id === deliveryId);
    
    if (!currentLocation) {
      console.error('No se encontró la ubicación actual del delivery');
      return;
    }

    // Detener cualquier animación previa para este delivery
    this.stopDeliveryAnimation(deliveryId);

    // Crear marcador de destino
    this.createDestinationMarker(destination, address);

    // Calcular ruta y iniciar animación
    this.calculateRoute(currentLocation, destination).then((route) => {
      if (route && route.length > 0) {
        this.animateDeliveryRoute(deliveryId, route, destination, address);
      } else {
        // Si no se puede calcular ruta, hacer línea recta
        const straightRoute = this.createStraightRoute(
          { lat: currentLocation.latitude, lng: currentLocation.longitude },
          destination
        );
        this.animateDeliveryRoute(deliveryId, straightRoute, destination, address);
      }
    });
  }

  // Calcular ruta usando OpenRouteService o línea recta como fallback
  private async calculateRoute(start: Location, end: {lat: number, lng: number}): Promise<{lat: number, lng: number}[] | null> {
    try {
      // Intentar usar OpenRouteService (requiere API key gratuita)
      // Por simplicidad, usaremos línea recta con puntos intermedios
      return this.createStraightRoute(
        { lat: start.latitude, lng: start.longitude },
        end
      );
    } catch (error) {
      console.error('Error calculando ruta:', error);
      return null;
    }
  }

  // Crear ruta en línea recta con puntos intermedios
  private createStraightRoute(start: {lat: number, lng: number}, end: {lat: number, lng: number}): {lat: number, lng: number}[] {
    const route = [];
    const steps = 20; // Número de pasos en la animación
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;
      route.push({ lat, lng });
    }
    
    return route;
  }

  // Crear marcador de destino
  private createDestinationMarker(destination: {lat: number, lng: number}, address: string): void {
    const destinationIcon = L.divIcon({
      html: `
        <div style="
          background-color: #FF4444;
          border-radius: 50% 50% 50% 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transform: rotate(-45deg);
        ">
          <div style="transform: rotate(45deg);">📦</div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });

    const marker = L.marker([destination.lat, destination.lng], {
      icon: destinationIcon,
      title: `Destino: ${address}`
    }).addTo(this.map);

    marker.bindPopup(`
      <div style="text-align: center;">
        <div style="color: #FF4444; font-size: 16px; margin-bottom: 5px;">📦</div>
        <b>Destino de Entrega</b><br>
        <small>${address}</small>
      </div>
    `);

    // Guardar referencia (usaremos el lat como key único)
    const key = Math.round(destination.lat * 1000000);
    this.destinationMarkers[key] = marker;
  }

  // Animar el recorrido del delivery
  private animateDeliveryRoute(deliveryId: number, route: {lat: number, lng: number}[], destination: {lat: number, lng: number}, address: string): void {
    let currentStep = 0;
    const totalSteps = route.length;
    const stepDuration = 500; // 500ms entre cada paso

    // Crear línea de ruta
    const routeLine = L.polyline(route.map(point => [point.lat, point.lng]), {
      color: '#4444FF',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(this.map);
    
    this.routeLines[deliveryId] = routeLine;

    // Cambiar estado del delivery a "en tránsito"
    this.updateDeliveryStatus(deliveryId, 'en_transito');

    const animationInterval = setInterval(() => {
      if (currentStep < totalSteps) {
        const currentPoint = route[currentStep];
        
        // Actualizar posición del marcador
        const marker = this.markers[deliveryId];
        if (marker) {
          marker.setLatLng([currentPoint.lat, currentPoint.lng]);
          
          // Actualizar ubicación en el array local
          const locationIndex = this.locations.findIndex(loc => loc.user_id === deliveryId);
          if (locationIndex !== -1) {
            this.locations[locationIndex].latitude = currentPoint.lat;
            this.locations[locationIndex].longitude = currentPoint.lng;
          }
        }
        
        currentStep++;
      } else {
        // Llegó al destino
        clearInterval(animationInterval);
        this.onDeliveryArrived(deliveryId, destination, address);
      }
    }, stepDuration);

    // Guardar referencia de la animación
    this.routeAnimations[deliveryId] = animationInterval;

    this.messageService.add({
      severity: 'info',
      summary: '🚀 Simulación Iniciada',
      detail: `Delivery #${deliveryId} en camino a ${address}`,
      life: 3000
    });
  }

  // Cuando el delivery llega al destino
  private onDeliveryArrived(deliveryId: number, destination: {lat: number, lng: number}, address: string): void {
    // Cambiar estado a "entregado"
    this.updateDeliveryStatus(deliveryId, 'entregado');
    
    // Limpiar línea de ruta
    if (this.routeLines[deliveryId]) {
      this.map.removeLayer(this.routeLines[deliveryId]);
      delete this.routeLines[deliveryId];
    }

    // Remover marcador de destino después de un tiempo
    setTimeout(() => {
      const key = Math.round(destination.lat * 1000000);
      if (this.destinationMarkers[key]) {
        this.map.removeLayer(this.destinationMarkers[key]);
        delete this.destinationMarkers[key];
      }
    }, 5000);

    this.messageService.add({
      severity: 'success',
      summary: '✅ Entrega Completada',
      detail: `Delivery #${deliveryId} llegó a ${address}`,
      life: 5000
    });

    // Recargar paquetes para actualizar estado
    this.loadPackages();
  }

  // Actualizar estado del delivery
  private updateDeliveryStatus(deliveryId: number, status: string): void {
    // Aquí podrías hacer una llamada al backend para actualizar el estado
    // Por ahora solo actualizamos localmente
    const delivery = this.deliveries.find(d => d.id === deliveryId);
    if (delivery) {
      // Simular actualización de estado
      console.log(`Estado del delivery #${deliveryId} cambiado a: ${status}`);
    }
  }

  // Detener animación de delivery
  private stopDeliveryAnimation(deliveryId: number): void {
    if (this.routeAnimations[deliveryId]) {
      clearInterval(this.routeAnimations[deliveryId]);
      delete this.routeAnimations[deliveryId];
    }
    
    if (this.routeLines[deliveryId]) {
      this.map.removeLayer(this.routeLines[deliveryId]);
      delete this.routeLines[deliveryId];
    }
  }
}