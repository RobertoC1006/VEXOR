// El vídeo se procesa en el dispositivo. No se suben imágenes ni se solicita audio.
export async function scanCamera(
  video: HTMLVideoElement,
  signal: AbortSignal,
  onRead: (code: string) => void,
) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw new Error(
      'La cámara requiere HTTPS y un navegador compatible. Puedes escribir el código manualmente.',
    );
  const { BrowserMultiFormatOneDReader } = await import('@zxing/browser');
  if (signal.aborted) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
  let controls: { stop: () => void } | undefined;
  const stop = () => {
    controls?.stop();
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
  if (signal.aborted) {
    stop();
    return;
  }
  signal.addEventListener('abort', stop, { once: true });
  let read = false;
  try {
    controls = await new BrowserMultiFormatOneDReader().decodeFromStream(
      stream,
      video,
      (result, _error, active) => {
        if (!result || read || signal.aborted) return;
        read = true;
        active.stop();
        stop();
        onRead(result.getText());
      },
    );
    if (signal.aborted || read) stop();
  } catch (error) {
    stop();
    throw error;
  }
}

export function cameraError(error: unknown) {
  const name = (error as Error)?.name;
  if (name === 'NotAllowedError')
    return 'No se pudo acceder a la cámara. Revisa el permiso de cámara de Safari o escribe el código manualmente.';
  if (name === 'NotFoundError')
    return 'No encontramos una cámara disponible. Puedes escribir el código manualmente.';
  if (name === 'NotReadableError')
    return 'La cámara está ocupada. Cierra otras aplicaciones que la usen e inténtalo de nuevo.';
  return error instanceof Error && error.message.startsWith('La cámara requiere')
    ? error.message
    : 'No pudimos iniciar la cámara. Puedes volver a intentarlo o escribir el código.';
}
