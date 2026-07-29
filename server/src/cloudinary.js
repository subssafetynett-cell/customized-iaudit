import { v2 as cloudinary } from 'cloudinary';

const COMPANY_LOGO_MAX_BYTES = 10 * 1024 * 1024;
const AUDIT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

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

    return new Promise((resolve, reject) => {
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

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: isPdf ? 'raw' : 'image',
                public_id: options.publicId,
                overwrite: false,
                ...(isPdf
                    ? {}
                    : {
                          transformation: [
                              { width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' },
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
}

export { COMPANY_LOGO_MAX_BYTES, AUDIT_EVIDENCE_MAX_BYTES };
