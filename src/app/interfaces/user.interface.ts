export interface User {
  id: number;
  username: string;
  role: 'admin' | 'delivery';
  token?: string;
  status?: 'working' | 'off';
}