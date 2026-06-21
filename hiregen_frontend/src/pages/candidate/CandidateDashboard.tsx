import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import styles from './CandidateDashboard.module.css';
import CandidateLayout from '../../layouts/candidate/CandidateLayout';
import axiosClient from '../../services/axiosClient';

/* ─── Types ──────────────────────────────────────────────────── */
type AppStage = 'pending' | 'reviewing' | 'shortlisted' | 'interviewing' | 'rejected' | 'hired';

interface Application {
    id: string;
    job_title: string;
    company: string;
    companyInitials: string;
    companyColor: string;
    logo_url?: string;
    location: string;
    stage: AppStage;
    applied_at: string;
    icon: string;
}

interface JobSuggest {
    id: string;
    title: string;
    company: string;
    companyInitials: string;
    companyColor: string;
    logo_url?: string;
    location: string;
    tags: string[];
    salary: string;
    badge?: 'new' | 'hot';
    icon: string;
}

/* ─── Stage config ───────────────────────────────────────────── */
const STAGE_META: Record<AppStage, { label: string; cls: string; icon: string }> = {
    pending:      { label: 'Mới nộp',              cls: 'stageNew',       icon: 'send' },
    reviewing:    { label: 'Đang đánh giá',        cls: 'stageReview',    icon: 'visibility' },
    shortlisted:  { label: 'Đạt sơ tuyển',         cls: 'stageReview',    icon: 'verified' },
    interviewing: { label: 'Hẹn phỏng vấn',        cls: 'stageInterview', icon: 'event' },
    rejected:     { label: 'Từ chối',              cls: 'stageRejected',  icon: 'close' },
    hired:        { label: 'Đã tuyển',             cls: 'stageOffer',     icon: 'celebration' },
};

const normalizeStage = (status?: string): AppStage => {
    if (status === 'interviewing') return 'interviewing';
    if (status === 'rejected' || status === 'withdrawn') return 'rejected';
    if (status === 'hired' || status === 'accepted' || status === 'offered') return 'hired';
    if (status === 'shortlisted') return 'shortlisted';
    if (status === 'reviewing' || status === 'processed') return 'reviewing';
    return 'pending';
};

