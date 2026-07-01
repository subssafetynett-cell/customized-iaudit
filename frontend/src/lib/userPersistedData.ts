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



export type PersistedDataOwnerOptions = {

    /** Whose assessment store to read/write (org admins may target teammates). */

    ownerUserId?: number;

};



function resolvePersistOwnerUserId(options?: PersistedDataOwnerOptions): number | null {

    const actorId = getStoredUserId();

    if (!actorId) return null;

    const requested = options?.ownerUserId;

    if (requested != null && Number.isFinite(requested) && requested > 0) {

        return requested;

    }

    return actorId;

}



function ownerQueryParam(options?: PersistedDataOwnerOptions): string {

    const actorId = getStoredUserId();

    const ownerUserId = resolvePersistOwnerUserId(options);

    if (!actorId || !ownerUserId || ownerUserId === actorId) return "";

    return `?ownerUserId=${ownerUserId}`;

}



function gapLocalKey(userId: number) {

    return `gapAnalyses_${userId}`;

}



function gapOrgLocalKey(orgRootUserId: number) {

    return `gapAnalyses_org_${orgRootUserId}`;

}



function gapAnalysisOwnerId(record: unknown): number | null {

    const a = record as { createdByUserId?: number; userId?: number };

    const id = Number(a?.createdByUserId ?? a?.userId);

    return Number.isFinite(id) && id > 0 ? id : null;

}



function filterGapAnalysesForUser<T>(list: T[], userId: number): T[] {

    return list.filter((item) => gapAnalysisOwnerId(item) === userId);

}



function stampGapAnalysesForUser<T>(list: T[], userId: number): T[] {

    return list.map((item) => ({

        ...(item as object),

        createdByUserId: gapAnalysisOwnerId(item) ?? userId,

        userId,

    })) as T[];

}



function selfLocalKey(userId: number) {

    return `selfAssessments_${userId}`;

}



function selfOrgLocalKey(orgRootUserId: number) {

    return `selfAssessments_org_${orgRootUserId}`;

}



function selfAssessmentOwnerId(record: unknown): number | null {

    const a = record as { createdByUserId?: number; userId?: number };

    const id = Number(a?.createdByUserId ?? a?.userId);

    return Number.isFinite(id) && id > 0 ? id : null;

}



function filterSelfAssessmentsForUser<T>(list: T[], userId: number): T[] {

    return list.filter((item) => selfAssessmentOwnerId(item) === userId);

}



function stampSelfAssessmentsForUser<T>(list: T[], userId: number): T[] {

    return list.map((item) => ({

        ...(item as object),

        createdByUserId: selfAssessmentOwnerId(item) ?? userId,

        userId,

    })) as T[];

}



function mergeSelfAssessmentsById<T extends { id: string }>(...lists: T[][]): T[] {

    const byId = new Map<string, T>();

    for (const list of lists) {

        for (const item of list) {

            if (item?.id) byId.set(String(item.id), item);

        }

    }

    return Array.from(byId.values()).sort((a, b) => {

        const da = Date.parse(String((a as { date?: string }).date ?? "")) || 0;

        const db = Date.parse(String((b as { date?: string }).date ?? "")) || 0;

        return db - da;

    });

}



function parseLocalStorageJsonArray(key: string): unknown[] {

    const saved = localStorage.getItem(key);

    if (!saved) return [];

    try {

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];

    } catch {

        return [];

    }

}



/** Best-effort org root from stored profile (creatorId null => self is root). */

function resolveStoredOrgRootUserId(): number | null {

    try {

        const raw = localStorage.getItem("user");

        if (!raw) return null;

        const user = JSON.parse(raw) as { id?: number; creatorId?: number | null };

        const id = Number(user?.id);

        if (!Number.isFinite(id) || id <= 0) return null;

        if (user.creatorId == null || user.creatorId === undefined) return id;

        const creatorId = Number(user.creatorId);

        return Number.isFinite(creatorId) && creatorId > 0 ? creatorId : id;

    } catch {

        return null;

    }

}



function mergeLegacyRecordsById(items: unknown[]): unknown[] {

    const byId = new Map<string, unknown>();

    for (const item of items) {

        const id = (item as { id?: string })?.id;

        if (id) byId.set(String(id), item);

    }

    return Array.from(byId.values());

}



/** Org-store rows: owned by user, or legacy unowned rows when user is org root. */

function filterGapAnalysesFromOrgLegacy<T>(list: T[], userId: number, orgRootUserId: number): T[] {

    if (!Array.isArray(list)) return [];

    return list.filter((item) => {

        const owner = gapAnalysisOwnerId(item);

        if (owner === userId) return true;

        if (owner === null && userId === orgRootUserId) return true;

        return false;

    });

}



