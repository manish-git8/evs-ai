import React from "react";
import { Button, Spinner } from "reactstrap";
import { FaCheck, FaShoppingCart, FaFileSignature } from "react-icons/fa";

/**
 * SelectionSummaryBar - Sticky bar showing current selection summary and actions
 * Displays count of selected items, total value, and primary action button
 */
const SelectionSummaryBar = ({
  selectedItemsCount,
  totalValue,
  suppliersWithSelections,
  onRequestSignoff,
  isSignoffRequested,
  isFinalized,
  isSaving,
  canRequestSignoff,
}) => {
  if (selectedItemsCount === 0 && !isSignoffRequested && !isFinalized) {
    return null;
  }

  const getBarStyle = () => {
    if (isFinalized) {
      return {
        background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
        borderColor: "#28a745",
      };
    }
    if (isSignoffRequested) {
      return {
        background: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
        borderColor: "#17a2b8",
      };
    }
    return {
      background: "linear-gradient(135deg, #009efb 0%, #0084d6 100%)",
      borderColor: "#009efb",
    };
  };

  const getStatusMessage = () => {
    if (isFinalized) {
      return "Sign-off Complete - Ready for PO Generation";
    }
    if (isSignoffRequested) {
      return "Sign-off Requested - Awaiting Approval";
    }
    return "Select items from suppliers to request sign-off";
  };

  return (
    <div
      className="selection-summary-bar"
      style={{
        ...getBarStyle(),
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "8px",
        marginBottom: "16px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2">
            <FaShoppingCart size={18} />
            <div>
              <div className="fw-bold" style={{ fontSize: "16px" }}>
                {selectedItemsCount} Item{selectedItemsCount !== 1 ? "s" : ""} Selected
              </div>
              <div style={{ fontSize: "11px", opacity: 0.9 }}>
                {getStatusMessage()}
              </div>
            </div>
          </div>

          {suppliersWithSelections.length > 0 && (
            <div className="d-none d-md-block" style={{ borderLeft: "1px solid rgba(255,255,255,0.3)", paddingLeft: "16px" }}>
              <div style={{ fontSize: "11px", opacity: 0.9 }}>From Suppliers</div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>
                {suppliersWithSelections.slice(0, 3).map((s) => s.name).join(", ")}
                {suppliersWithSelections.length > 3 && ` +${suppliersWithSelections.length - 3} more`}
              </div>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="text-end">
            <div style={{ fontSize: "11px", opacity: 0.9 }}>Total Value</div>
            <div className="fw-bold" style={{ fontSize: "20px" }}>
              ${totalValue.toFixed(2)}
            </div>
          </div>

          {!isSignoffRequested && !isFinalized && canRequestSignoff && (
            <Button
              color="light"
              onClick={onRequestSignoff}
              disabled={selectedItemsCount === 0 || isSaving}
              className="d-flex align-items-center gap-2"
              style={{ fontWeight: 600 }}
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" />
                  Processing...
                </>
              ) : (
                <>
                  <FaFileSignature size={14} />
                  Request Sign-off
                </>
              )}
            </Button>
          )}

          {(isSignoffRequested || isFinalized) && (
            <div
              className="d-flex align-items-center gap-2 px-3 py-2 rounded"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <FaCheck size={14} />
              <span className="fw-bold">
                {isFinalized ? "Approved" : "Pending Approval"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectionSummaryBar;
