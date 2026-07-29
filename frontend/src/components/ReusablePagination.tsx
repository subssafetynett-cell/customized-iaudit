import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ReusablePaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    className?: string;
}

const ReusablePagination: React.FC<ReusablePaginationProps> = React.memo(({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    className,
}) => {
    if (totalItems === 0) return null;

    const safeTotalPages = Math.max(1, totalPages);
    const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (safeTotalPages <= 7) {
            for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
        } else if (safeCurrentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, "...", safeTotalPages);
        } else if (safeCurrentPage >= safeTotalPages - 3) {
            pages.push(
                1,
                "...",
                safeTotalPages - 4,
                safeTotalPages - 3,
                safeTotalPages - 2,
                safeTotalPages - 1,
                safeTotalPages,
            );
        } else {
            pages.push(
                1,
                "...",
                safeCurrentPage - 1,
                safeCurrentPage,
                safeCurrentPage + 1,
                "...",
                safeTotalPages,
            );
        }
        return pages;
    };

    const startItem = (safeCurrentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems);

    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-slate-100 gap-4 px-2",
                className,
            )}
        >
            <div className="text-sm text-slate-500 font-medium">
                Showing{" "}
                <span className="text-slate-900 font-bold">{startItem}</span> to{" "}
                <span className="text-slate-900 font-bold">{endItem}</span> of{" "}
                <span className="text-slate-900 font-bold">{totalItems}</span> entries
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage <= 1}
                    className="rounded-xl h-8 sm:h-9 px-2 sm:px-4 font-semibold border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs sm:text-sm transition-all"
                >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) =>
                        page === "..." ? (
                            <span
                                key={`dots-${idx}`}
                                className="px-1 text-slate-400 font-bold"
                            >
                                ...
                            </span>
                        ) : (
                            <Button
                                key={`page-${page}`}
                                variant={safeCurrentPage === page ? "default" : "ghost"}
                                size="sm"
                                onClick={() => onPageChange(page as number)}
                                className={cn(
                                    "w-8 h-8 sm:w-10 sm:h-10 rounded-xl p-0 font-bold transition-all text-xs sm:text-sm shadow-none",
                                    safeCurrentPage === page
                                        ? "bg-[#213847] hover:bg-[#213847]/90 text-white shadow-md transform scale-105"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                                )}
                            >
                                {page}
                            </Button>
                        ),
                    )}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage >= safeTotalPages}
                    className="rounded-xl h-8 sm:h-9 px-2 sm:px-4 font-semibold border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs sm:text-sm transition-all"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
            </div>
        </div>
    );
});

ReusablePagination.displayName = "ReusablePagination";

export default ReusablePagination;
