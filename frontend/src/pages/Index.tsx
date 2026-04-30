import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import { API_BASE_URL } from "@/config";
import {
  Building2,
  MapPin,
  Users as UsersIcon,
  BarChart3,
  ShieldCheck,
  Search,
  ClipboardCheck,
  AlertCircle,
  AlertOctagon,
  Info,
  TrendingUp,
  Activity,
  FileText,
  Briefcase, 
  Rocket, 
  Sparkles,
  Clipboard, 
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, Label
} from "recharts";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import CompanyModal from "@/components/CompanyModal";
import SiteModal from "@/components/SiteModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TrialModal from "@/components/TrialModal";
import TrialBanner from "@/components/TrialBanner";

const Index = () => {
    const navigate = useNavigate();
    const { companies, isLoading, addCompany, addSite } = useCompanyStore();
    const [users, setUsers] = useState<any[]>([]);
    const [auditPlans, setAuditPlans] = useState<any[]>([]);
    const [auditPrograms, setAuditPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selfAssessments, setSelfAssessments] = useState<any[]>([]);
    const [gapAnalyses, setGapAnalyses] = useState<any[]>([]);
    const [showTrialModal, setShowTrialModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Onboarding state
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(1);

  // Calculate Metrics
  const totalSites = companies.reduce((acc, c) => acc + (c.sites?.length || 0), 0);
  const totalDepts = companies.reduce((acc, c) => acc + (c.sites?.reduce((a, s) => a + (s.departments?.length || 0), 0) || 0), 0);

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    
    // Only show onboarding if user exists and hasn't completed it
    if (!isLoading && user && !user.onboardingCompleted && companies.length === 0) {
      setShowWelcome(true);
      setOnboardingStep(1);
    }
  }, [isLoading, companies.length, totalSites]);

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Show trial modal ONLY IF onboarding is completed
      // and trial hasn't started and user is on trial tier
      if (currentUser.onboardingCompleted && 
          currentUser.subscriptionStatus === 'trial' && 
          !currentUser.trialEndDate && 
          !localStorage.getItem('trial_modal_seen')) {
        setShowTrialModal(true);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const [usersRes, plansRes, programsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/users?creatorId=${user.id}`),
          fetch(`${API_BASE_URL}/api/audit-plans?userId=${user.id}`),
          fetch(`${API_BASE_URL}/api/audit-programs?userId=${user.id}`)
        ]);

        if (usersRes.ok) setUsers(await usersRes.json());
        if (plansRes.ok) setAuditPlans(await plansRes.json());
        if (programsRes.ok) setAuditPrograms(await programsRes.json());

        // Load Self Assessments from localStorage
        const savedSelf = localStorage.getItem(`selfAssessments_${user.id}`);
        if (savedSelf) setSelfAssessments(JSON.parse(savedSelf));

        // Load Gap Analyses from localStorage
        const savedGap = localStorage.getItem(`gapAnalyses_${user.id}`);
        if (savedGap) setGapAnalyses(JSON.parse(savedGap));

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Self Assessment Score distribution logic
  // High (>=76%): Score >= 38
  // Medium (48-75%): Score 24-37
  // Low (<48%): Score < 24
  const saHigh = selfAssessments.filter(a => a.score >= 38).length;
  const saMedium = selfAssessments.filter(a => a.score >= 24 && a.score < 38).length;
  const saLow = selfAssessments.filter(a => a.score < 24).length;
  const totalSA = selfAssessments.length;

  const saDistribution = [
    { name: 'High (≥76%)', value: saHigh, color: '#10B981', percentage: totalSA > 0 ? `${Math.round((saHigh / totalSA) * 100)}%` : "0%" },
    { name: 'Medium (48-75%)', value: saMedium, color: '#FBBF24', percentage: totalSA > 0 ? `${Math.round((saMedium / totalSA) * 100)}%` : "0%" },
    { name: 'Low (<48%)', value: saLow, color: '#EF4444', percentage: totalSA > 0 ? `${Math.round((saLow / totalSA) * 100)}%` : "0%" },
  ];

  // Gap Analysis Score distribution logic (0-100 score in GapAnalysis.tsx)
  const gapCompliant = gapAnalyses.filter(a => {
    const total = a.questions?.length || 0;
    const comply = a.questions?.filter((q: any) => q.finding === 'Comply').length || 0;
    const score = total > 0 ? (comply / total) * 100 : 0;
    return score >= 70;
  }).length;

  const gapPartial = gapAnalyses.filter(a => {
    const total = a.questions?.length || 0;
    const comply = a.questions?.filter((q: any) => q.finding === 'Comply').length || 0;
    const score = total > 0 ? (comply / total) * 100 : 0;
    return score >= 40 && score < 70;
  }).length;

  const gapNonCompliant = gapAnalyses.filter(a => {
    const total = a.questions?.length || 0;
    const comply = a.questions?.filter((q: any) => q.finding === 'Comply').length || 0;
    const score = total > 0 ? (comply / total) * 100 : 0;
    return score < 40;
  }).length;

  const totalGap = gapAnalyses.length;

  const gapDistribution = [
    { name: 'Compliant (≥70%)', value: gapCompliant, color: '#10B981', percentage: totalGap > 0 ? `${Math.round((gapCompliant / totalGap) * 100)}%` : "0%" },
    { name: 'Partial (40-69%)', value: gapPartial, color: '#F59E0B', percentage: totalGap > 0 ? `${Math.round((gapPartial / totalGap) * 100)}%` : "0%" },
    { name: 'Non-Compliant (<40%)', value: gapNonCompliant, color: '#EF4444', percentage: totalGap > 0 ? `${Math.round((gapNonCompliant / totalGap) * 100)}%` : "0%" },
  ];

  // Findings Calculation (Matching AuditFindings.tsx extraction logic)
  const allFindings: any[] = [];
  auditPlans.forEach(plan => {
    try {
      const auditData = typeof plan.auditData === 'string' ? JSON.parse(plan.auditData) : (plan.auditData || {});
      const results: any[] = [];

      // 1. Extract from clauseData
      if (auditData.clauseData && typeof auditData.clauseData === 'object') {
        Object.entries(auditData.clauseData).forEach(([clauseId, entry]: any) => {
          const ft = entry?.findingType;
          if (!ft || ft === "C") return;
          if (["OFI", "Minor", "Major"].includes(ft)) {
            results.push({
              auditId: plan.id,
              clauseRef: `Clause ${clauseId}`,
              type: ft
            });
          }
        });
      }

      // 2. Extract from checklistData
      if (auditData.checklistData && typeof auditData.checklistData === 'object') {
        Object.entries(auditData.checklistData).forEach(([idx, entry]: any) => {
          const raw = entry?.findings;
          if (!raw || raw === "C" || raw.trim() === "") return;

          let type = null;
          if (raw === "OFI") type = "OFI";
          else if (raw === "Min" || raw === "Minor") type = "Minor";
          else if (raw === "Maj" || raw === "Major") type = "Major";

          if (type) {
            const clauseRef = entry.clause ? `Clause ${entry.clause}` : `Item ${Number(idx) + 1}`;
            results.push({
              auditId: plan.id,
              clauseRef,
              type
            });
          }
        });
      }

      // Deduplicate by (auditId, clauseRef) – keep highest severity
      const SEVERITY: Record<string, number> = { OFI: 1, Minor: 2, Major: 3 };
      const seen = new Map<string, any>();
      results.forEach((f) => {
        const key = `${f.auditId}::${f.clauseRef}`;
        const existing = seen.get(key);
        if (!existing || SEVERITY[f.type] > SEVERITY[existing.type]) {
          seen.set(key, f);
        }
      });

      allFindings.push(...Array.from(seen.values()));
    } catch (e) {
      console.error("Error parsing auditData for plan", plan.id, e);
    }
  });

  const totalOfi = allFindings.filter(f => f.type === 'OFI').length;
  const totalMinor = allFindings.filter(f => f.type === 'Minor').length;
  const totalMajor = allFindings.filter(f => f.type === 'Major').length;

  const findingsData = [
    { name: 'OFI', value: totalOfi, color: '#f59e0b' },
    { name: 'Minor N/C', value: totalMinor, color: '#ea580c' },
    { name: 'Major N/C', value: totalMajor, color: '#dc2626' },
  ].filter(f => f.value > 0);

  // If no findings yet, show dummy for demo
  const displayFindingsData = findingsData.length > 0 ? findingsData : [
    { name: 'OFI', value: 0, color: '#f59e0b' },
    { name: 'Minor N/C', value: 0, color: '#ea580c' },
    { name: 'Major N/C', value: 0, color: '#dc2626' },
  ];

  const getProgress = (plan: any) => {
    if (plan.auditData) {
      try {
        const data = typeof plan.auditData === 'string' ? JSON.parse(plan.auditData) : plan.auditData;
        return data.progress ?? 0;
      } catch (e) { return 0; }
    }
    return 0;
  };

  // Recent Activity logic: Get top 5 most recent audits
  const recentActivity = [...auditPlans]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    {
      label: "Companies",
      value: companies.length,
      icon: Building2,
      trend: "+12%",
      trendColor: "text-emerald-500 bg-emerald-50",
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      label: "Sites",
      value: totalSites,
      icon: MapPin,
      trend: "+5%",
      trendColor: "text-emerald-500 bg-emerald-50",
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      label: "Gap Analyses",
      value: gapAnalyses.length,
      icon: Search,
      trend: "+10%",
      trendColor: "text-emerald-500 bg-emerald-50",
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      label: "Self Assessments",
      value: selfAssessments.length,
      icon: ShieldCheck,
      trend: "+22%",
      trendColor: "text-emerald-500 bg-emerald-50",
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      label: "Audit Programs",
      value: auditPrograms.length,
      icon: ClipboardCheck,
      trend: "+8%",
      trendColor: "text-emerald-500 bg-emerald-50",
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      label: "Total Audits",
      value: auditPlans.length,
      icon: BarChart3,
      trend: "0%",
      trendColor: "text-red-400 bg-red-50",
      iconColor: "text-emerald-600 bg-emerald-50"
    },
  ];

  // Status Calculations
  const totalScheduledCount = auditPlans.filter(p => !p.auditData || getProgress(p) === 0).length;
  const totalCompletedCount = auditPlans.filter(p => getProgress(p) === 100).length;

  const findingDistribution = [
    { name: 'OFI', value: totalOfi, color: '#FCD34D', percentage: totalOfi + totalMinor + totalMajor > 0 ? `${Math.round((totalOfi / (totalOfi + totalMinor + totalMajor)) * 100)}%` : "0%" },
    { name: 'Minor N/C', value: totalMinor, color: '#F97316', percentage: totalOfi + totalMinor + totalMajor > 0 ? `${Math.round((totalMinor / (totalOfi + totalMinor + totalMajor)) * 100)}%` : "0%" },
    { name: 'Major N/C', value: totalMajor, color: '#E11D48', percentage: totalOfi + totalMinor + totalMajor > 0 ? `${Math.round((totalMajor / (totalOfi + totalMinor + totalMajor)) * 100)}%` : "0%" },
  ];

  // Dynamic Trend Data: Show months from Jan to July
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create an array for Jan to July (7 months)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const monthName = months[i];
    const auditsInMonth = auditPlans.filter(p => {
      const created = new Date(p.createdAt);
      return created.getMonth() === i && created.getFullYear() === currentYear;
    });
    return {
      month: monthName,
      scheduled: auditsInMonth.length,
      completed: auditsInMonth.filter(p => getProgress(p) === 100).length
    };
  });

    const handleStartTrial = async () => {
        if (!currentUser) return;
        localStorage.setItem('trial_modal_seen', 'true');
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/start-trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const updatedUser = await response.json();
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
                setShowTrialModal(false);
                toast.success("Welcome! Your 14-day free trial has started.");
            } else {
                toast.error("Failed to start trial. Please try again.");
                localStorage.removeItem('trial_modal_seen');
            }
        } catch (error) {
            console.error("Trial start error:", error);
            toast.error("A connection error occurred.");
            localStorage.removeItem('trial_modal_seen');
        }
    };

    const handleSubscribe = () => {
        localStorage.setItem('trial_modal_seen', 'true');
        navigate("/subscription");
    };

  // Calculate dynamic max for Y-axis scaling
  const maxVal = trendData.reduce((max, d) => Math.max(max, d.scheduled, d.completed), 0);
  const chartMax = Math.max(8, Math.ceil(maxVal / 2) * 2 + 2);
  const chartTicks = Array.from({ length: (chartMax / 2) + 1 }, (_, i) => i * 2);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-6 py-6">
        <TrialModal 
            isOpen={showTrialModal} 
            onStartTrial={handleStartTrial} 
            onSubscribe={handleSubscribe} 
        />
      <div className="max-w-[1600px] mx-auto space-y-6">
        {currentUser?.onboardingCompleted && (
          <TrialBanner 
            subscriptionStatus={currentUser?.subscriptionStatus} 
            trialEndDate={currentUser?.trialEndDate} 
          />
        )}

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm rounded-xl overflow-hidden bg-white hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-[12px] ${stat.iconColor}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${stat.trendColor}`}>
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-[#111827] mb-1">{stat.value}</h3>
                <p className="text-xs font-semibold text-[#6B7280] mb-2">{stat.label}</p>
                <p className="text-[10px] text-[#9CA3AF]">from last month</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Audit Trend Line Chart */}
          <Card className="lg:col-span-7 border-none shadow-sm rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">Audit Trend</h2>
                <p className="text-xs text-[#9CA3AF]">Scheduled vs completed audits</p>
              </div>
              <button className="text-[#9CA3AF] hover:text-[#111827]">...</button>
            </div>

            <div className="flex items-center gap-10 mb-6">
              <div>
                <p className="text-[10px] font-semibold text-[#9CA3AF] mb-1">Total Scheduled</p>
                <p className="text-xl font-extrabold text-[#111827]">{totalScheduledCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#9CA3AF] mb-1">Total Completed</p>
                <p className="text-xl font-extrabold text-[#111827]">{totalCompletedCount}</p>
              </div>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E293B" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#1E293B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                    ticks={chartTicks}
                    domain={[0, chartMax]}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="scheduled"
                    stroke="#489b82"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorScheduled)"
                    dot={{ r: 3, fill: '#489b82', strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#1f2937"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    dot={{ r: 3, fill: '#1f2937', strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B7280]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                Scheduled
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B7280]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1F2937]" />
                Completed
              </div>
            </div>
          </Card>

          {/* Finding Distribution Pie Chart */}
          <Card className="lg:col-span-5 border-none shadow-sm rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">Finding Distribution</h2>
                <p className="text-xs text-[#9CA3AF]">Audit non-conformances</p>
              </div>
              <button className="text-[#9CA3AF] hover:text-[#111827]">...</button>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={findingDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {findingDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          const { cx, cy } = viewBox as any;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                              <tspan x={cx} dy="-0.5em" className="fill-slate-400 text-[10px] font-semibold">Total</tspan>
                              <tspan x={cx} dy="1.4em" className="fill-[#111827] text-2xl font-black">{totalOfi + totalMinor + totalMajor}</tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-3 mt-6">
                {findingDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-[#6B7280]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-[#111827]">{item.value}</span>
                      <span className="text-[10px] font-bold text-[#9CA3AF] w-10 text-right">{item.percentage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

        </div>

        {/* Self Assessment & Gap Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Self Assessment Scores */}
          <Card className="border-none shadow-sm rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">Self Assessment Scores</h2>
                <p className="text-xs text-[#9CA3AF]">Score distribution across assessments</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-slate-300" />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
              <div className="h-[200px] w-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={saDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {saDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          const { cx, cy } = viewBox as any;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                              <tspan x={cx} dy="-0.5em" className="fill-slate-400 text-[10px] font-semibold">Total</tspan>
                              <tspan x={cx} dy="1.4em" className="fill-[#111827] text-2xl font-black">{totalSA}</tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-4 min-w-[200px]">
                {saDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-semibold text-[#6B7280]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-[#111827]">{item.value}</span>
                      <span className="text-xs font-medium text-[#9CA3AF] w-12 text-right">{item.percentage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Gap Analysis Scores */}
          <Card className="border-none shadow-sm rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">Gap Analysis Scores</h2>
                <p className="text-xs text-[#9CA3AF]">Compliance level distribution</p>
              </div>
              <Search className="w-5 h-5 text-slate-300" />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
              <div className="h-[200px] w-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gapDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {gapDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          const { cx, cy } = viewBox as any;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                              <tspan x={cx} dy="-0.5em" className="fill-slate-400 text-[10px] font-semibold">Total</tspan>
                              <tspan x={cx} dy="1.4em" className="fill-[#111827] text-2xl font-black">{totalGap}</tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-4 min-w-[200px]">
                {gapDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-semibold text-[#6B7280]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-[#111827]">{item.value}</span>
                      <span className="text-xs font-medium text-[#9CA3AF] w-12 text-right">{item.percentage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Full-Width Bar Chart Section */}
        {/* Bottom Row: Status Overview & Recent Audits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Audit Status Overview Bar Chart */}
          <Card className="lg:col-span-8 border-none shadow-sm rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">Audit Status Overview</h2>
                <p className="text-xs text-[#9CA3AF]">Monthly breakdown by status</p>
              </div>
              <button className="text-[#9CA3AF] hover:text-[#111827]">...</button>
            </div>

            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                    ticks={chartTicks}
                    domain={[0, chartMax]}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar
                    dataKey="scheduled"
                    name="Scheduled"
                    fill="#3BA082"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#757D8A"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
                <div className="w-3 h-3 rounded-full bg-[#3BA082]" />
                Scheduled
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280]">
                <div className="w-3 h-3 rounded-full bg-[#757D8A]" />
                Completed
              </div>
            </div>
          </Card>

          {/* Recent Audits List */}
          <Card className="lg:col-span-4 border-none shadow-sm rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">Recent Audits</h2>
                <p className="text-xs text-[#9CA3AF]">Latest created audit plans</p>
              </div>
              <button className="text-[#9CA3AF] hover:text-[#111827]">...</button>
            </div>

            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((plan, idx) => {
                  const progress = getProgress(plan);
                  const status = progress === 100 ? "Completed" : progress > 0 ? "In Progress" : "Planned";
                  const leadAuditorName = plan.leadAuditor
                    ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}`
                    : plan.leadAuditorEmail || "Unknown Auditor";

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#111827] line-clamp-1">{plan.auditName || plan.auditType}</h4>
                          <p className="text-[11px] font-medium text-[#9CA3AF]">{leadAuditorName}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`border-none px-2.5 py-1 text-[10px] font-bold rounded-full ${status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                          status === 'In Progress' ? 'bg-amber-50 text-amber-600' :
                            'bg-blue-50 text-blue-600'
                          }`}
                      >
                        {status}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                    <Clipboard className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-slate-400">No recent audits</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Onboarding Modals */}
      <Dialog open={showWelcome} onOpenChange={(open) => {
        if (!open && companies.length === 0) return;
        setShowWelcome(open);
      }}>
        <DialogContent 
          className="sm:max-w-md bg-white border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col"
          onPointerDownOutside={(e) => { if (companies.length === 0 || (companies.length > 0 && totalSites === 0)) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (companies.length === 0 || (companies.length > 0 && totalSites === 0)) e.preventDefault(); }}
        >
          <div className="flex-1 overflow-y-auto w-full">
          <div className="bg-[#213847] p-8 text-white flex flex-col items-center text-center space-y-4 relative">
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider h-7 px-2"
              onClick={() => {
                localStorage.removeItem('iaudit_onboarding_tour_completed');
                toast.success("Onboarding tour reset!");
                window.location.reload();
              }}
            >
              Reset Tour
            </Button>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Rocket className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Step {onboardingStep} of 6
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome to iAudit!</h2>
              <p className="text-slate-300 text-sm max-w-[280px]">
                {onboardingStep === 1 
                  ? "We're excited to help you streamline your compliance management journey."
                  : "Excellent! Your company is set up. Now let's define your operational structure."}
              </p>
            </div>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-4">
              {onboardingStep === 1 && (
                <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h4 className="font-black text-xl text-slate-900 tracking-tight whitespace-nowrap">Step 1: Create a Company</h4>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed px-1">
                      First you need to create a company by clicking the create company button.
                    </p>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h4 className="font-black text-xl text-slate-900 tracking-tight whitespace-nowrap">Step 2: Add Sites & Departments</h4>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed px-1">
                      Define your operational structure to track audits more effectively.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {onboardingStep === 2 && (
                <Button 
                  variant="outline"
                  className="w-1/3 h-12 text-slate-600 font-bold rounded-xl"
                  onClick={() => setOnboardingStep(1)}
                >
                  Back
                </Button>
              )}
              <Button 
                className={`${onboardingStep === 2 ? 'w-2/3' : 'w-full'} h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 group`}
                onClick={() => {
                  setShowWelcome(false);
                  if (onboardingStep === 1) {
                    setShowCreateCompany(true);
                  } else {
                    setShowCreateSite(true);
                  }
                }}
              >
                {onboardingStep === 1 ? "Set Up My Company" : "Set Up My Site"}
                <Sparkles className="ml-2 w-4 h-4 group-hover:rotate-12 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      <CompanyModal
        open={showCreateCompany}
        onClose={() => {
          setShowCreateCompany(false);
          if (companies.length === 0) {
            setShowWelcome(true);
          }
        }}
        mode="create"
        hideCancel={companies.length === 0}
        onSubmit={async (data) => {
          const success = await addCompany(data);
          if (success) {
            setShowCreateCompany(false);
            setOnboardingStep(2);
            setShowWelcome(true); // Go back to welcome modal as requested
            toast.success("Company created! Now let's add your first site.");
          }
        }}
      />

      <SiteModal
        open={showCreateSite}
        onClose={() => {
          setShowCreateSite(false);
          if (totalSites === 0) {
            setShowWelcome(true);
          }
        }}
        mode="create"
        onSubmit={async (data) => {
          console.log("[Onboarding] SiteModal onSubmit triggered", data);
          if (companies.length > 0) {
            console.log(`[Onboarding] Initiating Step 2 site creation for company: ${companies[0].id}`);
            const result = await addSite(companies[0].id, data);
            console.log("[Onboarding] Step 2 API response received:", result);
            
            if (result && result.success) {
              console.log("[Onboarding] Successfully created site, initiating direct navigation to Step 3...");
              setShowCreateSite(false);
              toast.success("Perfect! Your first site has been added.");
              
              // Direct navigation as requested, preserving the onboarding flag
              navigate("/users?onboarding=true");
            } else {
              const errorMessage = result?.error || "Failed to create site. Please try again.";
              console.error("[Onboarding] Step 2 failed:", errorMessage);
              toast.error(errorMessage);
              // Do NOT navigate or close modal on failure
            }
          } else {
            console.error("[Onboarding] No company found in store during site creation");
            toast.error("Company information missing. Please restart the setup.");
          }
        }}
      />
    </div>
  );
};

export default Index;
