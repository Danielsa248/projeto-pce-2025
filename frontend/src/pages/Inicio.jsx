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
            console.log('Glucose thresholds updated, reloading...');
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
                    lastGlucose: getMostRecentRecord(glucoseData.data) || null,
                    lastInsulin: getMostRecentRecord(insulinData.data) || null,
                    
                    glucoseStats: calculateGlucoseStats(glucoseData.data),
                    insulinStats: calculateInsulinStats(insulinData.data),
                    nextGlucoseEvent: getNextEvent(agendaData, 'G'),
                    nextInsulinEvent: getNextEvent(agendaData, 'I')
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

    const getMostRecentRecord = (records) => {
        if (!records || !Array.isArray(records) || records.length === 0) {
            return null;
        }
        
        const sortedRecords = [...records].sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            
            return dateB - dateA;
        });
                
        return sortedRecords[0];
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
        <div className="container mt-4">
            {/* Header */}
            <div className="mb-4">
                <h1 className="display-6 fw-bold text-primary mb-1">
                    <i className="fas fa-tachometer-alt me-3"></i>
                        Dashboard
                </h1>
                <p className="text-muted mb-0">Resumo das suas medições mais recentes</p>
            </div>

            {/* Primeira linha - Cards de estatísticas principais */}
            <Row className="g-3 mb-4">
                {/* Card Pacientes Cadastrados (Última Glicose) */}
                <Col xl={3} lg={6} md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ backgroundColor: '#e3f2fd' }}>
                        <Card.Body className="text-center py-4">
                            <div className="d-flex align-items-center justify-content-center mb-3">
                                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
                                     style={{ width: '48px', height: '48px' }}>
                                    <i className="fas fa-tint fs-5"></i>
                                </div>
                            </div>
                            <h2 className="fw-bold text-primary mb-1">
                                {dashboardData.lastGlucose ? dashboardData.lastGlucose.glucose_value : '0'}
                            </h2>
                            <p className="text-muted small mb-0">Última Glicose (mg/dL)</p>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Card Aniversariantes (Última Insulina) */}
                <Col xl={3} lg={6} md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ backgroundColor: '#fff3e0' }}>
                        <Card.Body className="text-center py-4">
                            <div className="d-flex align-items-center justify-content-center mb-3">
                                <div className="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center" 
                                     style={{ width: '48px', height: '48px' }}>
                                    <i className="fas fa-syringe fs-5"></i>
                                </div>
                            </div>
                            <h2 className="fw-bold text-warning mb-1">
                                {dashboardData.lastInsulin ? dashboardData.lastInsulin.insulin_value : '0'}
                            </h2>
                            <p className="text-muted small mb-0">Última Insulina (U)</p>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Última Medição de Glicose */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 pb-0">
                            <h6 className="fw-bold text-dark mb-0">Última Medição de Glicose</h6>
                        </Card.Header>
                        <Card.Body className="pt-2">
                            {dashboardData.lastGlucose ? (
                                <div className="d-flex flex-column gap-3">
                                    {/* Informações principais */}
                                    <div className="row text-center">
                                        <div className="col-4">
                                            <div className="border-end pe-3">
                                                <h5 className="fw-bold text-primary mb-1">
                                                    {dashboardData.lastGlucose.glucose_value}
                                                </h5>
                                                <small className="text-muted">mg/dL</small>
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="border-end pe-3">
                                                <h6 className="fw-bold text-success mb-1">
                                                    {dashboardData.lastGlucose.weight || '-'}
                                                </h6>
                                                <small className="text-muted">Peso (kg)</small>
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <h6 className="fw-bold text-info mb-1">
                                                {dashboardData.lastGlucose.condition}
                                            </h6>
                                            <small className="text-muted">Regime</small>
                                        </div>
                                    </div>

                                    {/* Status da Glicose */}
                                    {glucoseThresholds && (() => {
                                        const status = getGlucoseStatus(
                                            dashboardData.lastGlucose.glucose_value,
                                            dashboardData.lastGlucose.condition,
                                            glucoseThresholds
                                        );
                                        
                                        return status.showAlert && (
                                            <Alert variant={status.alertType} className="py-2 mb-2">
                                                <div className="d-flex align-items-center">
                                                    <i className={`${status.icon} me-2`}></i>
                                                    <small><strong>{status.message}</strong></small>
                                                </div>
                                            </Alert>
                                        );
                                    })()}

                                    {/* Data */}
                                    <div className="text-center">
                                        <small className="text-muted">
                                            <i className="fas fa-calendar me-1"></i>
                                            {new Date(dashboardData.lastGlucose.timestamp).toLocaleString('pt-PT')}
                                        </small>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-tint fa-2x text-muted mb-2"></i>
                                    <p className="text-muted small mb-0">Nenhuma medição encontrada</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Segunda linha - Cards de detalhes */}
            <Row className="g-3 mb-4">
                {/* Próximos Eventos de insulina*/}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 pb-0">
                            <h6 className="fw-bold text-dark mb-0">Próximo Evento de Insulina</h6>
                        </Card.Header>
                        <Card.Body className="pt-2">
                            <div className="d-flex flex-column gap-3">
                                {dashboardData.nextInsulinEvent ? (
                                    <div className="d-flex align-items-center p-3 bg-light rounded">
                                        <div className="me-3">
                                            <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center" 
                                                 style={{ width: '40px', height: '40px' }}>
                                                <i className="fas fa-syringe" style={{ fontSize: '16px' }}></i>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="fw-bold">Administração de Insulina</div>
                                            <div className="text-muted small">
                                                {new Date(dashboardData.nextInsulinEvent.data_evento).toLocaleString('pt-PT', {
                                                    weekday: 'short',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            {dashboardData.nextInsulinEvent.notas && (
                                                <div className="text-muted small mt-1">
                                                    <i className="fas fa-sticky-note me-1"></i>
                                                    {dashboardData.nextInsulinEvent.notas}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-end">
                                            <Badge bg="danger" className="small">
                                                {getTimeUntilEvent(dashboardData.nextInsulinEvent.data_evento)}
                                            </Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <i className="fas fa-syringe fa-3x text-muted mb-3" style={{ opacity: 0.3 }}></i>
                                        <h6 className="text-muted">Nenhuma administração agendada</h6>
                                        <p className="text-muted small mb-0">Aceda à Agenda para criar uma nova administração</p>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm" 
                                            className="mt-2"
                                            onClick={() => window.location.href = '/agenda'}
                                        >
                                            <i className="fas fa-calendar-plus me-1"></i>
                                            Criar Agendamento
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Próximos Eventos de glicose*/}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 pb-0">
                            <h6 className="fw-bold text-dark mb-0">Próximo Evento de Glicose</h6>
                        </Card.Header>
                        <Card.Body className="pt-2">
                            <div className="d-flex flex-column gap-3">
                                {dashboardData.nextGlucoseEvent ? (
                                    <div className="d-flex align-items-center p-3 bg-light rounded">
                                        <div className="me-3">
                                            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
                                                 style={{ width: '40px', height: '40px' }}>
                                                <i className="fas fa-tint" style={{ fontSize: '16px' }}></i>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="fw-bold">Medição de Glicose</div>
                                            <div className="text-muted small">
                                                {new Date(dashboardData.nextGlucoseEvent.data_evento).toLocaleString('pt-PT', {
                                                    weekday: 'short',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            {dashboardData.nextGlucoseEvent.notas && (
                                                <div className="text-muted small mt-1">
                                                    <i className="fas fa-sticky-note me-1"></i>
                                                    {dashboardData.nextGlucoseEvent.notas}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-end">
                                            <Badge bg="primary" className="small">
                                                {getTimeUntilEvent(dashboardData.nextGlucoseEvent.data_evento)}
                                            </Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <i className="fas fa-tint fa-3x text-muted mb-3" style={{ opacity: 0.3 }}></i>
                                        <h6 className="text-muted">Nenhuma medição agendada</h6>
                                        <p className="text-muted small mb-0">Aceda à Agenda para criar uma nova medição</p>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm" 
                                            className="mt-2"
                                            onClick={() => window.location.href = '/agenda'}
                                        >
                                            <i className="fas fa-calendar-plus me-1"></i>
                                            Criar Agendamento
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Terceira linha - Estatísticas */}
            <Row className="g-3">
                {/* Estatísticas de Glicose */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 pb-0">
                            <h6 className="fw-bold text-dark mb-0">Estatísticas de Glicose (7 dias)</h6>
                        </Card.Header>
                        <Card.Body className="pt-2">
                            {dashboardData.glucoseStats ? (
                                <>
                                    <Row className="text-center mb-3">
                                        <Col className="border-end">
                                            <h5 className="fw-bold text-info mb-1">{dashboardData.glucoseStats.average}</h5>
                                            <small className="text-muted">Média</small>
                                        </Col>
                                        <Col className="border-end">
                                            <h5 className="fw-bold text-success mb-1">{dashboardData.glucoseStats.min}</h5>
                                            <small className="text-muted">Mínima</small>
                                        </Col>
                                        <Col>
                                            <h5 className="fw-bold text-warning mb-1">{dashboardData.glucoseStats.max}</h5>
                                            <small className="text-muted">Máxima</small>
                                        </Col>
                                    </Row>
                                    <div className="text-center">
                                        <small className="text-muted">
                                            <i className="fas fa-calendar me-1"></i>
                                            {dashboardData.glucoseStats.count} medições
                                        </small>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-chart-bar fa-2x text-muted mb-2"></i>
                                    <p className="text-muted small mb-0">Dados insuficientes</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Estatísticas de Insulina */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 pb-0">
                            <h6 className="fw-bold text-dark mb-0">Estatísticas de Insulina (7 dias)</h6>
                        </Card.Header>
                        <Card.Body className="pt-2">
                            {dashboardData.insulinStats ? (
                                <>
                                    <Row className="text-center mb-3">
                                        <Col className="border-end">
                                            <h5 className="fw-bold text-secondary mb-1">{dashboardData.insulinStats.dailyAverage}</h5>
                                            <small className="text-muted">Média Diária</small>
                                        </Col>
                                        <Col>
                                            <h5 className="fw-bold text-primary mb-1">{dashboardData.insulinStats.weeklyTotal}</h5>
                                            <small className="text-muted">Total Semanal</small>
                                        </Col>
                                    </Row>
                                    <div className="text-center">
                                        <small className="text-muted">
                                            <i className="fas fa-syringe me-1"></i>
                                            {dashboardData.insulinStats.count} administrações
                                        </small>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fas fa-chart-pie fa-2x text-muted mb-2"></i>
                                    <p className="text-muted small mb-0">Dados insuficientes</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
