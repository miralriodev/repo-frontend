import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Location } from '../interfaces/location.interface';
import { Package } from '../interfaces/package.interface';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private locationUpdated = new Subject<Location>();
  private packageUpdated = new Subject<Package>();
  private activeDeliveriesUpdated = new Subject<number[]>();

  constructor() {
    this.socket = io(environment.socketUrl);
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('locationUpdated', (data: Location) => {
      this.locationUpdated.next(data);
    });

    this.socket.on('packageUpdated', (data: Package) => {
      this.packageUpdated.next(data);
    });

    this.socket.on('active-deliveries-updated', (activeDeliveryIds: number[]) => {
      this.activeDeliveriesUpdated.next(activeDeliveryIds);
    });
  }

  notifyDeliveryLogin(user: User): void {
    this.socket.emit('delivery-login', {
      userId: user.id,
      username: user.username,
      role: user.role
    });
  }

  notifyDeliveryLogout(userId: number): void {
    this.socket.emit('delivery-logout', { userId });
  }

  onActiveDeliveriesUpdated(): Observable<number[]> {
    return this.activeDeliveriesUpdated.asObservable();
  }

  updateLocation(data: { userId: number, latitude: number, longitude: number }): void {
    this.socket.emit('updateLocation', data);
  }

  updatePackageStatus(data: { packageId: number, status: string }): void {
    this.socket.emit('packageStatusUpdate', data);
  }

  onLocationUpdated(): Observable<Location> {
    return this.locationUpdated.asObservable();
  }

  onPackageUpdated(): Observable<Package> {
    return this.packageUpdated.asObservable();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Nuevo método para notificar que el admin se conectó
  notifyAdminConnected(): void {
    this.socket.emit('admin-connected');
  }
}