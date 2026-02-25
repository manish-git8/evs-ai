import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, Table, Badge } from 'reactstrap';
import { formatCurrency, formatNumber, getRiskLevelColor } from '../utils/formatters';

const SupplierPerformanceTable = (props) => {
  const { supplierData } = props;

  if (!supplierData) return null;

  const {
    supplierOverview = {},
    topSuppliersBySpend = [],
    supplierConcentration = {},
    deliveryMetrics = {},
    qualityMetrics = {},
    responsivenessMetrics = {},
    priceCompetitiveness = {},
    complianceMetrics = {}
    // NOTE: supplierPerformanceScores removed from destructuring
    // to avoid the "assigned but never used" warning
  } = supplierData;

  return (
    <>
      {/* Overview Cards */}
      <div className="row mb-3">
        <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
              <h6 className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>Active Suppliers</h6>
              <h3 className="mb-0 text-primary">
                {formatNumber(supplierOverview.totalActiveSuppliers || 0)}
              </h3>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                {formatNumber(supplierOverview.newSuppliersAdded || 0)} new this period
              </small>
            </CardBody>
          </Card>
        </div>
        <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
              <h6 className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>Suppliers Transacted</h6>
              <h3 className="mb-0 text-success">
                {formatNumber(supplierOverview.suppliersTransactedWith || 0)}
              </h3>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                out of {formatNumber(supplierOverview.totalActiveSuppliers || 0)} active
              </small>
            </CardBody>
          </Card>
        </div>
        <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
              <h6 className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>On-Time Delivery</h6>
              <h3 className="mb-0 text-warning">
                {typeof deliveryMetrics.overallOnTimeDeliveryRate === 'number'
                  ? deliveryMetrics.overallOnTimeDeliveryRate.toFixed(1)
                  : '0'}
                %
              </h3>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                {formatNumber(deliveryMetrics.onTimeDeliveries || 0)} of{' '}
                {formatNumber(deliveryMetrics.totalDeliveries || 0)} deliveries
              </small>
            </CardBody>
          </Card>
        </div>
        <div className="col-lg-3 col-md-6 col-sm-6 mb-3">
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
              <h6 className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>Quality Issue Rate</h6>
              <h3 className="mb-0 text-info">
                {typeof qualityMetrics.qualityIssueRate === 'number'
                  ? qualityMetrics.qualityIssueRate.toFixed(1)
                  : '0'}
                %
              </h3>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                {formatNumber(qualityMetrics.receiptsWithIssues || 0)} issues in{' '}
                {formatNumber(qualityMetrics.totalReceiptsProcessed || 0)} receipts
              </small>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="row mb-3">
        <div className="col-lg-4 col-md-6 mb-3">
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
              <h6 className="mb-2 fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                Responsiveness
              </h6>
              <div style={{ fontSize: '0.8rem' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Avg RFQ Response:</span>
                  <strong>
                    {typeof responsivenessMetrics.averageRfqResponseTime === 'number'
                      ? responsivenessMetrics.averageRfqResponseTime.toFixed(1)
                      : '0'}{' '}
                    days
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Avg PO Confirmation:</span>
                  <strong>
                    {typeof responsivenessMetrics.averagePoConfirmationTime === 'number'
                      ? responsivenessMetrics.averagePoConfirmationTime.toFixed(1)
                      : '0'}{' '}
                    days
                  </strong>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        <div className="col-lg-4 col-md-6 mb-3">
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
              <h6 className="mb-2 fw-bold text-success" style={{ fontSize: '0.9rem' }}>
                Price Competitiveness
              </h6>
              <div style={{ fontSize: '0.8rem' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Avg Savings:</span>
                  <strong className="text-success">
                    {formatCurrency(priceCompetitiveness.averageSavingsFromNegotiation || 0)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Total RFQs:</span>
                  <strong>
                    {formatNumber(priceCompetitiveness.totalRfqsConducted || 0)}
                  </strong>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        <div className="col-lg-4 col-md-6 mb-3">
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
            <CardBody className="p-3">
              <h6 className="mb-2 fw-bold text-info" style={{ fontSize: '0.9rem' }}>
                Compliance
              </h6>
              <div style={{ fontSize: '0.8rem' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Compliance Rate:</span>
                  <strong className="text-success">
                    {typeof complianceMetrics.complianceRate === 'number'
                      ? complianceMetrics.complianceRate.toFixed(1)
                      : '0'}
                    %
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">High Risk Suppliers:</span>
                  <strong className="text-danger">
                    {formatNumber((complianceMetrics.highRiskSuppliers || []).length)}
                  </strong>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Supplier Concentration Risk */}
      {supplierConcentration && (
        <Card className="mb-3">
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Supplier Concentration Risk</h5>
              <Badge color={getRiskLevelColor(supplierConcentration.riskLevel)} pill>
                {supplierConcentration.riskLevel || 'N/A'} RISK
              </Badge>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="d-flex justify-content-between">
                  <span>Top 5 Suppliers:</span>
                  <strong>
                    {formatCurrency(supplierConcentration.top5SuppliersSpend || 0)}
                  </strong>
                </div>
                <div className="progress mt-2" style={{ height: '8px' }}>
                  <div
                    className={`progress-bar bg-${getRiskLevelColor(
                      supplierConcentration.riskLevel
                    )}`}
                    style={{
                      width: `${supplierConcentration.top5SuppliersPercentage || 0}%`
                    }}
                  />
                </div>
                <small className="text-muted">
                  {typeof supplierConcentration.top5SuppliersPercentage === 'number'
                    ? supplierConcentration.top5SuppliersPercentage.toFixed(1)
                    : '0'}
                  % of total spend
                </small>
              </div>
              <div className="col-md-6 mb-3">
                <div className="d-flex justify-content-between">
                  <span>Top 10 Suppliers:</span>
                  <strong>
                    {formatCurrency(supplierConcentration.top10SuppliersSpend || 0)}
                  </strong>
                </div>
                <div className="progress mt-2" style={{ height: '8px' }}>
                  <div
                    className={`progress-bar bg-${getRiskLevelColor(
                      supplierConcentration.riskLevel
                    )}`}
                    style={{
                      width: `${supplierConcentration.top10SuppliersPercentage || 0}%`
                    }}
                  />
                </div>
                <small className="text-muted">
                  {typeof supplierConcentration.top10SuppliersPercentage === 'number'
                    ? supplierConcentration.top10SuppliersPercentage.toFixed(1)
                    : '0'}
                  % of total spend
                </small>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Top Suppliers Table */}
      {topSuppliersBySpend && topSuppliersBySpend.length > 0 && (
        <Card className="mb-3 shadow-sm border-0" style={{ borderRadius: '8px' }}>
          <CardBody>
            <h5 className="mb-3">Top Suppliers by Spend</h5>
            <div className="table-responsive">
              <Table hover size="sm" style={{ fontSize: '0.85rem' }}>
                <thead className="bg-light">
                  <tr>
                    <th>Supplier Name</th>
                    <th className="text-end">Total Spend</th>
                    <th className="text-end">% of Total</th>
                    <th className="text-end">Transactions</th>
                    <th className="text-end">Avg Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {topSuppliersBySpend.slice(0, 10).map((supplier, index) => (
                    <tr
                      key={
                        supplier.supplierId ||
                        supplier.supplierName ||
                        `supplier-${index}`
                      }
                    >
                      <td>
                        <strong className="text-primary">#{index + 1}</strong>{' '}
                        {supplier.supplierName}
                      </td>
                      <td className="text-end">
                        <strong>{formatCurrency(supplier.totalSpend || 0)}</strong>
                      </td>
                      <td className="text-end">
                        <Badge
                          color={
                            supplier.percentageOfTotalSpend > 20 ? 'warning' : 'info'
                          }
                          pill
                        >
                          {typeof supplier.percentageOfTotalSpend === 'number'
                            ? supplier.percentageOfTotalSpend.toFixed(1)
                            : '0'}
                          %
                        </Badge>
                      </td>
                      <td className="text-end">
                        {formatNumber(supplier.transactionCount || 0)}
                      </td>
                      <td className="text-end">
                        {formatCurrency(supplier.averageOrderValue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Delivery Performance */}
      {deliveryMetrics && (
        <div className="row">
          {Array.isArray(deliveryMetrics.bestDeliveryPerformers) &&
            deliveryMetrics.bestDeliveryPerformers.length > 0 && (
              <div className="col-md-6 mb-3">
                <Card className="h-100">
                  <CardBody>
                    <h5 className="mb-3 text-success">Best Delivery Performance</h5>
                    <Table size="sm">
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th className="text-end">On-Time %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryMetrics.bestDeliveryPerformers.map((supplier) => (
                          <tr key={supplier.supplierId}>
                            <td>{supplier.supplierName}</td>
                            <td className="text-end">
                              <Badge color="success">
                                {typeof supplier.onTimeDeliveryRate === 'number'
                                  ? supplier.onTimeDeliveryRate.toFixed(1)
                                  : '0'}
                                %
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </div>
            )}

          {Array.isArray(deliveryMetrics.worstDeliveryPerformers) &&
            deliveryMetrics.worstDeliveryPerformers.length > 0 && (
              <div className="col-md-6 mb-3">
                <Card className="h-100">
                  <CardBody>
                    <h5 className="mb-3 text-danger">Needs Improvement</h5>
                    <Table size="sm">
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th className="text-end">On-Time %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryMetrics.worstDeliveryPerformers.map((supplier) => (
                          <tr key={supplier.supplierId}>
                            <td>{supplier.supplierName}</td>
                            <td className="text-end">
                              <Badge color="danger">
                                {typeof supplier.onTimeDeliveryRate === 'number'
                                  ? supplier.onTimeDeliveryRate.toFixed(1)
                                  : '0'}
                                %
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </div>
            )}
        </div>
      )}
    </>
  );
};

SupplierPerformanceTable.propTypes = {
  supplierData: PropTypes.shape({
    supplierOverview: PropTypes.shape({
      totalActiveSuppliers: PropTypes.number,
      newSuppliersAdded: PropTypes.number,
      suppliersTransactedWith: PropTypes.number
    }),
    topSuppliersBySpend: PropTypes.arrayOf(
      PropTypes.shape({
        supplierId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        supplierName: PropTypes.string,
        totalSpend: PropTypes.number,
        percentageOfTotalSpend: PropTypes.number,
        transactionCount: PropTypes.number,
        averageOrderValue: PropTypes.number
      })
    ),
    supplierConcentration: PropTypes.shape({
      riskLevel: PropTypes.string,
      top5SuppliersSpend: PropTypes.number,
      top5SuppliersPercentage: PropTypes.number,
      top10SuppliersSpend: PropTypes.number,
      top10SuppliersPercentage: PropTypes.number
    }),
    deliveryMetrics: PropTypes.shape({
      overallOnTimeDeliveryRate: PropTypes.number,
      onTimeDeliveries: PropTypes.number,
      totalDeliveries: PropTypes.number,
      bestDeliveryPerformers: PropTypes.arrayOf(
        PropTypes.shape({
          supplierId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          supplierName: PropTypes.string,
          onTimeDeliveryRate: PropTypes.number
        })
      ),
      worstDeliveryPerformers: PropTypes.arrayOf(
        PropTypes.shape({
          supplierId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          supplierName: PropTypes.string,
          onTimeDeliveryRate: PropTypes.number
        })
      )
    }),
    qualityMetrics: PropTypes.shape({
      qualityIssueRate: PropTypes.number,
      receiptsWithIssues: PropTypes.number,
      totalReceiptsProcessed: PropTypes.number
    }),
    responsivenessMetrics: PropTypes.shape({
      averageRfqResponseTime: PropTypes.number,
      averagePoConfirmationTime: PropTypes.number
    }),
    priceCompetitiveness: PropTypes.shape({
      averageSavingsFromNegotiation: PropTypes.number,
      totalRfqsConducted: PropTypes.number
    }),
    complianceMetrics: PropTypes.shape({
      complianceRate: PropTypes.number,
      highRiskSuppliers: PropTypes.array
    })
  })
};

SupplierPerformanceTable.defaultProps = {
  supplierData: {
    supplierOverview: {
      totalActiveSuppliers: 0,
      newSuppliersAdded: 0,
      suppliersTransactedWith: 0
    },
    topSuppliersBySpend: [],
    supplierConcentration: {
      riskLevel: 'N/A',
      top5SuppliersSpend: 0,
      top5SuppliersPercentage: 0,
      top10SuppliersSpend: 0,
      top10SuppliersPercentage: 0
    },
    deliveryMetrics: {
      overallOnTimeDeliveryRate: 0,
      onTimeDeliveries: 0,
      totalDeliveries: 0,
      bestDeliveryPerformers: [],
      worstDeliveryPerformers: []
    },
    qualityMetrics: {
      qualityIssueRate: 0,
      receiptsWithIssues: 0,
      totalReceiptsProcessed: 0
    },
    responsivenessMetrics: {
      averageRfqResponseTime: 0,
      averagePoConfirmationTime: 0
    },
    priceCompetitiveness: {
      averageSavingsFromNegotiation: 0,
      totalRfqsConducted: 0
    },
    complianceMetrics: {
      complianceRate: 0,
      highRiskSuppliers: []
    }
  }
};

export default SupplierPerformanceTable;
