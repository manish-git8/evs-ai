import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col } from 'reactstrap';
import '../CompanyManagement/ReactBootstrapTable.scss';
import ComponentCard from '../../components/ComponentCard';

const Receipt = () => {
  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col md="12">
          <ComponentCard title="Receipt">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <input
                type="text"
                placeholder="Search..."
                className="form-control me-2"
                style={{ width: '300px' }}
              />
              <button className="btn btn-primary" type="button">
                Add New
              </button>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                striped
                hover
                condensed
                pagination
                options={options}
                tableHeaderClass="mb-0"
              >
                <TableHeaderColumn
                  isKey
                  dataField="name"
                  dataAlign="left"
                  headerAlign="left"
                  width="30%"
                >
                  Name
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="notes"
                  dataAlign="left"
                  headerAlign="left"
                  width="30%"
                >
                  Notes
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="supplierId"
                  dataAlign="left"
                  headerAlign="left"
                  width="30%"
                >
                  Supplier ID
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="actions"
                  dataAlign="center"
                  headerAlign="center"
                  width="10%"
                >
                  Actions
                </TableHeaderColumn>
              </BootstrapTable>
            </div>
          </ComponentCard>
        </Col>
      </Row>
    </div>
  );
};

export default Receipt;
