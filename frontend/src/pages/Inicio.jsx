import { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import './Inicio.css';

export default function Inicio() {
    const [dashboardData, setDashboardData] = useState({
        lastGlucose: null,
        lastInsulin: null,
        glucoseStats: null,
        insulinStats: null,
        weightStats: null
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const { getToken } = useAuth();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            const token = getToken();
            
            if (!token) {
                throw new Error('Token não encontrado');
            }

            const [glucoseResponse, insulinResponse] = await Promise.all([
                fetch('http://localhost:3000/api/bd/registos/Glucose?include=all', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }),
                fetch('http://localhost:3000/api/bd/registos/Insulina?include=all', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                })
            ]);

            if (!glucoseResponse.ok || !insulinResponse.ok) {
                throw new Error('Erro ao carregar dados');
            }

            const glucoseData = await glucoseResponse.json();
            const insulinData = await insulinResponse.json();

            if (glucoseData.success && insulinData.success) {
                // Processar dados do dashboard incluindo peso
                const processedData = {
                    lastGlucose: glucoseData.data[0] || null,
                    lastInsulin: insulinData.data[0] || null,
                    glucoseStats: calculateGlucoseStats(glucoseData.data),
                    insulinStats: calculateInsulinStats(insulinData.data),
                    weightStats: calculateWeightStats(glucoseData.data) 
                };

                setDashboardData(processedData);
            } else {
                throw new Error('Erro ao processar dados');
            }

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // SIMPLIFICADO: Calcular estatísticas de glicose sem tendência
    const calculateGlucoseStats = (data) => {
        if (!data || data.length === 0) return null;

        const last7Days = data.slice(0, 21); 
        const values = last7Days
            .map(record => parseFloat(record.glucose_value))
            .filter(val => !isNaN(val));

        if (values.length === 0) return null;

        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            average: avg.toFixed(1),
            min,
            max,
            count: values.length
        };
    };

    // Calcular estatísticas de insulina
    const calculateInsulinStats = (data) => {
        if (!data || data.length === 0) return null;

        const last7Days = data.slice(0, 14); // Últimos 7 dias (2 doses/dia)
        const values = last7Days
            .map(record => parseFloat(record.insulin_value))
            .filter(val => !isNaN(val));

        if (values.length === 0) return null;

        const total = values.reduce((sum, val) => sum + val, 0);
        const avg = total / values.length;

        return {
            dailyAverage: avg.toFixed(1),
            weeklyTotal: total.toFixed(1),
            count: values.length
        };
    };

    // NOVA FUNÇÃO: Calcular estatísticas de peso
    const calculateWeightStats = (data) => {
        if (!data || data.length === 0) return null;

        // Filtrar registos com peso dos últimos 7 dias
        const last7Days = data.slice(0, 21)
            .filter(record => record.weight && !isNaN(parseFloat(record.weight)))
            .map(record => ({
                weight: parseFloat(record.weight),
                date: new Date(record.timestamp)
            }))
            .sort((a, b) => a.date - b.date); // Ordenar por data

        if (last7Days.length === 0) return null;

        const weights = last7Days.map(record => record.weight);
        const avg = weights.reduce((sum, val) => sum + val, 0) / weights.length;
        const min = Math.min(...weights);
        const max = Math.max(...weights);
        
        // Calcular tendência (diferença entre primeiro e último)
        const trend = last7Days.length > 1 ? 
            last7Days[last7Days.length - 1].weight - last7Days[0].weight : 0;

        return {
            data: last7Days,
            average: avg.toFixed(1),
            min: min.toFixed(1),
            max: max.toFixed(1),
            trend: trend.toFixed(1),
            count: last7Days.length
        };
    };

    // NOVA FUNÇÃO: Gerar pontos SVG para o gráfico
    const generateWeightGraphPoints = (weightData) => {
        if (!weightData || weightData.length === 0) return '';

        const width = 280;
        const height = 100;
        const padding = 20;
        
        const weights = weightData.map(d => d.weight);
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);
        const weightRange = maxWeight - minWeight || 1;

        const points = weightData.map((point, index) => {
            const x = padding + (index / (weightData.length - 1 || 1)) * (width - 2 * padding);
            const y = height - padding - ((point.weight - minWeight) / weightRange) * (height - 2 * padding);
            return `${x},${y}`;
        }).join(' ');

        return points;
    };

    // Render do loading
    if (isLoading) {
        return (
            <main className="dashboard-container">
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">A carregar dashboard...</p>
                </div>
            </main>
        );
    }

    // Render do erro
    if (error) {
        return (
            <main className="dashboard-container">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao carregar dashboard</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </main>
        );
    }

    return (
        <main className="container-gluid py-4">
            <div className="dashboard-header mb-4 text-start">
                <div>
                    <h1 className="display-6 fw-bold text-primary mb-1">
                        <i className="fas fa-tachometer-alt me-3"></i>
                        Dashboard
                    </h1>
                    <p className="text-muted mb-0">
                        Resumo das suas medições mais recentes
                    </p>
                </div>
            </div>

            <Row className="g-4">
                {/* Card Última Glicose */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-tint me-2"></i>
                                Última Medição de Glicose
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData.lastGlucose ? (
                                <>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h2 className="display-4 fw-bold text-primary mb-0">
                                                {dashboardData.lastGlucose.glucose_value}
                                                <small className="text-muted"> mg/dL</small>
                                            </h2>
                                            
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="detail-item mb-0">
                                            <h6 className="text-primary mb-2 fw-bold">
                                                <i className="fas fa-calendar-alt me-2"></i>
                                                Data e Hora
                                            </h6>
                                            <p className="mb-0 fs-6 fw-semibold text-dark">
                                                {new Date(dashboardData.lastGlucose.timestamp).toLocaleString('pt-PT', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                                                        
                                        <div className="detail-item mb-0">
                                            <h6 className="text-primary mb-2 fw-bold">
                                                <i className="fas fa-utensils me-2"></i>
                                                Regime
                                            </h6>
                                            <p className="mb-0 fs-6 fw-semibold text-dark">
                                                {dashboardData.lastGlucose.condition}
                                            </p>
                                        </div>

                                        {/* Peso */}
                                        <div className="detail-item mb-0">
                                            <h6 className="text-primary mb-2 fw-bold">
                                                <i className="fas fa-weight me-2"></i>
                                                Peso Corporal
                                            </h6>
                                            <p className="mb-0 fs-6 fw-semibold text-dark">
                                                {dashboardData.lastGlucose.weight ? 
                                                    `${dashboardData.lastGlucose.weight} kg` : 
                                                    <span className="text-muted">-</span>
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">Nenhuma medição encontrada</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Card Última Insulina */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-danger text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-syringe me-2"></i>
                                Última Administração de Insulina
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData.lastInsulin ? (
                                <>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h2 className="display-4 fw-bold text-danger mb-0">
                                                {dashboardData.lastInsulin.insulin_value}
                                                <small className="text-muted"> U</small>
                                            </h2>
                                        </div>
                                    </div>
                                    
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="detail-item mb-0">
                                            <h6 className="text-danger mb-2 fw-bold">
                                                <i className="fas fa-calendar-alt me-2"></i>
                                                Data e Hora
                                            </h6>
                                            <p className="mb-0 fs-6 fw-semibold text-dark">
                                                {new Date(dashboardData.lastInsulin.timestamp).toLocaleString('pt-PT', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                                                        
                                        <div className="detail-item mb-0">
                                            <h6 className="text-danger mb-2 fw-bold">
                                                <i className="fas fa-route me-2"></i>
                                                Rota de Administração
                                            </h6>
                                            <Badge bg="danger" className="fs-6 px-3 py-2">
                                                {dashboardData.lastInsulin.route}
                                            </Badge>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-syringe fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">Nenhuma administração encontrada</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Estatísticas de Glicose */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-info text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-chart-bar me-2"></i>
                                Estatísticas de Glicose (7 dias)
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData.glucoseStats ? (
                                <>
                                    <Row className="text-center mb-4">
                                        <Col>
                                            <h4 className="fw-bold text-info">{dashboardData.glucoseStats.average} 
                                            </h4>
                                            <small className="text-muted">Média (mg/dL)</small>
                                        </Col>
                                        <Col>
                                            <h4 className="fw-bold text-success">{dashboardData.glucoseStats.min}
                                            </h4>
                                            <small className="text-muted">Mínima (mg/dL)</small>
                                        </Col>
                                        <Col>
                                            <h4 className="fw-bold text-warning">{dashboardData.glucoseStats.max}
                                            </h4>
                                            <small className="text-muted">Máxima (mg/dL)</small>
                                        </Col>
                                    </Row>
                                    
                                    <div className="text-center">
                                        <span className="text-muted">
                                            <i className="fas fa-calendar me-1"></i>
                                            {dashboardData.glucoseStats.count} medições nos últimos 7 dias
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">Dados insuficientes</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Estatísticas de Insulina */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-secondary text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-chart-pie me-2"></i>
                                Estatísticas de Insulina (7 dias)
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData.insulinStats ? (
                                <>
                                    <Row className="text-center mb-4">
                                        <Col>
                                            <h4 className="fw-bold text-secondary">{dashboardData.insulinStats.dailyAverage}</h4>
                                            <small className="text-muted">Média Diária (U)</small>
                                        </Col>
                                        <Col>
                                            <h4 className="fw-bold text-primary">{dashboardData.insulinStats.weeklyTotal}</h4>
                                            <small className="text-muted">Total Semanal (U)</small>
                                        </Col>
                                    </Row>
                                    
                                    <div className="text-center">
                                        <span className="text-muted">
                                            <i className="fas fa-syringe me-1"></i>
                                            {dashboardData.insulinStats.count} administrações nos últimos 7 dias
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-chart-pie fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">Dados insuficientes</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* ATUALIZADO: Gráfico de Peso com Hover */}
                <Col lg={12}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-weight me-2"></i>
                                Evolução do Peso (7 dias)
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData.weightStats ? (
                                <>
                                    {/* Estatísticas do Peso */}
                                    <Row className="text-center mb-4">
                                        <Col md={3}>
                                            <h5 className="fw-bold text-success">{dashboardData.weightStats.average}</h5>
                                            <small className="text-muted">Média (kg)</small>
                                        </Col>
                                        <Col md={3}>
                                            <h5 className="fw-bold text-info">{dashboardData.weightStats.min}</h5>
                                            <small className="text-muted">Mínimo (kg)</small>
                                        </Col>
                                        <Col md={3}>
                                            <h5 className="fw-bold text-warning">{dashboardData.weightStats.max}</h5>
                                            <small className="text-muted">Máximo (kg)</small>
                                        </Col>
                                        <Col md={3}>
                                            <h5 className={`fw-bold ${parseFloat(dashboardData.weightStats.trend) >= 0 ? 'text-danger' : 'text-success'}`}>
                                                {parseFloat(dashboardData.weightStats.trend) >= 0 ? '+' : ''}{dashboardData.weightStats.trend}
                                            </h5>
                                            <small className="text-muted">Tendência (kg)</small>
                                        </Col>
                                    </Row>

                                    {/* Gráfico de Linha SVG com Hover */}
                                    <div className="weight-graph-container mb-3" style={{ position: 'relative' }}>
                                        <svg width="100%" height="120" viewBox="0 0 280 100" className="weight-graph">
                                            {/* Linhas de grade horizontais */}
                                            {[20, 40, 60, 80].map((y, index) => (
                                                <line
                                                    key={index}
                                                    x1="20"
                                                    y1={y}
                                                    x2="260"
                                                    y2={y}
                                                    stroke="#e9ecef"
                                                    strokeWidth="1"
                                                    opacity="0.5"
                                                />
                                            ))}
                                            
                                            {/* Linha do gráfico */}
                                            <polyline
                                                points={generateWeightGraphPoints(dashboardData.weightStats.data)}
                                                fill="none"
                                                stroke="#198754"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="weight-line"
                                            />
                                            
                                            {/* Pontos do gráfico com Hover */}
                                            {dashboardData.weightStats.data.map((point, index) => {
                                                const weights = dashboardData.weightStats.data.map(d => d.weight);
                                                const minWeight = Math.min(...weights);
                                                const maxWeight = Math.max(...weights);
                                                const weightRange = maxWeight - minWeight || 1;
                                                
                                                const x = 20 + (index / (dashboardData.weightStats.data.length - 1 || 1)) * 240;
                                                const y = 80 - ((point.weight - minWeight) / weightRange) * 60;
                                                
                                                return (
                                                    <g key={index}>
                                                        {/* Área invisível maior para melhor hover */}
                                                        <circle
                                                            cx={x}
                                                            cy={y}
                                                            r="8"
                                                            fill="transparent"
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseEnter={() => setHoveredPoint({
                                                                index,
                                                                weight: point.weight,
                                                                date: point.date,
                                                                x: x,
                                                                y: y
                                                            })}
                                                            onMouseLeave={() => setHoveredPoint(null)}
                                                        />
                                                        {/* Ponto visível */}
                                                        <circle
                                                            cx={x}
                                                            cy={y}
                                                            r={hoveredPoint?.index === index ? "6" : "4"}
                                                            fill="#198754"
                                                            className="weight-point"
                                                            style={{
                                                                transition: 'all 0.2s ease',
                                                                filter: hoveredPoint?.index === index ? 
                                                                    'drop-shadow(0 3px 6px rgba(25, 135, 84, 0.4))' : 
                                                                    'none'
                                                            }}
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </svg>

                                        {/* Tooltip de Hover */}
                                        {hoveredPoint && (
                                            <div
                                                className="weight-tooltip"
                                                style={{
                                                    position: 'absolute',
                                                    left: `${(hoveredPoint.x / 280) * 100}%`,
                                                    top: `${(hoveredPoint.y / 100) * 100 - 10}%`,
                                                    transform: 'translate(-50%, -100%)',
                                                    background: 'rgba(0, 0, 0, 0.8)',
                                                    color: 'white',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    whiteSpace: 'nowrap',
                                                    zIndex: 10,
                                                    pointerEvents: 'none',
                                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                }}
                                            >
                                                <div className="text-center">
                                                    <div className="fw-bold">{hoveredPoint.weight} kg</div>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                                                        {hoveredPoint.date.toLocaleDateString('pt-PT', { 
                                                            day: '2-digit', 
                                                            month: '2-digit',
                                                            year: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Datas do gráfico */}
                                    <div className="d-flex justify-content-between text-center">
                                        {dashboardData.weightStats.data.map((point, index) => (
                                            <small key={index} className="text-muted weight-date">
                                                {point.date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                <br />
                                                <strong>{point.weight}kg</strong>
                                            </small>
                                        ))}
                                    </div>

                                    {/* Resumo */}
                                    <div className="text-center mt-3">
                                        <span className="text-muted">
                                            <i className="fas fa-weight me-1"></i>
                                            {dashboardData.weightStats.count} medições de peso nos últimos 7 dias
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-weight fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">Dados de peso insuficientes</p>
                                    <small className="text-muted">
                                        O peso é registado juntamente com as medições de glicose
                                    </small>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </main>
    );
}
