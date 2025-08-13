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

  getAllPackages(): Observable<Package[]> {
    return this.http.get<Package[]>(`${this.apiUrl}/all`, 
      { headers: this.getHeaders() }
    );
  }

  createPackageNew(packageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, packageData, { headers: this.getHeaders() });
  }

  assignDeliveryToPackage(packageId: number, deliveryId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${packageId}/assign`, { delivery_id: deliveryId }, { headers: this.getHeaders() });
  }

  updatePackageStatus(packageId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${packageId}/status`, { status }, { headers: this.getHeaders() });
  }
}