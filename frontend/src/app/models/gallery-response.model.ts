import { PhotoMeta } from './photo-meta.model';

export interface GalleryResponse {
  total: number;
  photos: PhotoMeta[];
}
