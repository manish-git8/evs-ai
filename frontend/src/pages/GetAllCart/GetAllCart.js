import React, { useEffect, useState } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Row, Col, CardBody, Card } from 'reactstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import CartService from '../../services/CartService';
import { getEntityId, getUserId } from '../localStorageUtil';

function onAfterDeleteRow(rowKeys) {
  alert(`The rowkey you dropped: ${rowKeys}`);
}

const GetAllCart = () => {
  const [cartData, setCartData] = useState([]);
  const companyId = getEntityId();
  const userId = getUserId();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const fetchCarts = async (pageNumber = 0) => {
    try {
      const response = await CartService.getCartsPaginated(companyId, pageSize, pageNumber, '', userId);
      
      // Handle both paginated response structure and legacy structure
      const responseData = response.data?.content ? response.data.content : (response.data || []);
      const totalCount = response.data?.totalElements || responseData.length;
      
      setCartData(responseData);
      setTotalElements(totalCount);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching cart data:', error);
      setCartData([]);
    }
  };

  const options = {
    afterDeleteRow: onAfterDeleteRow,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: currentPage + 1, // BootstrapTable uses 1-based indexing
    sizePerPage: pageSize,
    totalSize: totalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1; // Convert to 0-based indexing
      setCurrentPage(pageIndex);
      fetchCarts(pageIndex);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} carts
      </span>
    ),
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  return (
    <div>
      <Row>
        <Col md="12">
          <Card title="Company Management List">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <h4>My Cart</h4>
                <button className="btn btn-primary" type="button">
                  Add New
                </button>
              </div>
              <div className="table-responsive">
                <BootstrapTable
                  striped
                  hover
                  condensed
                  data={cartData}
                  pagination={totalElements > pageSize}
                  remote
                  fetchInfo={{
                    dataTotalSize: totalElements
                  }}
                  options={options}
                  tableHeaderClass="mb-0"
                >
                  <TableHeaderColumn width="150" dataField="productName" isKey>
                    Product Name
                  </TableHeaderColumn>
                  <TableHeaderColumn width="100" dataField="category">
                    Category
                  </TableHeaderColumn>
                  <TableHeaderColumn width="150" dataField="brand">
                    Brand
                  </TableHeaderColumn>
                  <TableHeaderColumn width="100" dataField="price">
                    Price
                  </TableHeaderColumn>
                  <TableHeaderColumn width="100" dataField="quantity">
                    Quantity
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GetAllCart;
