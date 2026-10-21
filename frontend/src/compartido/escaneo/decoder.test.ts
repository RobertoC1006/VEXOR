import { expect, it } from 'vitest';
import {
  BinaryBitmap,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';

it('decodifica un EAN-8 sintético válido con el motor usado por la cámara', () => {
  // Fixture 96385074: barras EAN-8, con margen claro y tres píxeles por módulo.
  const bits =
    '101' +
    '0001011' +
    '0101111' +
    '0111101' +
    '0110111' +
    '01010' +
    '1001110' +
    '1110010' +
    '1000100' +
    '1011100' +
    '101';
  const width = (bits.length + 20) * 3,
    height = 100;
  const pixels = new Uint8ClampedArray(width * height).fill(255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < bits.length * 3; x++)
      if (bits[Math.floor(x / 3)] === '1') pixels[y * width + 30 + x] = 0;
  const image = new BinaryBitmap(
    new HybridBinarizer(new RGBLuminanceSource(pixels, width, height)),
  );
  expect(new MultiFormatReader().decode(image).getText()).toBe('96385074');
});
