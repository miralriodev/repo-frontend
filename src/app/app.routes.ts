import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard],
    data: { role: 'admin' }
  },
  {
    path: 'delivery',
    loadComponent: () => import('./pages/delivery/delivery.component').then(m => m.DeliveryComponent),
    canActivate: [authGuard],
    data: { role: 'delivery' }
  },
  { path: '**', redirectTo: 'login' }
];
