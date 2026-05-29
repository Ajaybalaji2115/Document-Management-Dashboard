import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

export default function FileUploadCard({ onFilesSelected }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

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
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    onFilesSelected(selectedFiles);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerMockUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="upload-card glass-panel">
      <div 
        className={`drag-zone ${isDragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerMockUpload}
      >
        <div className="drag-zone-icon">
          <UploadCloud size={24} />
        </div>
        <div className="drag-zone-title">Drop files here or click to browse</div>
        <div className="drag-zone-sub">Any file type · Up to 20 MB per file</div>
        
        {/* Pill selectors underneath drag subtext */}
        <div className="interactive-pills-row">
          <span className="interactive-pill" onClick={(e) => { e.stopPropagation(); triggerMockUpload(); }}>Single file</span>
          <span className="interactive-pill" onClick={(e) => { e.stopPropagation(); triggerMockUpload(); }}>Bulk upload</span>
          <span className="interactive-pill" onClick={(e) => { e.stopPropagation(); triggerMockUpload(); }}>Try 4+ files to trigger notifications</span>
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
  );
}
