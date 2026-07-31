import {
    auditEvidenceUpload,
    handleUploadAuditEvidence,
    handleAuditEvidenceUploadError,
} from '../uploadAuditEvidence.js';
import {
    companyLogoUpload,
    handleUploadCompanyLogo,
    handleCompanyLogoUploadError,
} from '../uploadCompanyLogo.js';

/** Register upload routes on app and/or mountedApiRouter (same handlers). */
export function registerUploadRoutes(target, { authenticateToken, checkTrialExpiration }) {
    target.post(
        '/uploads/company-logo',
        authenticateToken,
        checkTrialExpiration,
        companyLogoUpload.single('logo'),
        handleUploadCompanyLogo,
        handleCompanyLogoUploadError,
    );
    target.post(
        '/uploads/audit-evidence',
        authenticateToken,
        checkTrialExpiration,
        auditEvidenceUpload.single('file'),
        handleUploadAuditEvidence,
        handleAuditEvidenceUploadError,
    );
}
