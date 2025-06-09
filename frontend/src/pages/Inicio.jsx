import { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';
import { getGlucoseStatus, loadGlucoseThresholds } from '../utils/glucoseUtils';

export default function Inicio() {
    const [dashboardData, setDashboardData] = useState({
        lastGlucose: null,
        lastInsulin: null,
        glucoseStats: null,
        insulinStats: null,
        nextGlucoseEvent: null,
        nextInsulinEvent: null
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [glucoseThresholds, setGlucoseThresholds] = useState(null);
    const { getToken } = useAuth();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        const thresholds = loadGlucoseThresholds();
        setGlucoseThresholds(thresholds);
    }, []);

    // Add this useEffect to listen for threshold updates
    useEffect(() => {
        const handleThresholdsUpdate = (event) => {
            console.log('🔄 Glucose thresholds updated, reloading...');
            setGlucoseThresholds(event.detail);
        };

        window.addEventListener('glucoseThresholdsUpdated', handleThresholdsUpdate);
        
        return () => {
            window.removeEventListener('glucoseThresholdsUpdated', handleThresholdsUpdate);
        };
    }, []);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            const token = getToken();
            
            if (!token) {
                throw new Error('Token não encontrado');
            }

            const [glucoseResponse, insulinResponse, agendaResponse] = await Promise.all([
                fetch('http://localhost:3000/api/registos/registos/Glucose?include=all', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }),
                fetch('http://localhost:3000/api/registos/registos/Insulina?include=all', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }),
                fetch('http://localhost:3000/api/agenda/', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                })
            ]);

            if (!glucoseResponse.ok) {
                console.error('Erro na resposta de glicose:', glucoseResponse.status);
            }
            if (!insulinResponse.ok) {
                console.error('Erro na resposta de insulina:', insulinResponse.status);
            }
            if (!agendaResponse.ok) {
                console.error('Erro na resposta da agenda:', agendaResponse.status, await agendaResponse.text());
            }

            const glucoseData = await glucoseResponse.json();
            const insulinData = await insulinResponse.json();
            const agendaData = await agendaResponse.json();

            if (glucoseData.success && insulinData.success) {
                const processedData = {
                    lastGlucose: glucoseData.data[0] || null,
                    lastInsulin: insulinData.data[0] || null,
                    glucoseStats: calculateGlucoseStats(glucoseData.data),
                    insulinStats: calculateInsulinStats(insulinData.data),
                    nextGlucoseEvent: getNextEvent(agendaData, 'Glucose'),
                    nextInsulinEvent: getNextEvent(agendaData, 'Insulina')
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

    const calculateInsulinStats = (data) => {
        if (!data || data.length === 0) return null;

        const last7Days = data.slice(0, 14);
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

    // Função para obter próximo evento por tipo
    const getNextEvent = (agendaData, tipo) => {
        if (!Array.isArray(agendaData) || agendaData.length === 0) {
            console.log('Agenda data is empty or not an array:', agendaData);
            return null;
        }
        
        const now = new Date();
        
        try {
            const upcomingEvents = agendaData
                .filter(event => {
                    if (!event.data_evento || !event.tipo_registo) {
                        console.log('Invalid event data:', event);
                        return false;
                    }
                    
                    const eventDate = new Date(event.data_evento);
                    const isValidDate = !isNaN(eventDate.getTime());
                    const isFutureEvent = eventDate > now;
                    const isCorrectType = event.tipo_registo === tipo;
                    const isNotCompleted = !event.realizado;
                    
                    return isValidDate && isFutureEvent && isCorrectType && isNotCompleted;
                })
                .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
            
            return upcomingEvents.length > 0 ? upcomingEvents[0] : null;
        } catch (error) {
            console.error('Error filtering events:', error);
            return null;
        }
    };

    const getTimeUntilEvent = (eventDate) => {
        const now = new Date();
        const eventTime = new Date(eventDate);
        const diffInMs = eventTime - now;

        if (diffInMs <= 0) return 'Agora';

        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 60) {
            return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} para o evento`;
        } else if (diffInHours < 24) {
            return `${diffInHours} h${diffInHours !== 1 ? 's' : ''} para o evento`;
        } else {
            return `${diffInDays} dia${diffInDays !== 1 ? 's' : ''} para o evento`;
        }
    };

    if (isLoading) {
        return (

            <main className="container py-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">A carregar...</span>
                    </div>
                    <p className="mt-3">A carregar dashboard...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (

            <main className="container py-4">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao carregar dashboard</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </main>
        );
    }

    return (

        <main className="container py-4">
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
                                        <div className="d-flex align-items-center">
                                            <h2 className="display-4 fw-bold text-primary mb-0 me-3">
                                                {dashboardData.lastGlucose.glucose_value}
                                                <small className="text-muted"> mg/dL</small>
                                            </h2>
                                            
                                            {/* Glucose Status Indicator */}
                                            {glucoseThresholds && (() => {
                                                const status = getGlucoseStatus(
                                                    dashboardData.lastGlucose.glucose_value,
                                                    dashboardData.lastGlucose.condition,
                                                    glucoseThresholds
                                                );
                                                
                                                return status.showAlert && (
                                                    <div className="d-flex flex-column align-items-center">
                                                        <div className={`badge ${status.bgColor} ${status.textColor} p-2 mb-1`}>
                                                            <i className={`${status.icon} me-1`}></i>
                                                            <span className="small fw-bold">{status.message}</span>
                                                        </div>
                                                        {status.level.includes('very') && (
                                                            <small className="text-danger fw-bold">
                                                                <i className="fas fa-exclamation-circle me-1"></i>
                                                                Contacte o médico
                                                            </small>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    
                                    {/* Glucose Status Alert */}
                                    {glucoseThresholds && (() => {
                                        const status = getGlucoseStatus(
                                            dashboardData.lastGlucose.glucose_value,
                                            dashboardData.lastGlucose.condition,
                                            glucoseThresholds
                                        );
                                        
                                        return status.showAlert && (
                                            <Alert variant={status.alertType} className="mb-3">
                                                <div className="d-flex align-items-center">
                                                    <i className={`${status.icon} me-2`}></i>
                                                    <div>
                                                        <strong>{status.message}</strong>
                                                        <div className="small mt-1">
                                                            Valor: {dashboardData.lastGlucose.glucose_value} mg/dL | 
                                                            Regime: {dashboardData.lastGlucose.condition}
                                                        </div>
                                                        {status.level.includes('very') && (
                                                            <div className="small text-danger mt-1">
                                                                <i className="fas fa-phone me-1"></i>
                                                                Recomenda-se contacto médico imediato
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Alert>
                                        );
                                    })()}

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
                                                {glucoseThresholds && (
                                                    <small className="d-block text-muted">
                                                        Normal: {(() => {
                                                            const normalizedRegime = dashboardData.lastGlucose.condition?.toLowerCase().includes('jejum') ? 'jejum' :
                                                                dashboardData.lastGlucose.condition?.toLowerCase().includes('pós') ? 'posPrandial' :
                                                                dashboardData.lastGlucose.condition?.toLowerCase().includes('pré') ? 'prePrandial' : 'aleatorio';
                                                            const threshold = glucoseThresholds[normalizedRegime];
                                                            return `${threshold.min}-${threshold.max} mg/dL`;
                                                        })()}
                                                    </small>
                                                )}
                                            </p>
                                        </div>

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
                                            <h4 className="fw-bold text-info">{dashboardData.glucoseStats.average}</h4>
                                            <small className="text-muted">Média (mg/dL)</small>
                                        </Col>
                                        <Col>
                                            <h4 className="fw-bold text-success">{dashboardData.glucoseStats.min}</h4>
                                            <small className="text-muted">Mínima (mg/dL)</small>
                                        </Col>
                                        <Col>
                                            <h4 className="fw-bold text-warning">{dashboardData.glucoseStats.max}</h4>
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
                
                {/* Próximo Evento de Glicose */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-calendar-plus me-2"></i>
                                Próxima Medição de Glicose
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData.nextGlucoseEvent ? (
                                <>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h4 className="fw-bold text-success mb-1">
                                                {new Date(dashboardData.nextGlucoseEvent.data_evento).toLocaleDateString('pt-PT', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </h4>
                                            <h5 className="text-muted mb-0">
                                                às {new Date(dashboardData.nextGlucoseEvent.data_evento).toLocaleTimeString('pt-PT', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </h5>
                                        </div>
                                        <div className="text-end">
                                            <Badge bg="success" className="fs-6">
                                                {getTimeUntilEvent(dashboardData.nextGlucoseEvent.data_evento)}
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    {dashboardData.nextGlucoseEvent.notas && (
                                        <div className="mt-3">
                                            <h6 className="text-success mb-2 fw-bold">
                                                <i className="fas fa-sticky-note me-2"></i>
                                                Notas
                                            </h6>
                                            <p className="mb-0 text-muted">
                                                {dashboardData.nextGlucoseEvent.notas}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-calendar-check fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">Nenhuma medição agendada</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Próximo Evento de Insulina */}
                <Col lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-warning text-dark">
                            <h5 className="mb-0">
                                <i className="fas fa-calendar-plus me-2"></i>
                                Próxima Administração de Insulina
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData.nextInsulinEvent ? (
                                <>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h4 className="fw-bold text-warning mb-1">
                                                {new Date(dashboardData.nextInsulinEvent.data_evento).toLocaleDateString('pt-PT', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </h4>
                                            <h5 className="text-muted mb-0">
                                                às {new Date(dashboardData.nextInsulinEvent.data_evento).toLocaleTimeString('pt-PT', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </h5>
                                        </div>
                                        <div className="text-end">
                                            <Badge bg="warning" text="dark" className="fs-6">
                                                {getTimeUntilEvent(dashboardData.nextInsulinEvent.data_evento)}
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    {dashboardData.nextInsulinEvent.notas && (
                                        <div className="mt-3">
                                            <h6 className="text-warning mb-2 fw-bold">
                                                <i className="fas fa-sticky-note me-2"></i>
                                                Notas
                                            </h6>
                                            <p className="mb-0 text-muted">
                                                {dashboardData.nextInsulinEvent.notas}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-calendar-check fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">Nenhuma administração agendada</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>   
        </main>
    );
}
