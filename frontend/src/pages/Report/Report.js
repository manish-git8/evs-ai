import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from 'reactstrap';
import {
  PieChartComponent,
  BarChartComponent,
  LineChartComponent,
  DoughnutChartComponent,
} from '../DynamicReportGenerate/ChartComponents';
import ReportService from '../../services/ReportService';
import { getEntityId, getEntityType, getUserId } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';

const Report = () => {
  const [defaultCharts, setDefaultCharts] = useState([]);
  const [customCharts, setCustomCharts] = useState([]);
  const [loading, setLoading] = useState({
    default: true,
    custom: true,
  });
  const [error, setError] = useState({
    default: null,
    custom: null,
  });
  const [activeTab, setActiveTab] = useState('default');
  const companyId = getEntityId();
  const entityType = getEntityType();
  const userId = getUserId();

  useEffect(() => {
    const fetchDefaultReports = async () => {
      try {
        const response = await ReportService.getAllDefaultReport(entityType, companyId);
        setDefaultCharts(response?.data || []);
        setLoading((prev) => ({ ...prev, default: false }));
      } catch (err) {
        setError((prev) => ({
          ...prev,
          default: err?.message || 'Failed to fetch default reports',
        }));
        setLoading((prev) => ({ ...prev, default: false }));
      }
    };

    const fetchCustomReports = async () => {
      try {
        const response = await ReportService.getAllCustomizeReport(entityType, companyId, userId);
        setCustomCharts(response?.data || []);
        setLoading((prev) => ({ ...prev, custom: false }));
      } catch (err) {
        setError((prev) => ({ ...prev, custom: err?.message || 'Failed to fetch custom reports' }));
        setLoading((prev) => ({ ...prev, custom: false }));
      }
    };

    fetchDefaultReports();
    fetchCustomReports();
  }, [companyId, entityType]);

  const renderChart = (chart) => {
    switch (chart?.chartType) {
      case 'PIE':
        return <PieChartComponent data={chart.data} options={chart?.options} />;
      case 'BAR':
        return <BarChartComponent data={chart.data} options={chart?.options} />;
      case 'LINE':
        return <LineChartComponent data={chart.data} options={chart?.options} />;
      case 'DOUGHNUT':
              console.log('DOUGHNUT');
              return <DoughnutChartComponent data={chart.data} options={chart?.options}/>;
      default:
        return <div>Data not available in the chart</div>;
    }
  };

  const renderCharts = (charts, type) => {
    if (loading[type]) {
      return <div className="p-3">Loading {type} reports...</div>;
    }

    if (error[type]) {
      return (
        <div className="p-3">
          Error loading {type} reports: {error[type]}
        </div>
      );
    }

    if (charts.length === 0) {
      return <div className="p-3">No {type} reports available</div>;
    }

    return (
      <Row className="mb-4">
        {charts.map((chart, index) => {
          const chartTitle = chart?.options?.plugins?.title?.text || 'Report Chart';
          const uniqueKey = `${chart?.chartType}-${chartTitle?.replace(/\s+/g, '-')}-${index}`;

          return (
            <Col key={uniqueKey} xl="4" lg="4" md="4" sm="12" className="mb-4">
              <Card className="chart-card" >
                <CardBody style={{ boxShadow: 'none' }}>
                  <CardTitle tag="h5" className="chart-title">
                    {chartTitle}
                  </CardTitle>
                  <div className="chart-container" style={{ boxShadow: 'none' }}>
                    {renderChart(chart)}
                  </div>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <div className="p-3">
      <Nav tabs className="mb-4">
        <NavItem>
          <NavLink active={activeTab === 'default'} onClick={() => setActiveTab('default')}>
            Default Reports
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink active={activeTab === 'custom'} onClick={() => setActiveTab('custom')}>
            Customized Reports
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={activeTab}>
        <TabPane tabId="default">{renderCharts(defaultCharts, 'default')}</TabPane>
        <TabPane tabId="custom">{renderCharts(customCharts, 'custom')}</TabPane>
      </TabContent>
    </div>
  );
};

export default Report;
