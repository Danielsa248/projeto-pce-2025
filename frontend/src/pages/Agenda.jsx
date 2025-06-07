import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, Form, Alert, Spinner, Badge, Card } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import * as agendaApi from '../api/agenda.js';

// Constants
const REGISTO_TYPES = {
    GLUCOSE: 'Glucose',
    INSULIN: 'Insulina'
};

const REGISTO_TYPE_LABELS = {
    [REGISTO_TYPES.GLUCOSE]: 'Glicose',
    [REGISTO_TYPES.INSULIN]: 'Insulina'
};

const VIEW_MODES = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month'
};

const VIEW_MODE_LABELS = {
    [VIEW_MODES.DAY]: 'Dia',
    [VIEW_MODES.WEEK]: 'Semana',
    [VIEW_MODES.MONTH]: 'Mês'
};

export default function Agenda() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState(VIEW_MODES.WEEK);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [marcacoes, setMarcacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingMarcacao, setEditingMarcacao] = useState(null);
    const [formData, setFormData] = useState({
        tipo_registo: REGISTO_TYPES.GLUCOSE,
        data_evento: '',
        date: '',
        time: '',
        notas: ''
    });

    // Fetch marcacoes from API  
    const fetchMarcacoes = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            setLoading(true);
            setError(null);
            const data = await agendaApi.obterMarcacoes();
            setMarcacoes(data);
        } catch (err) {
            console.error('Erro ao carregar agenda:', err);
            setError('Falha ao carregar a agenda. ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchMarcacoes();
    }, [fetchMarcacoes]);

    // Open modal for new marcacao
    const handleNewMarcacao = () => {
        setEditingMarcacao(null);
        
        // Set smart defaults: today's date with next hour rounded up
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Next hour, rounded to :00
        
        const defaultDate = nextHour.toISOString().slice(0, 10); // YYYY-MM-DD
        const defaultTime = nextHour.toTimeString().slice(0, 5); // HH:MM
        
        setFormData({
            tipo_registo: REGISTO_TYPES.GLUCOSE,
            data_evento: nextHour.toISOString().slice(0, 16), // Keep for backend compatibility
            date: defaultDate,
            time: defaultTime,
            notas: ''
        });
        setShowModal(true);
    };

    // Handle date/time changes and update combined datetime
    const handleDateTimeChange = (field, value) => {
        const newFormData = { ...formData, [field]: value };
        
        // Combine date and time into ISO string for backend
        if (newFormData.date && newFormData.time) {
            const combinedDateTime = `${newFormData.date}T${newFormData.time}`;
            newFormData.data_evento = combinedDateTime;
        }
        
        setFormData(newFormData);
    };

    // Add this helper function at the top of your component, after the constants
    const triggerAgendaUpdate = () => {
        // Trigger both storage event (for other tabs) and custom event (same tab)
        localStorage.setItem('agenda_updated', Date.now().toString());
        localStorage.removeItem('agenda_updated');
        window.dispatchEvent(new CustomEvent('agendaUpdated'));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.date || !formData.time) {
            setError('Por favor, preencha a data e hora.');
            return;
        }

        try {
            const eventDateTime = `${formData.date}T${formData.time}:00`;
            
            if (editingMarcacao) {
                // Update existing marcacao
                await agendaApi.alterarStatusMarcacao(editingMarcacao.id, {
                    tipo_registo: formData.tipo_registo,
                    data_evento: eventDateTime,
                    notas: formData.notas
                });
            } else {
                // Create new marcacao
                await agendaApi.criarMarcacao({
                    tipo_registo: formData.tipo_registo,
                    data_evento: eventDateTime,
                    notas: formData.notas
                });
            }

            await fetchMarcacoes(); // Refresh local data
            triggerAgendaUpdate(); // Add this line
            
            setShowModal(false);
            setEditingMarcacao(null);
            setFormData({
                tipo_registo: REGISTO_TYPES.GLUCOSE,
                date: '',
                time: '',
                notas: ''
            });
        } catch (error) {
            console.error('Erro ao guardar marcação:', error);
            setError('Falha ao guardar a marcação. ' + error.message);
        }
    };

    // Handle marking as completed/uncompleted
    const handleToggleCompleted = async (id, currentStatus) => {
        try {
            await agendaApi.alterarStatusMarcacao(id, !currentStatus);
            await fetchMarcacoes(); // Refresh local data
            triggerAgendaUpdate(); // Add this line
            
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            setError('Falha ao alterar o status da marcação. ' + error.message);
        }
    };

    // Handle deletion
    const handleDelete = async (id) => {
        if (!window.confirm('Tem a certeza que deseja eliminar esta marcação?')) {
            return;
        }

        try {
            await agendaApi.apagarMarcacao(id);
            await fetchMarcacoes(); // Refresh local data
            triggerAgendaUpdate(); // Add this line
            
        } catch (error) {
            console.error('Erro ao eliminar marcação:', error);
            setError('Falha ao eliminar a marcação. ' + error.message);
        }
    };

    // Navigation helpers
    const navigateDate = (direction) => {
        const newDate = new Date(currentDate);
        
        switch (viewMode) {
            case VIEW_MODES.DAY:
                newDate.setDate(newDate.getDate() + direction);
                break;
            case VIEW_MODES.WEEK:
                newDate.setDate(newDate.getDate() + (direction * 7));
                break;
            case VIEW_MODES.MONTH:
                newDate.setMonth(newDate.getMonth() + direction);
                break;
        }
        
        setCurrentDate(newDate);
    };

    // Get marcacoes for current view
    const getFilteredMarcacoes = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return marcacoes.map(marcacao => ({
            ...marcacao,
            data_evento: new Date(marcacao.data_evento),
            isOverdue: new Date(marcacao.data_evento) < now && !marcacao.realizado,
            isToday: new Date(marcacao.data_evento).toDateString() === today.toDateString(),
            isUpcoming: new Date(marcacao.data_evento) > now && !marcacao.realizado
        }));
    }, [marcacoes]);

    // Get marcacoes for display based on view mode
    const getDisplayMarcacoes = useMemo(() => {
        const filtered = getFilteredMarcacoes;
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const currentDay = currentDate.getDate();

        switch (viewMode) {
            case VIEW_MODES.DAY:
                return filtered.filter(m => 
                    m.data_evento.getFullYear() === currentYear &&
                    m.data_evento.getMonth() === currentMonth &&
                    m.data_evento.getDate() === currentDay
                );
            
            case VIEW_MODES.WEEK:
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                weekStart.setHours(0, 0, 0, 0); // Start of first day
                
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999); // End of last day
                
                return filtered.filter(m => 
                    m.data_evento >= weekStart && m.data_evento <= weekEnd
                );
            
            case VIEW_MODES.MONTH:
                return filtered.filter(m => 
                    m.data_evento.getFullYear() === currentYear &&
                    m.data_evento.getMonth() === currentMonth
                );
            
            default:
                return filtered;
        }
    }, [getFilteredMarcacoes, currentDate, viewMode]);

    // Get upcoming and overdue marcacoes
    const upcomingMarcacoes = useMemo(() => 
        getFilteredMarcacoes.filter(m => m.isUpcoming).slice(0, 5)
    , [getFilteredMarcacoes]);

    const overdueMarcacoes = useMemo(() => 
        getFilteredMarcacoes.filter(m => m.isOverdue)
    , [getFilteredMarcacoes]);

    // Format date for display
    const formatDisplayDate = () => {
        switch (viewMode) {
            case VIEW_MODES.DAY:
                return currentDate.toLocaleDateString('pt-PT', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            
            case VIEW_MODES.WEEK:
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                // If week spans across months, show both months
                if (weekStart.getMonth() !== weekEnd.getMonth()) {
                    return `${weekStart.getDate()} de ${weekStart.toLocaleDateString('pt-PT', { month: 'long' })} - ${weekEnd.getDate()} de ${weekEnd.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`;
                } else {
                    return `${weekStart.getDate()} - ${weekEnd.getDate()} de ${weekStart.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`;
                }
            
            case VIEW_MODES.MONTH:
                return currentDate.toLocaleDateString('pt-PT', { 
                    year: 'numeric', 
                    month: 'long' 
                });
            
            default:
                return currentDate.toLocaleDateString('pt-PT');
        }
    };

    // Render marcacao card
    const renderMarcacaoCard = (marcacao) => (
        <Card key={marcacao.id} className={`mb-3 ${marcacao.isOverdue ? 'border-danger' : marcacao.isToday ? 'border-warning' : ''}`}>
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <Badge bg={marcacao.tipo_registo === REGISTO_TYPES.GLUCOSE ? 'primary' : 'danger'}>
                                {REGISTO_TYPE_LABELS[marcacao.tipo_registo]}
                            </Badge>
                            {marcacao.realizado && <Badge bg="success">Realizado</Badge>}
                            {marcacao.isOverdue && <Badge bg="danger">Em atraso</Badge>}
                            {marcacao.isToday && <Badge bg="warning">Hoje</Badge>}
                        </div>
                        <p className="mb-1">
                            <strong>Data:</strong> {marcacao.data_evento.toLocaleString('pt-PT', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        <p className="mb-0 text-muted">
                            <strong>Notas:</strong> {marcacao.notas || 'Sem notas'}
                        </p>
                    </div>
                    <div className="d-flex flex-column gap-1">
                        <Button 
                            size="sm" 
                            variant={marcacao.realizado ? "success" : "outline-success"}
                            onClick={() => handleToggleCompleted(marcacao.id, marcacao.realizado)}
                            title={marcacao.realizado ? "Marcar como não realizado" : "Marcar como realizado"}
                        >
                            <i className={marcacao.realizado ? "fas fa-check-circle" : "fas fa-check"}></i>
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline-danger" 
                            onClick={() => handleDelete(marcacao.id)}
                        >
                            <i className="fas fa-trash"></i>
                        </Button>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );

    // Add this test component to your agenda page for testing
    const TestNotifications = () => {
        const testNotification = () => {
            if (Notification.permission === 'granted') {
                new Notification('Teste - Glicose em 5 minutos', {
                    body: 'Esta é uma notificação de teste do sistema',
                    icon: '/favicon.ico',
                    tag: 'test-notification',
                    requireInteraction: true
                });
            } else {
                alert('Notificações não estão ativadas');
            }
        };

        return (
            <Button variant="outline-secondary" size="sm" onClick={testNotification}>
                <i className="fas fa-bell me-2"></i>
                Testar Notificação
            </Button>
        );
    };

    if (loading) {
        return (
            <div className="container mt-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">A carregar...</span>
                </Spinner>
                <p className="mt-2">A carregar agenda...</p>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="display-6 fw-bold text-primary mb-1">
                        <i className="fas fa-calendar-alt me-3"></i>
                        Agenda
                    </h1>
                    <p className="text-muted mb-0">
                        Organize as suas medições de glicose e administrações de insulina
                    </p>
                </div>
                <Button variant="primary" onClick={handleNewMarcacao}>
                    <i className="fas fa-plus me-2"></i>
                    Nova Marcação
                </Button>
            </div>

            {error && (
                <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Quick Stats */}
            <div className="row mb-4">
                <div className="col-md-4">
                    <Card className="border-danger" style={{ backgroundColor: 'rgba(220, 53, 69, 0.05)' }}>
                        <Card.Body className="text-center py-3">
                            <h6 className="mb-2 fw-bold text-danger">Em Atraso</h6>
                            <div className="fs-3 fw-bold text-danger">{overdueMarcacoes.length}</div>
                        </Card.Body>
                    </Card>
                </div>
                <div className="col-md-4">
                    <Card className="border-info" style={{ backgroundColor: 'rgba(23, 162, 184, 0.05)' }}>
                        <Card.Body className="text-center py-3">
                            <h6 className="mb-2 text-info fw-bold">Glicose Hoje</h6>
                            <div className="fs-3 fw-bold text-info">
                                {getFilteredMarcacoes.filter(m => 
                                    m.isToday && 
                                    !m.realizado && 
                                    m.tipo_registo === REGISTO_TYPES.GLUCOSE
                                ).length}
                            </div>
                        </Card.Body>
                    </Card>
                </div>
                <div className="col-md-4">
                    <Card className="border-primary" style={{ backgroundColor: 'rgba(13, 110, 253, 0.05)' }}>
                        <Card.Body className="text-center py-3">
                            <h6 className="mb-2 text-primary fw-bold">Insulina Hoje</h6>
                            <div className="fs-3 fw-bold text-primary">
                                {getFilteredMarcacoes.filter(m => 
                                    m.isToday && 
                                    !m.realizado && 
                                    m.tipo_registo === REGISTO_TYPES.INSULIN
                                ).length}
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </div>

            {/* View Controls */}
            <Card className="mb-4">
                <Card.Header className="bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => navigateDate(-1)}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </Button>
                            <h5 className="mb-0">{formatDisplayDate()}</h5>
                            <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => navigateDate(1)}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </Button>
                        </div>
                        <div className="btn-group btn-group-sm" role="group" style={{ minWidth: '180px' }}>
                            {Object.entries(VIEW_MODE_LABELS).map(([mode, label], index, array) => (
                                <button
                                    key={mode}
                                    type="button"
                                    className={`btn ${viewMode === mode ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setViewMode(mode)}
                                    style={{
                                        flex: '1',
                                        borderRadius: index === 0 ? '0.375rem 0 0 0.375rem' : 
                                                   index === array.length - 1 ? '0 0.375rem 0.375rem 0' : '0',
                                        borderLeft: index > 0 ? 'none' : undefined,
                                        zIndex: viewMode === mode ? 1 : 0,
                                        minWidth: '70px',
                                        padding: '0.50rem 0.5rem',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card.Header>
                <Card.Body>
                    {getDisplayMarcacoes.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            <i className="fas fa-calendar-times fa-3x mb-3"></i>
                            <p>Nenhuma marcação encontrada para este período</p>
                        </div>
                    ) : (
                        <div className="row">
                            <div className="col">
                                {getDisplayMarcacoes.map(renderMarcacaoCard)}
                            </div>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Modal for creating/editing marcacao */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingMarcacao ? 'Editar Marcação' : 'Nova Marcação'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Tipo de Registo</Form.Label>
                            <Form.Select
                                value={formData.tipo_registo}
                                onChange={(e) => setFormData({...formData, tipo_registo: e.target.value})}
                                required
                            >
                                {Object.entries(REGISTO_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Data</Form.Label>
                            <Form.Control
                                type="date"
                                value={formData.date || ''}
                                onChange={(e) => handleDateTimeChange('date', e.target.value)}
                                min={new Date().toISOString().slice(0, 10)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Hora</Form.Label>
                            <Form.Control
                                type="time"
                                value={formData.time || ''}
                                onChange={(e) => handleDateTimeChange('time', e.target.value)}
                                required
                            />
                            <div className="mt-2">
                                <small className="text-muted d-block mb-2">Horários comuns:</small>
                                <div className="d-flex gap-2 flex-wrap">
                                    {['08:00', '12:00', '18:00', '20:00', '22:00'].map(time => (
                                        <Button
                                            key={time}
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => handleDateTimeChange('time', time)}
                                        >
                                            {time}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Notas (opcional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.notas}
                                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                                placeholder="Adicione notas sobre esta marcação..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit">
                            {editingMarcacao ? 'Atualizar' : 'Criar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Test Notifications Component - For Development Only */}
            <div className="mt-4">
                <h5 className="mb-3">
                    <i className="fas fa-bell me-2"></i>
                    Testar Notificações
                </h5>
                <p className="text-muted mb-3">
                    Utilize o botão abaixo para enviar uma notificação de teste para o seu navegador. 
                    Certifique-se de que as notificações estão permitidas para este site.
                </p>
                <TestNotifications />
            </div>
        </div>
    );
}
