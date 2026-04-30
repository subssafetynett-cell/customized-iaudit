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

const ReusablePagination: React.FC<ReusablePaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    className,
}) => {
    if (totalPages <= 1 && totalItems <= itemsPerPage) {
        if (totalItems === 0) return null;
        return (
            <div className={cn("flex items-center justify-between mt-6 px-2", className)}>
                <div className="text-sm text-slate-500 font-medium">
                    Showing 1 to {totalItems} of {totalItems} entries
                </div>
            </div>
        );
    }

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, "...", totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
            }
        }
        return pages;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className={cn("flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-slate-100 gap-4 px-2", className)}>
            <div className="text-sm text-slate-500 font-medium">
                Showing <span className="text-slate-900 font-bold">{totalItems === 0 ? 0 : startItem}</span> to <span className="text-slate-900 font-bold">{endItem}</span> of <span className="text-slate-900 font-bold">{totalItems}</span> entries
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-xl h-8 sm:h-9 px-2 sm:px-4 font-semibold border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs sm:text-sm transition-all"
                >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) => (
                        page === "..." ? (
                            <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold">...</span>
                        ) : (
                            <Button
                                key={`page-${page}`}
                                variant={currentPage === page ? "default" : "ghost"}
                                size="sm"
                                onClick={() => onPageChange(page as number)}
                                className={cn(
                                    "w-8 h-8 sm:w-10 sm:h-10 rounded-xl p-0 font-bold transition-all text-xs sm:text-sm shadow-none",
                                    currentPage === page
                                        ? "bg-[#213847] hover:bg-[#213847]/90 text-white shadow-md transform scale-105"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                )}
                            >
                                {page}
                            </Button>
                        )
                    ))}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-xl h-8 sm:h-9 px-2 sm:px-4 font-semibold border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs sm:text-sm transition-all"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
            </div>
        </div>
    );
};

export default ReusablePagination;
