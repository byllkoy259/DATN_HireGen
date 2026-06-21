import React, { useState, useEffect } from 'react';
import styles from './HRDashboard.module.css';
import HRLayout from '../../layouts/hr/HRLayout';
import type { NavSection } from '../../layouts/hr/HRLayout';
import axiosClient from '../../services/axiosClient';

/* ─── Types ─────────────────────────────────────────────────── */
interface PipelineRow {
    job: string;
    partner: string;
    matchPct: number;
    matchCount: number;
    interviews: number;
    status: JobStatus;
}

type JobStatus = 'open' | 'active' | 'closed' | 'draft' | 'pending' | 'expired';
type ApplicationBucket = 'pending' | 'reviewed' | 'hired' | 'rejected';
type ActivityType = 'apply' | 'ai' | 'job' | 'interview';

interface CompanySummary {
    id: string;
    name: string;
}

interface DashboardJob {
    id: string | number;
    company_id?: string;
    company_name?: string;
    title?: string;
    status?: string;
}

interface DashboardApplication {
    applicant_name?: string;
    applied_at?: string;
    final_match_score?: string | number | null;
    match_score?: string | number | null;
    status?: string;
}

interface DonutSegment {
    pct: number;
    color: string;
    label: string;
}

interface Activity {
    type: ActivityType;
    text: string;
    time: string;
    icon: string;
}

interface DashboardStats {
    jobs: number;
    candidates: number;
    newCvs: number;
    avgScore: number;
}

interface StatCardProps {
    icon: string;
    label: string;
    value: string;
    isHighlight?: boolean;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
    open:    { label: 'Đang mở',   cls: 'badgeGreen'  },
    active:  { label: 'Đang mở',   cls: 'badgeGreen'  },
    pending: { label: 'Chờ duyệt', cls: 'badgeAmber'  },
    draft:   { label: 'Nháp',      cls: 'badgeGray'   },
    closed:  { label: 'Đã đóng',   cls: 'badgeRed'    },
    expired: { label: 'Hết hạn',   cls: 'badgePurple' },
};

const normalizeJobStatus = (status?: string): JobStatus => {
    if (status === 'closed' || status === 'draft' || status === 'pending' || status === 'active') return status;
    if (status === 'expired') return 'expired';
    return 'open';
};

const normalizeApplicationBucket = (status?: string): ApplicationBucket => {
    if (status === 'hired' || status === 'accepted' || status === 'offered') return 'hired';
    if (status === 'rejected' || status === 'withdrawn') return 'rejected';
    if (status === 'reviewing' || status === 'processed' || status === 'shortlisted' || status === 'interviewing') return 'reviewed';
    return 'pending';
};

const getMatchScore = (application: DashboardApplication) =>
    parseFloat(String(application.final_match_score ?? application.match_score ?? 0)) || 0;

/* ─── Nav config: Dashboard là trang active ─────────────────── */
const NAV_SECTIONS: NavSection[] = [
    {
        title: 'TỔNG QUAN',
        items: [{ icon: 'grid_view', label: 'Dashboard', href: '/hr', isActive: true }],
    },
    {
        title: 'TUYỂN DỤNG',
        items: [
            { icon: 'work_outline',  label: 'Quản lý việc làm', href: '/hr/jobs' },
            { icon: 'person_search', label: 'Ứng viên',         href: '/hr/candidates' },
        ],
    },
    {
        title: 'CÔNG CỤ',
        items: [
            { icon: 'auto_awesome', label: 'AI Matching', href: '/hr/ai-matching' },
            { icon: 'bar_chart',    label: 'Báo cáo',    href: '/hr/reports' },
        ],
    },
    {
        title: 'CÀI ĐẶT',
        items: [
            { icon: 'domain',   label: 'Hồ sơ công ty', href: '/hr/companies' },
            { icon: 'settings', label: 'Cài đặt',       href: '/hr/settings' },
        ],
    },
];

/* ─── Sub-components ─────────────────────────────────────────── */
const DonutChart = ({ data, total }: { data: DonutSegment[]; total: number }) => {
    const r = 70, cx = 90, cy = 90;
    const circ = 2 * Math.PI * r;
    const slices = data.map((segment, index) => {
        const dash = (segment.pct / 100) * circ;
        const offset = data
            .slice(0, index)
            .reduce((sum, item) => sum + (item.pct / 100) * circ, 0);

        return { segment, dash, gap: circ - dash, offset };
    });

    return (
        <svg viewBox="0 0 180 180" className={styles.donutSvg}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f2f4f6" strokeWidth={20} />
            {slices.map(({ segment, dash, gap, offset }) => (
                <circle
                    key={segment.label} cx={cx} cy={cy} r={r} fill="none" stroke={segment.color}
                    strokeWidth={20} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 1s ease' }}
                />
            ))}
            <text x={cx} y={cy - 8}  textAnchor="middle" className={styles.donutNumber}>{total}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" className={styles.donutLabel}>TỔNG CV</text>
        </svg>
    );
};

