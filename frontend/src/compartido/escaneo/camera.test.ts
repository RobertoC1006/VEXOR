import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ decode: vi.fn(), media: vi.fn() }));
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatOneDReader: class {
    decodeFromStream = mock.decode;
  },
}));
import { scanCamera, cameraError } from './camera';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: mock.media } });
});
afterEach(() => vi.unstubAllGlobals());
it('libera la cámara si se cierra mientras el permiso sigue pendiente', async () => {
  let resolve!: (stream: MediaStream) => void;
  mock.media.mockReturnValue(
    new Promise<MediaStream>((r) => {
      resolve = r;
    }),
  );
  const stop = vi.fn();
  const controller = new AbortController();
  const pending = scanCamera(document.createElement('video'), controller.signal, vi.fn());
  await vi.waitFor(() => expect(mock.media).toHaveBeenCalled());
  controller.abort();
  resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await pending;
  expect(stop).toHaveBeenCalled();
  expect(mock.decode).not.toHaveBeenCalled();
});
it('usa la cámara trasera sin audio y entrega una sola lectura conservando ceros', async () => {
  const trackStop = vi.fn(),
    decoderStop = vi.fn(),
    onRead = vi.fn();
  mock.media.mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
  mock.decode.mockImplementation(async (_stream, _video, callback) => {
    callback({ getText: () => '000123' }, undefined, { stop: decoderStop });
    callback({ getText: () => '000999' }, undefined, { stop: decoderStop });
    return { stop: decoderStop };
  });
  await scanCamera(document.createElement('video'), new AbortController().signal, onRead);
  expect(mock.media).toHaveBeenCalledWith(
    expect.objectContaining({
      audio: false,
      video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
    }),
  );
  expect(onRead).toHaveBeenCalledExactlyOnceWith('000123');
  expect(trackStop).toHaveBeenCalled();
});
it('cerrar detiene los tracks y el decodificador de una sesión activa', async () => {
  const stop = vi.fn(),
    trackStop = vi.fn();
  mock.media.mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
  mock.decode.mockResolvedValue({ stop });
  const controller = new AbortController();
  await scanCamera(document.createElement('video'), controller.signal, vi.fn());
  controller.abort();
  expect(stop).toHaveBeenCalled();
  expect(trackStop).toHaveBeenCalled();
});
it('explica permisos rechazados y no solicita cámara fuera de HTTPS', async () => {
  expect(cameraError({ name: 'NotAllowedError' })).toContain('permiso de cámara');
  vi.stubGlobal('isSecureContext', false);
  await expect(
    scanCamera(document.createElement('video'), new AbortController().signal, vi.fn()),
  ).rejects.toThrow('HTTPS');
  expect(mock.media).not.toHaveBeenCalled();
});