function filterSelfAssessmentsFromOrgLegacy<T>(

    list: T[],

    userId: number,

    orgRootUserId: number,

): T[] {

    if (!Array.isArray(list)) return [];

    return list.filter((item) => {

        const owner = selfAssessmentOwnerId(item);

        if (owner === userId) return true;

        if (owner === null && userId === orgRootUserId) return true;

        return false;

    });

}



/** Per-user key plus pre-migration org keys; other org keys only if rows are owned by this user. */

function collectLegacyGapLocal(userId: number): unknown[] {

    const lists: unknown[] = [];

    lists.push(...parseLocalStorageJsonArray(gapLocalKey(userId)));

    const orgRootId = resolveStoredOrgRootUserId();

    if (orgRootId) {

        lists.push(

            ...filterGapAnalysesFromOrgLegacy(

                parseLocalStorageJsonArray(gapOrgLocalKey(orgRootId)) as unknown[],

                userId,

                orgRootId,

            ),

        );

    }

    const primaryOrgKey = orgRootId ? gapOrgLocalKey(orgRootId) : null;

    for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        if (!key?.startsWith("gapAnalyses_org_")) continue;

        if (key === primaryOrgKey) continue;

        lists.push(...filterGapAnalysesForUser(parseLocalStorageJsonArray(key), userId));

    }

    return mergeLegacyRecordsById(lists);

}



/** Per-user key plus pre-migration org keys; other org keys only if rows are owned by this user. */

function collectLegacySelfLocal(userId: number): unknown[] {

    const lists: unknown[] = [];

    lists.push(...parseLocalStorageJsonArray(selfLocalKey(userId)));

    const orgRootId = resolveStoredOrgRootUserId();

    if (orgRootId) {

        lists.push(

            ...filterSelfAssessmentsFromOrgLegacy(

                parseLocalStorageJsonArray(selfOrgLocalKey(orgRootId)) as unknown[],

                userId,

                orgRootId,

            ),

        );

    }

    const primaryOrgKey = orgRootId ? selfOrgLocalKey(orgRootId) : null;

    for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        if (!key?.startsWith("selfAssessments_org_")) continue;

        if (key === primaryOrgKey) continue;

        lists.push(...filterSelfAssessmentsForUser(parseLocalStorageJsonArray(key), userId));

    }

    return mergeLegacyRecordsById(lists);

}



export async function fetchGapAnalysesPersisted<T>(

    options?: PersistedDataOwnerOptions,

): Promise<{

    analyses: T[];

    draft: Record<string, unknown> | null;

    canWrite: boolean;

}> {

    const actorId = getStoredUserId();

    const userId = resolvePersistOwnerUserId(options);

    if (!userId) return { analyses: [], draft: null, canWrite: false };

    const useLocalBackup = userId === actorId;



    let analyses: T[] = [];

    let draft: Record<string, unknown> | null = null;

    let canWrite = true;



    try {

        const res = await apiFetch(`/gap-analyses${ownerQueryParam(options)}`);

        if (res.ok) {

            const data = await res.json();

            if (Array.isArray(data.analyses)) {

                analyses = filterGapAnalysesForUser(data.analyses as T[], userId);

            }

            if (data.draft && typeof data.draft === "object") {

                const owner = Number(

                    (data.draft as { ownerUserId?: number }).ownerUserId,

                );

                if (!Number.isFinite(owner) || owner === userId) {

                    draft = data.draft as Record<string, unknown>;

                }

            }

            canWrite = data.canWrite !== false;

            if (useLocalBackup) {

                localStorage.setItem(gapLocalKey(userId), JSON.stringify(analyses));

                const merged = await migrateLocalGapAnalysesToServer(analyses);

                return {

                    analyses: filterGapAnalysesForUser(merged, userId),

                    draft,

                    canWrite,

                };

            }

            return {

                analyses: filterGapAnalysesForUser(analyses, userId),

                draft,

                canWrite,

            };

        }

    } catch (e) {

        console.warn("Gap analyses API load failed, using local backup", e);

    }



    if (!useLocalBackup) {

        return { analyses: [], draft: null, canWrite: false };

    }



    const saved = localStorage.getItem(gapLocalKey(userId));

    if (saved) {

        try {

            analyses = filterGapAnalysesForUser(JSON.parse(saved) as T[], userId);

        } catch {

            analyses = [];

        }

    }

    if (!analyses.length) {

        const legacy = collectLegacyGapLocal(userId);

        if (legacy.length) {

            analyses = filterGapAnalysesForUser(legacy as T[], userId);

        }

    }

    return { analyses, draft: null, canWrite: true };

}



