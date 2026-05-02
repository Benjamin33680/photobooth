export interface Cell {
  id: number;
  type: 'logo' | 'photo' | 'empty';
  logo?: string;
  photo_index?: number;
  col: number;
  row: number;
  col_span: number;
  row_span: number;
}
