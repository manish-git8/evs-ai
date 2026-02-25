import { Card, CardBody, CardTitle, CardSubtitle } from 'reactstrap';
import PropTypes from 'prop-types';
import StepZilla from 'react-stepzilla';
import '../pages/CompanyRegistration/CompanyRegistrationSteps/steps.scss';

const ComponentCardNoSteps = ({ children, title, steps, subtitle }) => {
  return (
    <Card>
      <CardTitle tag="h4" className="px-4 py-3 mb-0">
        {title}

        <div className="step-progress" style={{ marginTop: '-45px' }}>
          <StepZilla steps={steps} showNavigation={false} showSteps={false}/>
        </div>
      </CardTitle>
      <CardBody className="p-0">
        <CardSubtitle className="text-muted mb-3">{subtitle || ''}</CardSubtitle>

        <div>{children}</div>
      </CardBody>
    </Card>
  );
};

ComponentCardNoSteps.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.node,
  steps: PropTypes.node,
};

export default ComponentCardNoSteps;
