export interface AuthUser {
  username: string;
  role: 'admin' | 'user';
  token: string;
}
