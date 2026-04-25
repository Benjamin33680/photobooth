// src/environments/environment.prod.ts
// On Pi, the Angular app is served from the same host as the API
export const environment = {
  production: true,
  apiUrl: '',       // same origin
  wsUrl: '',        // will be replaced by window.location.host at runtime
};
