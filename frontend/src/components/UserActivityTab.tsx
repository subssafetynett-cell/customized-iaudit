import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface UserActivityTabProps {
    userId: string | number;
}

export function UserActivityTab({ userId }: UserActivityTabProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{
        auditPrograms: any[];
        auditPlans: any[];
        findings: any[];
    } | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        async function fetchActivity() {
            try {
                setIsLoading(true);
                const res = await apiFetch(`/users/${userId}/activity`);
                if (res.ok) {
                    const json = await res.json();
                    if (isMounted) {
                        setData(json);
                    }
                } else {
                    toast.error("Failed to load user activity.");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error loading user activity.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        
        void fetchActivity();
        
        return () => {
            isMounted = false;
        };
    }, [userId]);

    const handleDownloadCSV = () => {
        if (!data) return;

        let csvContent = "data:text/csv;charset=utf-8,";

        // Audit Programs Section
        csvContent += "=== AUDIT PROGRAMS ===\n";
        csvContent += "ID,Name,Standard,Frequency,Status,Created At\n";
        data.auditPrograms.forEach(p => {
            csvContent += `${p.id},"${p.name}","${p.isoStandard}","${p.frequency}","${p.status}","${new Date(p.createdAt).toLocaleDateString()}"\n`;
        });
        csvContent += "\n";

        // Audit Plans Section
        csvContent += "=== AUDITS / PLANS ===\n";
        csvContent += "ID,Audit Name,Type,Status,Created At\n";
        data.auditPlans.forEach(p => {
            csvContent += `${p.id},"${p.auditName || 'Untitled'}","${p.auditType || 'N/A'}","${p.status}","${new Date(p.createdAt).toLocaleDateString()}"\n`;
        });
        csvContent += "\n";

        // Findings Section
        csvContent += "=== FINDINGS (NONCONFORMANCES) ===\n";
        csvContent += "NC Number,Title,Severity,Status,Created At\n";
        data.findings.forEach(f => {
            csvContent += `${f.ncNumber},"${f.findingTitle}","${f.severity}","${f.status}","${new Date(f.createdAt).toLocaleDateString()}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `user_activity_${userId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data) {
        return <div className="p-4 text-center text-muted-foreground">No data available.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">User Activity & Audits</h3>
                    <p className="text-sm text-muted-foreground">Overview of programs, audits, and findings associated with this user.</p>
                </div>
                <Button onClick={handleDownloadCSV} size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Download CSV
                </Button>
            </div>

            <Card className="shadow-none border-slate-200">
                <CardHeader className="py-4 bg-muted/30 border-b">
                    <CardTitle className="text-sm font-semibold">Audit Programs ({data.auditPrograms.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Standard</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.auditPrograms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No audit programs</TableCell>
                                </TableRow>
                            ) : (
                                data.auditPrograms.map(program => (
                                    <TableRow key={program.id}>
                                        <TableCell className="font-medium">{program.name}</TableCell>
                                        <TableCell>{program.isoStandard}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{program.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="shadow-none border-slate-200">
                <CardHeader className="py-4 bg-muted/30 border-b">
                    <CardTitle className="text-sm font-semibold">Audits / Plans ({data.auditPlans.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Audit Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.auditPlans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No audits</TableCell>
                                </TableRow>
                            ) : (
                                data.auditPlans.map(plan => (
                                    <TableRow key={plan.id}>
                                        <TableCell className="font-medium">{plan.auditName || "Untitled Audit"}</TableCell>
                                        <TableCell>{plan.auditType || "N/A"}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{plan.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="shadow-none border-slate-200">
                <CardHeader className="py-4 bg-muted/30 border-b">
                    <CardTitle className="text-sm font-semibold">Findings ({data.findings.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>NC Number</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.findings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No findings</TableCell>
                                </TableRow>
                            ) : (
                                data.findings.map(finding => (
                                    <TableRow key={finding.id}>
                                        <TableCell className="font-medium whitespace-nowrap">{finding.ncNumber}</TableCell>
                                        <TableCell>{finding.findingTitle}</TableCell>
                                        <TableCell>
                                            <Badge variant={finding.severity === "Major" ? "destructive" : "secondary"}>
                                                {finding.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{finding.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
