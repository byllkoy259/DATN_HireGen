import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DatePicker, TimePicker, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import styles from './HRScheduleInterview.module.css';
import HRLayout from '../../layouts/hr/HRLayout';
import type { NavSection } from '../../layouts/hr/HRLayout';
import axiosClient from '../../services/axiosClient';

/* ─── Nav ─────────────────────────────────────────────────────── */
const NAV_SECTIONS: NavSection[] = [
    { title: 'TỔNG QUAN', items: [{ icon: 'grid_view', label: 'Dashboard', href: '/hr' }] },
    {
        title: 'TUYỂN DỤNG',
        items: [
            { icon: 'work_outline',  label: 'Quản lý việc làm', href: '/hr/jobs' },
            { icon: 'person_search', label: 'Ứng viên', href: '/hr/candidates', isActive: true },
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

type InterviewFormat = 'online' | 'offline' | 'hybrid';

interface LocationState {
    application_id: string;
    applicant_name: string;
    job_title:      string;
    partner_name:   string;
    location:       string;
    match_score:    number;
    avatar_color:   string;
    initials:       string;
}

/* ─── Score color helper ─────────────────────────────────────── */
const matchColor = (s: number) => s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626';

/* ═══════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════ */
const HRScheduleInterview: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate  = useNavigate();
    const location  = useLocation();
    const state     = (location.state as LocationState) || {};

    /* ── Form state ── */
    const [interviewDate, setInterviewDate] = useState<Dayjs | null>(null);
    const [interviewTime, setInterviewTime] = useState<Dayjs | null>(null);
    const [format, setFormat]               = useState<InterviewFormat>('online');
    const [location_, setLocation_]         = useState('');
    const [meetingLink, setMeetingLink]     = useState('');
    const [notes, setNotes]                 = useState('');
    const [submitting, setSubmitting]       = useState(false);

    const isOnline  = format === 'online'  || format === 'hybrid';
    const isOffline = format === 'offline' || format === 'hybrid';

    /* ── Preview: combine date + time → datetime string ── */
    const previewDateTime = (() => {
        if (!interviewDate) return null;
        const d = interviewDate.clone();
        if (interviewTime) {
            return d.hour(interviewTime.hour()).minute(interviewTime.minute()).second(0);
        }
        return d.startOf('day');
    })();

    /* ── Submit ── */
    const handleConfirm = async () => {
        if (!interviewDate) {
            message.error('Vui lòng chọn ngày phỏng vấn!');
            return;
        }
        if (!interviewTime) {
            message.error('Vui lòng chọn giờ phỏng vấn!');
            return;
        }
        if (isOffline && !location_.trim()) {
            message.error('Vui lòng nhập địa điểm phỏng vấn!');
            return;
        }
        if (isOnline && !meetingLink.trim()) {
            message.error('Vui lòng nhập link cuộc họp cho hình thức Online/Hybrid!');
            return;
        }

        const scheduledTime = previewDateTime!.toISOString();

        // Build notes with format info
        const fullNotes = [
            `Hình thức: ${format === 'online' ? 'Online' : format === 'offline' ? 'Offline' : 'Hybrid'}`,
            isOffline && location_ ? `Địa điểm: ${location_}` : null,
            notes ? `Ghi chú: ${notes}` : null,
        ].filter(Boolean).join('\n');

        setSubmitting(true);
        try {
            await axiosClient.post('/api/interviews/', {
                application_id: state.application_id,
                scheduled_time: scheduledTime,
                meeting_link:   isOnline ? meetingLink || null : null,
                notes:          fullNotes || null,
            });
            message.success('Đã lên lịch phỏng vấn thành công! Ứng viên sẽ nhận được thông báo.');
            navigate('/hr/candidates');
        } catch (err: any) {
            message.error(err?.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại!');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => {
        navigate(`/hr/candidates/${id}`);
    };

    /* ─── Derived preview text ─── */
    const formatLabel = format === 'online' ? 'Phỏng vấn Online' : format === 'offline' ? 'Phỏng vấn Offline' : 'Phỏng vấn Hybrid';
    const previewDateText = previewDateTime
        ? `${previewDateTime.format('HH:mm')} · ${previewDateTime.format('DD/MM/YYYY')}`
        : 'Chưa chọn thời gian';

    return (
        <HRLayout
            navSections={NAV_SECTIONS}
            pageTitle="Lên lịch phỏng vấn"
            pageSubtitle={state.applicant_name ? `${state.applicant_name} · ${state.job_title}` : ''}
        >
            {/* ── Breadcrumb ── */}
            <div className={styles.breadcrumb}>
                <button className={styles.breadcrumbBack} onClick={() => navigate('/hr/candidates')} type="button">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Ứng viên
                </button>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#c4c6d1' }}>chevron_right</span>
                <button className={styles.breadcrumbBack} onClick={handleBack} type="button">
                    {state.applicant_name || 'Chi tiết ứng viên'}
                </button>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#c4c6d1' }}>chevron_right</span>
                <span className={styles.breadcrumbCurrent}>Lên lịch phỏng vấn</span>
            </div>

            <div className={styles.pageGrid}>
                {/* ══ LEFT: Candidate summary card ══ */}
                <div className={styles.summaryCol}>
                    <div className={styles.candidateCard}>
                        <div
                            className={styles.avatar}
                            style={{ background: state.avatar_color || '#1e4076' }}
                        >
                            {state.initials || '?'}
                        </div>
                        <h2 className={styles.candidateName}>{state.applicant_name || 'Ứng viên'}</h2>
                        <p className={styles.jobInfo}>{state.job_title}</p>
                        <p className={styles.partnerInfo}>
                            {state.partner_name}
                            <span className={styles.dot2}>·</span>
                            {state.location}
                        </p>

                        {typeof state.match_score === 'number' && (
                            <div className={styles.scoreRow}>
                                <div
                                    className={styles.scoreBadge}
                                    style={{ color: matchColor(state.match_score), borderColor: matchColor(state.match_score) }}
                                >
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                    {Math.round(state.match_score)}% Match
                                </div>
                            </div>
                        )}

                        <div className={styles.divider} />

                        <p className={styles.inviteNote}>
                            <span className="material-symbols-outlined">info</span>
                            Sau khi xác nhận, ứng viên sẽ nhận được thông báo về lịch phỏng vấn qua hệ thống.
                        </p>
                    </div>

                    {/* ── Preview card ── */}
                    <div className={styles.previewCard}>
                        <div className={styles.previewHeader}>
                            <span className="material-symbols-outlined">event</span>
                            <span>Xem trước lịch hẹn</span>
                        </div>
                        <div className={styles.previewBody}>
                            <div className={styles.previewRow}>
                                <span className="material-symbols-outlined">schedule</span>
                                <div>
                                    <p className={styles.previewLabel}>Thời gian</p>
                                    <p className={styles.previewValue}>{previewDateText}</p>
                                </div>
                            </div>
                            <div className={styles.previewRow}>
                                <span className="material-symbols-outlined">
                                    {format === 'online' ? 'videocam' : format === 'offline' ? 'location_on' : 'sync_alt'}
                                </span>
                                <div>
                                    <p className={styles.previewLabel}>Hình thức</p>
                                    <p className={styles.previewValue}>{formatLabel}</p>
                                </div>
                            </div>
                            {isOffline && location_ && (
                                <div className={styles.previewRow}>
                                    <span className="material-symbols-outlined">map</span>
                                    <div>
                                        <p className={styles.previewLabel}>Địa điểm</p>
                                        <p className={styles.previewValue}>{location_}</p>
                                    </div>
                                </div>
                            )}
                            {isOnline && meetingLink && (
                                <div className={styles.previewRow}>
                                    <span className="material-symbols-outlined">link</span>
                                    <div>
                                        <p className={styles.previewLabel}>Link họp</p>
                                        <p className={styles.previewValueLink}>{meetingLink}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT: Schedule form ══ */}
                <div className={styles.formCol}>
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <span className="material-symbols-outlined">calendar_add_on</span>
                            <div>
                                <h3 className={styles.formTitle}>Thiết lập lịch phỏng vấn</h3>
                                <p className={styles.formSubtitle}>Điền đầy đủ thông tin để gửi lời mời đến ứng viên</p>
                            </div>
                        </div>

                        {/* ── Step 1: Date & Time ── */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <div className={styles.stepDot}>1</div>
                                <span>Thời gian phỏng vấn</span>
                            </div>
                            <div className={styles.dateTimeRow}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Ngày phỏng vấn <span className={styles.required}>*</span>
                                    </label>
                                    <DatePicker
                                        className={styles.antPicker}
                                        format="DD/MM/YYYY"
                                        placeholder="Chọn ngày"
                                        disabledDate={(d) => d && d < dayjs().startOf('day')}
                                        value={interviewDate}
                                        onChange={(val) => setInterviewDate(val)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Giờ bắt đầu <span className={styles.required}>*</span>
                                    </label>
                                    <TimePicker
                                        className={styles.antPicker}
                                        format="HH:mm"
                                        placeholder="Chọn giờ"
                                        minuteStep={15}
                                        value={interviewTime}
                                        onChange={(val) => setInterviewTime(val)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Step 2: Format ── */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <div className={styles.stepDot}>2</div>
                                <span>Hình thức phỏng vấn</span>
                            </div>
                            <div className={styles.formatGrid}>
                                {[
                                    { key: 'online',  icon: 'videocam',    label: 'Online',  sub: 'Google Meet / Zoom' },
                                    { key: 'offline', icon: 'location_on', label: 'Offline', sub: 'Gặp trực tiếp tại văn phòng' },
                                    { key: 'hybrid',  icon: 'sync_alt',    label: 'Hybrid',  sub: 'Kết hợp cả hai hình thức' },
                                ].map(opt => (
                                    <button
                                        key={opt.key}
                                        className={`${styles.formatBtn} ${format === opt.key ? styles.formatBtnActive : ''}`}
                                        onClick={() => setFormat(opt.key as InterviewFormat)}
                                        type="button"
                                    >
                                        <span className={`material-symbols-outlined ${styles.formatIcon}`}>{opt.icon}</span>
                                        <span className={styles.formatLabel}>{opt.label}</span>
                                        <span className={styles.formatSub}>{opt.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Step 3: Location / Link ── */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <div className={styles.stepDot}>3</div>
                                <span>Địa điểm &amp; Liên kết</span>
                            </div>

                            {isOffline && (
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Địa điểm phỏng vấn
                                        {isOffline && <span className={styles.required}> *</span>}
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <span className="material-symbols-outlined">location_on</span>
                                        <input
                                            className={styles.textInput}
                                            placeholder="VD: Tầng 12, Tòa nhà ABC, 123 Lê Lợi, Q.1, TP.HCM"
                                            value={location_}
                                            onChange={e => setLocation_(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {isOnline && (
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>
                                        Link cuộc họp (Meet / Zoom)
                                        {isOnline && <span className={styles.required}> *</span>}
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <span className="material-symbols-outlined">link</span>
                                        <input
                                            className={styles.textInput}
                                            placeholder="https://meet.google.com/abc-defg-hij"
                                            value={meetingLink}
                                            onChange={e => setMeetingLink(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {!isOffline && !isOnline && (
                                <p className={styles.placeholder}>Chọn hình thức phỏng vấn ở bước 2 để điền thông tin</p>
                            )}
                        </div>

                        {/* ── Step 4: Notes ── */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                <div className={styles.stepDot}>4</div>
                                <span>Ghi chú</span>
                                <span className={styles.optional}>(Tùy chọn)</span>
                            </div>
                            <textarea
                                className={styles.textarea}
                                rows={3}
                                placeholder="VD: Chuẩn bị portfolio, mang CMND/CCCD, ăn mặc lịch sự..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* ── Actions ── */}
                        <div className={styles.actionBar}>
                            <button className={styles.btnBack} onClick={handleBack} type="button">
                                <span className="material-symbols-outlined">arrow_back</span>
                                Quay lại
                            </button>
                            <button
                                className={styles.btnConfirm}
                                onClick={handleConfirm}
                                disabled={submitting}
                                type="button"
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                {submitting ? 'Đang gửi lịch…' : 'Xác nhận lịch phỏng vấn'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </HRLayout>
    );
};

export default HRScheduleInterview;
