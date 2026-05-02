import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfigService {

  get apiHost(): string {
    return window.location.hostname;
  }

  get apiUrl(): string {
    return `http://${this.apiHost}:8000`;
  }

  get wsUrl(): string {
    return `ws://${this.apiHost}:8000`;
  }
}
