import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Package } from '../interfaces/package.interface';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  private apiUrl = `${environment.apiUrl}/packages`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.token}`
    });
  }

  createPackage(deliveryAddress: string, deliveryId: number): Observable<Package> {
    return this.http.post<Package>(`${this.apiUrl}`, 
      { deliveryAddress, deliveryId },
      { headers: this.getHeaders() }
    );
  }

  getPackagesByDelivery(deliveryId?: number): Observable<Package[]> {
    const url = deliveryId ? `${this.apiUrl}/delivery/${deliveryId}` : `${this.apiUrl}/delivery`;
    return this.http.get<Package[]>(url, { headers: this.getHeaders() });
  }

  updatePackageStatus(packageId: number, status: 'en_transito' | 'entregado' | 'regresado'): Observable<Package> {
    return this.http.put<Package>(`${this.apiUrl}/status`, 
      { packageId, status },
      { headers: this.getHeaders() }
    );
  }

  getAllPackages(): Observable<Package[]> {
    return this.http.get<Package[]>(`${this.apiUrl}/all`, 
      { headers: this.getHeaders() }
    );
  }
}