const ActivityFeed = ({ activities }: { activities: Activity[] }) => {
    if (!activities || activities.length === 0)
        return <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Chưa có hoạt động nào.</div>;

    return (
        <div className={styles.activityFeed}>
            {activities.map((act, i) => (
                <div key={i} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${styles[`icon_${act.type}`]}`}>
                        <span className="material-symbols-outlined">{act.icon}</span>
                    </div>
                    <div className={styles.activityContent}>
                        <p className={styles.activityText}>{act.text}</p>
                        <p className={styles.activityTime}>{act.time}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const StatCard = ({ icon, label, value, isHighlight = false }: StatCardProps) => (
    <div className={`${styles.statCard} ${isHighlight ? styles.statCardHighlight : ''}`}>
        <div className={styles.statIconWrapper}>
            <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className={styles.statInfo}>
            <p className={styles.statValue}>{value}</p>
            <p className={styles.statLabel}>{label}</p>
        </div>
    </div>
);

/* ─── HRDashboard ────────────────────────────────────────────── */
const PAGE_SIZE = 7;

const HRDashboard: React.FC = () => {
    const [stats, setStats]               = useState<DashboardStats>({ jobs: 0, candidates: 0, newCvs: 0, avgScore: 0 });
    const [pipeline, setPipeline]         = useState<PipelineRow[]>([]);
    const [donutData, setDonutData]       = useState<DonutSegment[]>([]);
    const [activities, setActivities]     = useState<Activity[]>([]);
    const [pipelinePage, setPipelinePage] = useState(1);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const compRes = await axiosClient.get('/api/companies/me');
                const compList = (compRes.data || []) as CompanySummary[];
                const compMap: Record<string, string> = {};
                compList.forEach((c) => { compMap[String(c.id)] = c.name; });

                const jobsRes = await axiosClient.get('/api/jobs/me');
                const jobs = (jobsRes.data || []) as DashboardJob[];

                const allApps: DashboardApplication[] = [];
                const pipelineRows: PipelineRow[] = [];
                const statusCounts: Record<ApplicationBucket, number> = { pending: 0, reviewed: 0, hired: 0, rejected: 0 };
                const dynamicActivities: Activity[] = [];

                for (const job of jobs) {
                    try {
                        const appsRes = await axiosClient.get(`/api/hr/applications/job/${job.id}`);
                        const apps = (appsRes.data || []) as DashboardApplication[];
                        allApps.push(...apps);

                        const aiMatched    = apps.filter((a) => getMatchScore(a) >= 80).length;
                        const interviewing = apps.filter((a) => a.status === 'interviewing').length;

                        apps.forEach((a) => {
                            const score = getMatchScore(a);
                            dynamicActivities.push({
                                type: score >= 80 ? 'ai' : 'apply',
                                text: `${a.applicant_name || 'Một ứng viên'} đã nộp CV vào vị trí ${job.title || 'chưa có tiêu đề'}`,
                                time: new Date(a.applied_at || Date.now()).toLocaleDateString('vi-VN'),
                                icon: score >= 80 ? 'auto_awesome' : 'description',
                                timestamp: new Date(a.applied_at || Date.now()).getTime(),
                            } as any);
                            statusCounts[normalizeApplicationBucket(a.status)]++;
                        });

                        const partnerName = (job.company_id ? compMap[String(job.company_id)] : undefined) || job.company_name || 'Đối tác chưa cập nhật';

                        pipelineRows.push({
                            job:        job.title || 'Chưa có tiêu đề',
                            partner:    partnerName,
                            matchPct:   apps.length > 0 ? Math.round((aiMatched / apps.length) * 100) : 0,
                            matchCount: aiMatched,
                            interviews: interviewing,
                            status:     normalizeJobStatus(job.status),
                        });
                    } catch {
                        console.warn(`Không lấy được hồ sơ cho Job ${job.id}`);
                    }
                }

                const totalApps  = allApps.length;
                const totalScore = allApps.reduce((sum, a) => sum + getMatchScore(a), 0);
                const avgScore   = totalApps > 0 ? Math.round(totalScore / totalApps) : 0;
                const openJobs   = jobs.filter((job) => {
                    const status = normalizeJobStatus(job.status);
                    return status === 'open' || status === 'active';
                }).length;

                setStats({
                    jobs:       openJobs,
                    candidates: totalApps,
                    newCvs:     allApps.filter(a => new Date(a.applied_at || 0).toDateString() === new Date().toDateString()).length,
                    avgScore,
                });
                setPipeline(pipelineRows);
                setPipelinePage(1);
                
                dynamicActivities.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
                setActivities(dynamicActivities.slice(0, 5));

                const interviewCount = allApps.filter(a => a.status === 'interviewing').length;

                if (totalApps > 0) {
                    setDonutData([
                        { pct: Math.round((statusCounts.reviewed / totalApps) * 100) || 0, color: '#6366f1', label: 'Đã đánh giá' },
                        { pct: Math.round((interviewCount        / totalApps) * 100) || 0, color: '#f59e0b', label: 'Phỏng vấn'   },
                        { pct: Math.round((statusCounts.hired    / totalApps) * 100) || 0, color: '#10b981', label: 'Đã tuyển'    },
                    ]);
                }
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu dashboard:', error instanceof Error ? error.message : error);
                setStats({ jobs: 0, candidates: 0, newCvs: 0, avgScore: 0 });
                setPipeline([]);
                setDonutData([]);
                setActivities([]);
            }
        };

        fetchDashboardData();
    }, []);

    const totalPages = Math.ceil(pipeline.length / PAGE_SIZE);
    const pagedPipeline = pipeline.slice((pipelinePage - 1) * PAGE_SIZE, pipelinePage * PAGE_SIZE);

    return (
        <HRLayout
            navSections={NAV_SECTIONS}
            headerActions={
                <button className={styles.btnOutline}>Xuất báo cáo</button>
            }
        >
            <div className={styles.statGrid}>
                <StatCard icon="assignment"     label="TỔNG JOB ĐANG MỞ"    value={stats.jobs.toString()} />
                <StatCard icon="person_search"  label="TỔNG SỐ ỨNG VIÊN"    value={stats.candidates.toString()} />
                <StatCard icon="description"    label="CV MỚI TRONG NGÀY"    value={stats.newCvs.toString()} />
                <StatCard icon="psychology_alt" label="AVG MATCH SCORE (AI)" value={`${stats.avgScore}%`} isHighlight />
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.leftCol}>
                    <div className={styles.card} style={{ height: '100%' }}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Tiến độ tuyển dụng hiện tại</h2>
                            <span className={styles.pipelineTotal}>{pipeline.length} công việc</span>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Công việc / Đối tác</th>
                                        <th>AI Match &gt;80%</th>
                                        <th>Phỏng vấn</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedPipeline.length > 0 ? pagedPipeline.map((row, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div className={styles.jobName}>{row.job}</div>
                                                <div className={styles.jobPartner}>{row.partner}</div>
                                            </td>
                                            <td>
                                                <div className={styles.matchCell}>
                                                    <div className={styles.matchBar}>
                                                        <div className={styles.matchFill} style={{ width: `${row.matchPct}%` }} />
                                                    </div>
                                                    <span className={styles.matchNum}>{row.matchCount}</span>
                                                </div>
                                            </td>
                                            <td className={styles.interviewNum}>{row.interviews}</td>
                                            <td>
                                                <span className={`${styles.badge} ${styles[STATUS_META[row.status]?.cls || 'badgeGray']}`}>
                                                    {STATUS_META[row.status]?.label || 'Đang xử lý'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                                Chưa có dữ liệu.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Phân trang */}
                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    className={styles.pageBtn}
                                    disabled={pipelinePage === 1}
                                    onClick={() => setPipelinePage(p => p - 1)}
                                >
                                    Trước
                                </button>
                                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                                    <button
                                        key={page}
                                        className={`${styles.pageBtn} ${pipelinePage === page ? styles.pageBtnActive : ''}`}
                                        onClick={() => setPipelinePage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    className={styles.pageBtn}
                                    disabled={pipelinePage === totalPages}
                                    onClick={() => setPipelinePage(p => p + 1)}
                                >
                                    Sau
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Phân bổ Trạng thái CV</h2>
                        </div>
                        <div className={styles.donutContainer}>
                            {donutData.length > 0 ? (
                                <>
                                    <div className={styles.donutWrapper}>
                                        <DonutChart data={donutData} total={stats.candidates} />
                                    </div>
                                    <div className={styles.legendList}>
                                        {donutData.map((s) => (
                                            <div key={s.label} className={styles.legendRow}>
                                                <div className={styles.legendDot} style={{ background: s.color }} />
                                                <span className={styles.legendLabel}>{s.label}</span>
                                                <span className={styles.legendPct}>{s.pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', width: '100%' }}>
                                    Chưa có dữ liệu CV
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.card} style={{ flex: 1 }}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Hoạt động gần đây</h2>
                        </div>
                        <div className={styles.activityInner}>
                            <ActivityFeed activities={activities} />
                        </div>
                    </div>
                </div>
            </div>
        </HRLayout>
    );
};

export default HRDashboard;
