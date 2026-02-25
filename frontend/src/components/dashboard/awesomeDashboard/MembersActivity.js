import { ButtonGroup, Button, Table } from 'reactstrap';
import DashCard from '../dashboardCards/DashCard';
import user1 from '../../../assets/images/users/user1.jpg';
import user2 from '../../../assets/images/users/user2.jpg';
import user3 from '../../../assets/images/users/user3.jpg';
import user4 from '../../../assets/images/users/user4.jpg';
import user5 from '../../../assets/images/users/user5.jpg';

const tableData = [
  {
    avatar: user1,
    name: 'Hanna Gover',
    earnings: '3,450',
    posts: 'Low',
  },
  {
    avatar: user2,
    name: 'Daniel Kristeen',
    earnings: '1,222',
    posts: 'Medium',
  },
  {
    avatar: user3,
    name: 'Julian Josephs',
    earnings: '4,560',
    posts: 'High',
  },
  {
    avatar: user4,
    name: 'Jan Petrovic',
    earnings: '7,000',
    posts: 'Low',
  },
  {
    avatar: user5,
    name: 'Hanna Gover',
    earnings: '4,000',
    posts: 'Medium',
  },
];

const MembersActivity = () => {
  return (
    <DashCard
      title="Members Activity"
      subtitle="what members preformance status"
      actions={
        <ButtonGroup>
          <Button color="primary">Today</Button>
          <Button color="primary">Week</Button>
          <Button color="primary">Month</Button>
        </ButtonGroup>
      }
    >
      <div className="table-responsive">
        <Table className="text-nowrap mt-3 mb-0 align-middle custom-table" borderless>
          <thead>
            <tr>
              <th>Name</th>
              <th>Earnings</th>
              <th>Post</th>
              <th>Reviews</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((tdata) => (
              <tr key={tdata.avatar} className={`border-top ${tdata.isActive}`}>
                <td>
                  <div className="d-flex align-items-center">
                    <img
                      src={tdata.avatar}
                      className="rounded-circle"
                      alt="avatar"
                      width="50"
                      height="50"
                    />
                    <div className="ms-3">
                      <h6 className="mb-0 fw-bold">{tdata.name}t</h6>
                    </div>
                  </div>
                </td>
                <td>${tdata.earnings}</td>
                <td>{tdata.posts}</td>
                <td>
                  <i className="bi bi-star-fill text-warning"></i>
                  <i className="bi bi-star-fill text-warning"></i>
                  <i className="bi bi-star-fill text-warning"></i>
                  <i className="bi bi-star-fill text-warning"></i>
                  <i className="bi bi-star text-warning"></i>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </DashCard>
  );
};

export default MembersActivity;
