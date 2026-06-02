import {
    COMPANY_LOGO_MAX_CHARS,
    COMPANY_LOGO_TYPE_ERROR_MESSAGE,
    getCompanyLogoFileSizeError,
} from "@/lib/validation";

const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|pjpeg|x-png)$/i;
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

function isAllowedImageFile(file: File): boolean {
  if (file.type && ALLOWED_MIME.test(file.type)) return true;
  return ALLOWED_EXT.test(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the image file."));
    };
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image. Try a different PNG or JPEG file."));
    img.src = src;
  });
}

/** Resize and compress a logo file to a JPEG data URL within storage limits. */
export async function compressCompanyLogoFile(
  file: File,
  maxChars: number = COMPANY_LOGO_MAX_CHARS
): Promise<string> {
  if (!isAllowedImageFile(file)) {
    throw new Error(COMPANY_LOGO_TYPE_ERROR_MESSAGE);
  }
  const sizeError = getCompanyLogoFileSizeError(file.size);
  if (sizeError) {
    throw new Error(sizeError);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const MAX = 512;
  const canvas = document.createElement("canvas");
  let { width, height } = img;
  if (width > MAX || height > MAX) {
    if (width > height) {
      height = Math.round((height * MAX) / width);
      width = MAX;
    } else {
      width = Math.round((width * MAX) / height);
      height = MAX;
    }
  }
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length > maxChars && quality > 0.4) {
    quality -= 0.1;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  if (result.length > maxChars) {
    throw new Error("Logo is too large after compression. Try a smaller image.");
  }
  return result;
}
