import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { Location } from '../interfaces/location.interface';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {
  private apiUrl = `${environment.apiUrl}/delivery`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.token}`
    });
  }

  updateLocation(latitude: number, longitude: number): Observable<Location> {
    return this.http.post<Location>(`${this.apiUrl}/location`, 
      { latitude, longitude },
      { headers: this.getHeaders() }
    );
  }

  getAllDeliveries(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/all`, 
      { headers: this.getHeaders() }
    );
  }

  getAllLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.apiUrl}/locations`, 
      { headers: this.getHeaders() }
    );
  }

  updateDeliveryStatus(deliveryId: number, status: 'working' | 'off'): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/status`, 
      { deliveryId, status },
      { headers: this.getHeaders() }
    );
  }
}