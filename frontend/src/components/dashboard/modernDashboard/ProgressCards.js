import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import UserDashboardService from '../../../services/UserDashboardService';
import CartService from '../../../services/CartService';
import RfqService from '../../../services/RfqService';
import PurchaseOrderService from '../../../services/PurchaseOrderService';
import { getEntityId, getUserId, formatDate } from '../../../pages/localStorageUtil';

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const ProgressCards = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultMetrics = {
    totalCartsWaitingApproval: 0,
    totalRFQsWaitingApproval: 0,
    totalPoWaitingApproval: 0,
    totalCartWaitingForConfirmationBySupplier: 0,
    totalCartConfirmationBySupplier: 0,
    totalRejectedCount: 0,
  };

  const [userMetrics, setUserMetrics] = useState(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedData, setExpandedData] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedCurrentPage, setExpandedCurrentPage] = useState(0);
  const [expandedTotalElements, setExpandedTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const expandedPageSize = 5;
  const expandedContainerRef = useRef(null);
  const companyId = getEntityId();
  const userId = getUserId();
  const isInitialLoad = useRef(true);

  const getUrlParam = (key, defaultValue = null) => {
    const value = searchParams.get(key);
    return value !== null ? value : defaultValue;
  };

  const updateUrlParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    const fetchUserMetrics = async () => {
      try {
        const response = await UserDashboardService.getUserMetrics(companyId, userId);
        if (response && response.data) {
          setUserMetrics({ ...defaultMetrics, ...response.data });
        } else {
          setUserMetrics(defaultMetrics);
        }
      } catch (error) {
        console.error('Failed to fetch user metrics:', error);
        setUserMetrics(defaultMetrics);
      } finally {
        setLoading(false);
      }
    };

    if (companyId && userId) {
      fetchUserMetrics();
    } else {
      setLoading(false);
    }
  }, [userId, companyId]);

  useEffect(() => {
    if (isInitialLoad.current && companyId && userId && !loading) {
      isInitialLoad.current = false;
      const savedCard = getUrlParam('progressCard');
      const savedPage = parseInt(getUrlParam('progressCardPage', '0'), 10);
      if (savedCard) {
        setExpandedCard(savedCard);
        fetchCardData(savedCard, savedPage);
      }
    }
  }, [companyId, userId, loading]);

  useEffect(() => {
    if (expandedCard && expandedContainerRef.current) {
      setTimeout(() => {
        expandedContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  }, [expandedCard]);

  // Handle Escape key to collapse expanded card
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && expandedCard) {
        setExpandedCard(null);
        setExpandedData([]);
        setExpandedCurrentPage(0);
        setExpandedTotalElements(0);
        setSearchTerm('');
        updateUrlParams({ progressCard: null, progressCardPage: null });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expandedCard]);

  // Trigger search when debounced search term changes
  useEffect(() => {
    if (expandedCard) {
      fetchCardData(expandedCard, 0, debouncedSearchTerm);
      updateUrlParams({ progressCardPage: 0 });
    }
  }, [debouncedSearchTerm]);

  const fetchCardData = async (cardKey, page = 0, search = '') => {
    setExpandedLoading(true);
    try {
      let response;
      switch (cardKey) {
        case 'totalCartsWaitingApproval':
          response = await CartService.getCartApprovalsPaginated(companyId, userId, 'pending', expandedPageSize, page, 'updatedDate', 'desc', search);
          break;
        case 'totalRFQsWaitingApproval':
          response = await RfqService.getRfqApprovalsPaginated(companyId, userId, 'REQUESTED', expandedPageSize, page, 'updatedDate', 'desc', search);
          break;
        case 'totalPoWaitingApproval':
          response = await PurchaseOrderService.getPOApprovalsPaginated(companyId, userId, 'pending', expandedPageSize, page, 'updatedDate', 'desc', search);
          break;
        case 'totalCartWaitingForConfirmationBySupplier':
          response = await PurchaseOrderService.getPOsByStatusForUser(companyId, userId, 'SUBMITTED', expandedPageSize, page, 'orderPlacedDate', 'desc', search);
          break;
        case 'totalCartConfirmationBySupplier':
          response = await PurchaseOrderService.getPOsByStatusForUser(companyId, userId, 'CONFIRMED,PARTIALLY_CONFIRMED', expandedPageSize, page, 'orderPlacedDate', 'desc', search);
          break;
        default:
          response = { data: { content: [], totalElements: 0 } };
      }
      const data = response.data || {};
      setExpandedData(data.content || []);
      setExpandedTotalElements(data.totalElements || 0);
      setExpandedCurrentPage(page);
    } catch (error) {
      console.error('Error fetching card data:', error);
      setExpandedData([]);
      setExpandedTotalElements(0);
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleCardClick = async (cardKey) => {
    if (expandedCard === cardKey) {
      setExpandedCard(null);
      setExpandedData([]);
      setExpandedCurrentPage(0);
      setExpandedTotalElements(0);
      setSearchTerm('');
      updateUrlParams({ progressCard: null, progressCardPage: null });
    } else {
      setExpandedCard(cardKey);
      setSearchTerm('');
      await fetchCardData(cardKey, 0, '');
      updateUrlParams({ progressCard: cardKey, progressCardPage: 0 });
    }
  };

  const handlePageChange = (newPage) => {
    if (expandedCard) {
      fetchCardData(expandedCard, newPage, debouncedSearchTerm);
      updateUrlParams({ progressCardPage: newPage });
    }
  };

  const handleRowClick = (cardKey, row) => {
    switch (cardKey) {
      case 'totalCartsWaitingApproval':
        navigate(`/cart-approval-details/${row.cartId}`);
        break;
      case 'totalRFQsWaitingApproval':
        navigate(`/RfqApprovalDetails/${row.rfqId}`, { state: { fromDashboard: true } });
        break;
      case 'totalPoWaitingApproval':
        navigate(`/purchase-order-detail/${row.purchaseOrderId || row.PurchaseOrderId}`, { state: { fromAwaitingApproval: true } });
        break;
      case 'totalCartWaitingForConfirmationBySupplier':
      case 'totalCartConfirmationBySupplier':
        navigate(`/purchase-order-detail/${row.purchaseOrderId || row.PurchaseOrderId}`, { state: { fromAwaitingApproval: false } });
        break;
      default:
        break;
    }
  };

  const formatStatusBadge = (status) => {
    const statusConfig = {
      APPROVED: { text: 'Approved', class: 'bg-success text-white' },
      REJECTED: { text: 'Rejected', class: 'bg-danger text-white' },
      PENDING: { text: 'Pending', class: 'bg-warning text-dark' },
      PENDING_APPROVAL: { text: 'Pending Approval', class: 'bg-warning text-dark' },
      CONFIRMED: { text: 'Confirmed', class: 'bg-success text-white' },
      PARTIALLY_CONFIRMED: { text: 'Partially Confirmed', class: 'bg-secondary text-white' },
      SUBMITTED: { text: 'Submitted', class: 'bg-primary text-white' },
      DRAFT: { text: 'Draft', class: 'bg-light text-dark border' },
      REQUESTED: { text: 'Requested', class: 'bg-info text-white' },
    };
    const config = statusConfig[status?.toUpperCase()] || { text: status || 'Unknown', class: 'bg-secondary text-white' };
    return <span className={`badge ${config.class}`} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px' }}>{config.text}</span>;
  };

  const getNestedValue = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '--';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const formatUserName = (user) => {
    if (!user) return '--';
    if (typeof user === 'object') {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const email = user.email || '';
      if (fullName && email) {
        return (
          <div style={{ lineHeight: '1.3' }}>
            <div style={{ fontWeight: 500 }}>{fullName.length > 18 ? `${fullName.substring(0, 18)}...` : fullName}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>{email.length > 22 ? `${email.substring(0, 22)}...` : email}</div>
          </div>
        );
      }
      return fullName || email || '--';
    }
    return String(user);
  };

  const truncateText = (text, maxLength = 20) => {
    if (!text) return '--';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const formatSupplierNames = (suppliers) => {
    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) return '--';
    const joined = suppliers.join(', ');
    if (joined.length > 25) {
      return (
        <span title={joined}>
          {joined.substring(0, 25)}... ({suppliers.length})
        </span>
      );
    }
    return joined;
  };

  const getTableColumns = (cardKey) => {
    switch (cardKey) {
      case 'totalCartsWaitingApproval':
        return [
          { key: 'cartNo', label: 'Cart #', width: '12%' },
          { key: 'approvalDecision', label: 'Status', width: '12%', format: formatStatusBadge },
          { key: 'supplierNames', label: 'Suppliers', width: '18%', format: formatSupplierNames },
          { key: 'cartAmount', label: 'Amount', width: '12%', format: formatCurrency },
          { key: 'neededBy', label: 'Needed By', width: '12%', format: (val) => formatDate(val) },
          { key: 'createdDate', label: 'Created', width: '12%', format: (val) => formatDate(val) },
          { key: 'createdBy', label: 'Created By', width: '22%', format: formatUserName },
        ];
      case 'totalRFQsWaitingApproval':
        return [
          { key: 'rfqNumber', label: 'RFQ #', width: '15%' },
          { key: 'title', label: 'Title', width: '25%', format: (val) => truncateText(val, 18) },
          { key: 'rfqStatus', label: 'Status', width: '15%', format: formatStatusBadge },
          { key: 'createdBy', label: 'Created By', width: '20%', format: formatUserName },
          { key: 'submittedAt', label: 'Submitted', width: '12%', format: (val) => formatDate(val) },
          { key: 'requiredAt', label: 'Required', width: '13%', format: (val) => formatDate(val) },
        ];
      case 'totalPoWaitingApproval':
        return [
          { key: 'orderNo', label: 'PO #', width: '15%' },
          { key: 'supplier.name', label: 'Supplier', width: '20%', nested: true },
          { key: 'approvalDecision', label: 'Status', width: '15%', format: formatStatusBadge },
          { key: 'orderTotal', label: 'Amount', width: '15%', format: formatCurrency },
          { key: 'buyerUser', label: 'Buyer', width: '20%', format: formatUserName },
          { key: 'orderPlacedDate', label: 'Date', width: '15%', format: (val) => formatDate(val) },
        ];
      case 'totalCartWaitingForConfirmationBySupplier':
      case 'totalCartConfirmationBySupplier':
        return [
          { key: 'orderNo', label: 'PO #', width: '15%' },
          { key: 'supplier.name', label: 'Supplier', width: '20%', nested: true },
          { key: 'orderStatus', label: 'Status', width: '15%', format: formatStatusBadge },
          { key: 'orderTotal', label: 'Amount', width: '15%', format: formatCurrency },
          { key: 'buyerUser', label: 'Buyer', width: '20%', format: formatUserName },
          { key: 'orderPlacedDate', label: 'Date', width: '15%', format: (val) => formatDate(val) },
        ];
      default:
        return [];
    }
  };

  const progressCardData = [
    { title: 'Procurement Carts', subtitle: 'Pending Approval', key: 'totalCartsWaitingApproval', bgColor: 'linear-gradient(145deg, #f8fbff, #ffffff)', color: '#2563eb', icon: 'bi-clipboard-check', description: 'Carts awaiting approval' },
    { title: 'Request For Quotations', subtitle: 'Under Review', key: 'totalRFQsWaitingApproval', bgColor: 'linear-gradient(145deg, #fefbf3, #ffffff)', color: '#d97706', icon: 'bi-file-earmark-text', description: 'RFQs pending approval' },
    { title: 'Purchase Orders', subtitle: 'Authorization Required', key: 'totalPoWaitingApproval', bgColor: 'linear-gradient(145deg, #fffbeb, #ffffff)', color: '#f59e0b', icon: 'bi-receipt', description: 'POs requiring authorization' },
    { title: 'Vendor Confirmations', subtitle: 'Awaiting Response', key: 'totalCartWaitingForConfirmationBySupplier', bgColor: 'linear-gradient(145deg, #f0fdfa, #ffffff)', color: '#0891b2', icon: 'bi-hourglass-split', description: 'Orders pending response' },
    { title: 'Active Orders', subtitle: 'Confirmed', key: 'totalCartConfirmationBySupplier', bgColor: 'linear-gradient(145deg, #f0fdf4, #ffffff)', color: '#059669', icon: 'bi-check-circle-fill', description: 'Confirmed orders' },
  ];

  const getExpandedCardData = () => progressCardData.find(card => card.key === expandedCard);

  const renderTable = (cardColor) => {
    const columns = getTableColumns(expandedCard);
    const totalPages = Math.ceil(expandedTotalElements / expandedPageSize);

    if (expandedLoading) {
      return (
        <div className="text-center py-3">
          <div className="spinner-border spinner-border-sm" style={{ color: cardColor }} />
          <p className="mb-0 mt-1" style={{ fontSize: '11px', color: '#6c757d' }}>Loading...</p>
        </div>
      );
    }

    if (expandedData.length === 0) {
      return (
        <div className="text-center py-3">
          <i className="bi bi-inbox" style={{ fontSize: '24px', color: '#ccc' }} />
          <p className="mb-0 mt-1" style={{ fontSize: '11px', color: '#6c757d' }}>
            {searchTerm ? `No results for "${searchTerm}"` : 'No items found'}
          </p>
        </div>
      );
    }

    return (
      <>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${cardColor}25` }}>
                {columns.map((col) => (
                  <th key={col.key} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '600', color: cardColor, width: col.width }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expandedData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => handleRowClick(expandedCard, row)}
                  style={{ borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${cardColor}08`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {columns.map((col) => {
                    const value = col.nested ? getNestedValue(row, col.key) : row[col.key];
                    return <td key={col.key} style={{ padding: '6px 8px', color: '#333', verticalAlign: 'middle' }}>{col.format ? col.format(value) : (value || '--')}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-2 pt-2" style={{ borderTop: '1px solid #eee' }}>
            <span style={{ fontSize: '10px', color: '#6c757d' }}>
              {expandedCurrentPage * expandedPageSize + 1}-{Math.min((expandedCurrentPage + 1) * expandedPageSize, expandedTotalElements)} of {expandedTotalElements}
            </span>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm"
                style={{ padding: '3px 10px', fontSize: '10px', backgroundColor: expandedCurrentPage === 0 ? '#f5f5f5' : `${cardColor}15`, border: `1px solid ${cardColor}30`, color: expandedCurrentPage === 0 ? '#aaa' : cardColor, borderRadius: '4px' }}
                disabled={expandedCurrentPage === 0}
                onClick={() => handlePageChange(expandedCurrentPage - 1)}
              >
                Prev
              </button>
              <button
                className="btn btn-sm"
                style={{ padding: '3px 10px', fontSize: '10px', backgroundColor: expandedCurrentPage >= totalPages - 1 ? '#f5f5f5' : `${cardColor}15`, border: `1px solid ${cardColor}30`, color: expandedCurrentPage >= totalPages - 1 ? '#aaa' : cardColor, borderRadius: '4px' }}
                disabled={expandedCurrentPage >= totalPages - 1}
                onClick={() => handlePageChange(expandedCurrentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return <div className="text-center py-4">Loading metrics...</div>;
  }

  const expandedCardData = getExpandedCardData();

  return (
    <div>
      {/* Cards Row - Always fixed, never moves */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {progressCardData.map((data) => {
          const count = userMetrics?.[data.key] || 0;
          const isSelected = expandedCard === data.key;

          return (
            <div
              key={data.key}
              onClick={() => handleCardClick(data.key)}
              style={{
                flex: '1 1 180px',
                maxWidth: 'calc(20% - 10px)',
                minWidth: '180px',
                minHeight: '140px',
                background: data.bgColor,
                border: `2px solid ${isSelected ? data.color : 'transparent'}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isSelected ? `0 4px 15px ${data.color}20` : '0 2px 8px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
            >
              <div className="d-flex align-items-center mb-2">
                <div
                  style={{
                    backgroundColor: `${data.color}20`,
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '10px',
                    flexShrink: 0,
                  }}
                >
                  <i className={`bi ${data.icon}`} style={{ fontSize: '16px', color: data.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: data.color, lineHeight: '1.2' }}>
                    {data.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{data.subtitle}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: data.color }}>{count}</span>
                  <i
                    className="bi bi-chevron-down"
                    style={{
                      fontSize: '12px',
                      color: data.color,
                      transform: isSelected ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.description}
              </div>
              <div style={{ fontSize: '9px', color: data.color, textAlign: 'center', marginTop: '8px', opacity: 0.7 }}>
                {isSelected ? 'Click to collapse · Press ESC' : 'Click to expand'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expansion Panel - Below cards */}
      <AnimatePresence>
        {expandedCard && expandedCardData && (
          <motion.div
            ref={expandedContainerRef}
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                background: expandedCardData.bgColor,
                border: `2px solid ${expandedCardData.color}`,
                borderRadius: '12px',
                padding: '14px 16px',
              }}
            >
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between mb-2 pb-2" style={{ borderBottom: `1px solid ${expandedCardData.color}20` }}>
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      backgroundColor: `${expandedCardData.color}20`,
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className={`bi ${expandedCardData.icon}`} style={{ fontSize: '14px', color: expandedCardData.color }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: expandedCardData.color }}>{expandedCardData.title}</span>
                    <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>{expandedTotalElements} items</span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {/* Search Input */}
                  <div style={{ position: 'relative' }}>
                    <i
                      className="bi bi-search"
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '12px',
                        color: '#999'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        padding: '6px 10px 6px 32px',
                        fontSize: '12px',
                        border: `1px solid ${expandedCardData.color}30`,
                        borderRadius: '6px',
                        outline: 'none',
                        width: '200px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = expandedCardData.color;
                        e.target.style.boxShadow = `0 0 0 2px ${expandedCardData.color}20`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = `${expandedCardData.color}30`;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {searchTerm && (
                      <i
                        className="bi bi-x-circle-fill"
                        onClick={() => setSearchTerm('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '12px',
                          color: '#999',
                          cursor: 'pointer',
                        }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => handleCardClick(expandedCard)}
                    style={{
                      backgroundColor: `${expandedCardData.color}15`,
                      border: `1px solid ${expandedCardData.color}40`,
                      color: expandedCardData.color,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="bi bi-x-lg" style={{ fontSize: '9px' }} />
                    Close
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px', padding: '10px 12px' }}>
                {renderTable(expandedCardData.color)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProgressCards;
