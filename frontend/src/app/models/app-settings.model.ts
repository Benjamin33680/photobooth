import { StripLayout } from './strip-layout.model';

export interface AppSettings {
  show_qrcode: boolean;
  remote_enabled: boolean;
  selected_logo: string;
  strip_background: string;
  strip_background_image: string | null;
  strip_layout: StripLayout;
  storage_quota_mb: number;
}
