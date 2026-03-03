import React from "react";
import { Card, CardBody, Badge } from "reactstrap";
import { FaTrophy, FaCheck, FaStar } from "react-icons/fa";
import { formatCurrency } from "../../utils/currencyUtils";

/**
 * SupplierSummaryCard - Displays a compact summary card for each supplier
 * Shows supplier name, status, total quoted, and selected items count
 */
const SupplierSummaryCard = ({
  supplier,
  supplierTotal,
  selectedItemsCount,
  isLowestBid,
  isAIRecommended,
  isActive,
  onClick,
  disabled,
}) => {
  const getStatusColor = (status) => {
    const colors = {
      draft: "secondary",
      submitted: "primary",
      finalized: "success",
      rejected: "danger",
      negotiation: "warning",
      signoff_requested: "info",
      shortlisted: "info",
      not_selected: "secondary",
    };
    return colors[status] || "dark";
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const isRejected = supplier.supplierStatus === "rejected";

  return (
    <Card
      className={`supplier-summary-card ${isActive ? "active" : ""} ${isRejected ? "rejected" : ""} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: isRejected ? 0.6 : 1,
        minWidth: "200px",
        maxWidth: "240px",
        transition: "all 0.2s ease",
      }}
    >
      <CardBody className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="mb-0 text-truncate" style={{ maxWidth: "140px", fontWeight: 600 }}>
            {supplier.name || "Unknown Supplier"}
          </h6>
          <div className="d-flex gap-1">
            {isLowestBid && !isRejected && (
              <Badge color="warning" pill title="Lowest Bid" style={{ fontSize: "10px" }}>
                <FaTrophy size={10} />
              </Badge>
            )}
            {isAIRecommended && !isRejected && (
              <Badge color="info" pill title="AI Recommended" style={{ fontSize: "10px" }}>
                <FaStar size={10} />
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-2">
          <Badge color={getStatusColor(supplier.supplierStatus)} pill style={{ fontSize: "10px" }}>
            {formatStatus(supplier.supplierStatus)}
          </Badge>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted d-block" style={{ fontSize: "10px" }}>Total</small>
            <span className={`fw-bold ${isLowestBid && !isRejected ? "text-success" : ""}`} style={{ fontSize: "14px" }}>
              {formatCurrency(supplierTotal, supplier.supplierCurrency || "USD")}
            </span>
          </div>
          {selectedItemsCount > 0 && (
            <div className="text-end">
              <Badge color="success" pill className="d-flex align-items-center gap-1">
                <FaCheck size={10} />
                <span>{selectedItemsCount}</span>
              </Badge>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default SupplierSummaryCard;
