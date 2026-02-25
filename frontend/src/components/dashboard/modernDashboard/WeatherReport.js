import { Col, Input, Table, Row } from 'reactstrap';
import DashCard from '../dashboardCards/DashCard';

const weatherData = [
  {
    icon: 'cloud-fog',
    time: '09:30',
    deg: '70',
  },
  {
    icon: 'cloud-fog2',
    time: '11:30',
    deg: '72',
  },
  {
    icon: 'cloud-hail',
    time: '13:30',
    deg: '75',
  },
  {
    icon: 'cloud-haze',
    time: '15:30',
    deg: '76',
  },
];

const WeatherReport = () => {
  return (
    <DashCard
      title="Weather Report"
      subtitle="January 2022"
      actions={
        <Input type="select" className="form-select">
          <option value="0">Monthly</option>
          <option value="1">Daily</option>
          <option value="2">Weekly</option>
          <option value="3">Yearly</option>
        </Input>
      }
    >
      <div className="d-flex align-items-center flex-row mt-4 pt-1">
        <div className="p-2 display-5 text-primary">
          <i className="bi bi-cloud-drizzle"></i>
          <span>
            73<sup>°</sup>
          </span>
        </div>
        <div className="p-2">
          <h3 className="mb-0">Saturday</h3>
          <small className="text-muted">Ahmedabad, India</small>
        </div>
      </div>
      <div className="table-responsive border-bottom">
        <Table borderless className="mt-3 mb-4 pb-2">
          <tbody>
            <tr>
              <td className="text-muted">Wind</td>
              <td>ESE 17 mph</td>
            </tr>
            <tr>
              <td className="text-muted">Humidity</td>
              <td>83%</td>
            </tr>
            <tr>
              <td className="text-muted">Pressure</td>
              <td>28.56 in</td>
            </tr>
            <tr>
              <td className="text-muted">Cloud Cover</td>
              <td>78%</td>
            </tr>
            <tr>
              <td className="text-muted">Ceiling</td>
              <td>25760 ft</td>
            </tr>
          </tbody>
        </Table>
      </div>

      <Row className="mt-4">
        {weatherData.map((wdata) => (
          <Col xs="3" className="text-center" key={wdata.icon}>
            <i className={`d-block fs-2 text-primary bi bi-${wdata.icon}`} />
            <span className="d-block text-muted text-nowrap pt-2">{wdata.time}</span>
            <h3 className="fw-light mt-1">
              {wdata.deg}
              <sup>°</sup>
            </h3>
          </Col>
        ))}
      </Row>
    </DashCard>
  );
};

export default WeatherReport;
