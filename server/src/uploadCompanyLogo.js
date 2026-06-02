import multer from 'multer';
import { COMPANY_LOGO_MAX_BYTES, isCloudinaryConfigured, uploadImageBuffer } from './cloudinary.js';

const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp)$/i;
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

/** Align with frontend + textSanitize: browsers often send legacy JPEG/PNG MIME labels. */
function normalizeLogoMime(mimetype) {
    const mime = String(mimetype || '').toLowerCase();
    if (mime === 'image/jpg' || mime === 'image/pjpeg') return 'image/jpeg';
    if (mime === 'image/x-png') return 'image/png';
    return mime;
}

function isAllowedLogoUpload(file) {
    const normalized = normalizeLogoMime(file.mimetype);
    if (ALLOWED_MIME.test(normalized)) return true;
    return ALLOWED_EXT.test(String(file.originalname || ''));
}

export const companyLogoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: COMPANY_LOGO_MAX_BYTES },
    fileFilter(_req, file, cb) {
        if (isAllowedLogoUpload(file)) {
            cb(null, true);
            return;
        }
        cb(new Error('Logo must be a PNG, JPEG, or WebP image.'));
    }
});

export async function handleUploadCompanyLogo(req, res) {
    if (!isCloudinaryConfigured()) {
        return res.status(503).json({
            error: 'Cloudinary is not configured on the server. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.',
            code: 'CLOUDINARY_NOT_CONFIGURED'
        });
    }

    if (!req.file?.buffer?.length) {
        return res.status(400).json({ error: 'No logo file received. Choose a PNG, JPEG, or WebP image.' });
    }

    try {
        const userId = req.user?.id;
        const publicId = userId ? `company-logo-user-${userId}-${Date.now()}` : undefined;
        const result = await uploadImageBuffer(req.file.buffer, { publicId });
        return res.status(200).json({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height
        });
    } catch (error) {
        console.error('[Cloudinary] company logo upload failed:', error?.message || error);
        if (error?.message === 'CLOUDINARY_NOT_CONFIGURED') {
            return res.status(503).json({
                error: 'Cloudinary is not configured on the server.',
                code: 'CLOUDINARY_NOT_CONFIGURED'
            });
        }
        return res.status(502).json({
            error: 'Could not upload logo to Cloudinary. Check your Cloudinary credentials and try again.'
        });
    }
}

/** Multer error handler for logo route */
export function handleCompanyLogoUploadError(err, req, res, next) {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'This logo is over 10 MB and cannot be uploaded. Please choose a smaller image (maximum 10 MB).'
            });
        }
        return res.status(400).json({ error: err.message || 'Invalid upload' });
    }
    if (err?.message) {
        return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Upload failed' });
}
