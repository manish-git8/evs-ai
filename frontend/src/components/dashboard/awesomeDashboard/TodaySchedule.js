import { Button } from 'reactstrap';
import DashCard from '../dashboardCards/DashCard';
import "./TodaySchedule.scss";

import img1 from '../../../assets/images/users/user1.jpg';
import img2 from '../../../assets/images/users/user2.jpg';
import img3 from '../../../assets/images/users/user3.jpg';
import img4 from '../../../assets/images/users/user4.jpg';
import img5 from '../../../assets/images/users/user5.jpg';

const TodaySchedule = () => {
  return (
    <DashCard title="Today 's Schedule" subtitle="check out your daily schedule">
      <div className="steamline position-relative border-start ms-4">
        <div className="sl-item my-3 py-1 border-bottom">
          <div className="sl-left float-start text-center rounded-circle text-white bg-success bg-success">
            <img className="rounded-circle" width="40" alt="user" src={img1} />
          </div>
          <div className="sl-right ms-3 ps-4 py-2">
            <div className="font-weight-medium">
              Meeting today <span className="sl-date"> 5 pm </span>
            </div>
            <div className="text-muted"> you can write anything </div>
          </div>
        </div>
        <div className="sl-item my-3 py-1 border-bottom">
          <div className="sl-left float-start text-center rounded-circle text-white bg-success bg-info">
            <img className="rounded-circle" width="40" alt="user" src={img2} />
          </div>
          <div className="sl-right ms-3 ps-4 py-2">
            <div className="font-weight-medium">Send documents to Clark</div>
            <div className="text-muted"> Lorem Ipsum is simply </div>
          </div>
        </div>
        <div className="sl-item my-3 py-1 border-bottom">
          <div className="sl-left float-start text-center rounded-circle text-white  bg-success">
            <img className="rounded-circle" width="40" alt="user" src={img3} />
          </div>
          <div className="sl-right ms-3 ps-4 py-2">
            <div>
              <a href="/"> Gohn Doe </a>
              <span className="sl-date">5 minutes ago</span>
            </div>
            <div className="text-muted"> Call today with gohn doe </div>
          </div>
        </div>
        <div className="sl-item my-3 py-1 border-bottom">
          <div className="sl-left float-start text-center rounded-circle text-white bg-success">
            <img className="rounded-circle" width="40" alt="user" src={img4} />
          </div>
          <div className="sl-right ms-3 ps-4 py-2">
            <div className="font-weight-medium">
              Go to the Doctor
              <span className="sl-date"> 5 minutes ago </span>
            </div>
            <div className="text-muted"> Contrary to popular belief </div>
          </div>
        </div>
        <div className="sl-item my-3 py-1 border-bottom">
          <div className="sl-left float-start text-center rounded-circle text-white bg-success">
            <img className="rounded-circle" width="40" alt="user" src={img5} />
          </div>
          <div className="sl-right ms-3 ps-4 py-2">
            <div>
              <a href="/"> Tiger Sroff </a>
              <span className="sl-date">5 minutes ago</span>
            </div>
            <div className="text-muted">
              Approve meeting with tiger Contrary to popular belief
              <div className='mt-3'>
                <Button size="sm" color="primary">
                  Accept
                </Button>
                <Button size="sm" color="outline-danger" className="ms-1">
                  Refuse
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashCard>
  );
};

export default TodaySchedule;
