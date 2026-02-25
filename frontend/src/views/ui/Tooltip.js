/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { Tooltip, Button, Row, Col } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';

import ComponentCard from '../../components/ComponentCard';

const TooltipItem = (props) => {
  const { item, id } = props;
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const toggle = () => setTooltipOpen(!tooltipOpen);

  return (
    <span>
      <Button className="me-3" color="outline-primary" id={`Tooltip-${id}`}>
        {item.text}
      </Button>
      <Tooltip
        placement={item.placement}
        isOpen={tooltipOpen}
        target={`Tooltip-${id}`}
        toggle={toggle}
        
      >
        Tooltip Content!
      </Tooltip>
    </span>
  );
};


const TooltipItem2 = (props) => {
  const { item, id } = props;
  const [tooltipOpen2, setTooltipOpen2] = useState(false);

  const toggle2 = () => setTooltipOpen2(!tooltipOpen2);

  return (
    <span>
      <Button className="me-3" color="outline-primary" id={`Tooltip2-${id}`}>
        {item.text}
      </Button>
      <Tooltip
        placement={item.placement}
        isOpen={tooltipOpen2}
        target={`Tooltip2-${id}`}
        toggle={toggle2}
        trigger="click"
        
      >
        Tooltip Content!
      </Tooltip>
    </span>
  );
};


const TooltipComponent = () => {
  return (
    <div>
      <BreadCrumbs />
      {/* --------------------------------------------------------------------------------*/}
      {/* Row*/}
      {/* --------------------------------------------------------------------------------*/}
      <Row>
        <Col xs="12" md="6">
      <ComponentCard title="Tooltip - On Hover">
        <>
          {[
            {
              placement: 'top',
              text: 'Top',
            },
            {
              placement: 'bottom',
              text: 'Bottom',
            },
            {
              placement: 'left',
              text: 'Left',
            },
            {
              placement: 'right',
              text: 'Right',
            },
          ].map((tooltip, i) => {
            return <TooltipItem key={tooltip.placement} item={tooltip} id={i} />;
          })}
        </>
      </ComponentCard>
      </Col>

      <Col xs="12" md="6">
      <ComponentCard title="Tooltip - On Click">
        <>
          {[
            {
              placement: 'top',
              text: 'Top',
            },
            {
              placement: 'bottom',
              text: 'Bottom',
            },
            {
              placement: 'left',
              text: 'Left',
            },
            {
              placement: 'right',
              text: 'Right',
            },
          ].map((tooltip2, i) => {
            return <TooltipItem2 key={tooltip2.placement} item={tooltip2} id={i} />;
          })}
        </>
      </ComponentCard>
      </Col>
      </Row>
      {/* -------------------------------------------------------------------------------- */}
      {/* Row */}
      {/* -------------------------------------------------------------------------------- */}
    </div>
  );
};

export default TooltipComponent;
