import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Location } from '../interfaces/location.interface';
import { Package } from '../interfaces/package.interface';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private locationUpdated = new Subject<Location>();
  private packageUpdated = new Subject<Package>();

  constructor() {
    this.socket = io(environment.apiUrl);
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('locationUpdated', (data: Location) => {
      this.locationUpdated.next(data);
    });

    this.socket.on('packageUpdated', (data: Package) => {
      this.packageUpdated.next(data);
    });
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
}