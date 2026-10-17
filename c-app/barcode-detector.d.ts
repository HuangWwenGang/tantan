interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue?: string; displayValue?: string }>>;
}

declare var BarcodeDetector: {
  prototype: BarcodeDetector;
  new (options?: { formats?: string[] }): BarcodeDetector;
};
