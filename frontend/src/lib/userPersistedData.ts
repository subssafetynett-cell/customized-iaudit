import { apiFetch } from "@/lib/api";



export function getStoredUserId(): number | null {

    try {

        const raw = localStorage.getItem("user");

        if (!raw) return null;

        const user = JSON.parse(raw) as { id?: number | string };

        const id = Number(user?.id);

        return Number.isFinite(id) && id > 0 ? id : null;

    } catch {

        return null;

    }

}



let cachedOrgRootId: number | null = null;



function gapLocalKey(orgRootId: number) {

    return `gapAnalyses_org_${orgRootId}`;

}



function selfLocalKey(orgRootId: number) {

    return `selfAssessments_org_${orgRootId}`;

}



/** Collect legacy per-user localStorage blobs for one-time migration. */

function collectLegacyGapLocal(userId: number): unknown[] {

    const lists: unknown[] = [];

    const orgKey = cachedOrgRootId ? gapLocalKey(cachedOrgRootId) : null;

    const legacyUserKey = `gapAnalyses_${userId}`;



    for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        if (!key?.startsWith("gapAnalyses_")) continue;

        if (orgKey && key === orgKey) continue;

        try {

            const parsed = JSON.parse(localStorage.getItem(key) || "[]");

            if (Array.isArray(parsed)) lists.push(...parsed);

        } catch {

            /* ignore */

        }

    }



    if (!lists.length) {

        const saved = localStorage.getItem(legacyUserKey);

        if (saved) {

            try {

                const parsed = JSON.parse(saved);

                if (Array.isArray(parsed)) lists.push(...parsed);

            } catch {

                /* ignore */

            }

        }

    }

    return lists;

}



function collectLegacySelfLocal(userId: number): unknown[] {

    const lists: unknown[] = [];

    const orgKey = cachedOrgRootId ? selfLocalKey(cachedOrgRootId) : null;

    const legacyUserKey = `selfAssessments_${userId}`;



    for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        if (!key?.startsWith("selfAssessments_")) continue;

        if (orgKey && key === orgKey) continue;

        try {

            const parsed = JSON.parse(localStorage.getItem(key) || "[]");

            if (Array.isArray(parsed)) lists.push(...parsed);

        } catch {

            /* ignore */

        }

    }



    if (!lists.length) {

        const saved = localStorage.getItem(legacyUserKey);

        if (saved) {

            try {

                const parsed = JSON.parse(saved);

                if (Array.isArray(parsed)) lists.push(...parsed);

            } catch {

                /* ignore */

            }

        }

    }

    return lists;

}



export async function fetchGapAnalysesPersisted<T>(): Promise<{

    analyses: T[];

    draft: Record<string, unknown> | null;

    canWrite: boolean;

}> {

    const userId = getStoredUserId();

    if (!userId) return { analyses: [], draft: null, canWrite: false };



    let analyses: T[] = [];

    let draft: Record<string, unknown> | null = null;

    let canWrite = true;



    try {

        const res = await apiFetch("/gap-analyses");

        if (res.ok) {

            const data = await res.json();

            if (typeof data.orgRootUserId === "number") {

                cachedOrgRootId = data.orgRootUserId;

            }

            if (Array.isArray(data.analyses)) {

                analyses = data.analyses as T[];

            }

            if (data.draft && typeof data.draft === "object") {

                draft = data.draft as Record<string, unknown>;

            }

            canWrite = data.canWrite !== false;

            if (cachedOrgRootId) {

                localStorage.setItem(

                    gapLocalKey(cachedOrgRootId),

                    JSON.stringify(analyses),

                );

            }

            const merged = await migrateLocalGapAnalysesToServer(analyses);

            return { analyses: merged, draft, canWrite };

        }

    } catch (e) {

        console.warn("Gap analyses API load failed, using local backup", e);

    }



    const orgId = cachedOrgRootId;

    const saved = orgId

        ? localStorage.getItem(gapLocalKey(orgId))

        : null;

    if (saved) {

        try {

            analyses = JSON.parse(saved) as T[];

        } catch {

            analyses = [];

        }

    } else {

        const legacy = collectLegacyGapLocal(userId);

        if (legacy.length) analyses = legacy as T[];

    }

    return { analyses, draft: null, canWrite: true };

}



export async function persistGapAnalysesList<T>(analyses: T[]): Promise<void> {

    const userId = getStoredUserId();

    if (!userId) return;



    if (cachedOrgRootId) {

        localStorage.setItem(

            gapLocalKey(cachedOrgRootId),

            JSON.stringify(analyses),

        );

    }



    try {

        const res = await apiFetch("/gap-analyses", {

            method: "PUT",

            body: JSON.stringify({ analyses }),

        });

        if (!res.ok) {

            console.warn("Failed to persist gap analyses to server", await res.text());

        } else {

            const data = await res.json().catch(() => ({}));

            if (typeof data.orgRootUserId === "number") {

                cachedOrgRootId = data.orgRootUserId;

            }

        }

    } catch (e) {

        console.warn("Gap analyses API save failed", e);

    }

}



export async function persistGapAnalysisDraft(

    draft: Record<string, unknown> | null,

): Promise<void> {

    if (!getStoredUserId()) return;



    try {

        await apiFetch("/gap-analyses", {

            method: "PUT",

            body: JSON.stringify({ draft }),

        });

    } catch (e) {

        console.warn("Gap analysis draft API save failed", e);

    }

}



