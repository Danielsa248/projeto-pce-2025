import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { Spinner, Alert, Button } from 'react-bootstrap';

// Register Chart.js components
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

// Constants
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

const API_ENDPOINTS = {
  glucose: 'http://localhost:3000/api/registos/Glucose',
  insulin: 'http://localhost:3000/api/registos/Insulina',
};

const CHART_COLORS = {
  glucose: {
    border: 'rgba(54, 162, 235, 0.7)',
    background: 'rgba(54, 162, 235, 0.2)',
  },
  insulin: {
    border: 'rgba(255, 99, 132, 0.7)',
    background: 'rgba(255, 99, 132, 0.2)',
  }
};

const DATA_TYPE_LABELS = {
  glucose: {
    name: 'Glicose',
    unit: 'mg/dL',
    description: 'Histórico de medições de glicose',
  },
  insulin: {
    name: 'Insulina',
    unit: 'U',
    description: 'Histórico de medições de insulina',
  }
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

  const [data, setData] = useState({
    glucose: [],
    insulin: []
  });
  
  const [loadingState, setLoadingState] = useState({
    glucose: true,
    insulin: true,
  });
  
  const [error, setError] = useState(null);
  

  const { getToken } = useAuth();


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
            return date.toLocaleString('pt-BR', { 
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

 
  const fetchDataByType = useCallback(async (dataType) => {
    try {
      setLoadingState(prev => ({ ...prev, [dataType]: true }));
      setError(null);
      
      const token = getToken();
      if (!token) {
        throw new Error('Não autenticado');
      }
      
      const response = await fetch(API_ENDPOINTS[dataType], {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Falha ao obter dados de ${DATA_TYPE_LABELS[dataType].name.toLowerCase()}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error(responseData.message || `Erro ao processar dados de ${DATA_TYPE_LABELS[dataType].name.toLowerCase()}`);
      }
      
      const parsedData = responseData.data.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      
      setData(prev => ({
        ...prev,
        [dataType]: parsedData
      }));
      
    } catch (error) {
      console.error(`Erro ao obter dados de ${dataType}:`, error);
      setError(`Falha ao carregar dados de ${DATA_TYPE_LABELS[dataType].name}. ${error.message}`);
    } finally {
      setLoadingState(prev => ({ ...prev, [dataType]: false }));
    }
  }, [getToken]);
  

  const fetchAllData = useCallback(async () => {
    setError(null);
    await Promise.all([
      fetchDataByType('glucose'),
      fetchDataByType('insulin')
    ]);
  }, [fetchDataByType]);
  

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);


  const filterDataByTimeRange = useCallback((dataArray, timeRange) => {
    if (!dataArray || dataArray.length === 0) {
      return [];
    }
    
    const sortedData = [...dataArray].sort((a, b) => 
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
    
    return sortedData.filter(item => {
      const itemDate = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
      return itemDate >= cutoffDate;
    });
  }, []);


  const prepareChartData = useCallback((dataType, timeRange) => {
    const filteredData = filterDataByTimeRange(data[dataType], timeRange);
    
    if (filteredData.length === 0) {
      return {
        chartData: null,
        average: 0
      };
    }
    
    const total = filteredData.reduce((sum, item) => {
      const value = Number(item.value);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const average = filteredData.length ? Math.round(total / filteredData.length) : 0;
    
    const chartData = {
      datasets: [
        {
          label: `${DATA_TYPE_LABELS[dataType].name} (${DATA_TYPE_LABELS[dataType].unit})`,
          data: filteredData.map(item => ({
            x: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
            y: Number(item.value)
          })),
          borderColor: CHART_COLORS[dataType].border,
          backgroundColor: CHART_COLORS[dataType].background,
          tension: 0.2,
          pointStyle: 'circle',
          pointRadius: 5,
          pointHoverRadius: 8,
        },
      ],
    };
    
    return { chartData, average };
  }, [data, filterDataByTimeRange]);

  // Update charts when data or time ranges change
  useEffect(() => {
    const isLoading = loadingState.glucose || loadingState.insulin;
    
    if (!isLoading && !error) {
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
    }
  }, [timeRanges, data, loadingState, error, prepareChartData]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((dataType, value) => {
    setTimeRanges(prev => ({
      ...prev,
      [dataType]: value
    }));
  }, []);

  // Render time range selector
  const renderTimeRangeSelector = useCallback((dataType) => (
    <select 
      className="form-select form-select-sm" 
      value={timeRanges[dataType]}
      onChange={(e) => handleTimeRangeChange(dataType, e.target.value)}
      style={{ width: 'auto', minWidth: '120px' }}
      aria-label={`Selecionar período para ${DATA_TYPE_LABELS[dataType].name}`}
    >
      {Object.entries(TIME_RANGE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  ), [timeRanges, handleTimeRangeChange]);

  // Render data card
  const renderDataCard = useCallback((dataType) => (
    <div className="col-md-6">
      <div className="card bg-light border-0">
        <div className="card-body text-center">
          <h5>Média de {DATA_TYPE_LABELS[dataType].name}</h5>
          {loadingState[dataType] ? (
            <div className="d-flex justify-content-center">
              <Spinner animation="border" size="sm" />
            </div>
          ) : (
            <>
              <div className={`display-5 fw-bold text-${dataType === 'glucose' ? 'primary' : 'danger'}`}>
                {averages[dataType]}
              </div>
              <p className="text-muted">{DATA_TYPE_LABELS[dataType].unit}</p>
            </>
          )}
        </div>
      </div>
    </div>
  ), [averages, loadingState]);

  // Render chart
  const renderChart = useCallback((dataType) => (
    <div className="col-md-6 mb-4">
      <div className="card shadow">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">{DATA_TYPE_LABELS[dataType].name}</h5>
            <p className="text-muted small mb-0">{DATA_TYPE_LABELS[dataType].description}</p>
          </div>
          <div>{renderTimeRangeSelector(dataType)}</div>
        </div>
        <div className="card-body">
          <div style={{ height: '300px' }}>
            {loadingState[dataType] ? (
              <div className="d-flex align-items-center justify-content-center h-100">
                <Spinner animation="border" />
              </div>
            ) : chartData[dataType] ? (
              <Line data={chartData[dataType]} options={chartOptions} />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <p className="text-muted">Nenhum dado disponível para o período selecionado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ), [chartData, chartOptions, loadingState, renderTimeRangeSelector]);

  // Show error message if data fetching failed
  if (error) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">
          <Alert.Heading>Erro</Alert.Heading>
          <p>{error}</p>
          <div className="d-flex justify-content-end">
            <Button 
              variant="outline-danger" 
              onClick={fetchAllData}
            >
              Tentar novamente
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Show full-page loading only during initial load
  const isInitialLoading = loadingState.glucose && loadingState.insulin && !chartData.glucose && !chartData.insulin;
  if (isInitialLoading) {
    return (
      <div className="container mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">A carregar...</span>
        </Spinner>
        <p className="mt-2">A carregar dados...</p>
      </div>
    );
  }

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
                {renderDataCard('glucose')}
                {renderDataCard('insulin')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="row">
        {renderChart('glucose')}
        {renderChart('insulin')}
      </div>
    </div>
  );
}