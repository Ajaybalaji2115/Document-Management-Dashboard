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
  Loader,
  Trash2,
  ArrowLeft
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
  const [activeTab, setActiveTab] = useState('upload');
  
  // Upload and Toast states
  const [uploads, setUploads] = useState([]); // List of files currently uploading
  const [toasts, setToasts] = useState([]); // Real-time notification toast popups
  
  // Bulk upload tracking state
  const [bulkProcessing, setBulkProcessing] = useState(null); // { id: '...', total: X, completeCount: Y }
  
  // Selection state for Document Library bulk delete
  const [selectedDocIds, setSelectedDocIds] = useState([]);

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
          // Check if notification ID has already been received to prevent duplicates from StrictMode connections
          setNotifications(prev => {
            if (prev.some(n => n.id === data.id)) {
              return prev; // Ignore duplicates completely
            }

            // Uniquely trigger a sliding toast alert (only for consolidated bulk success, errors, or system alerts!)
            const isIndividualSuccess = data.type === 'info' && data.message.includes('uploaded successfully') && !data.message.includes('files uploaded');
            if (!isIndividualSuccess) {
              const toastId = Math.random().toString(36).substr(2, 9);
              setToasts(toastsPrev => [...toastsPrev, { id: toastId, message: data.message, type: data.type, timestamp: data.timestamp }]);
            }
            
            // Uniquely increment unread count
            setUnreadCount(countPrev => countPrev + 1);

            // Clear global banner if a bulk upload completes matching the message
            if (data.type === 'success' && data.message.includes('uploaded successfully')) {
              setBulkProcessing(null);
              fetchDocuments(); // Refresh libraries automatically
            }

            return [data, ...prev];
          });
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
      ws.close(); // Unconditionally close to clean up both connecting and open sockets in StrictMode
    };
  }, [fetchDocuments, fetchNotifications]);

  // Initial Fetches
  useEffect(() => {
    fetchDocuments();
    fetchNotifications();
  }, [fetchDocuments, fetchNotifications]);

  // --- Trigger Single Batch Complete Toast & Auto-Clear Tracker ---
  useEffect(() => {
    if (uploads.length === 0) return;

    const activeCount = uploads.filter(u => u.status === 'uploading').length;
    const completedCount = uploads.filter(u => u.status === 'complete').length;

    // If all files in the batch have finished
    if (activeCount === 0 && completedCount > 0) {
      const toastId = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [
        ...prev, 
        { 
          id: toastId, 
          message: `${completedCount} ${completedCount === 1 ? 'file' : 'files'} uploaded successfully`, 
          type: 'success', 
          timestamp: new Date().toISOString() 
        }
      ]);

      // Refresh libraries
      fetchDocuments();
      setBulkProcessing(null); // Clear active processing banner

      // Auto-clear tracker panel after 6 seconds to keep dashboard clean
      const timer = setTimeout(() => {
        setUploads([]);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [uploads, fetchDocuments]);

  // --- Dismiss Toast Helper ---
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 6000);
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

  // --- Handle Delete (Full-Stack Delete Feature) ---
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/documents/${id}`);
      // Remove from select list if it was checked
      setSelectedDocIds(prev => prev.filter(item => item !== id));
      // Refresh documents (WebSockets will notify list with a single toast)
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      const toastId = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [
        ...prev, 
        { 
          id: toastId, 
          message: `Failed to delete: ${error.response?.data || error.message}`, 
          type: 'error' 
        }
      ]);
    }
  };

  // --- Handle Bulk Delete (Consolidated Success Toast) ---
  const handleBulkDelete = async () => {
    const count = selectedDocIds.length;
    if (!window.confirm(`Are you sure you want to delete the selected ${count} ${count === 1 ? 'file' : 'files'}?`)) return;
    try {
      await axios.post(`${API_BASE_URL}/documents/bulk-delete`, selectedDocIds);
      setSelectedDocIds([]); // Clear selection list
      fetchDocuments();      // Refresh documents list
    } catch (error) {
      console.error('Error in bulk deletion:', error);
      const toastId = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [
        ...prev, 
        { 
          id: toastId, 
          message: `Failed to delete files: ${error.response?.data || error.message}`, 
          type: 'error' 
        }
      ]);
    }
  };

  // --- Core Upload Action (Axios Progress Tracking) ---
  const executeUpload = async (file, bulkGroupId, totalCount) => {
    const fileId = Math.random().toString(36).substr(2, 9);
    setUploads(prev => [...prev, { id: fileId, name: file.name, size: file.size, type: file.type || 'application/pdf', progress: 0, status: 'uploading' }]);
    const formData = new FormData();
    formData.append('file', file);
    if (bulkGroupId) {
      formData.append('bulkGroupId', bulkGroupId);
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
      setIsProgressCollapsed(false); // Expanded and fully visible by default
      
      pdfFiles.forEach(file => {
        executeUpload(file, bulkGroupId, pdfFiles.length);
      });
    } else {
      // STANDARD SINGLE / SMALL MULTI-UPLOAD
      setIsProgressCollapsed(false); // Expanded and fully visible by default
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

  // Mock pill quick clicks
  const triggerMockUpload = (count) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Helper for notification icons
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
    <div className="app-container">
      {/* APP TOP HEADER */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Back Action Controller */}
          <button className="back-btn" onClick={() => alert('Navigating back')}>
            <ArrowLeft size={16} /> Back
          </button>
          
          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
          
          {/* AJAY BALAJI Brand Section */}
          <div className="logo-section">
            <div className="logo-icon">
              <FileText size={16} color="#fff" />
            </div>
            <span className="logo-text">AJAY BALAJI DOCUMENT HUB</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Notification Bell Dropdown Panel */}
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
        </div>
      </header>

      {/* MAIN CONTENT SPLIT GRID */}
      <main className="main-content">
        
        {/* LEFT COLUMN: UPLOAD & PROGRESS DRAWER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* DRAG & DROP ZONE CARD */}
          <div className="upload-card glass-panel">
            <div 
              className={`drag-zone ${isDragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <div className="drag-zone-icon">
                <UploadCloud size={24} />
              </div>
              <div className="drag-zone-title">Drop files here or click to browse</div>
              <div className="drag-zone-sub">Any file type · Up to 20 MB per file</div>
              
              {/* Pill selectors underneath drag subtext */}
              <div className="interactive-pills-row">
                <span className="interactive-pill" onClick={(e) => { e.stopPropagation(); triggerMockUpload(1); }}>Single file</span>
                <span className="interactive-pill" onClick={(e) => { e.stopPropagation(); triggerMockUpload(5); }}>Bulk upload</span>
                <span className="interactive-pill" onClick={(e) => { e.stopPropagation(); triggerMockUpload(4); }}>Try 4+ files to trigger notifications</span>
              </div>

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

          {/* REAL-TIME PROGRESS drawer (HORIZONTAL tracker list) */}
          {uploads.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div className="collapsible-trigger" onClick={() => setIsProgressCollapsed(!isProgressCollapsed)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={15} />
                  <span>Upload Status Tracker ({uploads.length})</span>
                </div>
                {isProgressCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </div>

              <div className={`collapsible-content ${isProgressCollapsed ? 'collapsed' : ''}`} style={{ marginTop: '1rem' }}>
                <div className="progress-list">
                  {/* Summary Status Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
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
                  
                  {/* Progress Node Elements */}
                  {uploads.map(item => (
                    <div 
                      key={item.id} 
                      className={`tracker-progress-item ${item.status}`}
                    >
                      {/* Left color icon wrapper */}
                      <div className={`tracker-icon-wrapper ${item.status}`}>
                        <FileText size={16} />
                      </div>

                      {/* Name, percentage, size and MIME info */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }} title={item.name}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.status === 'failed' ? 'var(--status-error)' : 'var(--color-text-secondary)' }}>
                            {item.status === 'uploading' ? `${item.progress}%` : item.status === 'complete' ? 'Upload complete' : item.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{formatBytes(item.size)}</span>
                          <span style={{ color: '#cbd5e1', fontSize: '0.6rem' }}>•</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>{item.type || 'application/pdf'}</span>
                        </div>
                      </div>

                      {/* Right close/delete upload status tracker action */}
                      <button 
                        className="btn-icon" 
                        style={{ padding: '0.2rem', color: 'var(--color-text-muted)' }}
                        onClick={() => setUploads(prev => prev.filter(u => u.id !== item.id))}
                      >
                        <X size={14} />
                      </button>

                      {/* Animated bottom progress bar line */}
                      {item.status === 'uploading' && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          height: '2px',
                          background: 'rgba(37, 99, 235, 0.05)'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${item.progress}%`,
                            background: 'var(--primary)',
                            transition: 'width 0.25s ease-out'
                          }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DOCUMENT LIBRARY LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* BULK PROCESSING HEADER BANNER */}
          {bulkProcessing && (
            <div className="global-banner">
              <div className="global-banner-meta">
                <Loader className="banner-spinner" size={14} />
                <span>Bulk upload in progress — processing {bulkProcessing.total} files in background.</span>
              </div>
              <button 
                className="btn-icon" 
                style={{ color: '#1e40af', padding: 0 }}
                onClick={() => setBulkProcessing(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* MAIN DOCUMENT LIBRARY GRID */}
          <div className="library-card glass-panel">
            <div className="library-header">
              <div className="library-title-container">
                <h2 className="library-title">Document Library</h2>
                <span className="library-sub">Track, search, and download your repository</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {selectedDocIds.length > 0 && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ 
                      color: 'var(--status-error)', 
                      borderColor: 'var(--status-error)', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      padding: '0.35rem 0.75rem', 
                      fontSize: '0.72rem' 
                    }}
                    onClick={handleBulkDelete}
                  >
                    <Trash2 size={12} />
                    Delete Selected ({selectedDocIds.length})
                  </button>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                  Total: {documents.length}
                </span>
              </div>
            </div>

            <div className="table-wrapper">
              {documents.length === 0 ? (
                <div className="library-empty-state">
                  <File size={32} style={{ opacity: 0.3, color: 'var(--color-text-muted)' }} />
                  <div>
                    <h4 style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>No Documents Uploaded</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      Select a single PDF file or trigger a bulk file upload to populate your library.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="library-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={documents.length > 0 && selectedDocIds.length === documents.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocIds(documents.map(d => d.id));
                            } else {
                              setSelectedDocIds([]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th>Document Name</th>
                      <th>Size</th>
                      <th>Upload Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id} style={{ background: selectedDocIds.includes(doc.id) ? 'rgba(37, 99, 235, 0.02)' : 'none' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedDocIds.includes(doc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocIds(prev => [...prev, doc.id]);
                              } else {
                                setSelectedDocIds(prev => prev.filter(id => id !== doc.id));
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <div className="doc-name-cell">
                            <span className="doc-icon-pdf">
                              <FileText size={16} />
                            </span>
                            <span className="doc-name-text" title={doc.name}>
                              {doc.name}
                            </span>
                          </div>
                        </td>
                        <td>{formatBytes(doc.size)}</td>
                        <td>{formatDate(doc.uploadDate)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {/* Download Button */}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', display: 'inline-flex', gap: '0.3rem' }}
                            onClick={() => handleDownload(doc)}
                          >
                            <Download size={11} />
                            Download
                          </button>
                          
                          {/* Premium Delete Icon Button */}
                          <button 
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '0.35rem', 
                              fontSize: '0.72rem', 
                              display: 'inline-flex', 
                              marginLeft: '0.4rem', 
                              color: 'var(--status-error)', 
                              borderColor: 'var(--border-color)' 
                            }}
                            onClick={() => handleDelete(doc.id, doc.name)}
                            title="Delete Document"
                          >
                            <Trash2 size={12} />
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

      {/* TOAST NOTIFICATION POPUPS */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={15} color="var(--status-success)" />
            ) : toast.type === 'error' ? (
              <AlertCircle size={15} color="var(--status-error)" />
            ) : (
              <Info size={15} color="var(--status-info)" />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 }}>
              <span style={{ color: 'var(--color-text-primary)' }}>{toast.message}</span>
              {toast.timestamp && (
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', opacity: 0.8 }}>
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