export async function deleteGapAnalysisPersisted(externalId: string): Promise<void> {

    const userId = getStoredUserId();

    if (!userId) return;



    try {

        const res = await apiFetch(`/gap-analyses/${encodeURIComponent(externalId)}`, {

            method: "DELETE",

        });

        if (!res.ok && res.status !== 404) {

            console.warn("Gap analysis delete API failed", await res.text());

        }

    } catch (e) {

        console.warn("Gap analysis delete API error", e);

    }

}



export async function fetchSelfAssessmentsPersisted<T>(): Promise<{

    assessments: T[];

    draft: Record<string, unknown> | null;

    canWrite: boolean;

}> {

    const userId = getStoredUserId();

    if (!userId) return { assessments: [], draft: null, canWrite: false };



    let assessments: T[] = [];

    let draft: Record<string, unknown> | null = null;

    let canWrite = true;



    try {

        const res = await apiFetch("/self-assessments");

        if (res.ok) {

            const data = await res.json();

            if (typeof data.orgRootUserId === "number") {

                cachedOrgRootId = data.orgRootUserId;

            }

            if (Array.isArray(data.assessments)) {

                assessments = data.assessments as T[];

            }

            if (data.draft && typeof data.draft === "object") {

                draft = data.draft as Record<string, unknown>;

            }

            canWrite = data.canWrite !== false;

            if (cachedOrgRootId) {

                localStorage.setItem(

                    selfLocalKey(cachedOrgRootId),

                    JSON.stringify(assessments),

                );

            }

            const merged = await migrateLocalSelfAssessmentsToServer(assessments);

            return { assessments: merged, draft, canWrite };

        }

    } catch (e) {

        console.warn("Self assessments API load failed, using local backup", e);

    }



    const orgId = cachedOrgRootId;

    const saved = orgId

        ? localStorage.getItem(selfLocalKey(orgId))

        : null;

    if (saved) {

        try {

            assessments = JSON.parse(saved) as T[];

        } catch {

            assessments = [];

        }

    } else {

        const legacy = collectLegacySelfLocal(userId);

        if (legacy.length) assessments = legacy as T[];

    }

    return { assessments, draft: null, canWrite: true };

}



export async function persistSelfAssessmentsList<T>(assessments: T[]): Promise<void> {

    const userId = getStoredUserId();

    if (!userId) return;



    if (cachedOrgRootId) {

        localStorage.setItem(

            selfLocalKey(cachedOrgRootId),

            JSON.stringify(assessments),

        );

    }



    try {

        const res = await apiFetch("/self-assessments", {

            method: "PUT",

            body: JSON.stringify({ assessments }),

        });

        if (!res.ok) {

            console.warn(

                "Failed to persist self assessments to server",

                await res.text(),

            );

        } else {

            const data = await res.json().catch(() => ({}));

            if (typeof data.orgRootUserId === "number") {

                cachedOrgRootId = data.orgRootUserId;

            }

        }

    } catch (e) {

        console.warn("Self assessments API save failed", e);

    }

}



export async function persistSelfAssessmentDraft(

    draft: Record<string, unknown> | null,

): Promise<void> {

    if (!getStoredUserId()) return;



    try {

        await apiFetch("/self-assessments", {

            method: "PUT",

            body: JSON.stringify({ draft }),

        });

    } catch (e) {

        console.warn("Self assessment draft API save failed", e);

    }

}



export async function deleteSelfAssessmentPersisted(

    externalId: string,

): Promise<void> {

    if (!getStoredUserId()) return;



    try {

        const res = await apiFetch(

            `/self-assessments/${encodeURIComponent(externalId)}`,

            { method: "DELETE" },

        );

        if (!res.ok && res.status !== 404) {

            console.warn("Self assessment delete API failed", await res.text());

        }

    } catch (e) {

        console.warn("Self assessment delete API error", e);

    }

}



/** Merge local-only records into server list once (migration after first API load). */

export async function migrateLocalGapAnalysesToServer<T extends { id: string }>(

    serverList: T[],

): Promise<T[]> {

    const userId = getStoredUserId();

    if (!userId) return serverList;



    const legacyItems = collectLegacyGapLocal(userId) as T[];

    if (!legacyItems.length) return serverList;



    const byId = new Map(serverList.map((a) => [a.id, a]));

    let changed = false;

    for (const item of legacyItems) {

        if (item?.id && !byId.has(item.id)) {

            byId.set(item.id, item);

            changed = true;

        }

    }

    const merged = Array.from(byId.values());

    if (changed && merged.length > serverList.length) {

        await persistGapAnalysesList(merged);

    }

    return merged;

}



export async function migrateLocalSelfAssessmentsToServer<T extends { id: string }>(

    serverList: T[],

): Promise<T[]> {

    const userId = getStoredUserId();

    if (!userId) return serverList;



    const legacyItems = collectLegacySelfLocal(userId) as T[];

    if (!legacyItems.length) return serverList;



    const byId = new Map(serverList.map((a) => [a.id, a]));

    let changed = false;

    for (const item of legacyItems) {

        if (item?.id && !byId.has(item.id)) {

            byId.set(item.id, item);

            changed = true;

        }

    }

    const merged = Array.from(byId.values());

    if (changed && merged.length > serverList.length) {

        await persistSelfAssessmentsList(merged);

    }

    return merged;

}


