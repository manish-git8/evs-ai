import { Card, CardBody, CardSubtitle, CardTitle, Input, Table } from 'reactstrap';

import user1 from '../../../assets/images/users/user1.jpg';
import user2 from '../../../assets/images/users/user2.jpg';
import user3 from '../../../assets/images/users/user3.jpg';
import user4 from '../../../assets/images/users/user4.jpg';
import user5 from '../../../assets/images/users/user5.jpg';

const tableData = [
  {
    id: 1,
    avatar: user1,
    name: 'Hanna Gover',
    status: 'Sale',
    date: 'April 9, 2022',
    price: '95K',
  },
  {
    id: 2,
    avatar: user2,
    name: 'Daniel Kristeen',
    status: 'High',
    date: 'April 9, 2022',
    price: '95K',
  },
  {
    id: 3,
    avatar: user3,
    name: 'Julian Josephs',
    status: 'Tax',
    date: 'April 9, 2022',
    price: '95K',
  },
  {
    id: 4,
    avatar: user4,
    name: 'Jan Petrovic',
    status: 'Extended',
    date: 'April 9, 2022',
    price: '95K',
  },
  {
    id: 5,
    avatar: user5,
    name: 'Hanna Gover',
    status: 'Buy',
    date: 'April 9, 2022',
    price: '95K',
  },
];

const SalesOverview = () => {
  return (
    <Card>
      <CardBody>
        <div className="d-md-flex align-items-center">
          <div>
            <CardTitle tag="h4">Sales Overview</CardTitle>
            <CardSubtitle className="text-muted mb-0">Check the monthly sales</CardSubtitle>
          </div>

          <div className="ms-auto">
            <Input type="select" className="form-select">
              <option value="0">Monthly</option>
              <option value="1">Daily</option>
              <option value="2">Weekly</option>
              <option value="3">Yearly</option>
            </Input>
          </div>
        </div>
      </CardBody>
      <div className="py-3 px-4 bg-light">
        <div className="d-md-flex align-items-center">
          <div>
            <h3 className='mb-1'>March 2022</h3>
            <span className="text-muted fs-6">Report for this month</span>
          </div>

          <div className="ms-auto">
            <h2 className="text-primary mb-0">$3,690</h2>
          </div>
        </div>
      </div>
      <div className="table-responsive">
        <Table className="text-nowrap mb-0 align-middle" hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Date</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((tdata) => (
              <tr key={tdata.id}>
                <td>
                  <div className='d-flex align-items-center'> 
                  <img
                      src={tdata.avatar}
                      className="rounded-circle"
                      alt="avatar"
                      width="50"
                      height="50"
                    />
                  <h6 className="mb-0 ms-3">{tdata.name}</h6>
                  </div>
                
                </td>

                <td>
                  {tdata.status === 'Sale' ? (
                    <span className="badge text-dark-white bg-success d-inline-block">
                      {tdata.status}
                    </span>
                  ) : tdata.status === 'High' ? (
                    <span className="badge text-dark-white bg-danger d-inline-block">
                      {tdata.status}
                    </span>
                  ) : tdata.status === 'Buy' ? (
                    <span className="badge text-dark-white bg-warning d-inline-block">
                      {tdata.status}
                    </span>
                  ) : tdata.status === 'Extended' ? (
                    <span className="badge text-dark-white bg-primary d-inline-block">
                      {tdata.status}
                    </span>
                  ) : (
                    <span className="badge text-dark-white bg-info d-inline-block">
                      {tdata.status}
                    </span>
                  )}
                </td>
                <td className='text-muted'>{tdata.date}</td>
                <td>${tdata.price}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
};

export default SalesOverview;
