import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export type BoothState =
  | 'idle'
  | 'countdown'
  | 'capture'
  | 'processing'
  | 'result';

export interface BoothMessage {
  type: string;
  data?: string;        // base64 frame
  value?: number;       // countdown tick
  photo_index?: number; // which photo (0-2)
  index?: number;       // capture index
  strip_b64?: string;
  url?: string;
  id?: string;
  created_at?: string;
  message?: string;     // error
}

@Injectable({ providedIn: 'root' })
export class PhotoboothService implements OnDestroy {
  private ws: WebSocket | null = null;

  // Observable streams
  readonly state$ = new BehaviorSubject<BoothState>('idle');
  readonly previewFrame$ = new BehaviorSubject<string | null>(null);
  readonly countdownValue$ = new BehaviorSubject<number>(0);
  readonly currentPhotoIndex$ = new BehaviorSubject<number>(0);
  readonly resultStrip$ = new BehaviorSubject<string | null>(null);
  readonly resultUrl$ = new BehaviorSubject<string | null>(null);
  readonly error$ = new Subject<string>();
  readonly captureFlash$ = new Subject<void>();

  // ---------------------------------------------------------------- //

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = `ws://192.168.1.50:8000/api/camera/ws`;

    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => this._handleMessage(JSON.parse(event.data));
    this.ws.onerror = () => this.error$.next('WebSocket connection error');
    this.ws.onclose = () => {
      // Auto-reconnect after 3s
      setTimeout(() => this.connect(), 3000);
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  startSession(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'start' }));
      this.resultStrip$.next(null);
      this.resultUrl$.next(null);
    }
  }

  resetSession(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'reset' }));
    }
  }

  // ---------------------------------------------------------------- //

  private _handleMessage(msg: BoothMessage): void {
    switch (msg.type) {
      case 'frame':
        this.previewFrame$.next(`data:image/jpeg;base64,${msg.data}`);
        if (this.state$.value === 'idle') {
          // keep state idle, just update preview
        }
        break;

      case 'countdown':
        this.state$.next('countdown');
        this.countdownValue$.next(msg.value ?? 0);
        this.currentPhotoIndex$.next(msg.photo_index ?? 0);
        // Also update preview frame if provided
        break;

      case 'capture':
        this.state$.next('capture');
        this.captureFlash$.next();
        break;

      case 'processing':
        this.state$.next('processing');
        break;

      case 'result':
        this.resultStrip$.next(
          msg.strip_b64 ? `data:image/jpeg;base64,${msg.strip_b64}` : null
        );
        this.resultUrl$.next(msg.url ?? null);
        this.state$.next('result');
        break;

      case 'error':
        this.error$.next(msg.message ?? 'Unknown error');
        this.state$.next('idle');
        break;

      case 'reset':
        this.resultStrip$.next(null);
        this.resultUrl$.next(null);
        this.state$.next('idle');
        break;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
