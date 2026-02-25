import React, { useState } from "react";
import {
  Card,
  CardBody,
  Collapse,
  Badge,
  Input,
  Button,
} from "reactstrap";
import { FaChevronDown, FaChevronRight, FaTrophy, FaCheck, FaHistory, FaExclamationTriangle } from "react-icons/fa";

/**
 * ItemComparisonRow - Expandable row showing all supplier quotes for a single item
 * Allows selection of one supplier per item with inline price/qty editing
 */
const ItemComparisonRow = ({
  item,
  suppliers,
  responseItems,
  selectedSupplierId,
  lowestPriceSupplierId,
  onSelectSupplier,
  onPriceChange,
  onQuantityChange,
  onViewNegotiationHistory,
  isSignoffRequested,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getSupplierResponse = (supplierId) => {
    const supplierResponse = responseItems.find((r) => r.supplierId === supplierId);
    if (!supplierResponse) return null;
    return supplierResponse.items.find((i) => i.rfqItemId === item.rfqItemId);
  };

  const getSupplierStatusColor = (status) => {
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

  const hasValidPrice = (supplierId) => {
    const response = getSupplierResponse(supplierId);
    return response && parseFloat(response.unitPrice) > 0;
  };

  const calculateItemTotal = (supplierId) => {
    const response = getSupplierResponse(supplierId);
    if (!response) return 0;
    const qty = parseFloat(response.quantity || item.quantity || 0);
    const price = parseFloat(response.unitPrice || 0);
    return qty * price;
  };

  const suppliersWithQuotes = suppliers.filter((s) => {
    const response = getSupplierResponse(s.supplierId);
    return response && (parseFloat(response.unitPrice) > 0 || s.supplierStatus !== "rejected");
  });

  const quotedSuppliersCount = suppliers.filter((s) => hasValidPrice(s.supplierId)).length;

  return (
    <Card className="item-comparison-row mb-2">
      <div
        className="item-header d-flex align-items-center justify-content-between p-3"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: "pointer", background: isExpanded ? "#f8f9fa" : "#fff" }}
      >
        <div className="d-flex align-items-center gap-3">
          {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
          <div>
            <span className="fw-bold" style={{ color: "#009efb" }}>
              {item.partId}
            </span>
            <span className="ms-2 text-muted">-</span>
            <span className="ms-2">{item.description}</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-muted" style={{ fontSize: "12px" }}>
            <span className="me-3">
              <strong>UOM:</strong> {item.uom}
            </span>
            <span className="me-3">
              <strong>Qty:</strong> {item.quantity}
            </span>
            <span>
              <strong>Quotes:</strong> {quotedSuppliersCount}/{suppliers.length}
            </span>
          </div>
          {selectedSupplierId && (
            <Badge color="success" pill className="d-flex align-items-center gap-1">
              <FaCheck size={10} />
              Selected
            </Badge>
          )}
          {lowestPriceSupplierId && (
            <Badge color="warning" pill title="Best Price Available">
              <FaTrophy size={10} className="me-1" />
              Best: ${calculateItemTotal(lowestPriceSupplierId).toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      <Collapse isOpen={isExpanded}>
        <CardBody className="pt-0 pb-3">
          {item.notes && (
            <div className="mb-3 p-2 bg-light rounded" style={{ fontSize: "12px" }}>
              <strong>Notes:</strong> {item.notes}
            </div>
          )}

          <div className="supplier-quotes-list">
            {suppliers.map((supplier) => {
              const response = getSupplierResponse(supplier.supplierId);
              const isRejected = supplier.supplierStatus === "rejected";
              const isSelected = selectedSupplierId === supplier.supplierId;
              const isLowestPrice = lowestPriceSupplierId === supplier.supplierId && hasValidPrice(supplier.supplierId);
              const itemTotal = calculateItemTotal(supplier.supplierId);
              const canSelect = hasValidPrice(supplier.supplierId) && !isRejected && !isSignoffRequested;
              const supplierIndex = suppliers.findIndex((s) => s.supplierId === supplier.supplierId);

              return (
                <div
                  key={supplier.supplierId}
                  className={`supplier-quote-card p-3 mb-2 rounded ${isSelected ? "selected" : ""} ${isRejected ? "rejected" : ""}`}
                  style={{
                    border: isSelected ? "2px solid #28a745" : "1px solid #e9ecef",
                    background: isSelected ? "rgba(40, 167, 69, 0.05)" : isRejected ? "#f8f9fa" : "#fff",
                    opacity: isRejected ? 0.6 : 1,
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="d-flex align-items-start gap-3 flex-grow-1">
                      <div className="selection-radio">
                        <Input
                          type="radio"
                          name={`item-${item.rfqItemId}`}
                          checked={isSelected}
                          onChange={() => onSelectSupplier(supplier.supplierId, item.rfqItemId)}
                          disabled={!canSelect}
                          style={{ transform: "scale(1.2)", cursor: canSelect ? "pointer" : "not-allowed" }}
                        />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="fw-bold">{supplier.name}</span>
                          {isLowestPrice && (
                            <Badge color="warning" pill style={{ fontSize: "10px" }}>
                              <FaTrophy size={8} className="me-1" />
                              BEST PRICE
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge color="success" pill style={{ fontSize: "10px" }}>
                              <FaCheck size={8} className="me-1" />
                              SELECTED
                            </Badge>
                          )}
                          <Badge color={getSupplierStatusColor(supplier.supplierStatus)} pill style={{ fontSize: "10px" }}>
                            {supplier.supplierStatus?.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="d-flex align-items-center gap-4">
                          <div className="input-group-sm" style={{ width: "120px" }}>
                            <label className="small text-muted d-block" style={{ fontSize: "10px" }}>
                              Unit Price
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={response?.unitPrice || ""}
                              onChange={(e) => onPriceChange(supplierIndex, e.target.value)}
                              disabled={isSignoffRequested || isRejected}
                              className={`form-control-sm ${isSelected ? "border-success" : ""} ${isLowestPrice ? "text-success fw-bold" : ""}`}
                              placeholder="0.00"
                              style={{ fontSize: "13px" }}
                            />
                          </div>

                          <div className="input-group-sm" style={{ width: "100px" }}>
                            <label className="small text-muted d-block" style={{ fontSize: "10px" }}>
                              Quantity
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={response?.quantity || ""}
                              onChange={(e) => onQuantityChange(supplierIndex, e.target.value)}
                              disabled={isSignoffRequested || isRejected}
                              className={`form-control-sm ${isSelected ? "border-success" : ""}`}
                              placeholder={item.quantity}
                              style={{ fontSize: "13px" }}
                            />
                          </div>

                          <Button
                            color="outline-secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewNegotiationHistory(supplierIndex, item);
                            }}
                            disabled={isRejected}
                            title="View negotiation history"
                            style={{ padding: "4px 8px" }}
                          >
                            <FaHistory size={12} />
                          </Button>
                        </div>

                        {!hasValidPrice(supplier.supplierId) && !isRejected && (
                          <div className="mt-2 text-warning" style={{ fontSize: "11px" }}>
                            <FaExclamationTriangle size={10} className="me-1" />
                            No price entered - cannot select
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-end" style={{ minWidth: "100px" }}>
                      <small className="text-muted d-block" style={{ fontSize: "10px" }}>
                        Total
                      </small>
                      <span
                        className={`fw-bold ${isLowestPrice ? "text-success" : ""}`}
                        style={{ fontSize: "16px" }}
                      >
                        ${itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Collapse>
    </Card>
  );
};

export default ItemComparisonRow;
