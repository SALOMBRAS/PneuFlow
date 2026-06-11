const ACCEPTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif'
]);

const ACCEPTED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif']);

const DEFAULT_OPTIONS = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  outputType: 'image/webp'
};

const HEIC_CONVERSION_ERROR = 'Não foi possível converter esta imagem. Tente enviar uma foto em JPG, PNG ou WEBP.';
const INVALID_IMAGE_ERROR = 'Formato de imagem inválido.';

const getExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || '';

const getBaseName = (fileName = 'imagem') => {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  return withoutExtension
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'imagem';
};

export const isSupportedImageFile = (file) => {
  if (!file) return false;
  const type = file.type?.toLowerCase();
  const extension = getExtension(file.name);
  return ACCEPTED_IMAGE_TYPES.has(type) || ACCEPTED_IMAGE_EXTENSIONS.has(extension);
};

const isHeicImage = (file) => {
  const type = file.type?.toLowerCase();
  const extension = getExtension(file.name);
  return type === 'image/heic' || type === 'image/heif' || extension === 'heic' || extension === 'heif';
};

const loadImage = (blob) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(INVALID_IMAGE_ERROR));
    };

    image.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Não foi possível otimizar esta imagem.'));
      },
      type,
      quality
    );
  });

const calculateSize = (width, height, maxWidth, maxHeight) => {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
};

const convertHeicToBrowserImage = async (file) => {
  try {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92
    });

    return Array.isArray(converted) ? converted[0] : converted;
  } catch (error) {
    console.error('Erro ao converter HEIC/HEIF:', error);
    throw new Error(HEIC_CONVERSION_ERROR);
  }
};

export const optimizeImageToWebp = async (file, options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!isSupportedImageFile(file)) {
    throw new Error(INVALID_IMAGE_ERROR);
  }

  const readableBlob = isHeicImage(file) ? await convertHeicToBrowserImage(file) : file;

  let image;
  try {
    image = await loadImage(readableBlob);
  } catch (error) {
    if (isHeicImage(file)) throw new Error(HEIC_CONVERSION_ERROR);
    throw error;
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error(INVALID_IMAGE_ERROR);
  }

  const target = calculateSize(sourceWidth, sourceHeight, config.maxWidth, config.maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível otimizar esta imagem.');

  context.drawImage(image, 0, 0, target.width, target.height);

  const webpBlob = await canvasToBlob(canvas, config.outputType, config.quality);
  const fileName = `${getBaseName(file.name)}.webp`;

  return new File([webpBlob], fileName, {
    type: config.outputType,
    lastModified: Date.now()
  });
};

export const IMAGE_UPLOAD_ACCEPT =
  'image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.heic,.heif';