export async function persistGapAnalysesList<T>(

    analyses: T[],

    options?: PersistedDataOwnerOptions,

): Promise<boolean> {

    const actorId = getStoredUserId();

    const userId = resolvePersistOwnerUserId(options);

    if (!userId) return false;



    const owned = filterGapAnalysesForUser(analyses, userId);

    const stamped = stampGapAnalysesForUser(owned, userId);

    if (userId === actorId) {

        localStorage.setItem(gapLocalKey(userId), JSON.stringify(stamped));

    }



    try {

        const body: { analyses: T[]; ownerUserId?: number } = { analyses: stamped };

        if (actorId && userId !== actorId) body.ownerUserId = userId;

        const res = await apiFetch("/gap-analyses", {

            method: "PUT",

            body: JSON.stringify(body),

        });

        if (!res.ok) {

            const { parseTrialLimitApiError } = await import("@/lib/trialLimits");

            if (await parseTrialLimitApiError(res)) return false;

            console.warn("Failed to persist gap analyses to server", await res.text());

            return false;

        }

        return true;

    } catch (e) {

        console.warn("Gap analyses API save failed", e);

        return false;

    }

}



export async function persistGapAnalysisDraft(

    draft: Record<string, unknown> | null,

    options?: PersistedDataOwnerOptions,

): Promise<void> {

    const actorId = getStoredUserId();

    const userId = resolvePersistOwnerUserId(options);

    if (!userId) return;



    try {

        const body: { draft: Record<string, unknown> | null; ownerUserId?: number } = {

            draft:

                draft === null

                    ? null

                    : { ...draft, ownerUserId: userId },

        };

        if (actorId && userId !== actorId) body.ownerUserId = userId;

        await apiFetch("/gap-analyses", {

            method: "PUT",

            body: JSON.stringify(body),

        });

    } catch (e) {

        console.warn("Gap analysis draft API save failed", e);

    }

}



export async function deleteGapAnalysisPersisted(

    externalId: string,

    options?: PersistedDataOwnerOptions,

): Promise<void> {

    if (!getStoredUserId()) return;



    try {

        const res = await apiFetch(

            `/gap-analyses/${encodeURIComponent(externalId)}${ownerQueryParam(options)}`,

            {

            method: "DELETE",

        },

        );

        if (!res.ok && res.status !== 404) {

            console.warn("Gap analysis delete API failed", await res.text());

        }

    } catch (e) {

        console.warn("Gap analysis delete API error", e);

    }

}



export async function fetchSelfAssessmentsPersisted<T>(

    options?: PersistedDataOwnerOptions,

): Promise<{

    assessments: T[];

    draft: Record<string, unknown> | null;

    canWrite: boolean;

}> {

    const actorId = getStoredUserId();

    const userId = resolvePersistOwnerUserId(options);

    if (!userId) return { assessments: [], draft: null, canWrite: false };

    const useLocalBackup = userId === actorId;



    let assessments: T[] = [];

    let draft: Record<string, unknown> | null = null;

    let canWrite = true;



    try {

        const res = await apiFetch(`/self-assessments${ownerQueryParam(options)}`);

        if (res.ok) {

            const data = await res.json();

            const serverList = Array.isArray(data.assessments)

                ? filterSelfAssessmentsForUser(data.assessments as T[], userId)

                : [];

            let localBackup: T[] = [];

            if (useLocalBackup) {

                const saved = localStorage.getItem(selfLocalKey(userId));

                if (saved) {

                    try {

                        localBackup = filterSelfAssessmentsForUser(

                            JSON.parse(saved) as T[],

                            userId,

                        );

                    } catch {

                        localBackup = [];

                    }

                }

            }

            assessments = useLocalBackup

                ? mergeSelfAssessmentsById(serverList, localBackup)

                : serverList;

            if (data.draft && typeof data.draft === "object") {

                const owner = Number(

                    (data.draft as { ownerUserId?: number }).ownerUserId,

                );

                if (!Number.isFinite(owner) || owner === userId) {

                    draft = data.draft as Record<string, unknown>;

                }

            }

            canWrite = data.canWrite !== false;

            if (useLocalBackup) {

                localStorage.setItem(

                    selfLocalKey(userId),

                    JSON.stringify(assessments),

                );

                const merged = await migrateLocalSelfAssessmentsToServer(assessments);

                return {

                    assessments: filterSelfAssessmentsForUser(merged, userId),

                    draft,

                    canWrite,

                };

            }

            return {

                assessments: filterSelfAssessmentsForUser(assessments, userId),

                draft,

                canWrite,

            };

        }

    } catch (e) {

        console.warn("Self assessments API load failed, using local backup", e);

    }



    if (!useLocalBackup) {

        return { assessments: [], draft: null, canWrite: false };

    }



    const saved = localStorage.getItem(selfLocalKey(userId));

    if (saved) {

        try {

            assessments = filterSelfAssessmentsForUser(

                JSON.parse(saved) as T[],

                userId,

            );

        } catch {

            assessments = [];

        }

    }

    if (!assessments.length) {

        const legacy = collectLegacySelfLocal(userId);

        if (legacy.length) {

            assessments = filterSelfAssessmentsForUser(legacy as T[], userId);

        }

    }

    return { assessments, draft: null, canWrite: true };

}



