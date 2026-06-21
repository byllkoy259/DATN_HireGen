import React, { useState, useEffect, useRef } from 'react';
import { Badge, Dropdown, Modal, Empty, message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../services/axiosClient';
import styles from './NotificationBell.module.css';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    notification_type?: string;
    action_url?: string;
}

const NotificationBell: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

    const pollingIntervalRef = useRef<number | null>(null);

    const fetchNotifications = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await axiosClient.get('/api/notifications', {
                params: { limit: 20, offset: 0 }
            });
            const data: Notification[] = res.data;
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchNotifications(false); // don't show spinner for initial background fetch

        // Polling every 30 seconds
        pollingIntervalRef.current = setInterval(() => {
            fetchNotifications(false);
        }, 30000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    const handleMarkAsRead = async (id: string, action_url?: string) => {
        const notif = notifications.find(n => n.id === id);
        if (!notif) return;

        // Optimistic update
        let isSuccess = true;
        if (!notif.is_read) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            try {
                await axiosClient.put(`/api/notifications/${id}/read`);
            } catch (error) {
                // Rollback
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
                setUnreadCount(prev => prev + 1);
                message.error('Không thể đánh dấu đã đọc. Vui lòng thử lại.');
                isSuccess = false;
            }
        }

        if (isSuccess) {
            if (action_url) {
                setIsOpen(false);
                navigate(action_url);
            } else {
                setSelectedNotif(notif);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;

        const previousNotifications = [...notifications];
        const previousUnreadCount = unreadCount;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            await axiosClient.put('/api/notifications/read-all');
        } catch (error) {
            // Rollback
            setNotifications(previousNotifications);
            setUnreadCount(previousUnreadCount);
            message.error('Có lỗi xảy ra khi đánh dấu tất cả đã đọc.');
        }
    };

    const dropdownOverlay = (
        <div className={styles.dropdownOverlay}>
            <div className={styles.dropdownHeader}>
                <h3 className={styles.dropdownTitle}>Thông báo</h3>
                {unreadCount > 0 && (
                    <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                        Đánh dấu tất cả đã đọc
                    </button>
                )}
            </div>

            <div className={styles.notificationList}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin size="small" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Empty description="Không có thông báo nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ''}`}
                            onClick={() => handleMarkAsRead(notif.id, notif.action_url)}
                        >
                            <div className={styles.itemHeader}>
                                <h4 className={styles.itemTitle}>{notif.title}</h4>
                                {!notif.is_read && <span className={styles.unreadDot} />}
                            </div>
                            <p className={styles.itemMessage}>
                                {notif.message.replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00:00)/, (match: string) => {
                                    const d = new Date(match);
                                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                                })}
                            </p>
                            <p className={styles.itemTime}>
                                {formatDistanceToNow(new Date(notif.created_at + 'Z'), { addSuffix: true, locale: vi })}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className={styles.dropdownFooter}>
                    {/* Placeholder for View All page */}
                    <button className={styles.viewAllBtn} onClick={() => { setIsOpen(false); /* navigate('/notifications') */ }}>
                        Xem tất cả
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <>
            <Dropdown
                popupRender={() => dropdownOverlay}
                trigger={['click']}
                placement="bottomRight"
                open={isOpen}
                onOpenChange={setIsOpen}
            >
                <button className={styles.bellContainer}>
                    <Badge count={unreadCount} overflowCount={99} size="small">
                        <span className={`material-symbols-outlined ${styles.bellIcon}`}>notifications</span>
                    </Badge>
                </button>
            </Dropdown>

            <Modal
                title={selectedNotif?.title}
                open={!!selectedNotif}
                onCancel={() => setSelectedNotif(null)}
                footer={null}
                centered
            >
                {selectedNotif && (
                    <div>
                        <div className={styles.modalTime}>
                            {new Date(selectedNotif.created_at + 'Z').toLocaleString('vi-VN')}
                        </div>
                        <div className={styles.modalMessage}>
                            {selectedNotif.message.replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00:00)/, (match: string) => {
                                const d = new Date(match);
                                return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                            })}
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default NotificationBell;
