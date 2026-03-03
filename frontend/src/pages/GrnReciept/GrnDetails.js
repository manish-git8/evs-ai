import { useEffect, useState } from 'react';
import { Button, Spinner } from 'reactstrap';
import { Download, FileText, ArrowLeft, Trash2 } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import GrnService from '../../services/GrnService';
import FileUploadService from '../../services/FileUploadService';
import ReceiptService from '../../services/RecieptService';
import { getEntityId, formatCurrency } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';

const GrnDetails = () => {
  const { grnId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const companyId = getEntityId();
  const [grn, setGrn] = useState(null);
  const [orderNo, setOrderNo] = useState('N/A');
  const [previewFile, setPreviewFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateStr} at ${timeStr}`;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch GRN details
      const grnResponse = await GrnService.getGRNsPaginated(companyId, 1, 0, '', grnId);
      // Extract from paginated response structure or legacy structure
      const responseData = grnResponse.data?.content
        ? grnResponse.data.content
        : grnResponse.data || [];
      
      if (responseData.length === 0) {
        toast.error('GRN not found');
        return;
      }
      
      const grnData = responseData[0]; // Get first item from array
      setGrn(grnData);

      // Use purchase order number directly from GRN response
      setOrderNo(grnData.purchaseOrderNumber || 'N/A');

      // Fetch file if exists - use root documentId
      if (grnData.documentId) {
        const { documentId } = grnData;
        if (documentId) {
          try {
            const fileResponse = await FileUploadService.getFileByFileId(documentId);
            const fileBlob = new Blob([fileResponse.data], {
              type: fileResponse.headers['content-type'] || 'application/octet-stream',
            });
            const fileUrl = URL.createObjectURL(fileBlob);
            setPreviewFile({
              url: fileUrl,
              name: `GRN_${grnData.grnNo || grnId}_document`,
              type: fileResponse.headers['content-type'] || 'application/octet-stream',
            });
          } catch (error) {
            console.error('Error fetching file:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load GRN details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    return () => {
      if (previewFile?.url) {
        URL.revokeObjectURL(previewFile.url);
      }
    };
  }, [grnId, companyId]);

  const handleDownload = () => {
    if (previewFile?.url) {
      const link = document.createElement('a');
      link.href = previewFile.url;
      link.download = previewFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleGoBack = () => {
    const fromPage = location.state?.fromPage;
    if (fromPage) {
      navigate(fromPage);
    } else {
      navigate('/grn-receipt');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      created: 'info',
      processed: 'success',
      in_progress: 'warning',
      deleted: 'danger',
    };
    return statusColors[status?.toLowerCase()] || 'secondary';
  };

  const getStatusLabel = (status) => {
    const labels = {
      created: 'Created',
      processed: 'Processed',
      in_progress: 'In Progress',
      deleted: 'Deleted',
    };
    return labels[status?.toLowerCase()] || status || 'Unknown';
  };

  const handleCreateReceipt = async () => {
    try {
      const response = await ReceiptService.handleCreateReceipt(companyId, grnId);
      const { fileId } = response.data;

      Swal.fire({
        icon: 'success',
        title: 'Receipt Created',
        showCancelButton: true,
        confirmButtonText: 'OK',
        cancelButtonText: 'Download Receipt',
      }).then(async (result) => {
        if (result.isConfirmed) {
          toast.dismiss();
          toast.success('Receipt created successfully', {
            autoClose: 2000,
            position: 'top-right',
          });
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          try {
            const downloadResponse = await FileUploadService.downloadFile(fileId);
            const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Receipt_${fileId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.dismiss();
            toast.success('Receipt downloaded successfully', {
              autoClose: 2000,
              position: 'top-right',
            });
          } catch (downloadError) {
            console.error('Error downloading receipt:', downloadError);
            toast.error('Failed to download receipt PDF');
          }
        }
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast.error(error.response?.data?.errorMessage || 'An unexpected error occurred');
    }
  };

  const handleDeleteGRN = async () => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
      });

      if (result.isConfirmed) {
        await GrnService.deleteGRN(companyId, grnId);
        Swal.fire('Deleted!', 'GRN has been deleted.', 'success');
        // Navigate back to GRN list after deletion
        navigate('/grn-receipt');
      }
    } catch (error) {
      console.error('Error deleting GRN:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to delete GRN');
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner color="primary" size="lg" />
        <span className="ms-2">Loading GRN details...</span>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="text-center" style={{ padding: '40px' }}>
        <h5>GRN not found</h5>
        <p className="text-muted">The requested GRN could not be found.</p>
        <Button color="primary" onClick={handleGoBack}>
          <ArrowLeft size={16} className="me-1" />
          Go Back
        </Button>
      </div>
    );
  }

  // Extract data directly from GRN response
  const supplier = grn.supplier || {};
  const companyName = grn.company?.displayName || grn.company?.name || 'N/A';
  
  // Get receivedBy and verifiedBy from GRN response (they are UserDto objects)
  const receivedByEmployee = grn.receivedBy;
  const verifiedByEmployee = grn.verifiedBy;

  // Helper function to format user name
  const formatUserName = (user) => {
    if (!user) return 'N/A';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  };

  return (
    <div style={{ padding: '24px 15px' }}>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        style={{ top: '12px', right: '12px' }}
        toastStyle={{
          marginBottom: '0',
          position: 'absolute',
          top: 0,
          right: 0,
        }}
      />
      <div
        className="card shadow-sm"
        style={{
          borderRadius: '12px',
          border: 'none',
          marginBottom: '24px',
          width: '100%',
          maxWidth: 'none',
        }}
      >
        <div className="card-body" style={{ padding: '24px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="icon-wrapper"
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#009efb',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="bi bi-receipt text-white" style={{ fontSize: '20px' }}></i>
              </div>
              <div>
                <div
                  className="mb-1"
                  style={{
                    fontSize: '32px',
                    letterSpacing: '0.5px',
                    lineHeight: '1.2',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: '#495057', fontWeight: '400', fontSize: '32px' }}>
                    GRN No.
                  </span>
                  <span
                    style={{
                      color: '#212529',
                      fontWeight: '800',
                      marginLeft: '12px',
                      fontSize: '32px',
                    }}
                  >
                    {grn?.grnNo || 'N/A'}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span
                    className={`badge bg-${getStatusBadge(grn.status)}`}
                    style={{
                      fontSize: '0.75rem',
                      padding: '6px 12px',
                      fontWeight: '500',
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      borderRadius: '6px',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    {getStatusLabel(grn.status)}
                  </span>
                  {grn?.PurchaseOrderId && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#009efb',
                        cursor: 'pointer',
                        fontWeight: '500',
                        textDecoration: 'none',
                      }}
                      onMouseOver={(e) => {
                        e.target.style.textDecoration = 'underline';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.textDecoration = 'none';
                      }}
                      onFocus={(e) => {
                        e.target.style.textDecoration = 'underline';
                      }}
                      onBlur={(e) => {
                        e.target.style.textDecoration = 'none';
                      }}
                      onClick={() => {
                        navigate(`/purchase-order-detail/${grn.PurchaseOrderId}`, {
                          state: {
                            fromPage: `/grn-details/${grnId}`,
                          },
                        });
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigate(`/purchase-order-detail/${grn.PurchaseOrderId}`, {
                            state: {
                              fromPage: `/grn-details/${grnId}`,
                            },
                          });
                        }
                      }}
                    >
                      <i
                        className="fas fa-external-link-alt me-1"
                        style={{ fontSize: '0.75rem' }}
                      ></i>
                      View PO: {orderNo}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button
                className="btn btn-gradient-primary"
                onClick={handleGoBack}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                }}
              >
                <ArrowLeft size={16} className="me-2" />
                Back
              </Button>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-6 col-md-12">
              <div className="border-start ps-3">
                {previewFile ? (
                  <>
                    {previewFile.type.includes('pdf') ? (
                      <div style={{ height: '500px', width: '100%' }}>
                        <iframe
                          src={previewFile.url}
                          title="PDF Preview"
                          width="100%"
                          height="100%"
                          style={{ border: '1px solid #dee2e6', borderRadius: '6px' }}
                        />
                      </div>
                    ) : previewFile.type.includes('image') ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '500px',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={previewFile.url}
                          alt="Attached File"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="text-center"
                        style={{
                          height: '500px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          backgroundColor: '#f8f9fa',
                        }}
                      >
                        <FileText size={48} color="#6c757d" />
                        <p className="mt-2 mb-3" style={{ color: '#6c757d', fontSize: '14px' }}>
                          {previewFile.name}
                        </p>
                        <Button
                          className="btn btn-gradient-primary"
                          size="sm"
                          onClick={handleDownload}
                          style={{
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                            border: 'none',
                            color: 'white',
                            fontSize: '12px',
                            padding: '6px 12px',
                          }}
                        >
                          <Download size={14} className="me-1" />
                          Download to View
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="text-center"
                    style={{
                      height: '500px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      backgroundColor: '#f8f9fa',
                    }}
                  >
                    <FileText size={48} color="#6c757d" />
                    <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '12px' }}>
                      No file available for preview
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-6 col-md-12 mb-3 mb-lg-0">
              <div>
                {/* GRN Information Section */}
                <div className="row mb-3">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                      }}
                    >
                      <h6
                        className="mb-3"
                        style={{ color: '#009efb', fontWeight: '600', fontSize: '13px' }}
                      >
                        <i className="bi bi-receipt me-2"></i>GRN Information
                      </h6>
                      <table
                        style={{
                          fontSize: '0.85rem',
                          backgroundColor: 'transparent',
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: '0',
                        }}
                      >
                        <tbody>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Company:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>{companyName}</strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Received By:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {formatUserName(receivedByEmployee)}
                              </strong>
                              <div className="text-muted" style={{ fontSize: '11px' }}>
                                {formatDateTime(grn.receivedDateTime)}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Verified By:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {formatUserName(verifiedByEmployee)}
                              </strong>
                              <div className="text-muted" style={{ fontSize: '11px' }}>
                                {formatDateTime(grn.verifiedDate)}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                      }}
                    >
                      <h6
                        className="mb-3"
                        style={{ color: '#28a745', fontWeight: '600', fontSize: '13px' }}
                      >
                        <i className="fas fa-building me-2"></i>Supplier Information
                      </h6>
                      <table
                        style={{
                          fontSize: '0.85rem',
                          backgroundColor: 'transparent',
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: '0',
                        }}
                      >
                        <tbody>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Name:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {supplier.name || supplier.displayName || 'N/A'}
                              </strong>
                              {supplier.displayName && supplier.name !== supplier.displayName && (
                                <div className="text-muted" style={{ fontSize: '11px' }}>
                                  ({supplier.displayName})
                                </div>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Email:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <span style={{ color: '#495057' }}>{supplier.email || 'N/A'}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Phone:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <span style={{ color: '#495057' }}>
                                {supplier.primaryContact || supplier.customerServicePhone || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Items Details Section */}
                {grn.grnDetails && grn.grnDetails.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-3">
                      <h6 style={{ color: '#17a2b8', fontWeight: '600', fontSize: '14px' }}>
                        <i className="fas fa-clipboard-list me-2"></i>
                        Item Details ({grn.grnDetails.length} items)
                      </h6>
                    </div>
                    <div
                      className="mb-3"
                      style={{
                        border: '1px solid #e8ecef',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                      }}
                    >
                      <div className="table-responsive">
                        <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                          <thead style={{ backgroundColor: '#009efb' }}>
                            <tr>
                              <th
                                className="text-nowrap"
                                style={{ padding: '8px', fontWeight: '600', color: 'white' }}
                              >
                                Part ID
                              </th>
                              <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                Description
                              </th>
                              <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                U/M
                              </th>
                              <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                Qty Rcd
                              </th>
                              <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                Qty Acc
                              </th>
                              <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                Unit Price
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {grn.grnDetails.map((grnDetail) => (
                              <tr key={grnDetail.grnDetailID}>
                                <td
                                  className="text-nowrap"
                                  style={{ padding: '6px 8px', color: '#495057' }}
                                >
                                  {grnDetail.partId || '-'}
                                </td>
                                <td style={{ padding: '6px 8px', color: '#495057' }}>
                                  {grnDetail.partDescription || '-'}
                                </td>
                                <td style={{ padding: '6px 8px', color: '#495057' }}>
                                  {grnDetail.unitOfMeasurement || '-'}
                                </td>
                                <td
                                  className="text-center"
                                  style={{ padding: '6px 8px', color: '#495057' }}
                                >
                                  {grnDetail.qtyReceived || '0'}
                                </td>
                                <td
                                  className="text-center"
                                  style={{ padding: '6px 8px', color: '#495057' }}
                                >
                                  {grnDetail.qtyAccepted || '0'}
                                </td>
                                <td style={{ padding: '6px 8px', color: '#495057' }}>
                                  {grnDetail.unitPrice != null
                                    ? formatCurrency(grnDetail.unitPrice)
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {grn.notes && (
                  <div className="mb-3">
                    <div
                      style={{
                        backgroundColor: '#f8fcff',
                        border: '1px solid #e1f5fe',
                        borderLeft: '3px solid #81d4fa',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 1px 3px rgba(0, 158, 251, 0.05)',
                      }}
                    >
                      <div>
                        <h6
                          className="mb-2"
                          style={{
                            color: '#0288d1',
                            fontWeight: '500',
                            fontSize: '14px',
                            margin: '0 0 8px 0',
                          }}
                        >
                          <i className="fas fa-comment-alt me-2" style={{ fontSize: '12px' }}></i>
                          Notes & Comments
                        </h6>
                        <div
                          style={{
                            color: '#546e7a',
                            fontSize: '0.9rem',
                            lineHeight: '1.5',
                            fontWeight: '400',
                            wordBreak: 'break-word',
                          }}
                        >
                          {grn.notes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end border-top pt-3">
            <div className="d-flex gap-2">
              <Button
                className="btn btn-gradient-primary"
                onClick={handleCreateReceipt}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                }}
              >
                <Download size={14} className="me-1" />
                Download Receipt
              </Button>
              <Button
                className="btn btn-danger"
                onClick={handleDeleteGRN}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                }}
              >
                <Trash2 size={14} className="me-1" />
                Delete GRN
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrnDetails;