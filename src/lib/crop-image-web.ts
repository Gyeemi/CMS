type CropImageOptions = {
  imageWidth: number;
  imageHeight: number;
  viewportSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  outputSize?: number;
};

export function getCoverScale(imageWidth: number, imageHeight: number, viewportSize: number) {
  return Math.max(viewportSize / imageWidth, viewportSize / imageHeight);
}

export function clampCropOffset(
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  zoom: number,
) {
  const scale = getCoverScale(imageWidth, imageHeight, viewportSize) * zoom;
  const displayW = imageWidth * scale;
  const displayH = imageHeight * scale;
  const maxOffsetX = Math.max(0, (displayW - viewportSize) / 2);
  const maxOffsetY = Math.max(0, (displayH - viewportSize) / 2);

  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  };
}

export async function cropImageToSquareDataUri(uri: string, options: CropImageOptions) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image cropping is only available in the browser.');
  }

  const {
    imageWidth,
    imageHeight,
    viewportSize,
    zoom,
    offsetX,
    offsetY,
    outputSize = 512,
  } = options;

  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const scale = getCoverScale(imageWidth, imageHeight, viewportSize) * zoom;
      const displayW = imageWidth * scale;
      const displayH = imageHeight * scale;
      const left = (viewportSize - displayW) / 2 + offsetX;
      const top = (viewportSize - displayH) / 2 + offsetY;

      const sourceX = (0 - left) / scale;
      const sourceY = (0 - top) / scale;
      const sourceSize = viewportSize / scale;

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Unable to crop image.'));
        return;
      }

      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => reject(new Error('Unable to load image for cropping.'));
    image.src = uri;
  });
}
