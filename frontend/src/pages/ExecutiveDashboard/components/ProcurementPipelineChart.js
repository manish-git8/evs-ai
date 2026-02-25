import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, Row, Col } from 'reactstrap';
import { formatCurrency, formatNumber } from '../utils/formatters';

const ProcurementPipelineChart = (props) => {
  const { pipelineData } = props;

  if (!pipelineData) return null;

  const {
    requisitionStage = {},
    purchaseOrderStage = {},
    invoiceStage = {},
    pipelineSummary = {}
  } = pipelineData;

  const stages = [
    {
      name: 'Requisitions',
      count: requisitionStage.totalCount || 0,
      value: requisitionStage.totalValue || 0,
      color: 'primary'
    },
    {
      name: 'Purchase Orders',
      count: purchaseOrderStage.totalCount || 0,
      value: purchaseOrderStage.totalValue || 0,
      color: 'info'
    },
    {
      name: 'Invoices',
      count: invoiceStage.totalCount || 0,
      value: invoiceStage.totalValue || 0,
      color: 'success'
    }
  ];

  return (
    <Card className="shadow-sm border-0" style={{ borderRadius: '8px' }}>
      <CardBody className="p-3">
        <h6 className="mb-3 fw-bold text-primary">Procurement Pipeline Overview</h6>

        {/* Summary */}
        <div className="mb-4 pb-3 border-bottom">
          <Row className="text-center">
            <Col xs={6}>
              <div className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                Total Items
              </div>
              <div className="fs-3 fw-bold text-primary">
                {formatNumber(pipelineSummary.itemsInPipeline || 0)}
              </div>
            </Col>
            <Col xs={6}>
              <div className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                Total Value
              </div>
              <div className="fs-3 fw-bold text-success">
                {formatCurrency(pipelineSummary.totalPipelineValue || 0)}
              </div>
            </Col>
          </Row>
        </div>

        {/* Stages */}
        <Row style={{ fontSize: '0.85rem' }}>
          {stages.map((stage) => (
            <Col lg={4} md={4} key={stage.name} className="mb-3">
              <div
                className="text-center p-3 border rounded"
                style={{ backgroundColor: '#f8f9fa' }}
              >
                <div
                  className={`fw-bold text-${stage.color} mb-2`}
                  style={{ fontSize: '0.9rem' }}
                >
                  {stage.name}
                </div>
                <div className="mb-2">
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Items
                  </div>
                  <div className="fs-4 fw-bold">{formatNumber(stage.count)}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Value
                  </div>
                  <div
                    className="fw-bold text-success"
                    style={{ fontSize: '0.9rem' }}
                  >
                    {formatCurrency(stage.value)}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </CardBody>
    </Card>
  );
};

ProcurementPipelineChart.propTypes = {
  pipelineData: PropTypes.shape({
    requisitionStage: PropTypes.shape({
      totalCount: PropTypes.number,
      totalValue: PropTypes.number
    }),
    purchaseOrderStage: PropTypes.shape({
      totalCount: PropTypes.number,
      totalValue: PropTypes.number
    }),
    invoiceStage: PropTypes.shape({
      totalCount: PropTypes.number,
      totalValue: PropTypes.number
    }),
    pipelineSummary: PropTypes.shape({
      itemsInPipeline: PropTypes.number,
      totalPipelineValue: PropTypes.number
    })
  })
};

ProcurementPipelineChart.defaultProps = {
  pipelineData: {
    requisitionStage: {
      totalCount: 0,
      totalValue: 0
    },
    purchaseOrderStage: {
      totalCount: 0,
      totalValue: 0
    },
    invoiceStage: {
      totalCount: 0,
      totalValue: 0
    },
    pipelineSummary: {
      itemsInPipeline: 0,
      totalPipelineValue: 0
    }
  }
};

export default ProcurementPipelineChart;
