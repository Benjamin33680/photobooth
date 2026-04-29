import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStorageService {

  set(key: string, value: any): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('SessionStorage set error:', e);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) as T : null;
    } catch (e) {
      console.error('SessionStorage get error:', e);
      return null;
    }
  }

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error('SessionStorage remove error:', e);
    }
  }

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.error('SessionStorage clear error:', e);
    }
  }
}
