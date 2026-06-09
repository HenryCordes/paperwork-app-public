export interface ReceiptInfo {
  date: Date;
  total: number;
  taxLow: number;
  taxHigh: number;
}

export interface TextElement {
  text: string;
  topLeft?: [number, number];
  topRight?: [number, number];
  bottomLeft?: [number, number];
  bottomRight?: [number, number];
}
