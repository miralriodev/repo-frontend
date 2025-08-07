export interface Package {
  id: number;
  delivery_address: string;
  delivery_id: number;
  status: 'asignado' | 'en_transito' | 'entregado' | 'regresado';
  delivery_name?: string;
}