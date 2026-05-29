import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Header({ 
  unreadCount, 
  notifications, 
  handleMarkAsRead, 
  handleMarkAllAsRead, 
  formatDate 
}) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Back Action Controller */}
        <button className="back-btn" onClick={() => alert('Navigating back')}>
          <ArrowLeft size={16} /> Back
        </button>
        
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
        
        {/* Brand Logo Section */}
        <div className="logo-section">
          <div className="logo-icon">
            <FileText size={16} color="#fff" />
          </div>
          <span className="logo-text">AJAY BALAJI DOCUMENT HUB</span>
        </div>
      </div>

      <div className="header-actions">
        <NotificationBell 
          unreadCount={unreadCount}
          notifications={notifications}
          handleMarkAsRead={handleMarkAsRead}
          handleMarkAllAsRead={handleMarkAllAsRead}
          formatDate={formatDate}
        />
      </div>
    </header>
  );
}
