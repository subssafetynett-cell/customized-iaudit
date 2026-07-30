/** Lightweight progress bus so upload % updates don't re-render AuditExecute. */

type Listener = (progress: number) => void;

const progressById = new Map<string, number>();
const listenersById = new Map<string, Set<Listener>>();

export function setEvidenceUploadProgress(clientId: string, progress: number) {
    const pct = Math.max(0, Math.min(100, Math.round(progress)));
    progressById.set(clientId, pct);
    const listeners = listenersById.get(clientId);
    if (!listeners) return;
    for (const fn of listeners) fn(pct);
}

export function getEvidenceUploadProgress(clientId: string): number {
    return progressById.get(clientId) ?? 0;
}

export function clearEvidenceUploadProgress(clientId: string) {
    progressById.delete(clientId);
    listenersById.delete(clientId);
}

export function subscribeEvidenceUploadProgress(
    clientId: string,
    listener: Listener,
): () => void {
    let set = listenersById.get(clientId);
    if (!set) {
        set = new Set();
        listenersById.set(clientId, set);
    }
    set.add(listener);
    listener(getEvidenceUploadProgress(clientId));
    return () => {
        set!.delete(listener);
        if (set!.size === 0) listenersById.delete(clientId);
    };
}

/** Keep original File for retry without re-picking. */
const filesByClientId = new Map<string, File>();

export function rememberEvidenceUploadFile(clientId: string, file: File) {
    filesByClientId.set(clientId, file);
}

export function takeEvidenceUploadFile(clientId: string): File | undefined {
    return filesByClientId.get(clientId);
}

export function forgetEvidenceUploadFile(clientId: string) {
    filesByClientId.delete(clientId);
    clearEvidenceUploadProgress(clientId);
}
