import { Card, CardBody, CardTitle, Progress, Row, Col, Button } from 'reactstrap';

import img1 from '../../../assets/images/bg/photoshop.jpg';
import img2 from '../../../assets/images/bg/sketch.jpg';
import img3 from '../../../assets/images/bg/figma.jpg';

const exdata = [
  {
    id: 1,
    img: img1,
    title: 'Photoshop',
    subtext: 'This is a sample text',
    color: 'info',
    value: 40,
  },
  {
    id: 2,
    img: img2,
    title: 'Sketch',
    subtext: 'This is a sample text',
    color: 'primary',
    value: 60,
  },
  {
    id: 3,
    img: img3,
    title: 'Figma',
    subtext: 'This is a sample text',
    color: 'danger',
    value: 70,
  },
];

const Experiances = () => {
  return (
    <Card>
      <CardBody className="border-bottom">
        <CardTitle tag="h4" className="mb-4 pb-2">
          Experiances
        </CardTitle>

        {exdata.map((edata) => (
          <div className="mt-4 d-md-flex align-items-center" key={edata.id}>
            <div className="d-flex align-items-center">
              <img src={edata.img} alt={edata.img} />
              <div className="ms-3">
                <h4 className='mb-1'>{edata.title}</h4>
                <span className="text-muted">{edata.subtext}</span>
              </div>
              
            </div>
            <div className="ms-md-auto mt-3 mt-md-0 w-50">
                <Progress className="w-100" color={edata.color} value={edata.value} />
              </div>
          </div>
        ))}
      </CardBody>
      <CardBody className="my-2">
        <Row>
          <Col md="4" className="text-center">
            <h3>5486</h3>
            <span className="text-muted">Projects</span>
          </Col>
          <Col md="4" className="text-center mt-3 mt-md-0">
            <h3>987</h3>
            <span className="text-muted">Winning Entries</span>
          </Col>
          <Col md="4" className="justify-content-end d-flex align-items-center mt-3 mt-md-0">
            <Button color="primary">Hire me</Button>
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default Experiances;
