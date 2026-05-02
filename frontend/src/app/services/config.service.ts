import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfigService {

  get apiHost(): string {
    return window.location.hostname;
  }

  get apiUrl(): string {
    const port = window.location.port;
    if (!port || port === '80' || port === '443') {
      return `${window.location.protocol}//${this.apiHost}`;
    }
    return `http://${this.apiHost}:8000`;
  }

  get wsUrl(): string {
    const port = window.location.port;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (!port || port === '80' || port === '443') {
      return `${wsProtocol}//${this.apiHost}`;
    }
    return `ws://${this.apiHost}:8000`;
  }
}