export async function persistSelfAssessmentsList<T>(

    assessments: T[],

    options?: PersistedDataOwnerOptions,

): Promise<boolean> {

    const actorId = getStoredUserId();

    const userId = resolvePersistOwnerUserId(options);

    if (!userId) return false;



    const owned = filterSelfAssessmentsForUser(assessments, userId);

    const stamped = stampSelfAssessmentsForUser(owned, userId);

    if (userId === actorId) {

        localStorage.setItem(selfLocalKey(userId), JSON.stringify(stamped));

    }



    try {

        const body: { assessments: T[]; ownerUserId?: number } = { assessments: stamped };

        if (actorId && userId !== actorId) body.ownerUserId = userId;

        const res = await apiFetch("/self-assessments", {

            method: "PUT",

            body: JSON.stringify(body),

        });

        if (!res.ok) {

            const { parseTrialLimitApiError } = await import("@/lib/trialLimits");

            if (await parseTrialLimitApiError(res)) return false;

            console.warn(

                "Failed to persist self assessments to server",

                await res.text(),

            );

            return false;

        }

        return true;

    } catch (e) {

        console.warn("Self assessments API save failed", e);

        return false;

    }

}



export async function persistSelfAssessmentDraft(

    draft: Record<string, unknown> | null,

    options?: PersistedDataOwnerOptions,

): Promise<void> {

    const actorId = getStoredUserId();

    const userId = resolvePersistOwnerUserId(options);

    if (!userId) return;



    try {

        const body: { draft: Record<string, unknown> | null; ownerUserId?: number } = {

            draft:

                draft === null

                    ? null

                    : { ...draft, ownerUserId: userId },

        };

        if (actorId && userId !== actorId) body.ownerUserId = userId;

        await apiFetch("/self-assessments", {

            method: "PUT",

            body: JSON.stringify(body),

        });

    } catch (e) {

        console.warn("Self assessment draft API save failed", e);

    }

}



export async function deleteSelfAssessmentPersisted(

    externalId: string,

    options?: PersistedDataOwnerOptions,

): Promise<void> {

    if (!getStoredUserId()) return;



    try {

        const res = await apiFetch(

            `/self-assessments/${encodeURIComponent(externalId)}${ownerQueryParam(options)}`,

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



    const legacyItems = stampGapAnalysesForUser(

        collectLegacyGapLocal(userId) as T[],

        userId,

    );

    if (!legacyItems.length) return serverList;



    const ownedServer = filterGapAnalysesForUser(serverList, userId);

    const byId = new Map(ownedServer.map((a) => [a.id, a]));

    let changed = false;

    for (const item of legacyItems) {

        if (item?.id && !byId.has(item.id)) {

            byId.set(item.id, item);

            changed = true;

        }

    }

    const merged = Array.from(byId.values());

    if (changed && merged.length > ownedServer.length) {

        await persistGapAnalysesList(merged);

    }

    return merged;

}



export async function migrateLocalSelfAssessmentsToServer<T extends { id: string }>(

    serverList: T[],

): Promise<T[]> {

    const userId = getStoredUserId();

    if (!userId) return serverList;



    const legacyItems = stampSelfAssessmentsForUser(

        collectLegacySelfLocal(userId) as T[],

        userId,

    );

    if (!legacyItems.length) return serverList;



    const ownedServer = filterSelfAssessmentsForUser(serverList, userId);

    const byId = new Map(ownedServer.map((a) => [a.id, a]));

    let changed = false;

    for (const item of legacyItems) {

        if (item?.id && !byId.has(item.id)) {

            byId.set(item.id, item);

            changed = true;

        }

    }

    const merged = Array.from(byId.values());

    if (changed && merged.length > ownedServer.length) {

        await persistSelfAssessmentsList(merged);

    }

    return merged;

}


