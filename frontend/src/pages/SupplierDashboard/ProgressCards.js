import React, { useEffect, useState } from 'react';
import { Row, Col, Card, CardBody } from 'reactstrap';
import { Link } from 'react-router-dom';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import { getEntityId } from '../localStorageUtil';
import { CartConstant } from '../../constant/CartConstant';

const ProgressCards = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const supplierId = getEntityId();

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        const response = await PurchaseOrderService.getPurchaseOrders(supplierId);
        const data = response?.data;
        const list = data && Array.isArray(data.content)
          ? data.content
          : Array.isArray(data)
          ? data
          : [];
        setPurchaseOrders(list);
      } catch (error) {
        console.error('Failed to fetch purchase orders:', error);
      }
    };

    fetchPurchaseOrders();
  }, [supplierId]);

  const calculateTotalAmountByStatus = (statuses) => {
    const statusArray = Array.isArray(statuses) ? statuses : [statuses];
    const ordersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    return ordersArray
      .filter((order) => statusArray.includes(order.orderStatus?.toUpperCase()))
      .reduce((total, order) => total + order.orderTotal, 0);
  };

  const calculateCountByStatus = (statuses) => {
    const statusArray = Array.isArray(statuses) ? statuses : [statuses];
    const ordersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    return ordersArray.filter((order) => 
      statusArray.includes(order.orderStatus?.toUpperCase())
    ).length;
  };

  const formatAmount = (value) => {
    if (value >= 1e7) {
      return `${(value / 1e7).toFixed(1)}Cr`;
    }
    if (value >= 1e5) {
      return `${(value / 1e5).toFixed(1)}L`;
    }
    if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toFixed(2);
  };

  const progressCardData = [
    {
      title: 'Pending',
      subtitle: 'Awaiting Confirmation',
      status: CartConstant.SUBMITTED,
      bgColor: '#ffc107',
      bgLight: 'rgba(255, 193, 7, 0.1)',
      icon: 'bi-clock-history',
      description: 'Orders pending supplier acknowledgment',
      badgeClass: 'bg-warning bg-opacity-10 text-warning',
    },
    {
      title: 'Confirmed',
      subtitle: 'Confirmed & Processing',
      status: [CartConstant.CONFIRMED, CartConstant.PARTIALLY_CONFIRMED],
      bgColor: '#28a745',
      bgLight: 'rgba(40, 167, 69, 0.1)',
      icon: 'bi-check-circle-fill',
      description: 'Orders confirmed and in fulfillment',
      badgeClass: 'bg-success bg-opacity-10 text-success',
    },
    {
      title: 'Shipped',
      subtitle: 'Out for Delivery',
      status: 'SHIPPED',
      bgColor: '#6f42c1',
      bgLight: 'rgba(111, 66, 193, 0.1)',
      icon: 'bi-truck',
      description: 'Orders shipped and in transit',
      badgeClass: 'bg-purple bg-opacity-10',
      badgeTextColor: '#6f42c1',
    },
    {
      title: 'Closed',
      subtitle: 'Completed/Cancelled',
      status: 'CLOSED',
      bgColor: '#dc3545',
      bgLight: 'rgba(220, 53, 69, 0.1)',
      icon: 'bi-x-circle-fill',
      description: 'Orders delivered or cancelled',
      badgeClass: 'bg-danger bg-opacity-10 text-danger',
    },
  ];

  return (
    <Row>
      {progressCardData.map((data) => {
        const count = calculateCountByStatus(data.status);
        const amount = calculateTotalAmountByStatus(data.status);

        return (
          <Col lg="3" md="6" className="mb-3" key={data.title}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: '12px',
                borderLeft: `4px solid ${data.bgColor}`,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: data.bgLight,
                    }}
                  >
                    <i
                      className={`bi ${data.icon}`}
                      style={{ fontSize: '24px', color: data.bgColor }}
                    ></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-0 text-muted" style={{ fontSize: '13px', fontWeight: '500' }}>
                      {data.title}
                    </h6>
                    <small className="text-muted" style={{ fontSize: '11px' }}>
                      {data.subtitle}
                    </small>
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-end">
                  <div>
                    <h3 className="mb-0 fw-bold" style={{ color: data.bgColor }}>
                      {formatAmount(amount)}
                    </h3>
                    <small className="text-muted">Total Value</small>
                  </div>
                  <div className="text-end">
                    <Link
                      to={`/purchase-order?status=${data.status}&dashboard=true`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className={`badge ${data.badgeClass}`}
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: data.badgeTextColor || '',
                        }}
                      >
                        {count} {count === 1 ? 'Order' : 'Orders'}
                      </div>
                    </Link>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-top">
                  <small className="text-muted">{data.description}</small>
                </div>
              </CardBody>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default ProgressCards;