import React, { useState, useRef, useEffect } from 'react';
import { Label, Button } from 'reactstrap';
import PropTypes from 'prop-types';
import { FaDownload, FaFileUpload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import FileUploadService from '../../services/FileUploadService';
import { getEntityId, getExtensionFromContentType } from '../localStorageUtil';

const QueryModal = ({
  isOpen,
  onClose,
  onSubmit,
  previousQueries = [],
  queryInput,
  setQueryInput,
  onFileUploadSuccess,
}) => {
  const [attachedFileName, setAttachedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const companyId = getEntityId();

  useEffect(() => {
    if (isOpen) {
      setAttachedFile(null);
      setFileInputKey(Date.now());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAttachedFile(file.name);
    const formData = new FormData();
    formData.append('fileContent', file, file.name);

    try {
      const response = await FileUploadService.uploadFile(companyId, file);
      if (response?.data?.fileId) {
        toast.success('File uploaded successfully!');
        const { fileId } = response.data;
        setAttachedFile(file.name);
        onFileUploadSuccess(fileId);
      } else {
        toast.error('File upload failed! No fileId returned.');
        setAttachedFile(null);
        setFileInputKey(Date.now());
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
      setAttachedFile(null);
      setFileInputKey(Date.now());
    }
  };

  const handleFileDownload = async (fileId) => {
    try {
      const downloadResponse = await FileUploadService.downloadFile(fileId);
      const contentType = downloadResponse.headers['content-type'];
      const extension = getExtensionFromContentType(contentType);
      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attachment_${fileId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content" style={{ borderRadius: '12px', border: 'none' }}>
          {/* Header */}
          <div 
            className="modal-header" 
            style={{ 
              backgroundColor: '#f8f9fa', 
              borderBottom: '1px solid #dee2e6',
              borderRadius: '12px 12px 0 0' 
            }}
          >
            <div className="d-flex align-items-center">
              <i className="bi bi-chat-dots me-2" style={{ color: '#009efb', fontSize: '20px' }}></i>
              <h5 className="modal-title mb-0" style={{ color: '#333', fontWeight: '600' }}>
                Submit Query
              </h5>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body" style={{ padding: '24px' }}>
            {/* Previous Queries Section */}
            {previousQueries.length > 0 && (
              <div className="mb-4">
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-clock-history me-2" style={{ color: '#6c757d' }}></i>
                  <h6 className="mb-0" style={{ color: '#495057', fontWeight: '500' }}>
                    Previous Queries
                  </h6>
                  <span className="badge bg-light text-dark ms-2" style={{ fontSize: '11px' }}>
                    {previousQueries.length}
                  </span>
                </div>
                
                <div 
                  className="border rounded" 
                  style={{ 
                    maxHeight: '250px', 
                    overflowY: 'auto',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  {previousQueries.map((query) => {
                    const { queryText: text } = query;
                    const resolvedByIndex = query.queryText.indexOf('Resolved by');
                    const dashIndex = resolvedByIndex !== -1 ? query.queryText.lastIndexOf('-', resolvedByIndex) : -1;
                    const isResolved = resolvedByIndex !== -1;

                    let queryText = text;
                    let resolvedText = '';

                    if (resolvedByIndex !== -1 && dashIndex !== -1) {
                      queryText = query.queryText.slice(0, dashIndex).trim();
                      resolvedText = query.queryText.slice(dashIndex + 1).trim();
                    }

                    const { fileId } = query;
                    
                    return (
                      <div 
                        key={query.id} 
                        className="p-3 border-bottom"
                        style={{ 
                          fontSize: '14px',
                          backgroundColor: isResolved ? '#f8f9fa' : '#ffffff'
                        }}
                      >
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <i 
                              className={`bi ${isResolved ? 'bi-check-circle-fill' : 'bi-person-circle'} me-2`}
                              style={{ 
                                color: isResolved ? '#28a745' : '#009efb',
                                fontSize: '16px'
                              }}
                            ></i>
                            <div>
                              <div className="d-flex align-items-center">
                                <span className="fw-medium" style={{ color: '#333' }}>
                                  {query.userName}
                                </span>
                                {isResolved && (
                                  <span className="badge bg-success ms-2" style={{ fontSize: '10px' }}>
                                    Resolved
                                  </span>
                                )}
                              </div>
                              <small className="text-muted" style={{ fontSize: '11px' }}>
                                {new Date(query.timestamp).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </div>
                          </div>
                          
                          {fileId && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleFileDownload(fileId)}
                              style={{ 
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '6px'
                              }}
                            >
                              <FaDownload className="me-1" />
                              File
                            </button>
                          )}
                        </div>

                        <div className="query-content">
                          <div
                            style={{ 
                              color: '#495057',
                              fontSize: '13px',
                              lineHeight: '1.5'
                            }}
                          >
                            {queryText}
                          </div>
                          
                          {resolvedText && (
                            <div 
                              className="mt-2 p-2 rounded"
                              style={{ 
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6'
                              }}
                            >
                              <div className="d-flex align-items-center mb-1">
                                <i className="bi bi-check-circle me-2" style={{ color: '#6c757d', fontSize: '12px' }}></i>
                                <small className="fw-medium" style={{ fontSize: '11px', color: '#495057' }}>
                                  Resolution
                                </small>
                              </div>
                              <small style={{ fontSize: '12px', color: '#6c757d' }}>
                                {resolvedText}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* File Attachment Display */}
            {attachedFileName && (
              <div 
                className="mb-3 p-2 rounded d-flex align-items-center"
                style={{ 
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #bbdefb'
                }}
              >
                <i className="bi bi-paperclip me-2" style={{ color: '#1976d2' }}></i>
                <span style={{ fontSize: '13px', color: '#1565c0', fontWeight: '500' }}>
                  {attachedFileName}
                </span>
              </div>
            )}
            
            {/* New Query Input */}
            <div className="mb-3">
              <Label htmlFor="queryInput" className="form-label fw-medium mb-2">
                <i className="bi bi-pencil-square me-2" style={{ color: '#009efb' }}></i>
                Your Question or Concern
              </Label>
              <div className="position-relative">
                <textarea
                  ref={textAreaRef}
                  id="queryInput"
                  className="form-control"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  rows="4"
                  placeholder="Type your question or concern here..."
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #ced4da',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm position-absolute"
                  onClick={() => fileInputRef.current.click()}
                  style={{ 
                    top: '8px',
                    right: '8px',
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}
                  title="Attach a file"
                >
                  <FaFileUpload className="me-1" />
                  Attach
                </button>
              </div>
              <input
                key={fileInputKey}
                type="file"
                id="fileInput"
                className="d-none"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </div>
          </div>
          
          {/* Footer */}
          <div 
            className="modal-footer" 
            style={{ 
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #dee2e6',
              borderRadius: '0 0 12px 12px'
            }}
          >
            <Button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              style={{ borderRadius: '8px', padding: '8px 20px' }}
            >
              <i className="bi bi-x-lg me-1"></i>
              Cancel
            </Button>
            <Button
              type="button"
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={!queryInput.trim()}
              style={{ 
                borderRadius: '8px', 
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #009efb, #0085d1)',
                border: 'none'
              }}
            >
              <i className="bi bi-send me-1"></i>
              Submit Query
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

QueryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  previousQueries: PropTypes.array,
  queryInput: PropTypes.string.isRequired,
  setQueryInput: PropTypes.func.isRequired,
  onFileUploadSuccess: PropTypes.func,
};

export default QueryModal;
