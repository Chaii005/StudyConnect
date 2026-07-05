import { useState } from 'react';
import { formatBytes } from '@/utils';
import { SafeInput } from '../common/SafeInput';

// Helper parse subject và tên hiển thị của tài liệu
// eslint-disable-next-line react-refresh/only-export-components
export const parseFileSubject = (fileName) => {
  const match = fileName.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return {
      subject: match[1],
      displayName: match[2]
    };
  }
  return {
    subject: 'Chung',
    displayName: fileName
  };
};

export default function GroupDocuments({
  group,
  user,
  files,
  selectedFile,
  setSelectedFile,
  customFileName,
  setCustomFileName,
  isUploadingFile,
  handleFileUpload,
  handleFileDelete,
  addToast,
}) {
  const [selectedFilterSubject, setSelectedFilterSubject] = useState('All');

  // Trích xuất danh sách tất cả các môn học đã có trong tài liệu
  const allSubjects = Array.from(
    new Set(
      files.map((file) => parseFileSubject(file.fileName).subject)
    )
  ).filter(Boolean);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setCustomFileName(file.name);
    }
  };

  const handleFileDownload = (file) => {
    try {
      const link = document.createElement('a');
      link.href = file.fileData;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (addToast) addToast(`Đang tải xuống: ${file.fileName}`, 'success');
    } catch {
      if (addToast) addToast('Không thể tải xuống tài liệu này', 'error');
    }
  };

  // Lọc file theo môn học được chọn
  const filteredFiles = selectedFilterSubject === 'All'
    ? files
    : files.filter(file => parseFileSubject(file.fileName).subject === selectedFilterSubject);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px', width: '100%', overflow: 'hidden' }}>
      <div className="document-share-card">
        <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-primary)' }}>
          Chia sẻ tài liệu học tập mới
        </h3>
        <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="document-upload-box"
            style={{
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <input
              type="file"
              id="file-upload-input"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                zIndex: 2
              }}
            />
            <div
              className="document-upload-icon-wrap"
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 10px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.06)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--text-primary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                />
              </svg>
            </div>
            {selectedFile ? (
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>Đã chọn: {selectedFile.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Dung lượng: {formatBytes(selectedFile.size)}
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 500, fontSize: '13px', margin: 0 }} className="upload-box-text">Chọn tài liệu học tập</p>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên tài liệu hiển thị</label>
              <div className="form-input-wrap">
                <SafeInput
                  type="text"
                  className="form-input no-icon"
                  placeholder="Đặt tên cho tài liệu dễ nhận biết..."
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                />
              </div>
            </div>
          )}
          <button
            type="submit"
            className="btn btn-mono responsive-btn-full"
            style={{
              width: 'max-content',
              alignSelf: 'flex-end',
              padding: '10px 24px'
            }}
            disabled={isUploadingFile || !selectedFile}
          >
            {isUploadingFile ? 'Đang tải lên...' : 'Upload tài liệu'}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', margin: 0 }}>Danh sách tài liệu ({filteredFiles.length})</h3>
          
          {/* Bộ lọc theo môn học */}
          {allSubjects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Bộ lọc môn:</span>
              <select
                value={selectedFilterSubject}
                onChange={(e) => setSelectedFilterSubject(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="All">Tất cả môn học</option>
                {allSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredFiles.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)' }}>Không tìm thấy tài liệu phù hợp.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', minWidth: 0 }}>
            {filteredFiles.map((file) => {
              const canDelete = file.userId === user.id || group.creatorId === user.id;
              const { subject, displayName } = parseFileSubject(file.fileName);
              
              let icon = 'file';
              if (file.fileType?.includes('image/')) icon = 'img';
              else if (file.fileType?.includes('pdf')) icon = 'pdf';
              else if (file.fileType?.includes('zip') || file.fileType?.includes('rar')) icon = 'zip';
              
              return (
                <div
                  key={file.id}
                  className="document-file-row"
                >
                  <div className="document-file-info">
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </span>
                    <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                        {subject && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(0,0,0,0.06)',
                              color: 'var(--text-primary)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              display: 'inline-block',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word'
                            }}
                          >
                            {subject}
                          </span>
                        )}
                        <h4
                          style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: 0,
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            minWidth: 0
                          }}
                        >
                          {displayName}
                        </h4>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', marginBottom: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 6px', alignItems: 'center' }}>
                        <span>Dung lượng: {formatBytes(file.fileSize)}</span>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <span>Chia sẻ bởi: {file.userFullName}</span>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <span>{new Date(file.createdAt).toLocaleDateString('vi-VN')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="document-file-actions">
                    <button
                      onClick={() => handleFileDownload(file)}
                      className="btn btn-mono"
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px'
                      }}
                    >
                      Tải xuống
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleFileDelete(file.id)}
                        className="btn-mono"
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                          e.currentTarget.style.background = 'none';
                        }}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        .document-file-row {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .document-file-info {
          display: flex;
          align-items: center;
          gap: 16px;
          overflow: hidden;
          min-width: 0;
          flex: 1;
          width: 100%;
        }
        .document-file-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        
        @media (max-width: 991px) {
          .document-file-row {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            padding: 16px;
          }
          .document-file-info {
            align-items: flex-start;
          }
          .document-file-actions {
            width: 100%;
          }
          .document-file-actions button {
            flex: 1;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
