import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  Bell, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  X,
  File,
  Loader
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';
const WS_URL = 'ws://localhost:8080/ws';

export default function App() {
  // Document and Notification States
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // UI Panels toggles
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);
  
  // Upload and Toast states
  const [uploads, setUploads] = useState([]); // List of files currently uploading
  const [toasts, setToasts] = useState([]); // Real-time notification toast popups
  
  // Bulk upload tracking state
  const [bulkProcessing, setBulkProcessing] = useState(null); // { id: '...', total: X, completeCount: Y }

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- Utility: Format File Size ---
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // --- Utility: Format Date ---
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // --- Fetch Data from Spring Boot ---
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications`);
      setNotifications(response.data);
      // Count unread
      const unread = response.data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // --- WebSocket Connection ---
  useEffect(() => {
    let ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('Connected to real-time notification socket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);

        if (data.action === 'REFRESH') {
          // If refresh event, fetch latest notification read statuses
          fetchNotifications();
        } else if (data.id && data.message) {
          // If it's a notification object, prepend to list
          setNotifications(prev => [data, ...prev]);
          
          // Trigger a beautiful sliding toast alert
          const toastId = Math.random().toString(36).substr(2, 9);
          setToasts(prev => [...prev, { id: toastId, message: data.message, type: data.type, timestamp: data.timestamp }]);
          
          // Count unread
          setUnreadCount(prev => prev + 1);

          // Clear global banner if a bulk upload completes matching the message
          if (data.type === 'success' && data.message.includes('uploaded successfully')) {
            setBulkProcessing(null);
            fetchDocuments(); // Refresh libraries automatically
          }
        }
      } catch (e) {
        console.warn('Received standard text payload:', event.data);
      }
    };

    ws.onclose = () => {
      console.warn('Real-time connection closed. Reconnecting in 3s...');
      setTimeout(() => {
        // Simple automatic reconnection
        fetchNotifications();
      }, 3000);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [fetchDocuments, fetchNotifications]);

  // Initial Fetches
  useEffect(() => {
    fetchDocuments();
    fetchNotifications();
  }, [fetchDocuments, fetchNotifications]);

  // --- Dismiss Toast Helper ---
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // --- Handle Click Outside Notification Panel ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Put Request: Read Operations ---
  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/read-all`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // --- Handle Download ---
  const handleDownload = (doc) => {
    window.open(`${API_BASE_URL}/documents/download/${doc.id}`, '_blank');
  };

  // --- Core Upload Action (Axios Progress Tracking) ---
  const executeUpload = async (file, bulkGroupId, totalCount) => {
    const fileId = Math.random().toString(36).substr(2, 9);
    setUploads(prev => [...prev, { id: fileId, name: file.name, size: file.size, type: file.type || 'application/pdf', progress: 0, status: 'uploading' }]);
    const formData = new FormData();
    formData.append('file', file);
    if (bulkGroupId) {
      formData.append('totalCount', totalCount);
    }

    try {
      await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploads(prev => prev.map(item => 
            item.id === fileId ? { ...item, progress: percentCompleted } : item
          ));
        }
      });

      // Mark success
      setUploads(prev => prev.map(item => 
        item.id === fileId ? { ...item, progress: 100, status: 'complete' } : item
      ));

      // Refresh documents grid on individual complete
      if (!bulkGroupId) {
        fetchDocuments();
      }

    } catch (err) {
      console.error('Upload error for file ' + file.name, err);
      setUploads(prev => prev.map(item => 
        item.id === fileId ? { ...item, status: 'failed' } : item
      ));
    }
  };

  // --- File Select orchestrator ---
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    processFiles(selectedFiles);
  };

  const processFiles = (selectedFiles) => {
    const total = selectedFiles.length;
    
    // Only accept PDFs
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
    if (pdfFiles.length < total) {
      const toastId = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id: toastId, message: 'Only PDF files are supported.', type: 'error' }]);
      if (pdfFiles.length === 0) return;
    }

    if (pdfFiles.length > 3) {
      // SMART BULK UPLOAD MODE
      const bulkGroupId = Math.random().toString(36).substr(2, 9);
      const bulkToastId = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id: bulkToastId, message: `Upload in progress — processing ${pdfFiles.length} files in background.`, type: 'info' }]);
      setBulkProcessing({ id: bulkGroupId, total: pdfFiles.length });
      setIsProgressCollapsed(false); // Expanded and fully visible by default!
      
      pdfFiles.forEach(file => {
        executeUpload(file, bulkGroupId, pdfFiles.length);
      });
    } else {
      // STANDARD SINGLE / SMALL MULTI-UPLOAD
      setIsProgressCollapsed(false); // Expanded and fully visible by default!
      pdfFiles.forEach(file => {
        executeUpload(file, null, null);
      });
    }
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Drag and Drop Handlers ---
  const [isDragActive, setIsDragActive] = useState(false);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Helper for notification icons
  const renderNotifIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <FileText size={20} color="#fff" />
          </div>
          <span className="logo-text">AETHER DOCS</span>
        </div>

        <div className="header-actions">
          {/* Notification Bell Dropdown Panel */}
          <div className="bell-container" ref={dropdownRef}>
            <button 
              className="btn-icon bell-trigger" 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </button>

            {isNotifOpen && (
              <div className="notification-dropdown glass-panel">
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
                      <Bell size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                      <p style={{ fontSize: '0.85rem' }}>Your notification inbox is clean</p>
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
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="main-content">
        
        {/* LEFT COLUMN: UPLOAD AND PROGRESS PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* DRAG AND DROP ZONE */}
          <div className="upload-card glass-panel animate-slide-in">
            <div>
              <h2 className="upload-card-title">Upload Documents</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Securely upload company PDF policies and tracking details
              </p>
            </div>

            <div 
              className={`drag-zone ${isDragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <div className="drag-zone-icon">
                <UploadCloud size={32} />
              </div>
              <div className="drag-zone-title">Drag & drop files or click to browse</div>
              <div className="drag-zone-sub">Supported formats: PDF (up to 50MB)</div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                multiple 
                accept="application/pdf"
              />
            </div>
          </div>

          {/* REAL-TIME PROGRESS LIST (COLLAPSIBLE FOR BULK) */}
          {uploads.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem' }}>
              <div className="collapsible-trigger" onClick={() => setIsProgressCollapsed(!isProgressCollapsed)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} />
                  <span>Upload Status Tracker ({uploads.length})</span>
                </div>
                {isProgressCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>

              <div className={`collapsible-content ${isProgressCollapsed ? 'collapsed' : ''}`} style={{ marginTop: '1rem' }}>
                <div className="progress-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Summary Status Line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                    <span>
                      {uploads.filter(u => u.status === 'complete').length} of {uploads.length} files complete
                    </span>
                    {uploads.some(u => u.status === 'complete' || u.status === 'failed') && (
                      <button 
                        onClick={() => setUploads(prev => prev.filter(u => u.status !== 'complete' && u.status !== 'failed'))}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                      >
                        Clear Completed
                      </button>
                    )}
                  </div>
                  

                      {/* Left icon wrapper */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: 'var(--status-error)',
                        padding: '0.5rem',
                        borderRadius: '6px'
                      }}>
                        <FileText size={18} />
                      </div>

                      {/* Middle info */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }} title={item.name}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: item.status === 'failed' ? 'var(--status-error)' : 'var(--color-text-secondary)' }}>
                            {item.status === 'uploading' ? `${item.progress}%` : item.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{formatBytes(item.size)}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6rem' }}>•</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 600 }}>{item.type || 'application/pdf'}</span>
                        </div>
                      </div>

                      {/* Right status icon */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {item.status === 'uploading' && (
                          <div className="banner-spinner" style={{ width: '14px', height: '14px' }} />
                        )}
                        {item.status === 'complete' && (
                          <CheckCircle2 size={16} color="var(--status-success)" />
                        )}
                        {item.status === 'failed' && (
                          <AlertCircle size={16} color="var(--status-error)" />
                        )}
                      </div>

                      {/* Animated bottom progress bar line */}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.05)'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${item.progress}%`,
                          background: item.status === 'failed' ? 'var(--status-error)' : 'linear-gradient(to right, var(--primary), var(--secondary))',
                          transition: 'width 0.2s ease-out'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DOCUMENT LIBRARY GRID & ALERTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* BULK PROCESSING HEADER BANNER */}
          {bulkProcessing && (
            <div className="global-banner">
              <div className="global-banner-meta">
                <Loader className="banner-spinner" size={16} />
                <span>Bulk upload in progress — processing {bulkProcessing.total} files in background.</span>
              </div>
              <button 
                className="btn-icon" 
                style={{ color: '#fff', padding: 0 }}
                onClick={() => setBulkProcessing(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* DOCUMENT LIBRARY TABLE */}
          <div className="library-card glass-panel animate-slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="library-header">
              <div className="library-title-container">
                <h2 className="library-title">Document Library</h2>
                <span className="library-sub">Track, search, and download your repository</span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                Total: {documents.length}
              </span>
            </div>

            <div className="table-wrapper">
              {documents.length === 0 ? (
                <div className="library-empty-state">
                  <File size={40} style={{ opacity: 0.3 }} />
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No Documents Uploaded</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      Select a single PDF file or trigger a bulk file upload to populate your library.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="library-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Size</th>
                      <th>Upload Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id} className="animate-fade-in">
                        <td>
                          <div className="doc-name-cell">
                            <span className="doc-icon-pdf">
                              <FileText size={18} />
                            </span>
                            <span className="doc-name-text" title={doc.name}>
                              {doc.name}
                            </span>
                          </div>
                        </td>
                        <td>{formatBytes(doc.size)}</td>
                        <td>{formatDate(doc.uploadDate)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => handleDownload(doc)}
                          >
                            <Download size={12} />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* TOAST SYSTEM ALERTS */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} color="var(--status-success)" />
            ) : toast.type === 'error' ? (
              <AlertCircle size={16} color="var(--status-error)" />
            ) : (
              <Info size={16} color="var(--status-info)" />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <span>{toast.message}</span>
              {toast.timestamp && (
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', opacity: 0.8 }}>
                  {formatDate(toast.timestamp)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
