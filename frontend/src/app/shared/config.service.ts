import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfigService {

  /**
   * Retourne l'hôte du backend dynamiquement.
   * - Si on est sur le Pi (localhost) → localhost
   * - Si on est sur un autre appareil → l'IP du Pi = hostname de la page
   */
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