/* ═══════════════════════════════════════════════════════════════
   CandidateDashboard
═══════════════════════════════════════════════════════════════ */
const CandidateDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [userName,    setUserName]    = useState('');
    const [applications,setApplications]= useState<Application[]>([]);
    const [jobs,        setJobs]        = useState<JobSuggest[]>([]);
    const [notifs, setNotifs]             = useState<any[]>([]);
    const [interviews, setInterviews]     = useState<any[]>([]);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
    const [stats,       setStats]       = useState({ applied: 0, views: 0, interviews: 0, saved: 0 });
    const [loading,     setLoading]     = useState(true);

    const newNotifCount = notifs.filter(n => n.unread).length;

    /* Greeting */
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const meRes = await axiosClient.get('/api/auth/me');
                let appsRes = { data: [] };
                
                try { 
                    const res = await axiosClient.get('/api/candidate/applications');
                    
                    appsRes.data = res.data.map((app: any) => {
                        const compName = app.job?.company?.name || 'Company';
                        const initial = compName.charAt(0).toUpperCase();

                        return {
                            id: app.id,
                            job_title: app.job?.title,
                            company: compName,
                            companyInitial: initial,
                            companyColor: '#1e4067',
                            logo_url: app.job?.company?.logo_url || app.job?.logo_url || '',
                            location: app.job?.location,
                            stage: normalizeStage(app.status),
                            applied_at: new Date(app.applied_at).toLocaleDateString('vi-VN'),
                            icon: 'work'
                        };
                    });
                } catch (e) { 
                    console.warn('applications API not implemented yet', e); 
                }

                let notifsRes: any = { data: [] };
                try { 
                    notifsRes = await axiosClient.get('/api/notifications'); 
                } catch (e) { 
                    console.warn('notifications API not implemented yet'); 
                }

                let interviewsRes = { data: [] };
                try {
                    interviewsRes = await axiosClient.get('/api/interviews/candidate/me');
                } catch (e) {
                    console.warn('interviews API error', e);
                }

                let name = meRes.data.full_name || '';
                setUserName(name);
                
                const apps = appsRes.data || [];
                setApplications(apps.length > 0 ? apps : []);
                
                const fetchedInterviews = interviewsRes.data || [];
                setInterviews(fetchedInterviews);

                setStats({
                    applied:    apps.length || 0,
                    views:      0,
                    interviews: fetchedInterviews.length || apps.filter((a: any) => a.stage === 'interviewing').length || 0,
                    saved:      0,
                });
                
                const formatOldMsg = (msg: string) => {
                    return msg.replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00:00)/, (match: string) => {
                        const d = new Date(match);
                        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                    });
                };

                if (notifsRes.data?.items) {
                    setNotifs(notifsRes.data.items.map((n: any) => ({
                        id: n.id,
                        unread: !n.is_read,
                        text: formatOldMsg(n.message),
                        time: new Date(n.created_at + 'Z').toLocaleString('vi-VN'),
                        iconBg: '#eff6ff',
                        icon: 'notifications',
                        title: n.title
                    })));
                } else if (Array.isArray(notifsRes.data)) {
                    setNotifs(notifsRes.data.map((n: any) => ({
                        id: n.id,
                        unread: !n.is_read,
                        text: formatOldMsg(n.message),
                        time: new Date(n.created_at + 'Z').toLocaleString('vi-VN'),
                        iconBg: '#eff6ff',
                        icon: 'notifications',
                        title: n.title
                    })));
                } else {
                    setNotifs([]);
                }

            } catch {
                const token = localStorage.getItem('access_token');
                if (token) {
                    try {
                        const p = JSON.parse(atob(token.split('.')[1]));
                        let n = p.full_name || '';
                        setUserName(n);
                    } catch {}
                } else {
                    setUserName('Bạn');
                }
                setApplications([]);
                setStats({ applied: 0, views: 0, interviews: 0, saved: 0 });
                setNotifs([]);
            } finally {
                setJobs([]);

                setLoading(false);
            }
        };

        load();
    }, []);

    /* ── Upcoming interview (first one in future, or latest) */
    const nextInterviewRaw = interviews.length > 0 ? interviews[0] : null;
    let nextInterview: any = null;
    if (nextInterviewRaw) {
        const relatedApp = applications.find(a => a.id === nextInterviewRaw.application_id);
        nextInterview = {
            ...nextInterviewRaw,
            job_title: relatedApp ? relatedApp.job_title : `Vị trí ID: ${nextInterviewRaw.application_id.substring(0, 8)}`,
            company: relatedApp ? relatedApp.company : 'Công ty'
        };
    }
    let interviewFormat = nextInterview?.meeting_link ? 'Online' : 'Trực tiếp';
    let interviewLocation = '';
    let interviewNotes = nextInterview?.notes || '';

    if (nextInterview?.notes?.includes('Hình thức:')) {
        interviewFormat = nextInterview.notes.match(/Hình thức: (.*?)(?:\n|$)/)?.[1] || interviewFormat;
        interviewLocation = nextInterview.notes.match(/Địa điểm: (.*?)(?:\n|$)/)?.[1] || '';
        const notesMatch = nextInterview.notes.match(/Ghi chú: ([\s\S]*)$/);
        interviewNotes = notesMatch ? notesMatch[1] : '';
    }

    /* ── Render ─────────────────────────────────────────────── */
    return (
        <CandidateLayout 
            pageTitle={<>{greeting}, {userName}</>}
            pageSubtitle={
                <>
                    {new Intl.DateTimeFormat('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).format(new Date())}
                    {newNotifCount > 0 && (
                        <> · Bạn có <strong className={styles.notifHighlight}>{newNotifCount} thông báo mới</strong> từ nhà tuyển dụng</>
                    )}
                </>
            }
        >

            {loading ? (
                <div className={styles.loadingState}>
                    <div className={styles.loadingDots}><span /><span /><span /></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : (
                <>
                    {/* ── Row 1: Stat Cards ──────────────────── */}
                    <div className={styles.statGrid}>
                        <div className={styles.statCard} onClick={() => navigate('/candidate/applications')}>
                            <div className={styles.statIconWrapper}>
                                <span className="material-symbols-outlined">assignment</span>
                            </div>
                            <div className={styles.statInfo}>
                                <p className={styles.statValue}>{stats.applied}</p>
                                <p className={styles.statLabel}>ĐƠN ĐÃ NỘP</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIconWrapper}>
                                <span className="material-symbols-outlined">visibility</span>
                            </div>
                            <div className={styles.statInfo}>
                                <p className={styles.statValue}>{stats.views}</p>
                                <p className={styles.statLabel}>LƯỢT HR XEM HỒ SƠ</p>
                            </div>
                        </div>
                        <div className={`${styles.statCard} ${styles.statCardHighlight}`} onClick={() => nextInterview && navigate('/candidate/applications')}>
                            <div className={styles.statIconWrapper}>
                                <span className="material-symbols-outlined">event</span>
                            </div>
                            <div className={styles.statInfo}>
                                <p className={styles.statValue}>{stats.interviews}</p>
                                <p className={styles.statLabel}>PHỎNG VẤN SẮP TỚI</p>
                            </div>
                        </div>
                        <div className={styles.statCard} onClick={() => navigate('/candidate/saved')}>
                            <div className={styles.statIconWrapper}>
                                <span className="material-symbols-outlined">favorite</span>
                            </div>
                            <div className={styles.statInfo}>
                                <p className={styles.statValue}>{stats.saved}</p>
                                <p className={styles.statLabel}>VIỆC ĐÃ LƯU</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Row 2: Applications + Interview/Deadlines */}
                    <div className={styles.row2}>

                        {/* Applications list */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, marginRight: 6 }}>drafts</span> Đơn ứng tuyển của tôi
                                </h3>
                                <button className={styles.btnGhost} onClick={() => navigate('/candidate/applications')}>
                                    Xem tất cả →
                                </button>
                            </div>
                            <div className={styles.cardBody}>
                                {applications.slice(0, 4).map(app => {
                                    const sm = STAGE_META[app.stage];
                                    return (
                                        <div key={app.id} className={styles.appItem}>
                                            <div className={styles.appLogo}>
                                                {app.logo_url ? (
                                                    <img 
                                                        src={app.logo_url} 
                                                        alt={app.company} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', background: app.companyColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                        {app.companyInitials}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.appInfo}>
                                                <p className={styles.appTitle}>{app.job_title}</p>
                                                <p className={styles.appCompany}>{app.company} · {app.location}</p>
                                                <div className={styles.appMeta}>
                                                    <span className={`${styles.stage} ${styles[sm.cls]}`}>
                                                        <span className="material-symbols-outlined">{sm.icon}</span>
                                                        {app.stage === 'interviewing' ? 'Phỏng vấn 27/03' : sm.label}
                                                    </span>
                                                    <span className={styles.appDate}>Nộp {app.applied_at}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Interview card + Deadlines */}
                        <div className={styles.rightStack}>

                            {/* Upcoming interview */}
                            {nextInterview ? (
                                <div className={styles.interviewCard}>
                                    <p className={styles.intLabel}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 4 }}>event</span>
                                        Phỏng vấn sắp tới
                                    </p>
                                    <p className={styles.intTitle}>{nextInterview.job_title}</p>
                                    <p className={styles.intCo}>{nextInterview.company} · {interviewFormat}</p>
                                    <p className={styles.intTime}>{new Date(nextInterview.scheduled_time + 'Z').toLocaleTimeString('vi-VN')} - {new Date(nextInterview.scheduled_time + 'Z').toLocaleDateString('vi-VN')}</p>
                                    <p className={styles.intTz}>Giờ địa phương</p>
                                    <div className={styles.intActions}>
                                        <button className={styles.btnIntGhost} onClick={() => navigate('/candidate/applications')}>Xem Đơn</button>
                                        <button className={styles.btnIntWhite} onClick={() => setIsInterviewModalOpen(true)}>Chi tiết</button>
                                    </div>
                                    
                                    <Modal
                                        title="Chi tiết lịch phỏng vấn"
                                        open={isInterviewModalOpen}
                                        onCancel={() => setIsInterviewModalOpen(false)}
                                        footer={null}
                                        centered
                                    >
                                        <div style={{ padding: '10px 0' }}>
                                            <p style={{ marginBottom: 10 }}><strong>Thời gian:</strong> {new Date(nextInterview.scheduled_time + 'Z').toLocaleTimeString('vi-VN')} - {new Date(nextInterview.scheduled_time + 'Z').toLocaleDateString('vi-VN')}</p>
                                            <p style={{ marginBottom: 10 }}><strong>Hình thức:</strong> {interviewFormat}</p>
                                            <p style={{ marginBottom: 10 }}>
                                                <strong>Địa điểm & liên kết:</strong>{' '}
                                                {interviewLocation && <span>{interviewLocation}</span>}
                                                {interviewLocation && nextInterview.meeting_link && <span> | </span>}
                                                {nextInterview.meeting_link && <a href={nextInterview.meeting_link} target="_blank" rel="noreferrer">{nextInterview.meeting_link}</a>}
                                                {!interviewLocation && !nextInterview.meeting_link && 'Chưa cập nhật'}
                                            </p>
                                            <p style={{ marginBottom: 10 }}><strong>Ghi chú:</strong> <span style={{ whiteSpace: 'pre-line' }}>{interviewNotes || 'Không có'}</span></p>
                                        </div>
                                    </Modal>
                                </div>
                            ) : (
                                <div className={styles.noInterviewCard}>
                                    <span className="material-symbols-outlined">event_busy</span>
                                    <p>Chưa có lịch phỏng vấn</p>
                                    <button className={styles.btnSmall} onClick={() => navigate('/candidate/jobs')}>
                                        Tìm việc ngay →
                                    </button>
                                </div>
                            )}

                            {/* Notifications */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader} style={{ padding: '12px 16px' }}>
                                    <h3 className={styles.cardTitle} style={{ fontSize: 13 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 6 }}>notifications</span> Thông báo
                                    </h3>
                                    {newNotifCount > 0 && (
                                        <span className={styles.notifCountBadge}>{newNotifCount} mới</span>
                                    )}
                                </div>
                                <div className={styles.notifList}>
                                    {notifs.map(n => (
                                        <div key={n.id} className={`${styles.notifItem} ${n.unread ? styles.notifUnreadItem : ''}`}>
                                            <div className={styles.notifIcon} style={{ background: n.iconBg }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{n.icon}</span>
                                            </div>
                                            <div className={styles.notifBody}>
                                                <p className={styles.notifText}>{n.text}</p>
                                                <p className={styles.notifTime}>{n.time}</p>
                                            </div>
                                            {n.unread && <div className={styles.unreadDot} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Row 3: Job Suggestions + Notifications */}
                    <div className={styles.row3}>

                        {/* Job suggestions */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, marginRight: 6 }}>auto_awesome</span> Việc làm có thể bạn quan tâm
                                </h3>
                                <button className={styles.btnGhost} onClick={() => navigate('/candidate/jobs')}>
                                    Xem tất cả →
                                </button>
                            </div>
                            <div className={styles.jobGrid}>
                                {jobs.map(job => (
                                    <div key={job.id} className={styles.jobCard} onClick={() => navigate('/candidate/jobs')}>
                                        <div className={styles.jobCardTop}>
                                            <div className={styles.jobLogo}>
                                                <span className="material-symbols-outlined">{job.icon}</span>
                                            </div>
                                            {job.badge === 'hot' && <span className={styles.badgeHot}>HOT</span>}
                                            {job.badge === 'new' && <span className={styles.badgeNew}>Mới</span>}
                                        </div>
                                        <p className={styles.jobTitle}>{job.title}</p>
                                        <p className={styles.jobCompany}>{job.company} · {job.location}</p>
                                        <div className={styles.jobTags}>
                                            {job.tags.map(t => <span key={t} className={styles.jobTag}>{t}</span>)}
                                        </div>
                                        <p className={styles.jobSalary}>{job.salary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>
                </>
            )}
        </CandidateLayout>
    );
};

export default CandidateDashboard;
