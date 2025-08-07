import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    // Verificar roles si es necesario
    const requiredRole = route.data['role'] as string;
    if (requiredRole) {
      if (requiredRole === 'admin' && !authService.isAdmin) {
        router.navigate(['/delivery']);
        return false;
      }
      if (requiredRole === 'delivery' && !authService.isDelivery) {
        router.navigate(['/admin']);
        return false;
      }
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};