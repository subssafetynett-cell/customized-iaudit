import multer from 'multer';
import {
    AUDIT_EVIDENCE_MAX_BYTES,
    isCloudinaryConfigured,
    uploadEvidenceBuffer,
} from './cloudinary.js';

const ALLOWED_MIME = /^(image\/(jpeg|jpg|png)|application\/pdf)$/i;
const ALLOWED_EXT = /\.(jpe?g|png|pdf)$/i;

function normalizeEvidenceMime(mimetype, originalname) {
    const mime = String(mimetype || '').toLowerCase();
    if (mime === 'image/jpg' || mime === 'image/pjpeg') return 'image/jpeg';
    if (mime === 'image/x-png') return 'image/png';
    if (mime === 'application/x-pdf') return 'application/pdf';
    if (mime && ALLOWED_MIME.test(mime)) return mime;
    const name = String(originalname || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    return mime;
}

function isAllowedEvidenceUpload(file) {
    const normalized = normalizeEvidenceMime(file.mimetype, file.originalname);
    if (ALLOWED_MIME.test(normalized)) return true;
    return ALLOWED_EXT.test(String(file.originalname || ''));
}

export const auditEvidenceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: AUDIT_EVIDENCE_MAX_BYTES },
    fileFilter(_req, file, cb) {
        if (isAllowedEvidenceUpload(file)) {
            cb(null, true);
            return;
        }
        cb(new Error('Evidence must be a PNG, JPEG, or PDF file.'));
    },
});

export async function handleUploadAuditEvidence(req, res) {
    if (!isCloudinaryConfigured()) {
        return res.status(503).json({
            error: 'Cloudinary is not configured on this server. Evidence cannot be uploaded as a URL.',
            code: 'CLOUDINARY_NOT_CONFIGURED',
        });
    }

    if (!req.file?.buffer?.length) {
        return res.status(400).json({
            error: 'No evidence file received. Choose a PNG, JPEG, or PDF.',
        });
    }

    try {
        const userId = req.user?.id;
        const planId = req.body?.planId ? String(req.body.planId).replace(/[^\w-]/g, '').slice(0, 32) : '';
        const mime = normalizeEvidenceMime(req.file.mimetype, req.file.originalname);
        const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
        const publicId = [
            'evidence',
            userId ? `u${userId}` : 'anon',
            planId ? `p${planId}` : '',
            Date.now(),
        ]
            .filter(Boolean)
            .join('-');

        const result = await uploadEvidenceBuffer(req.file.buffer, {
            mime,
            publicId,
        });

        const url = result.secure_url || result.url;
        if (!url) {
            return res.status(502).json({ error: 'Upload succeeded but no file URL was returned.' });
        }

        return res.status(200).json({
            url,
            publicId: result.public_id,
            type: mime,
            name: req.file.originalname || `evidence.${ext}`,
            bytes: req.file.size,
            format: result.format || ext,
        });
    } catch (error) {
        console.error('[Cloudinary] audit evidence upload failed:', error?.message || error);
        if (error?.message === 'CLOUDINARY_NOT_CONFIGURED') {
            return res.status(503).json({
                error: 'Cloudinary is not configured on the server.',
                code: 'CLOUDINARY_NOT_CONFIGURED',
            });
        }
        return res.status(502).json({
            error: 'Could not upload evidence to Cloudinary. Try again or use a smaller file.',
        });
    }
}

export function handleAuditEvidenceUploadError(err, req, res, next) {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: `This file is over ${AUDIT_EVIDENCE_MAX_BYTES / (1024 * 1024)} MB and cannot be uploaded.`,
            });
        }
        return res.status(400).json({ error: err.message || 'Invalid upload' });
    }
    if (err?.message) {
        return res.status(400).json({ error: err.message });
    }
    return next(err);
}
