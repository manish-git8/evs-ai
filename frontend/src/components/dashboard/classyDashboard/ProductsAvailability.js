import { Input, Table } from 'reactstrap';
import DashCard from '../dashboardCards/DashCard';

const tableData = [
  {
    id: 1,
    isActive: 'active',
    color: 'primary',
    title: 'Apple iPhone 6 Space Grey, 16 GB',
    pid: '5457',
    quantity: '357',
    price: '435',
    icon: 'bi bi-cart',
  },
  {
    id: 2,
    isActive: '',
    color: 'warning',
    title: 'Fossil Marshall For Men Black Smartwatch',
    pid: '5457',
    quantity: '357',
    price: '435',
    icon: 'bi bi-shop',
  },
  {
    id: 3,
    isActive: '',
    color: 'danger',
    title: 'Sony Bravia 80cm - 32 HD Ready LED TV',
    pid: '5457',
    quantity: '357',
    price: '435',
    icon: 'bi bi-cart',
  },
  {
    id: 4,
    isActive: '',
    color: 'info',
    title: 'Panasonic P75 Champagne Gold, 8 GB',
    pid: '5457',
    quantity: '357',
    price: '435',
    icon: 'bi bi-house',
  },
];

const ProductsAvailability = () => {
  return (
    <DashCard
      title="Products Availability"
      subtitle="March 2022"
      actions={
        <Input type="select" className="form-select">
          <option value="0">Electronics</option>
          <option value="1">Kichen</option>
          <option value="2">Wooden</option>
        </Input>
      }
    >
      <div className="table-responsive">
        <Table className="text-nowrap mt-3 mb-0 align-middle custom-table" borderless>
          <thead>
            <tr>
              <th>Product</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((tdata) => (
              <tr key={tdata.id} className={`border-top ${tdata.isActive}`}>
                <td style={{ width: '90px' }}>
                  <div
                    className={`circle-box md-box flex-shrink-0 bg-${tdata.color} text-dark-white`}
                  >
                    <i className={tdata.icon}></i>
                  </div>
                </td>
                <td>
                  <h5 className="mb-0">{tdata.title}</h5>
                  <div>
                    <span className="text-muted">Product id : MI{tdata.pid}</span>
                  </div>
                </td>
                <td>{tdata.quantity}</td>
                <td>${tdata.price}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </DashCard>
  );
};

export default ProductsAvailability;
