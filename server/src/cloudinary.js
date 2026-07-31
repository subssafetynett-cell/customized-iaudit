import { v2 as cloudinary } from 'cloudinary';

const COMPANY_LOGO_MAX_BYTES = 10 * 1024 * 1024;
const AUDIT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = Number.parseInt(
    process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '25000',
    10,
) || 25000;

/** @returns {boolean} */
export function isCloudinaryConfigured() {
    if (process.env.CLOUDINARY_URL?.trim()) {
        return true;
    }
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME?.trim()
        && process.env.CLOUDINARY_API_KEY?.trim()
        && process.env.CLOUDINARY_API_SECRET?.trim()
    );
}

function ensureCloudinaryConfig() {
    if (process.env.CLOUDINARY_URL?.trim()) {
        cloudinary.config();
        return;
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

function withUploadTimeout(promise, label) {
    let timer;
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise((_, reject) => {
            timer = setTimeout(() => {
                const err = new Error(`${label} timed out after ${CLOUDINARY_UPLOAD_TIMEOUT_MS}ms`);
                err.code = 'UPLOAD_TIMEOUT';
                reject(err);
            }, CLOUDINARY_UPLOAD_TIMEOUT_MS);
        }),
    ]);
}

/**
 * Upload an image buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {{ publicId?: string }} [options]
 */
export async function uploadImageBuffer(buffer, options = {}) {
    if (!isCloudinaryConfigured()) {
        const err = new Error('CLOUDINARY_NOT_CONFIGURED');
        throw err;
    }
    ensureCloudinaryConfig();

    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || 'iaudit/company-logos';

    const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                public_id: options.publicId,
                overwrite: Boolean(options.publicId),
                transformation: [{ width: 512, height: 512, crop: 'limit', quality: 'auto:good' }]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });

    return withUploadTimeout(uploadPromise, 'Cloudinary image upload');
}

/**
 * Upload audit evidence (PNG/JPEG/PDF) to Cloudinary.
 * @param {Buffer} buffer
 * @param {{ mime?: string, publicId?: string, folder?: string }} [options]
 */
export async function uploadEvidenceBuffer(buffer, options = {}) {
    if (!isCloudinaryConfigured()) {
        const err = new Error('CLOUDINARY_NOT_CONFIGURED');
        throw err;
    }
    ensureCloudinaryConfig();

    const mime = String(options.mime || '').toLowerCase();
    const isPdf = mime === 'application/pdf';
    const folder =
        options.folder
        || process.env.CLOUDINARY_EVIDENCE_FOLDER?.trim()
        || 'iaudit/audit-evidence';

    const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: isPdf ? 'raw' : 'image',
                public_id: options.publicId,
                overwrite: false,
                ...(isPdf
                    ? {}
                    : {
                          // Client already compresses; keep a light server-side guardrail.
                          transformation: [
                              {
                                  width: 1280,
                                  height: 1280,
                                  crop: 'limit',
                                  quality: 'auto:good',
                                  fetch_format: 'auto',
                              },
                          ],
                      }),
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });

    return withUploadTimeout(uploadPromise, 'Cloudinary evidence upload');
}

export { COMPANY_LOGO_MAX_BYTES, AUDIT_EVIDENCE_MAX_BYTES };
