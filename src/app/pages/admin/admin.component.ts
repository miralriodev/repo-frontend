import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription, interval, lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

import { Location } from '../../interfaces/location.interface';
import { Package } from '../../interfaces/package.interface';
import { User } from '../../interfaces/user.interface';
import { AuthService } from '../../services/auth.service';
import { DeliveryService } from '../../services/delivery.service';
import { PackageService } from '../../services/package.service';
import { SocketService } from '../../services/socket.service';

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
    ToastModule,
    TooltipModule,
    AutoCompleteModule
  ],
  providers: [MessageService],
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
    
    /* Modal principal con overflow controlado */
    ::ng-deep .p-dialog {
      overflow: visible !important;
    }
    
    ::ng-deep .p-dialog-content {
      padding: 1.5rem !important;
      position: relative !important;
      overflow: visible !important;
      max-height: 80vh !important;
    }
    
    /* Contenedor del formulario con scroll interno */
    ::ng-deep .p-dialog .flex.flex-column.gap-3 {
      position: relative !important;
      overflow-y: auto !important;
      max-height: calc(80vh - 3rem) !important;
      padding-right: 10px !important;
    }
    
    .admin-dashboard {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: var(--surface-ground);
    }
    
    /* Header styles */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.5rem;
      background-color: var(--surface-card);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      z-index: 10;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .logo-section i {
      font-size: 1.5rem;
      color: var(--primary-color);
    }
    
    .logo-section h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-color);
    }
    
    .header-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .location-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }
    
    .theme-toggle {
      background: none;
      border: none;
      color: var(--text-color-secondary);
      cursor: pointer;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .theme-toggle:hover {
      background-color: var(--surface-hover);
    }
    
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 2rem;
    }
    
    .user-profile:hover {
      background-color: var(--surface-hover);
    }
    
    /* Dashboard content */
    .dashboard-content {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    
    /* Sidebar */
    .sidebar {
      width: 250px;
      background-color: var(--surface-card);
      padding: 1.5rem 0;
      box-shadow: 2px 0 4px rgba(0,0,0,0.03);
      overflow-y: auto;
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      color: var(--text-color-secondary);
      transition: all 0.2s ease;
    }
    
    .menu-item:hover {
      background-color: var(--surface-hover);
      color: var(--text-color);
    }
    
    .menu-item.active {
      background-color: var(--primary-50);
      color: var(--primary-color);
      border-left: 3px solid var(--primary-color);
    }
    
    .menu-item i {
      font-size: 1.25rem;
    }
    
    /* Main content */
    .main-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    /* Summary cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }
    
    .summary-card {
      background-color: var(--surface-card);
      border-radius: 8px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .card-icon i {
      font-size: 1.5rem;
      color: white;
    }
    
    .card-icon.blue {
      background-color: #3B82F6;
    }
    
    .card-icon.green {
      background-color: #10B981;
    }
    
    .card-icon.orange {
      background-color: #F59E0B;
    }
    
    .card-icon.purple {
      background-color: #8B5CF6;
    }
    
    .card-content h3 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-color-secondary);
      margin: 0 0 0.25rem 0;
    }
    
    .card-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-color);
      margin: 0;
    }
    
    /* Map section */
    .map-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }
    
    .map-container, .deliveries-list {
      background-color: var(--surface-card);
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--surface-border);
    }
    
    .section-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-color);
    }
    
    .map-controls {
      display: flex;
      gap: 0.5rem;
    }
    
    #map {
      height: 400px;
    }
    
    /* Deliveries list */
    .delivery-items {
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .delivery-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 0.75rem;
      background-color: var(--surface-section);
      transition: all 0.2s ease;
    }
    
    .delivery-item:hover {
      background-color: var(--surface-hover);
    }
    
    .delivery-item.active {
      border-left: 3px solid #10B981;
    }
    
    .delivery-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--surface-hover);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .delivery-avatar i {
      color: var(--text-color-secondary);
    }
    
    .delivery-info h4 {
      margin: 0 0 0.25rem 0;
      font-size: 0.9375rem;
      font-weight: 500;
    }
    
    .delivery-status {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }
    
    .status-active {
      background-color: #10B981;
      color: white;
    }
    
    .status-inactive {
      background-color: var(--surface-hover);
      color: var(--text-color-secondary);
    }
    
    /* Packages section */
    .packages-section {
      background-color: var(--surface-card);
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    
    .packages-table {
      width: 100%;
    }
    
    .package-id {
      font-weight: 600;
      color: var(--primary-color);
    }
    
    .delivery-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      display: inline-block;
      text-transform: capitalize;
    }
    
    .status-assigned {
      background-color: #3B82F6;
      color: white;
    }
    
    .status-transit {
      background-color: #F59E0B;
      color: white;
    }
    
    .status-delivered {
      background-color: #10B981;
      color: white;
    }
    
    .status-returned {
      background-color: #EF4444;
      color: white;
    }
    
    .action-buttons {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
    
    /* Responsive adjustments */
    @media screen and (max-width: 992px) {
      .map-section {
        grid-template-columns: 1fr;
      }
      
      .sidebar {
        width: 64px;
      }
      
      .menu-item span {
        display: none;
      }
      
      .menu-item {
        justify-content: center;
        padding: 0.75rem;
      }
    }
    
    @media screen and (max-width: 768px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media screen and (max-width: 576px) {
      .summary-cards {
        grid-template-columns: 1fr;
      }
    }
    
    /* Estilos para el botón flotante */
    .floating-action-button {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 4rem;
      height: 4rem;
      z-index: 1000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .floating-action-button .p-button-icon {
      font-size: 1.5rem;
    }
  `],
  template: `
    <div class="admin-dashboard">
      <!-- Header con navegación y perfil -->
      <header class="dashboard-header">
        <div class="logo-section">
          <i class="pi pi-truck"></i>
          <h1>LogiTrack</h1>
        </div>
        
        <div class="header-controls">
          <div class="location-info" *ngIf="locationDetected">
            <i class="pi pi-map-marker"></i>
            <span>{{userCity}}, {{userCountry}}</span>
          </div>
          
          <button class="theme-toggle" (click)="toggleTheme()">
            <i class="pi pi-moon"></i>
          </button>
          
          <div class="user-profile" (click)="toggleProfileMenu()">
            <span>Admin</span>
            <i class="pi pi-user"></i>
          </div>
          
          <p-button icon="pi pi-sign-out" styleClass="p-button-text p-button-rounded" pTooltip="Cerrar Sesión" tooltipPosition="bottom" (onClick)="logout()"></p-button>
        </div>
      </header>
      
      <!-- Contenido principal -->
      <div class="dashboard-content">
        <!-- Panel lateral izquierdo -->
        <aside class="sidebar">
          <div class="menu-item active">
            <i class="pi pi-home"></i>
            <span>Panel Principal</span>
          </div>
          <div class="menu-item">
            <i class="pi pi-box"></i>
            <span>Gestión de Paquetes</span>
          </div>
          <div class="menu-item">
            <i class="pi pi-users"></i>
            <span>Repartidores</span>
          </div>
          <div class="menu-item">
            <i class="pi pi-chart-bar"></i>
            <span>Estadísticas</span>
          </div>
          <div class="menu-item">
            <i class="pi pi-cog"></i>
            <span>Configuración</span>
          </div>
        </aside>
        
        <!-- Área principal de contenido -->
        <main class="main-content">
          <!-- Tarjetas de resumen -->
          <div class="summary-cards">
            <div class="summary-card">
              <div class="card-icon blue">
                <i class="pi pi-box"></i>
              </div>
              <div class="card-content">
                <h3>Total Paquetes</h3>
                <p class="card-value">{{packages.length}}</p>
              </div>
            </div>
            
            <div class="summary-card">
              <div class="card-icon green">
                <i class="pi pi-check-circle"></i>
              </div>
              <div class="card-content">
                <h3>Entregados</h3>
                <p class="card-value">{{getPackageCountByStatus('entregado')}}</p>
              </div>
            </div>
            
            <div class="summary-card">
              <div class="card-icon orange">
                <i class="pi pi-sync"></i>
              </div>
              <div class="card-content">
                <h3>En Tránsito</h3>
                <p class="card-value">{{getPackageCountByStatus('en_transito')}}</p>
              </div>
            </div>
            
            <div class="summary-card">
              <div class="card-icon purple">
                <i class="pi pi-users"></i>
              </div>
              <div class="card-content">
                <h3>Repartidores</h3>
                <p class="card-value">{{deliveries.length}}</p>
              </div>
            </div>
          </div>
          
          <!-- Mapa y lista de repartidores -->
          <div class="map-section">
            <div class="map-container">
              <div class="section-header">
                <h2>Monitoreo en Tiempo Real</h2>
                <div class="map-controls">
                  <p-button icon="pi pi-map-marker" styleClass="p-button-sm p-button-outlined" pTooltip="Mi Ubicación" tooltipPosition="bottom" (onClick)="getCurrentPosition()"></p-button>
                  <p-button icon="pi pi-users" styleClass="p-button-sm p-button-outlined" pTooltip="Ver Todos" tooltipPosition="bottom" (onClick)="showAllDeliveryLocations()"></p-button>
                </div>
              </div>
              <div id="map"></div>
            </div>
            
            <div class="deliveries-list">
              <div class="section-header">
                <h2>Repartidores Activos</h2>
              </div>
              <div class="delivery-items">
                <div *ngFor="let delivery of deliveries" class="delivery-item" [ngClass]="{'active': isDeliveryActive(delivery?.id)}">
                  <div class="delivery-avatar">
                    <i class="pi pi-user"></i>
                  </div>
                  <div class="delivery-info">
                    <h4>{{ delivery?.username || 'Repartidor #' + delivery?.id }}</h4>
                    <span class="delivery-status" [ngClass]="isDeliveryActive(delivery?.id) ? 'status-active' : 'status-inactive'">
                      {{ isDeliveryActive(delivery?.id) ? 'En servicio' : 'Fuera de servicio' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Tabla de paquetes - Siempre visible -->
          <div class="packages-section">
            <div class="section-header">
              <h2>Gestión de Paquetes</h2>
              <p-button icon="pi pi-plus" label="Nuevo Envío" styleClass="p-button-sm" (onClick)="openNewPackageDialog()"></p-button>
            </div>
            
            <p-table [value]="packages" styleClass="packages-table" [paginator]="true" [rows]="5" [rowsPerPageOptions]="[5,10,25]" [showCurrentPageReport]="true">
              <ng-template pTemplate="header">
                <tr>
                  <th>ID</th>
                  <th>Destinatario</th>
                  <th>Dirección de Entrega</th>
                  <th>Repartidor Asignado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-pkg>
                <tr>
                  <td><span class="package-id">#{{pkg.id}}</span></td>
                  <td>{{pkg.recipient_name}}</td>
                  <td>{{pkg.delivery_address}}</td>
                  <td>
                    <div class="delivery-cell">
                      <i *ngIf="!pkg.delivery_id" class="pi pi-user-minus"></i>
                      <i *ngIf="pkg.delivery_id" class="pi pi-user"></i>
                      <span>{{pkg.delivery_name || 'Sin asignar'}}</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="{
                      'status-assigned': pkg.status === 'asignado',
                      'status-transit': pkg.status === 'en_transito',
                      'status-delivered': pkg.status === 'entregado',
                      'status-returned': pkg.status === 'regresado'
                    }">
                      {{ getStatusLabel(pkg.status) }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <p-button 
                        *ngIf="pkg.status === 'asignado' && pkg.delivery_id" 
                        icon="pi pi-play" 
                        styleClass="p-button-rounded p-button-sm p-button-success" 
                        pTooltip="Iniciar simulación de entrega" 
                        tooltipPosition="left"
                        (onClick)="simulateDelivery(pkg)"></p-button>
                      
                      <p-button 
                        *ngIf="!pkg.delivery_id && pkg.status !== 'entregado'" 
                        icon="pi pi-user-plus" 
                        styleClass="p-button-rounded p-button-sm p-button-info" 
                        pTooltip="Asignar repartidor" 
                        tooltipPosition="left"
                        (onClick)="openAssignDeliveryDialog(pkg)"></p-button>
                        
                      <p-button 
                        icon="pi pi-eye" 
                        styleClass="p-button-rounded p-button-sm p-button-outlined" 
                        pTooltip="Ver detalles" 
                        tooltipPosition="left"></p-button>
                    </div>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="6" class="text-center p-4">
                    <div class="flex flex-column align-items-center">
                      <i class="pi pi-inbox text-muted" style="font-size: 3rem"></i>
                      <p class="mt-3 mb-0">No hay paquetes disponibles</p>
                      <p-button label="Crear Nuevo Paquete" icon="pi pi-plus" styleClass="p-button-sm mt-3" (onClick)="openNewPackageDialog()"></p-button>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </main>
      </div>
    </div>
    
    <!-- Botón flotante para crear paquete -->
    <button pButton 
      class="p-button-rounded p-button-lg floating-action-button" 
      icon="pi pi-plus" 
      (click)="openNewPackageDialog()" 
      pTooltip="Nuevo Envío" 
      tooltipPosition="left">
    </button>
    
    <!-- Modal Nuevo Paquete -->
    <p-dialog header="Nuevo Paquete" [(visible)]="showNewPackageDialog" [style]="{width: '600px', minHeight: '400px'}">
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="recipientName">Nombre del destinatario *</label>
          <input pInputText id="recipientName" [(ngModel)]="newPackageForm.recipientName" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="address">Dirección *</label>
          <!-- Reemplazar p-autoComplete con un input estándar y lista personalizada -->
          <div class="custom-autocomplete-container" style="position: relative;">
            <input 
              pInputText 
              id="address" 
              [(ngModel)]="newPackageForm.address"
              (input)="onAddressInput($event)"
              placeholder="Escriba la dirección..."
              class="w-full">
            
            <!-- Lista personalizada de sugerencias -->
            <div *ngIf="addressSuggestions.length > 0" class="custom-suggestions-list" style="position: absolute; top: 100%; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background: white; border: 1px solid #ccc; border-radius: 4px; z-index: 1000;">
              <div 
                *ngFor="let suggestion of addressSuggestions" 
                class="suggestion-item" 
                (click)="selectAddress(suggestion)"
                style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                {{ suggestion }}
              </div>
            </div>
          </div>
          <small class="text-500" *ngIf="locationDetected && userCity && userCountry">
            Solo se permiten direcciones en {{userCity}}, {{userCountry}}
          </small>
          <small class="text-500" *ngIf="!locationDetected">
            Detectando tu ubicación para establecer zona de cobertura...
          </small>
        </div>
        <div class="flex flex-column gap-2">
          <label for="delivery">Asignar delivery (opcional)</label>
          <p-dropdown 
            id="delivery" 
            [options]="activeDeliveryOptions" 
            [(ngModel)]="newPackageForm.deliveryId" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="Seleccionar delivery"
            [showClear]="true"
            appendTo="body">
          </p-dropdown>
        </div>
        <div class="flex gap-2 justify-content-end">
          <p-button label="Cancelar" styleClass="p-button-secondary" (onClick)="closeNewPackageDialog()"></p-button>
          <p-button label="Crear" (onClick)="createNewPackage()" [loading]="loading"></p-button>
        </div>
      </div>
    </p-dialog>
    
    <!-- Modal Asignar Delivery -->
    <p-dialog header="Asignar Delivery" [(visible)]="showAssignDeliveryDialog" [style]="{width: '400px'}">
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="assignDelivery">Seleccionar delivery</label>
          <p-dropdown 
            id="assignDelivery" 
            [options]="activeDeliveryOptions" 
            [(ngModel)]="selectedDeliveryId" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="Seleccionar delivery"
            appendTo="body">
          </p-dropdown>
        </div>
        <div class="flex gap-2 justify-content-end">
          <p-button label="Cancelar" styleClass="p-button-secondary" (onClick)="closeAssignDeliveryDialog()"></p-button>
          <p-button label="Asignar" (onClick)="assignDeliveryToPackage()" [loading]="loading"></p-button>
        </div>
      </div>
    </p-dialog>
    
    <p-toast></p-toast>
  `
})
export class AdminComponent implements OnInit, OnDestroy {
  deliveries: User[] = [];
  packages: Package[] = [];
  locations: Location[] = [];
  map!: L.Map;
  markers: { [key: number]: L.Marker } = {};
  loading = false;
  private subscriptions: Subscription[] = [];
  myLocationMarker: L.Marker | null = null;
  showAllDeliveries = false;
  
  // Propiedades para simulación
  private routeAnimations: { [key: number]: any } = {};
  private destinationMarkers: { [key: number]: L.Marker } = {};
  private routeLines: { [key: number]: L.Polyline } = {};
  private activeDeliveryIds: number[] = [];
  
  // Propiedades para modales
  showNewPackageDialog = false;
  showAssignDeliveryDialog = false;
  selectedPackage: Package | null = null;
  selectedDeliveryId: number | null = null;
  
  // Formulario para nuevo paquete
  newPackageForm = {
    recipientName: '',
    address: '',
    deliveryId: null as number | null
  };
  
  // Propiedades para detección automática de ubicación
  userLocation: {lat: number, lng: number} | null = null;
  userCity: string = '';
  userCountry: string = '';
  locationDetected = false;
  
  // Nuevas propiedades para autocompletado
  addressSuggestions: string[] = [];
  cityBounds = {
    // Estos se actualizarán automáticamente basados en tu ubicación
    north: 0,
    south: 0, 
    east: 0,
    west: 0
  };

  
  // Opciones para dropdown de deliveries
  get activeDeliveryOptions() {
    return this.deliveries
      .filter(delivery => this.isDeliveryActive(delivery.id))
      .map(delivery => ({
        label: delivery.username || `Delivery #${delivery.id}`,
        value: delivery.id
      }));
  }

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
    
    // Notificar al backend que el admin se conectó
    this.socketService.notifyAdminConnected();
    
    // Cargar deliveries activos
    this.loadActiveDeliveries();
    
    // Detectar ubicación automáticamente al iniciar
    this.detectUserLocationAndCity(() => {
      setTimeout(() => {
        this.loadLocations();
      }, 500);
    });
    
    // Suscribirse a actualizaciones de ubicación
    this.subscriptions.push(
      this.socketService.onLocationUpdated().subscribe(location => {
        // Verificar que la ubicación tenga datos válidos
        if (!location || !location.user_id) {
          console.warn('⚠️ Ubicación inválida recibida:', location);
          return;
        }
        
        // Buscar el delivery correspondiente para preservar el username
        const delivery = this.deliveries.find(d => d.id === location.user_id);
        if (delivery && !location.username) {
          location.username = delivery.username;
        }
        
        this.updateMarker(location);
        const existingIndex = this.locations.findIndex(loc => loc.user_id === location.user_id);
        if (existingIndex >= 0) {
          // Preservar el username original si no viene en la actualización
          if (!location.username && this.locations[existingIndex].username) {
            location.username = this.locations[existingIndex].username;
          }
          this.locations[existingIndex] = location;
        } else {
          this.locations.push(location);
        }
        
        this.messageService.add({
          severity: 'info',
          summary: '📍',
          detail: `${location.username || 'Delivery #' + location.user_id} actualizado`,
          life: 1000
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
        console.log('Recibidos deliveries activos:', activeIds);
        this.activeDeliveryIds = activeIds;
        this.loadLocations();
      })
    );
    
    // Recargar ubicaciones cada 10 segundos
    this.subscriptions.push(
      interval(10000).subscribe(() => {
        this.loadLocations();
      })
    );
    
    // Recargar deliveries cada 30 segundos para mantener datos actualizados
    this.subscriptions.push(
      interval(30000).subscribe(() => {
        this.loadDeliveries();
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
  isDeliveryActive(deliveryId: number | undefined): boolean {
    if (deliveryId === undefined) return false;
    return this.activeDeliveryIds.includes(deliveryId);
  }
  
  // Filtrar deliveries para mostrar solo los activos
  get activeDeliveries(): User[] {
    return this.deliveries.filter(delivery => 
      this.isDeliveryActive(delivery.id)
    );
  }
  
  // Obtener todos los deliveries sin filtrar
  get allDeliveries(): User[] {
    return this.deliveries;
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
        // Filtrar solo las ubicaciones de deliveries activos
        this.locations = data.filter(location => 
          this.activeDeliveryIds.includes(location.user_id)
        );
        this.updateMapWithLocations();
        console.log('✅ Ubicaciones sincronizadas (solo activos):', this.locations.length);
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
    this.http.get<{activeDeliveries: number[]}>(`${environment.apiUrl}/api/delivery/active`)
      .subscribe({
        next: (response) => {
          this.activeDeliveryIds = response.activeDeliveries;
          console.log('Deliveries activos cargados:', this.activeDeliveryIds);
          // No llamar updateMarkersVisibility aquí, se manejará en loadLocations
        },
        error: (error) => {
          console.error('Error cargando deliveries activos:', error);
        }
      });
  }

  // Nueva función para detectar ubicación y ciudad automáticamente
  detectUserLocationAndCity(callback?: () => void): void {
    if (navigator.geolocation) {
      this.messageService.add({
        severity: 'info',
        summary: 'Detectando ubicación',
        detail: 'Obteniendo tu ubicación actual...'
      });
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation = { lat: latitude, lng: longitude };
          
          // Centrar el mapa en tu ubicación actual
          this.map.setView([latitude, longitude], 13);
          
          // Crear marcador de tu ubicación
          this.createUserLocationMarker(latitude, longitude);
          
          try {
            // Detectar ciudad usando geocodificación inversa
            await this.detectCityFromCoordinates(latitude, longitude);
            
            // Establecer límites de cobertura basados en tu ciudad
            this.setCityBounds(latitude, longitude);
            
            this.locationDetected = true;
            
            this.messageService.add({
              severity: 'success',
              summary: 'Ubicación detectada',
              detail: `Ciudad: ${this.userCity}, ${this.userCountry}`
            });
            
          } catch (error) {
            console.error('Error detectando ciudad:', error);
            this.messageService.add({
              severity: 'warn',
              summary: 'Ubicación parcial',
              detail: 'Ubicación detectada, pero no se pudo identificar la ciudad'
            });
          }
          
          if (callback) callback();
        },
        (error) => {
          console.error('Error getting location', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error de ubicación',
            detail: 'No se pudo obtener tu ubicación. Usando configuración por defecto.'
          });
          
          // Usar ubicación por defecto (centro del mundo)
          this.map.setView([0, 0], 2);
          if (callback) callback();
        }
      );
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Geolocalización no disponible',
        detail: 'Tu navegador no soporta geolocalización'
      });
      if (callback) callback();
    }
  }

  // Función para detectar ciudad usando geocodificación inversa
  private async detectCityFromCoordinates(lat: number, lng: number): Promise<void> {
    try {
      const response = await lastValueFrom(this.http.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      )) as any;
      
      if (response && response.address) {
        this.userCity = response.address.city || 
                      response.address.town || 
                      response.address.village || 
                      response.address.municipality || 
                      'Ciudad no identificada';
        
        this.userCountry = response.address.country || 'País no identificado';
        
        console.log('Ciudad detectada:', this.userCity, this.userCountry);
      }
    } catch (error) {
      console.error('Error en geocodificación inversa:', error);
      throw error;
    }
  }

  // Función para establecer límites de cobertura basados en tu ubicación
  private setCityBounds(lat: number, lng: number): void {
    // Establecer un radio de aproximadamente 20km alrededor de tu ubicación
    const radiusInDegrees = 0.18; // Aproximadamente 20km
    
    this.cityBounds = {
      north: lat + radiusInDegrees,
      south: lat - radiusInDegrees,
      east: lng + radiusInDegrees,
      west: lng - radiusInDegrees
    };
    
    console.log('Límites de cobertura establecidos:', this.cityBounds);
  }

  // Función mejorada para crear marcador de ubicación del usuario
  private createUserLocationMarker(lat: number, lng: number): void {
    if (this.myLocationMarker) {
      this.myLocationMarker.setLatLng([lat, lng]);
    } else {
      const myIcon = L.divIcon({
        className: 'my-location-icon',
        html: '<div style="background-color: #007bff; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,123,255,0.5);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      this.myLocationMarker = L.marker([lat, lng], {
        icon: myIcon,
        zIndexOffset: 1000
      }).addTo(this.map);
      
      this.myLocationMarker.bindPopup(
        `<b>Tu ubicación actual</b><br>${this.userCity ? this.userCity + ', ' + this.userCountry : 'Ubicación detectada'}`
      ).openPopup();
    }
  }

  // Función actualizada getCurrentPosition (mantener para el botón manual)
  getCurrentPosition(callback?: () => void): void {
    this.detectUserLocationAndCity(callback);
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
    
    // Crear icono simple para el delivery (camioneta)
    const customIcon = L.divIcon({
      html: `
        <div style="
          background-color: ${motoColor};
          border-radius: 50%;
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          border: 1px solid white;
          box-shadow: none;
          position: relative;
        ">
          🚚
          <div style="
            position: absolute;
            top: -3px;
            right: -3px;
            background: white;
            color: ${motoColor};
            border-radius: 50%;
            width: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: bold;
            border: 1px solid white;
            box-shadow: none;
          ">${user_id}</div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
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
  
  // Método para alternar entre tema claro y oscuro
  toggleTheme(): void {
    const body = document.body;
    if (body.classList.contains('dark-theme')) {
      body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    } else {
      body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    }
  }
  
  // Método para mostrar/ocultar el menú de perfil
  toggleProfileMenu(): void {
    // Implementación básica - en una versión más completa se podría usar un servicio o estado
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
      profileMenu.classList.toggle('show');
    }
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
    console.log('👀 Mostrando todas las ubicaciones de delivery activos');
    
    // Limpiar marcadores existentes antes de cargar todos
    this.clearAllMarkers();
    
    // Cargar todas las ubicaciones pero filtrar solo las activas
    this.deliveryService.getAllLocations().subscribe({
      next: (data) => {
        // Filtrar solo las ubicaciones de deliveries activos
        const activeLocations = data.filter(location => 
          this.activeDeliveryIds.includes(location.user_id)
        );
        
        console.log('📍 Ubicaciones activas cargadas para mostrar:', activeLocations.length, activeLocations);
        
        // Verificar si hay ubicaciones con coordenadas idénticas y ajustarlas ligeramente
        const adjustedLocations = this.adjustOverlappingLocations(activeLocations);
        
        this.locations = adjustedLocations;
        this.showAllDeliveries = true;
        this.updateMapWithLocations();
        
        this.messageService.add({
          severity: 'info',
          summary: 'Mapa actualizado',
          detail: `Mostrando ${activeLocations.length} deliveries activos en el mapa`
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

  // Obtener etiqueta legible para el estado del paquete
  getStatusLabel(status: string): string {
    const statusLabels: {[key: string]: string} = {
      'asignado': 'Asignado',
      'en_transito': 'En tránsito',
      'entregado': 'Entregado',
      'regresado': 'Regresado'
    };
    return statusLabels[status] || status;
  }
  
  // Contar paquetes por estado
  getPackageCountByStatus(status: string): number {
    if (!this.packages) return 0;
    return this.packages.filter(pkg => pkg.status === status).length;
  }
  
  // Abrir modal para crear nuevo paquete
  openNewPackageDialog(): void {
    this.newPackageForm = {
      recipientName: '',
      address: '',
      deliveryId: null
    };
    this.showNewPackageDialog = true;
  }
  
  // Cerrar modal de nuevo paquete
  closeNewPackageDialog(): void {
    this.showNewPackageDialog = false;
  }
  
  // Crear nuevo paquete
  async createNewPackage(): Promise<void> {
    if (!this.newPackageForm.recipientName || !this.newPackageForm.address) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete los campos obligatorios'
      });
      return;
    }
    
    // Validar que la dirección esté en la zona permitida
    const isValidAddress = await this.validateAddress(this.newPackageForm.address);
    if (!isValidAddress) {
      this.messageService.add({
        severity: 'error',
        summary: 'Dirección no válida',
        detail: 'La dirección debe estar dentro de la zona de cobertura'
      });
      return;
    }
    
    this.loading = true;
    
    const packageData = {
      recipient_name: this.newPackageForm.recipientName,
      delivery_address: this.newPackageForm.address,
      delivery_id: this.newPackageForm.deliveryId,
      status: 'asignado'
    };

    this.packageService.createPackageNew(packageData).subscribe({
      next: (response) => {
        this.loading = false;
        this.showNewPackageDialog = false;
        this.loadPackages();
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Paquete creado correctamente'
        });
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el paquete'
        });
      }
    });
  }
  
  // Abrir modal para asignar delivery a un paquete
  openAssignDeliveryDialog(pkg: Package): void {
    this.selectedPackage = pkg;
    this.selectedDeliveryId = null;
    this.showAssignDeliveryDialog = true;
  }
  
  // Cerrar modal de asignar delivery
  closeAssignDeliveryDialog(): void {
    this.showAssignDeliveryDialog = false;
    this.selectedPackage = null;
    this.selectedDeliveryId = null;
  }
  
  // Asignar delivery a un paquete existente
  assignDeliveryToPackage(): void {
    if (!this.selectedPackage || !this.selectedDeliveryId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor seleccione un delivery'
      });
      return;
    }
    
    this.loading = true;
    
    this.packageService.assignDeliveryToPackage(
      this.selectedPackage.id,
      this.selectedDeliveryId
    ).subscribe({
      next: (response) => {
        this.loading = false;
        this.showAssignDeliveryDialog = false;
        this.loadPackages();
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Delivery asignado correctamente'
        });
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo asignar el delivery'
        });
      }
    });
  }
  
  // Simular entrega de un paquete
  simulateDelivery(pkg: Package): void {
    if (!pkg.delivery_id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'El paquete debe tener un delivery asignado'
      });
      return;
    }

    // Cambiar estado a en_transito
    this.packageService.updatePackageStatus(pkg.id, 'en_transito').subscribe({
      next: () => {
        this.loadPackages();
        
        // Geocodificar dirección y iniciar simulación
        this.geocodeAddress(pkg.delivery_address).then((coords) => {
          if (coords) {
            this.startDeliverySimulation(pkg.delivery_id!, coords, pkg.delivery_address, pkg.id);
            
            this.messageService.add({
              severity: 'info',
              summary: 'Simulación iniciada',
              detail: `Delivery en camino a ${pkg.delivery_address}`
            });
          }
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado del paquete'
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
  private startDeliverySimulation(deliveryId: number, destination: {lat: number, lng: number}, address: string, packageId: number): void {
    const currentLocation = this.locations.find(loc => loc.user_id === deliveryId);
    
    if (!currentLocation) {
      console.error('No se encontró la ubicación actual del delivery');
      return;
    }
  
    // Detener cualquier animación previa para este delivery
    this.stopDeliveryAnimation(deliveryId);
  
    // Crear marcador de destino
    // Create destination marker with unique key based on coordinates
    const key = Math.round(destination.lat * 1000000);
    if (this.destinationMarkers[key]) {
      this.map.removeLayer(this.destinationMarkers[key]);
    }
    
    const destinationIcon = L.divIcon({
      html: `
0        <div style="
          background-color: #777777;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: none;
        ">
        </div>
      `,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });

    this.destinationMarkers[key] = L.marker([destination.lat, destination.lng], {
      icon: destinationIcon
    })
    .bindPopup(`<b>Destino:</b><br>${address}`)
    .addTo(this.map);
  
    // Calcular ruta y iniciar animación
    this.calculateRoute(currentLocation, destination).then((route) => {
      if (route && route.length > 0) {
        this.animateDeliveryRoute(deliveryId, route, destination, address, packageId);
      } else {
        // Si no se puede calcular ruta, hacer línea recta
        const straightRoute = this.createSmoothStraightRoute(
          { lat: currentLocation.latitude, lng: currentLocation.longitude },
          destination
        );
        this.animateDeliveryRoute(deliveryId, straightRoute, destination, address, packageId);
      }
    });
  }

  // Calcular ruta simulando calles (sin API externa)
  private async calculateRoute(start: Location, end: {lat: number, lng: number}): Promise<{lat: number, lng: number}[] | null> {
    console.log('🚗 Calculando ruta simulada desde:', [start.latitude, start.longitude], 'hasta:', [end.lat, end.lng]);
    
    // Crear una ruta que simule seguir calles
    const route = this.createRealisticRoute(
      { lat: start.latitude, lng: start.longitude },
      end
    );
    
    console.log('✅ Ruta simulada calculada con', route.length, 'puntos');
    return route;
  }

  // Crear ruta en línea recta más suave con más puntos intermedios
  private createSmoothStraightRoute(start: {lat: number, lng: number}, end: {lat: number, lng: number}): {lat: number, lng: number}[] {
    const route = [];
    const steps = 50; // Más pasos para movimiento más suave
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;
      route.push({ lat, lng });
    }
    
    return route;
  }

  // Crear ruta realista que simule seguir calles
  private createRealisticRoute(start: {lat: number, lng: number}, end: {lat: number, lng: number}): {lat: number, lng: number}[] {
    const route = [];
    const totalSteps = 80; // Más pasos para ruta más realista
    
    // Calcular diferencias
    const latDiff = end.lat - start.lat;
    const lngDiff = end.lng - start.lng;
    
    // Crear puntos que simulen seguir una cuadrícula de calles
    for (let i = 0; i <= totalSteps; i++) {
      const progress = i / totalSteps;
      
      // Agregar variación para simular calles (no línea recta)
      let latVariation = 0;
      let lngVariation = 0;
      
      // Simular giros y calles cada ciertos intervalos
      if (i % 8 === 0 && i > 0 && i < totalSteps) {
        // Simular un giro - primero horizontal, luego vertical
        const turnProgress = (i % 16) / 16;
        if (turnProgress < 0.5) {
          // Moverse más horizontalmente
          lngVariation = Math.sin(progress * Math.PI * 4) * 0.0002;
        } else {
          // Moverse más verticalmente  
          latVariation = Math.sin(progress * Math.PI * 4) * 0.0002;
        }
      }
      
      // Agregar pequeñas variaciones aleatorias para simular calles curvas
      const randomVariation = 0.0001;
      latVariation += (Math.random() - 0.5) * randomVariation;
      lngVariation += (Math.random() - 0.5) * randomVariation;
      
      const point = {
        lat: start.lat + (latDiff * progress) + latVariation,
        lng: start.lng + (lngDiff * progress) + lngVariation
      };
      
      route.push(point);
    }
    
    return route;
  }

  // Animar el recorrido del delivery con estilo ultra minimalista
  private animateDeliveryRoute(deliveryId: number, route: {lat: number, lng: number}[], destination: {lat: number, lng: number}, address: string, packageId: number): void {
    let currentStep = 0;
    const stepDuration = 250; // Más lento: 250ms por paso
    
    console.log('🎬 Iniciando animación con', route.length, 'pasos');
    
    // Crear línea de ruta - estilo ultra minimalista
    const routeLine = L.polyline(route.map(point => [point.lat, point.lng]), {
      color: '#555555',
      weight: 1,
      opacity: 0.4,
      dashArray: '2, 6'
    }).addTo(this.map);
    
    this.routeLines[deliveryId] = routeLine;
    
    // Cambiar estado del delivery a "en tránsito"
    this.updateDeliveryStatus(deliveryId, 'en_transito');
    
    // Emitir evento de inicio de simulación
    this.socketService.emitRouteSimulation({
      deliveryId,
      route,
      destination,
      address,
      currentStep: 0,
      totalSteps: route.length,
      status: 'start',
      packageId // Añadir el ID del paquete
    });
    
    const animate = () => {
      if (currentStep >= route.length) {
        console.log('🏁 Delivery llegó al destino');
        
        // Emitir evento de finalización de simulación
        this.socketService.emitRouteSimulation({
          deliveryId,
          route,
          destination,
          address,
          currentStep: route.length,
          totalSteps: route.length,
          status: 'complete',
          packageId // Añadir el ID del paquete
        });
        
        this.onDeliveryArrived(deliveryId, destination, address, packageId);
        return;
      }
      
      const currentPosition = route[currentStep];
      
      // Actualizar posición del marcador con transición suave
      if (this.markers[deliveryId]) {
        const marker = this.markers[deliveryId];
        
        // Agregar clase CSS para transición suave
        const markerElement = marker.getElement();
        if (markerElement) {
          markerElement.style.transition = 'all 0.15s ease-out';
        }
        
        marker.setLatLng([currentPosition.lat, currentPosition.lng]);
        
        // Actualizar ubicación en el array local
        const locationIndex = this.locations.findIndex(loc => loc.user_id === deliveryId);
        if (locationIndex !== -1) {
          this.locations[locationIndex].latitude = currentPosition.lat;
          this.locations[locationIndex].longitude = currentPosition.lng;
        }
        
        // Actualizar popup con progreso - versión ultra minimalista
        const progress = Math.round((currentStep / route.length) * 100);
        marker.bindPopup(`
          <div style="text-align: center;">
            <b>${progress}%</b>
          </div>
        `);
        
        // Emitir actualización de simulación cada 5 pasos para no saturar
        if (currentStep % 5 === 0 || currentStep === route.length - 1) {
          this.socketService.emitRouteSimulation({
            deliveryId,
            route,
            destination,
            address,
            currentStep,
            totalSteps: route.length,
            status: 'update',
            packageId // Añadir el ID del paquete
          });
        }
      }
      
      currentStep++;
      this.routeAnimations[deliveryId] = setTimeout(animate, stepDuration);
    };
    
    animate();
    
    this.messageService.add({
      severity: 'info',
      summary: '🚀 Simulación Iniciada',
      detail: `Delivery #${deliveryId} en camino a ${address} (${Math.round(route.length * stepDuration / 1000)}s estimado)`,
      life: 3000
    });
  }

  // Cuando el delivery llega al destino
  private onDeliveryArrived(deliveryId: number, destination: {lat: number, lng: number}, address: string, packageId: number): void {
    // Buscar el paquete correspondiente y actualizar su estado
    const packageToUpdate = this.packages.find(pkg => 
      pkg.delivery_id === deliveryId && 
      pkg.delivery_address === address && 
      pkg.status === 'en_transito'
    );
    
    if (packageToUpdate) {
      this.packageService.updatePackageStatus(packageToUpdate.id, 'entregado').subscribe({
        next: () => {
          this.loadPackages();
        },
        error: (err) => {
          console.error('Error actualizando estado del paquete:', err);
        }
      });
    }
    
    // Limpiar línea de ruta
    if (this.routeLines[deliveryId]) {
      this.map.removeLayer(this.routeLines[deliveryId]);
      delete this.routeLines[deliveryId];
    }

    // Emitir evento de finalización de simulación con el ID del paquete
    this.socketService.emitRouteSimulation({
      deliveryId,
      route: [],
      destination,
      address,
      currentStep: 0,
      totalSteps: 0,
      status: 'complete',
      packageId // Añadir el ID del paquete
    });

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
      detail: `Paquete entregado en ${address}`,
      life: 5000
    });
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
      clearTimeout(this.routeAnimations[deliveryId]);
      delete this.routeAnimations[deliveryId];
    }
    
    if (this.routeLines[deliveryId]) {
      this.map.removeLayer(this.routeLines[deliveryId]);
      delete this.routeLines[deliveryId];
    }
  }
  
  // Método para manejar la entrada de texto en el campo de dirección
  onAddressInput(event: any): void {
    const query = event.target.value;
    if (query.length < 3) {
      this.addressSuggestions = [];
      return;
    }
    
    this.geocodeAddressWithSuggestions(query).then(suggestions => {
      this.addressSuggestions = suggestions;
    });
  }
  
  // Método para seleccionar una dirección de la lista
  selectAddress(address: string): void {
    this.newPackageForm.address = address;
    this.addressSuggestions = [];
  }
  
  // Función actualizada para buscar direcciones en tu área
  private async geocodeAddressWithSuggestions(address: string): Promise<string[]> {
    try {
      let searchQuery = address;
      
      // Si se detectó la ciudad, agregar contexto geográfico a la búsqueda
      if (this.userCity && this.userCountry) {
        searchQuery = `${address}, ${this.userCity}, ${this.userCountry}`;
      }
      
      const response = await lastValueFrom(this.http.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&bounded=1&viewbox=${this.cityBounds.west},${this.cityBounds.north},${this.cityBounds.east},${this.cityBounds.south}`
      )) as any[];
      
      if (response && response.length > 0) {
        return response
          .filter(item => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            
            // Filtrar solo direcciones dentro de tu área
            return lat >= this.cityBounds.south &&
                   lat <= this.cityBounds.north &&
                   lng >= this.cityBounds.west &&
                   lng <= this.cityBounds.east;
          })
          .map(item => item.display_name)
          .slice(0, 5);
      }
      
      return [];
    } catch (error) {
      console.error('Error en geocodificación:', error);
      return [];
    }
  }
  
  // Función actualizada para validar direcciones basada en tu ubicación
  private async validateAddress(address: string): Promise<boolean> {
    if (!this.locationDetected) {
      // Si no se detectó ubicación, permitir cualquier dirección
      return true;
    }
    
    try {
      const coords = await this.geocodeAddress(address);
      if (!coords) return false;
      
      // Verificar si la dirección está dentro de los límites de tu ciudad
      const isWithinBounds = 
        coords.lat >= this.cityBounds.south &&
        coords.lat <= this.cityBounds.north &&
        coords.lng >= this.cityBounds.west &&
        coords.lng <= this.cityBounds.east;
      
      if (!isWithinBounds) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Dirección fuera de cobertura',
          detail: `Solo se permiten direcciones en ${this.userCity}, ${this.userCountry}`
        });
      }
      
      return isWithinBounds;
    } catch (error) {
      console.error('Error validando dirección:', error);
      return false;
    }
  }
}