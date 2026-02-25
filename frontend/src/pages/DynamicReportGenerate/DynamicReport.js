import { useState, useEffect } from 'react';
import { Row, Col, Card, CardBody, CardTitle } from 'reactstrap';
import { PieChartComponent, BarChartComponent, LineChartComponent, DoughnutChartComponent } from './ChartComponents';
import ReportService from '../../services/ReportService';
import { getEntityId, getEntityType } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';

const DynamicReport = () => {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const companyId = getEntityId();
  const entityType = getEntityType();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await ReportService.getAllDefaultReport(entityType);
        setCharts(response?.data);
        setLoading(false);
      } catch (err) {
        setError(err?.message || 'Failed to fetch reports');
        setLoading(false);
      }
    };

    fetchReports();
  }, [companyId]);

  const renderChart = (chart) => {
    console.log(chart?.chartType);
    switch (chart?.chartType) {      
      case 'PIE':
        return <PieChartComponent data={chart.data} options={chart?.options} />;
      case 'BAR':
        return <BarChartComponent data={chart.data} options={chart?.options} />;
      case 'LINE':
        return <LineChartComponent data={chart.data} options={chart?.options} />;
      case 'DOUGHNUT':       
        return <DoughnutChartComponent data={chart.data} options={chart?.options}/>;
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  if (loading) {
    return <div className="p-3">Loading reports...</div>;
  }

  if (error) {
    return <div className="p-3">No reports available</div>;
  }

  if (charts.length === 0) {
    return <div className="p-3">No reports available</div>;
  }

  return (
    <div className="p-3" style={{ paddingTop: '24px' }}>
      <h3 className="mb-4">Sales Data Visualization</h3>
      <Row className="mb-4">
        {charts.map((chart) => {
          const chartTitle = chart?.options?.plugins?.title?.text || 'Untitled Chart';
          const uniqueKey = `${chart?.chartType}-${chartTitle?.replace(/\s+/g, '-')}`;

          return (
            <Col key={uniqueKey} xl="4" lg="4" md="4" sm="12" className="mb-4">
              <Card className="chart-card">
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

      <style>{`
        .chart-card {
          border: 1px solid #e3e6f0;
          border-radius: 8px;
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
          transition: all 0.3s;
        }

        .chart-card:hover {
          box-shadow: 0 0.25rem 2rem 0 rgba(58, 59, 69, 0.2);
        }

        .chart-title {
          color: #5a5c69;
          font-weight: 600;
          margin-bottom: 1rem;
          border-bottom: 1px solid #e3e6f0;
          padding-bottom: 0.5rem;
        }

        .chart-container {
          height: 300px;
          position: relative;
        }

        .card-body {
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default DynamicReport;
