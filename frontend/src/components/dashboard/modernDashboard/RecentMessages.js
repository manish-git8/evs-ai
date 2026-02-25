import { ListGroup, ListGroupItem } from 'reactstrap';
import SimpleBar from 'simplebar-react';
import DashCard from '../dashboardCards/DashCard';
import user1 from '../../../assets/images/users/user1.jpg';
import user2 from '../../../assets/images/users/user2.jpg';
import user3 from '../../../assets/images/users/user3.jpg';
import user4 from '../../../assets/images/users/user4.jpg';
import user5 from '../../../assets/images/users/user5.jpg';

const msgsData = [
  {
    image: user1,
    name: 'James Anderson',
    comment:
      'Request for proposals (RFP) for the procurement of office supplies, including stationery, printer cartridges, and office furniture. Request for proposals (RFP) for the procurement of office supplies, including stationery, printer cartridges, and office furniture',
    date: '10:20 AM',
  },
  {
    image: user2,
    name: 'Mihael Jorden',
    comment: ' Invitation',
    date: '11:32 PM',
  },
  {
    image: user3,
    name: 'Johnathan Doeting',
    comment: 'Request for bids for building maintenance services, including cleaning, repairs, and general upkeep of office premises',
    date: '01:00 AM',
  },
  {
    image: user4,
    name: 'Daniel Kristeen',
    comment: 'Request for quotations (RFQ) for catering services for the annual company conference, including breakfast, lunch, and refreshments.',
    date: '02:45 PM',
  },
  {
    image: user5,
    name: 'Jan Petrovic',
    comment: 'Call for proposals for custom software development to support new business processes and enhance operational efficiency',
    date: '06:00 AM',
  },
  {
    image: user1,
    name: 'Hanna Gover',
    comment: 'Request for proposals (RFP) for the installation of comprehensive security systems, including surveillance cameras, alarms, and access control systems.',
    date: '08:11 PM',
  },
];

const RecentMessages = () => {
  return (
    <DashCard title="Announcements" 
    subtitle="Daily updated announcements"
    subTitleStyle={{ color: '#007bff', fontSize: '14px'}}
    >
      <SimpleBar style={{ height: '415px' }}>
        <ListGroup flush style={{fontSize: "14px" , backgroundColor : "#009cf8"}}>
          {msgsData.map((icomment) => (
            <ListGroupItem
              action
              href="#"
              tag="a"
              key={icomment.name}
              className="border-0 p-3 w-100 rounded"
            >
              <div className="d-flex align-items-center">
                {/* <img src={icomment.image} alt="user" width="50" className="rounded-circle" /> */}
                <div className="ms-3 col-10">
                  {/* <ListGroupItemHeading className="fw-bold mb-0 text-truncate">
                    {icomment.name}
                  </ListGroupItemHeading> */}
                  <span >{icomment.comment}</span>
                  {/* <small className="text-muted">{icomment.date}</small> */}
                </div>
              </div>
            </ListGroupItem>
          ))}
        </ListGroup>
      </SimpleBar>
    </DashCard>
  );
};

export default RecentMessages;
