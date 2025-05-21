import React, { useEffect, useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ptBR } from 'date-fns/locale';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Constantes
const TIME_RANGES = {
  ALL: 'all',
  HOURS_24: '24hours',
  DAYS_7: '7days',
  DAYS_14: '14days',
  DAYS_28: '28days',
};

const TIME_RANGE_LABELS = {
  [TIME_RANGES.ALL]: 'Todo o período',
  [TIME_RANGES.HOURS_24]: '24 Horas',
  [TIME_RANGES.DAYS_7]: '7 Dias',
  [TIME_RANGES.DAYS_14]: '14 Dias',
  [TIME_RANGES.DAYS_28]: '28 Dias',
};

export default function Estatisticas() {
  const [timeRanges, setTimeRanges] = useState({
    glucose: TIME_RANGES.DAYS_7,
    insulin: TIME_RANGES.DAYS_7,
  });
  
  const [chartData, setChartData] = useState({
    glucose: null,
    insulin: null,
  });
  
  const [averages, setAverages] = useState({
    glucose: 0,
    insulin: 0,
  });
  
 
  const sampleData = useMemo(() => ({
    glucose: [
      { timestamp: new Date('2025-05-20T08:30:00'), value: 95 },
      { timestamp: new Date('2025-05-20T13:30:00'), value: 105 },
      { timestamp: new Date('2025-05-20T20:30:00'), value: 125 },
      { timestamp: new Date('2025-05-19T08:30:00'), value: 105 },
      { timestamp: new Date('2025-05-18T08:30:00'), value: 120 },
      { timestamp: new Date('2025-05-17T08:30:00'), value: 110 },
      { timestamp: new Date('2025-05-16T08:30:00'), value: 95 },
      { timestamp: new Date('2025-05-15T08:30:00'), value: 100 },
      { timestamp: new Date('2025-05-14T08:30:00'), value: 115 },
      { timestamp: new Date('2025-05-13T08:30:00'), value: 125 },
      { timestamp: new Date('2025-05-12T08:30:00'), value: 110 },
      { timestamp: new Date('2025-05-11T08:30:00'), value: 105 },
      { timestamp: new Date('2025-05-10T08:30:00'), value: 100 },
      { timestamp: new Date('2025-05-09T08:30:00'), value: 95 },
      { timestamp: new Date('2025-05-08T08:30:00'), value: 110 },
      { timestamp: new Date('2025-05-07T08:30:00'), value: 120 },
    ],
    insulin: [
      { timestamp: new Date('2025-05-20T08:30:00'), value: 10 },
      { timestamp: new Date('2025-05-19T08:30:00'), value: 12 },
      { timestamp: new Date('2025-05-18T08:30:00'), value: 15 },
      { timestamp: new Date('2025-05-17T08:30:00'), value: 13 },
      { timestamp: new Date('2025-05-16T08:30:00'), value: 10 },
      { timestamp: new Date('2025-05-15T08:30:00'), value: 11 },
      { timestamp: new Date('2025-05-14T08:30:00'), value: 14 },
      { timestamp: new Date('2025-05-13T08:30:00'), value: 16 },
      { timestamp: new Date('2025-05-12T08:30:00'), value: 13 },
      { timestamp: new Date('2025-05-11T08:30:00'), value: 12 },
      { timestamp: new Date('2025-05-10T08:30:00'), value: 11 },
      { timestamp: new Date('2025-05-09T08:30:00'), value: 10 },
      { timestamp: new Date('2025-05-08T08:30:00'), value: 12 },
      { timestamp: new Date('2025-05-07T08:30:00'), value: 14 },
    ],
  }), []);
  

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Medições ao Longo do Tempo',
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            const date = new Date(tooltipItems[0].parsed.x);
            return date.toLocaleString('pt-PT', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'PP',
          displayFormats: {
            day: 'dd/MM'
          }
        },
        adapters: {
          date: {
            locale: ptBR
          }
        },
        title: {
          display: true,
          text: 'Data'
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Valor'
        }
      },
    },
  }), []);


  const filterDataByTimeRange = (data, timeRange) => {
    if (!data || data.length === 0) {
      return [];
    }
    

    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    if (timeRange === TIME_RANGES.ALL) {
      return sortedData;
    }
    

    const now = new Date();
    let cutoffDate = new Date();
    
    switch(timeRange) {
      case TIME_RANGES.HOURS_24:
        cutoffDate.setHours(now.getHours() - 24);
        break;
      case TIME_RANGES.DAYS_7:
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case TIME_RANGES.DAYS_14:
        cutoffDate.setDate(now.getDate() - 14);
        break;
      case TIME_RANGES.DAYS_28:
        cutoffDate.setDate(now.getDate() - 28);
        break;
      default:
        cutoffDate.setDate(now.getDate() - 7);
    }
    
    return sortedData.filter(item => new Date(item.timestamp) >= cutoffDate);
  };


  const prepareChartData = (dataType, timeRange) => {
    const filteredData = filterDataByTimeRange(sampleData[dataType], timeRange);
    
    if (filteredData.length === 0) {
      return {
        chartData: null,
        average: 0
      };
    }
    

    const total = filteredData.reduce((sum, item) => sum + item.value, 0);
    const average = Math.round(total / filteredData.length);
    

    const chartData = {
      datasets: [
        {
          label: dataType === 'glucose' ? 'Glicose (mg/dL)' : 'Insulina (U)',
          data: filteredData.map(item => ({
            x: new Date(item.timestamp),
            y: item.value
          })),
          borderColor: dataType === 'glucose' 
            ? 'rgba(54, 162, 235, 0.7)' 
            : 'rgba(255, 99, 132, 0.7)',
          backgroundColor: dataType === 'glucose' 
            ? 'rgba(54, 162, 235, 0.2)' 
            : 'rgba(255, 99, 132, 0.2)',
          tension: 0.2,
          pointStyle: 'circle',
          pointRadius: 5,
          pointHoverRadius: 8,
        },
      ],
    };
    
    return { chartData, average };
  };


  useEffect(() => {
    const glucoseResults = prepareChartData('glucose', timeRanges.glucose);
    const insulinResults = prepareChartData('insulin', timeRanges.insulin);
    
    setChartData({
      glucose: glucoseResults.chartData,
      insulin: insulinResults.chartData
    });
    
    setAverages({
      glucose: glucoseResults.average,
      insulin: insulinResults.average
    });
  }, [timeRanges, sampleData]);


  const handleTimeRangeChange = (dataType, value) => {
    setTimeRanges(prev => ({
      ...prev,
      [dataType]: value
    }));
  };


  const renderTimeRangeSelector = (dataType) => (
    <select 
      className="form-select form-select-sm" 
      value={timeRanges[dataType]}
      onChange={(e) => handleTimeRangeChange(dataType, e.target.value)}
      style={{ width: 'auto', minWidth: '120px' }}
    >
      {Object.entries(TIME_RANGE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Estatísticas</h2>
      
      {/* Summary cards */}
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow">
            <div className="card-header bg-white">
              <h5 className="mb-0">Evolução das Medições ao Longo do Tempo</h5>
              <p className="text-muted small mb-0">Visão geral das suas medições mais recentes</p>
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card bg-light border-0">
                    <div className="card-body text-center">
                      <h5>Média de Glicose</h5>
                      <div className="display-5 fw-bold text-primary">{averages.glucose}</div>
                      <p className="text-muted">mg/dL</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card bg-light border-0">
                    <div className="card-body text-center">
                      <h5>Média de Insulina</h5>
                      <div className="display-5 fw-bold text-danger">{averages.insulin}</div>
                      <p className="text-muted">U</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="row">
        {/* Glucose Chart */}
        <div className="col-md-6 mb-4">
          <div className="card shadow">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Glicose</h5>
                <p className="text-muted small mb-0">Histórico de medições de glicose</p>
              </div>
              <div>{renderTimeRangeSelector('glucose')}</div>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                {chartData.glucose ? (
                  <Line data={chartData.glucose} options={chartOptions} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <p className="text-muted">Nenhum dado disponível para o período selecionado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Insulin Chart */}
        <div className="col-md-6 mb-4">
          <div className="card shadow">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Insulina</h5>
                <p className="text-muted small mb-0">Histórico de medições de insulina</p>
              </div>
              <div>{renderTimeRangeSelector('insulin')}</div>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                {chartData.insulin ? (
                  <Line data={chartData.insulin} options={chartOptions} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <p className="text-muted">Nenhum dado disponível para o período selecionado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}