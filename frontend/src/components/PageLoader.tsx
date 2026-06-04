/** Shown while a lazily loaded route chunk is downloading. */
export function PageLoader() {
    return (
        <div
            className="flex min-h-[50vh] w-full items-center justify-center bg-background"
            role="status"
            aria-label="Loading page"
        >
            <div className="flex flex-col items-center gap-3">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#213847]" />
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        </div>
    );
}
