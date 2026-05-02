import { Cell } from './cell.model';

export interface StripLayout {
  cols: number;
  rows: number;
  cells: Cell[];
}
