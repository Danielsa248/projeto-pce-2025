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
  glucose: 'http://localhost:3000/api/registos/registos/Glucose',
  insulin: 'http://localhost:3000/api/registos/registos/Insulina',
};

const CHART_COLORS = {
  glucose: {
    border: 'rgba(54, 162, 235, 0.7)',
    background: 'rgba(54, 162, 235, 0.2)',
  },
  insulin: {
    border: 'rgba(255, 99, 132, 0.7)',
    background: 'rgba(255, 99, 132, 0.2)',
  },
  weight: {
    border: 'rgba(25, 135, 84, 0.7)',
    background: 'rgba(25, 135, 84, 0.2)',
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
    description: 'Histórico de administrações de insulina',
  },
  weight: {
    name: 'Peso',
    unit: 'kg',
    description: 'Evolução do peso corporal',
  }
};

const MEAL_STATES = {
  ALL: 'all',
  JEJUM: 'Jejum',
  POS_PRANDIAL: 'Pós-prandial',
  PRE_PRANDIAL: 'Pré-prandial',
  ALEATORIO: 'Aleatório'
};

const MEAL_STATE_LABELS = {
  [MEAL_STATES.ALL]: 'Todos os tipos',
  [MEAL_STATES.JEJUM]: 'Jejum',
  [MEAL_STATES.POS_PRANDIAL]: 'Pós-prandial',
  [MEAL_STATES.PRE_PRANDIAL]: 'Pré-prandial',
  [MEAL_STATES.ALEATORIO]: 'Aleatório'
};

// Add route constants for insulin
const ROUTE_STATES = {
  ALL: 'all',
  SUBCUTANEA: 'Subcutânea',
  INTRAVENOSA: 'Intravenosa'
};

const ROUTE_STATE_LABELS = {
  [ROUTE_STATES.ALL]: 'Todas as vias',
  [ROUTE_STATES.SUBCUTANEA]: 'Subcutânea',
  [ROUTE_STATES.INTRAVENOSA]: 'Intravenosa'
};

