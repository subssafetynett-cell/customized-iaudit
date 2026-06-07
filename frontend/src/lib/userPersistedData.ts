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

            localStorage.setItem(gapLocalKey(userId), JSON.stringify(analyses));

            const merged = await migrateLocalGapAnalysesToServer(analyses);

            return {

                analyses: filterGapAnalysesForUser(merged, userId),

                draft,

                canWrite,

            };

        }

    } catch (e) {

        console.warn("Gap analyses API load failed, using local backup", e);

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



export async function persistGapAnalysesList<T>(analyses: T[]): Promise<void> {

    const userId = getStoredUserId();

    if (!userId) return;



    const owned = filterGapAnalysesForUser(analyses, userId);

    const stamped = stampGapAnalysesForUser(owned, userId);

    localStorage.setItem(gapLocalKey(userId), JSON.stringify(stamped));



    try {

        const res = await apiFetch("/gap-analyses", {

            method: "PUT",

            body: JSON.stringify({ analyses: stamped }),

        });

        if (!res.ok) {

            console.warn("Failed to persist gap analyses to server", await res.text());

        }

    } catch (e) {

        console.warn("Gap analyses API save failed", e);

    }

}



export async function persistGapAnalysisDraft(

    draft: Record<string, unknown> | null,

): Promise<void> {

    const userId = getStoredUserId();

    if (!userId) return;



    try {

        await apiFetch("/gap-analyses", {

            method: "PUT",

            body: JSON.stringify({

                draft:

                    draft === null

                        ? null

                        : { ...draft, ownerUserId: userId },

            }),

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

            const serverList = Array.isArray(data.assessments)

                ? filterSelfAssessmentsForUser(data.assessments as T[], userId)

                : [];

            let localBackup: T[] = [];

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

            assessments = mergeSelfAssessmentsById(serverList, localBackup);

            if (data.draft && typeof data.draft === "object") {

                const owner = Number(

                    (data.draft as { ownerUserId?: number }).ownerUserId,

                );

                if (!Number.isFinite(owner) || owner === userId) {

                    draft = data.draft as Record<string, unknown>;

                }

            }

            canWrite = data.canWrite !== false;

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

    } catch (e) {

        console.warn("Self assessments API load failed, using local backup", e);

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



export async function persistSelfAssessmentsList<T>(assessments: T[]): Promise<boolean> {

    const userId = getStoredUserId();

    if (!userId) return false;



    const owned = filterSelfAssessmentsForUser(assessments, userId);

    const stamped = stampSelfAssessmentsForUser(owned, userId);

    localStorage.setItem(selfLocalKey(userId), JSON.stringify(stamped));



    try {

        const res = await apiFetch("/self-assessments", {

            method: "PUT",

            body: JSON.stringify({ assessments: stamped }),

        });

        if (!res.ok) {

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

): Promise<void> {

    const userId = getStoredUserId();

    if (!userId) return;



    try {

        await apiFetch("/self-assessments", {

            method: "PUT",

            body: JSON.stringify({

                draft:

                    draft === null

                        ? null

                        : { ...draft, ownerUserId: userId },

            }),

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


