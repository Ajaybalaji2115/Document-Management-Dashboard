import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NotificationBell({ 
  unreadCount, 
  notifications, 
  handleMarkAsRead, 
  handleMarkAllAsRead, 
  formatDate 
}) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderNotifIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={14} />;
      case 'error':
        return <AlertCircle size={14} />;
      default:
        return <Bell size={14} />;
    }
  };

  return (
    <div className="bell-container" ref={dropdownRef}>
      <button 
        className="btn-icon bell-trigger" 
        onClick={() => setIsNotifOpen(!isNotifOpen)}
        title="Notifications"
      >
        <Bell size={20} style={{ color: 'var(--color-text-secondary)' }} />
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </button>

      {isNotifOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>System Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={28} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.8rem' }}>Your notification inbox is clean</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                >
                  <div className="notif-icon-wrapper">
                    <div className={`notif-icon ${notif.type}`}>
                      {renderNotifIcon(notif.type)}
                    </div>
                  </div>
                  <div className="notif-content">
                    <p className="notif-message">{notif.message}</p>
                    <span className="notif-time">{formatDate(notif.timestamp)}</span>
                  </div>
                  {!notif.read && (
                    <button 
                      className="btn-icon notif-read-action"
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="Mark as read"
                    >
                      <CheckCircle2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