export default function Estatisticas() {
  const [timeRanges, setTimeRanges] = useState({
    glucose: TIME_RANGES.DAYS_7,
    insulin: TIME_RANGES.DAYS_7,
  });
  
  const [mealStates, setMealStates] = useState({
    glucose: MEAL_STATES.ALL,
  });
  
  const [routeStates, setRouteStates] = useState({
    insulin: ROUTE_STATES.ALL,
  });
  
  const [chartData, setChartData] = useState({
    glucose: null,
    insulin: null,
    weight: null,
  });
  
  const [averages, setAverages] = useState({
    glucose: 0,
    insulin: 0,
    weight: 0,
  });

  const [minMaxValues, setMinMaxValues] = useState({
    glucose: { min: null, max: null },
    insulin: { min: null, max: null },
    weight: { min: null, max: null },
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
        text: 'Valores ao Longo do Tempo',
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


  const filterDataByTimeRange = useCallback((dataArray, timeRange, filterState = null, filterType = 'meal') => {
    if (!dataArray || dataArray.length === 0) {
      return [];
    }
    
    const sortedData = [...dataArray].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Apply time range filtering
    let filteredData = sortedData;
    if (timeRange !== TIME_RANGES.ALL) {
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
      
      filteredData = filteredData.filter(item => {
        const itemDate = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
        return itemDate >= cutoffDate;
      });
    }
    
    // Apply secondary filtering
    if (filterState && filterState !== MEAL_STATES.ALL && filterState !== ROUTE_STATES.ALL) {
      filteredData = filteredData.filter(item => {
        if (filterType === 'meal') {
          // For glucose, filter by condition (meal state)
          return item.condition === filterState;
        } else if (filterType === 'route') {
          // For insulin, filter by route
          return item.route === filterState;
        }
        return true;
      });
    }
    
    return filteredData;
  }, []);


  const prepareChartData = useCallback((dataType, timeRange, filterState, filterType) => {
    let sourceData = data[dataType === 'weight' ? 'glucose' : dataType];
    
    const filteredData = filterDataByTimeRange(sourceData, timeRange, filterState, filterType);
    
    if (filteredData.length === 0) {
      return {
        chartData: null,
        average: 0,
        min: null,
        max: null
      };
    }
    
    let values, chartDataPoints;
    
    if (dataType === 'weight') {
      // Filter glucose data for weight values
      const weightData = filteredData
        .filter(item => item.weight && !isNaN(parseFloat(item.weight)))
        .map(item => ({
          timestamp: item.timestamp,
          value: parseFloat(item.weight)
        }));
      
      if (weightData.length === 0) {
        return {
          chartData: null,
          average: 0,
          min: null,
          max: null
        };
      }
      
      values = weightData.map(item => item.value);
      chartDataPoints = weightData;
    } else {
      values = filteredData.map(item => Number(item.value)).filter(val => !isNaN(val));
      chartDataPoints = filteredData.map(item => ({
        timestamp: item.timestamp,
        value: Number(item.value)
      }));
    }
    
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = values.length ? (dataType === 'weight' ? (total / values.length).toFixed(1) : Math.round(total / values.length)) : 0;
    
    const min = values.length ? (dataType === 'weight' ? Math.min(...values).toFixed(1) : Math.round(Math.min(...values))) : null;
    const max = values.length ? (dataType === 'weight' ? Math.max(...values).toFixed(1) : Math.round(Math.max(...values))) : null;
    
    const chartData = {
      datasets: [
        {
          label: `${DATA_TYPE_LABELS[dataType].name} (${DATA_TYPE_LABELS[dataType].unit})`,
          data: chartDataPoints.map(item => ({
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
    
    return { chartData, average, min, max };
  }, [data, filterDataByTimeRange]);

  // Update charts when data, time ranges, or filter states change
  useEffect(() => {
    const isLoading = loadingState.glucose || loadingState.insulin;
    
    if (!isLoading && !error) {
      const glucoseResults = prepareChartData(
        'glucose', 
        timeRanges.glucose, 
        mealStates.glucose, 
        'meal'
      );
      const insulinResults = prepareChartData(
        'insulin', 
        timeRanges.insulin, 
        routeStates.insulin, 
        'route'
      );
      // Weight chart uses glucose time range
      const weightResults = prepareChartData(
        'weight', 
        timeRanges.glucose, 
        null, 
        null
      );
      
      setChartData({
        glucose: glucoseResults.chartData,
        insulin: insulinResults.chartData,
        weight: weightResults.chartData
      });
      
      setAverages({
        glucose: glucoseResults.average,
        insulin: insulinResults.average,
        weight: weightResults.average
      });
      
      setMinMaxValues({
        glucose: { min: glucoseResults.min, max: glucoseResults.max },
        insulin: { min: insulinResults.min, max: insulinResults.max },
        weight: { min: weightResults.min, max: weightResults.max }
      });
    }
  }, [timeRanges, mealStates, routeStates, data, loadingState, error, prepareChartData]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((dataType, value) => {
    setTimeRanges(prev => ({
      ...prev,
      [dataType]: value
    }));
  }, []);

  // Handle meal state change
  const handleMealStateChange = useCallback((dataType, value) => {
    setMealStates(prev => ({
      ...prev,
      [dataType]: value
    }));
  }, []);

  // Handle route state change
  const handleRouteStateChange = useCallback((dataType, value) => {
    setRouteStates(prev => ({
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

  // Render filter selector for glucose and insulin
  const renderFilterSelector = useCallback((dataType) => {
    if (dataType === 'glucose') {
      return (
        <select 
          className="form-select form-select-sm" 
          value={mealStates[dataType]}
          onChange={(e) => handleMealStateChange(dataType, e.target.value)}
          style={{ width: 'auto', minWidth: '140px' }}
          aria-label={`Selecionar tipo de evento para ${DATA_TYPE_LABELS[dataType].name}`}
        >
          {Object.entries(MEAL_STATE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    } else {
      return (
        <select 
          className="form-select form-select-sm" 
          value={routeStates[dataType]}
          onChange={(e) => handleRouteStateChange(dataType, e.target.value)}
          style={{ width: 'auto', minWidth: '140px' }}
          aria-label={`Selecionar via de administração para ${DATA_TYPE_LABELS[dataType].name}`}
        >
          {Object.entries(ROUTE_STATE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    }
  }, [mealStates, routeStates, handleMealStateChange, handleRouteStateChange]);

  const renderDataCard = useCallback((dataType) => (
    <div className="col-md-4">
      <div className="card bg-light border-0">
        <div className="card-body text-center">
          <h5 className="mb-4">Estatísticas de {DATA_TYPE_LABELS[dataType].name}</h5>
          {(dataType === 'weight' ? loadingState.glucose : loadingState[dataType]) ? (
            <div className="d-flex justify-content-center">
              <Spinner animation="border" size="sm" />
            </div>
          ) : (
            <>
              <div className="row">
                <div className="col-4">
                  <div className="text-center">
                    <small className="text-muted d-block mb-2">Mínimo</small>
                    <div className={`display-6 fw-bold text-${dataType === 'glucose' ? 'success' : dataType === 'insulin' ? 'info' : 'success'}`}>
                      {minMaxValues[dataType].min !== null ? minMaxValues[dataType].min : '0'}
                    </div>
                    <small className="text-muted">{DATA_TYPE_LABELS[dataType].unit}</small>
                  </div>
                </div>
                
                <div className="col-4">
                  <div className="text-center">
                    <small className="text-muted d-block mb-2">Média</small>
                    <div className={`display-6 fw-bold text-${dataType === 'glucose' ? 'primary' : dataType === 'insulin' ? 'danger' : 'success'}`}>
                      {averages[dataType]}
                    </div>
                    <small className="text-muted">{DATA_TYPE_LABELS[dataType].unit}</small>
                  </div>
                </div>
                
                <div className="col-4">
                  <div className="text-center">
                    <small className="text-muted d-block mb-2">Máximo</small>
                    <div className={`display-6 fw-bold text-${dataType === 'glucose' ? 'warning' : dataType === 'insulin' ? 'danger' : 'warning'}`}>
                      {minMaxValues[dataType].max !== null ? minMaxValues[dataType].max : '0'}
                    </div>
                    <small className="text-muted">{DATA_TYPE_LABELS[dataType].unit}</small>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  ), [averages, minMaxValues, loadingState]);

  const renderChart = useCallback((dataType) => {
    const separatorColors = {
      glucose: '#0d6efd',
      insulin: '#dc3545',
      weight: '#198754'
    };

    return (
      <div className={`col-md-${dataType === 'weight' ? '12' : '6'} mb-4 d-flex`}>
        <div className="card shadow w-100 h-100">
          <div className="card-header bg-white">
            {dataType === 'weight' ? (
              <div>
                <h5 className="mb-2">{DATA_TYPE_LABELS[dataType].name}</h5>
                <p className="text-muted small mb-0">
                  {DATA_TYPE_LABELS[dataType].description} (baseado no período de glicose)
                </p>
              </div>
            ) : (
              <div>
                <div className="d-flex flex-column flex-lg-row justify-content-lg-between align-items-lg-start gap-2">
                  <h5 className="mb-0 flex-shrink-0">{DATA_TYPE_LABELS[dataType].name}</h5>
                
                  <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-2 gap-sm-3">
                    <div className="d-flex align-items-center gap-2">
                      <small className="text-muted text-nowrap">Período:</small>
                      {renderTimeRangeSelector(dataType)}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <small className="text-muted text-nowrap">
                        {dataType === 'glucose' ? 'Tipo:' : 'Via:'}
                      </small>
                      {renderFilterSelector(dataType)}
                    </div>
                  </div>
                </div>
                
                <p className="text-muted small mb-0 mt-2">
                  {DATA_TYPE_LABELS[dataType].description}
                </p>
              </div>
            )}
          </div>
          
          <div style={{ 
            height: '2px', 
            backgroundColor: separatorColors[dataType],
            opacity: 0.3,
            margin: '0'
          }}></div>
          
          <div className="card-body d-flex flex-column">
            <div className="flex-grow-1" style={{ height: '400px', minHeight: '400px' }}>
              {(dataType === 'weight' ? loadingState.glucose : loadingState[dataType]) ? (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <Spinner animation="border" />
                </div>
              ) : chartData[dataType] ? (
                <Line data={chartData[dataType]} options={chartOptions} />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <p className="text-muted">
                    {dataType === 'weight' 
                      ? 'Nenhum dado de peso disponível para o período selecionado'
                      : 'Nenhum dado disponível para o período selecionado'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [chartData, chartOptions, loadingState, renderTimeRangeSelector, renderFilterSelector]);

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
      <h1 className="display-6 fw-bold text-primary mb-1">
        <i className="fas fa-line-chart me-3"></i>
        Estatísticas
      </h1>
      <p className="text-muted mb-4">
        Consulte as suas estatísticas globais
      </p>
      
      {/* Summary cards */}
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow">
            <div className="card-header bg-white">
              <h5 className="mb-0">Evolução das Medições ao Longo do Tempo</h5>
              <p className="text-muted small mb-0">Visão geral das medições mais recentes</p>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-4">
                {/* Card de Glicose */}
                <div className="col-md-4 d-flex">
                  <div className="card bg-light border-0 w-100 h-100">
                    <div className="card-body text-center d-flex flex-column justify-content-center">
                      <h5 className="mb-4">Estatísticas de Glicose</h5>
                      {loadingState.glucose ? (
                        <div className="d-flex justify-content-center">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : (
                        <>
                          <div className="row h-100">
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Mínimo</small>
                                <div className="h3 fw-bold text-primary">
                                  {minMaxValues.glucose.min !== null ? minMaxValues.glucose.min : '0'}
                                </div>
                                <small className="text-muted">mg/dL</small>
                              </div>
                            </div>
                            
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Média</small>
                                <div className="h3 fw-bold text-primary">
                                  {averages.glucose}
                                </div>
                                <small className="text-muted">mg/dL</small>
                              </div>
                            </div>
                            
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Máximo</small>
                                <div className="h3 fw-bold text-primary">
                                  {minMaxValues.glucose.max !== null ? minMaxValues.glucose.max : '0'}
                                </div>
                                <small className="text-muted">mg/dL</small>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card de Insulina */}
                <div className="col-md-4 d-flex">
                  <div className="card bg-light border-0 w-100 h-100">
                    <div className="card-body text-center d-flex flex-column justify-content-center">
                      <h5 className="mb-4">Estatísticas de Insulina</h5>
                      {loadingState.insulin ? (
                        <div className="d-flex justify-content-center">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : (
                        <>
                          <div className="row h-100">
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Mínimo</small>
                                <div className="h3 fw-bold text-primary">
                                  {minMaxValues.insulin.min !== null ? minMaxValues.insulin.min : '0'}
                                </div>
                                <small className="text-muted">U</small>
                              </div>
                            </div>
                            
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Média</small>
                                <div className="h3 fw-bold text-primary">
                                  {averages.insulin}
                                </div>
                                <small className="text-muted">U</small>
                              </div>
                            </div>
                            
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Máximo</small>
                                <div className="h3 fw-bold text-primary">
                                  {minMaxValues.insulin.max !== null ? minMaxValues.insulin.max : '0'}
                                </div>
                                <small className="text-muted">U</small>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card de Peso */}
                <div className="col-md-4 d-flex">
                  <div className="card bg-light border-0 w-100 h-100">
                    <div className="card-body text-center d-flex flex-column justify-content-center">
                      <h5 className="mb-4">Estatísticas de Peso</h5>
                      {loadingState.glucose ? (
                        <div className="d-flex justify-content-center">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : (
                        <>
                          <div className="row h-100">
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Mínimo</small>
                                <div className="h3 fw-bold text-primary">
                                  {minMaxValues.weight.min !== null ? minMaxValues.weight.min : '0'}
                                </div>
                                <small className="text-muted">kg</small>
                              </div>
                            </div>
                            
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Média</small>
                                <div className="h3 fw-bold text-primary">
                                  {averages.weight}
                                </div>
                                <small className="text-muted">kg</small>
                              </div>
                            </div>
                            
                            <div className="col-4 d-flex flex-column justify-content-center">
                              <div className="text-center">
                                <small className="text-muted d-block mb-2">Máximo</small>
                                <div className="h3 fw-bold text-primary">
                                  {minMaxValues.weight.max !== null ? minMaxValues.weight.max : '0'}
                                </div>
                                <small className="text-muted">kg</small>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="row g-4 mb-4">
        {renderChart('glucose')}
        {renderChart('insulin')}
      </div>

      {/* Weight chart */}
      <div className="row g-4">
        {renderChart('weight')}
      </div>
    </div>
  );
}