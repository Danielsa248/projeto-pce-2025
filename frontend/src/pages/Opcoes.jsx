import { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';

export default function Opcoes() {
    const { user } = useAuth();
    const [notificationSettings, setNotificationSettings] = useState({
        enabled: Notification.permission === 'granted',
        times: {
            first: 30,   // First notification (30 min before)
            second: 15,  // Second notification (15 min before)
            third: 5     // Third notification (5 min before)
        },
        browserNotifications: true,
        bellNotifications: true,
        // Add glucose thresholds
        glucoseThresholds: {
            jejum: { min: 65, max: 100 },           // Fasting
            posPrandial: { min: 70, max: 140 },     // Post-meal
            prePrandial: { min: 70, max: 100 },     // Pre-meal
            aleatorio: { min: 70, max: 140 }        // Random
        }
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [permission, setPermission] = useState(Notification.permission);

    // Load settings from localStorage on component mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setNotificationSettings(prev => ({
                    ...prev,
                    ...parsed,
                    enabled: Notification.permission === 'granted' // Always sync with actual permission
                }));
            } catch (error) {
                console.error('Error loading notification settings:', error);
            }
        }
    }, []);

    // Update permission state when it changes
    useEffect(() => {
        setNotificationSettings(prev => ({
            ...prev,
            enabled: permission === 'granted'
        }));
    }, [permission]);

    const handleTimeChange = (timeKey, value) => {
        const numValue = parseInt(value);
        if (numValue < 1 || numValue > 60) return; // Validation: 1-60 minutes

        setNotificationSettings(prev => ({
            ...prev,
            times: {
                ...prev.times,
                [timeKey]: numValue
            }
        }));
    };

    const handleToggleChange = (key) => {
        setNotificationSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleEnableNotifications = async () => {
        try {
            const granted = await NotificationService.requestPermission();
            const newPermission = granted ? 'granted' : 'denied';
            setPermission(newPermission);
            
            if (granted) {
                setSaveMessage('Notificações ativadas com sucesso!');
                setTimeout(() => setSaveMessage(''), 3000);
            } else {
                setSaveMessage('Permissão para notificações foi negada.');
                setTimeout(() => setSaveMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            setSaveMessage('Erro ao ativar notificações.');
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        
        try {
            // Save to localStorage
            localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
            
            // Update NotificationService with new settings
            NotificationService.updateSettings(notificationSettings);
            
            // Clear notification cache to apply new timings immediately
            NotificationService.clearNotificationCache();
            
            // IMPORTANT: Also trigger a reload of glucose thresholds in components that use them
            // This ensures the Dashboard page picks up the new thresholds immediately
            window.dispatchEvent(new CustomEvent('glucoseThresholdsUpdated', { 
                detail: notificationSettings.glucoseThresholds 
            }));
            
            setSaveMessage('Definições guardadas com sucesso!');
            setTimeout(() => setSaveMessage(''), 3000);
            
        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveMessage('Erro ao guardar definições.');
            setTimeout(() => setSaveMessage(''), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleThresholdChange = (regime, type, value) => {
        const numValue = parseInt(value);
        if (numValue < 30 || numValue > 400) return; // Validation: 30-400 mg/dL

        setNotificationSettings(prev => ({
            ...prev,
            glucoseThresholds: {
                ...prev.glucoseThresholds,
                [regime]: {
                    ...prev.glucoseThresholds[regime],
                    [type]: numValue
                }
            }
        }));
    };

    const getPermissionStatus = () => {
        switch (permission) {
            case 'granted':
                return { variant: 'success', text: 'Ativadas', icon: 'fas fa-check-circle' };
            case 'denied':
                return { variant: 'danger', text: 'Negadas', icon: 'fas fa-times-circle' };
            default:
                return { variant: 'warning', text: 'Pendentes', icon: 'fas fa-exclamation-circle' };
        }
    };

    const status = getPermissionStatus();

    return (
        <div className="container mt-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="display-6 fw-bold text-primary mb-1">
                        <i className="fas fa-cog me-3"></i>
                        Opções
                    </h1>
                    <p className="text-muted mb-0">
                        Configure as suas preferências de notificações
                    </p>
                </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
                <Alert variant={saveMessage.includes('sucesso') ? 'success' : 'danger'} className="mb-4">
                    {saveMessage}
                </Alert>
            )}

            <Row className="g-4">
                {/* Notification Permission Card */}
                <Col lg={12}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-shield-alt me-2"></i>
                                Permissões de Notificação
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h6 className="mb-1">Estado das Notificações do Navegador</h6>
                                    <p className="text-muted mb-0 small">
                                        Permissão para mostrar notificações do sistema operativo
                                    </p>
                                </div>
                                <div className="text-end">
                                    <Badge bg={status.variant} className="fs-6 px-3 py-2">
                                        <i className={`${status.icon} me-1`}></i>
                                        {status.text}
                                    </Badge>
                                </div>
                            </div>
                            
                            {permission !== 'granted' && (
                                <Button 
                                    variant="primary" 
                                    onClick={handleEnableNotifications}
                                    className="mb-3"
                                >
                                    <i className="fas fa-bell me-2"></i>
                                    {permission === 'denied' ? 'Tentar Novamente' : 'Ativar Notificações'}
                                </Button>
                            )}

                            {permission === 'denied' && (
                                <Alert variant="warning" className="mb-0">
                                    <i className="fas fa-info-circle me-2"></i>
                                    <strong>Notificações bloqueadas:</strong> Para ativar, clique no ícone de cadeado na barra de endereços e permita notificações.
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Notification Timing Settings */}
                <Col lg={12}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-info text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-clock me-2"></i>
                                Tempos de Notificação
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <p className="text-muted mb-4">
                                Configure quando quer receber lembretes antes das suas medições agendadas.
                            </p>

                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">
                                            <i className="fas fa-bell text-info me-2"></i>
                                            Primeiro Aviso
                                        </Form.Label>
                                        <div className="input-group">
                                            <Form.Control
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={notificationSettings.times.first}
                                                onChange={(e) => handleTimeChange('first', e.target.value)}
                                                disabled={!notificationSettings.enabled}
                                            />
                                            <span className="input-group-text">min antes</span>
                                        </div>
                                        <Form.Text className="text-muted">
                                            Primeiro lembrete (padrão: 30 min)
                                        </Form.Text>
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">
                                            <i className="fas fa-bell text-warning me-2"></i>
                                            Segundo Aviso
                                        </Form.Label>
                                        <div className="input-group">
                                            <Form.Control
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={notificationSettings.times.second}
                                                onChange={(e) => handleTimeChange('second', e.target.value)}
                                                disabled={!notificationSettings.enabled}
                                            />
                                            <span className="input-group-text">min antes</span>
                                        </div>
                                        <Form.Text className="text-muted">
                                            Segundo lembrete (padrão: 15 min)
                                        </Form.Text>
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">
                                            <i className="fas fa-bell text-danger me-2"></i>
                                            Terceiro Aviso
                                        </Form.Label>
                                        <div className="input-group">
                                            <Form.Control
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={notificationSettings.times.third}
                                                onChange={(e) => handleTimeChange('third', e.target.value)}
                                                disabled={!notificationSettings.enabled}
                                            />
                                            <span className="input-group-text">min antes</span>
                                        </div>
                                        <Form.Text className="text-muted">
                                            Último lembrete (padrão: 5 min)
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Alert variant="info" className="mt-4">
                                <i className="fas fa-lightbulb me-2"></i>
                                <strong>Dica:</strong> Os valores devem estar em ordem decrescente. Além destes, sempre receberá notificações no momento exato e em caso de atraso.
                            </Alert>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Glucose Thresholds Settings - New Card Added */}
                <Col lg={12}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-warning text-dark">
                            <h5 className="mb-0">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Alertas de Glicose
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <p className="text-muted mb-4">
                                Configure os valores de referência para alertas visuais nas medições de glicose por tipo de regime.
                            </p>

                            <Row className="g-4">
                                {Object.entries({
                                    jejum: { label: 'Jejum', icon: 'fas fa-moon' },
                                    posPrandial: { label: 'Pós-prandial', icon: 'fas fa-utensils' },
                                    prePrandial: { label: 'Pré-prandial', icon: 'fas fa-clock' },
                                    aleatorio: { label: 'Aleatório', icon: 'fas fa-random' }
                                }).map(([regime, config]) => (
                                    <Col md={6} lg={3} key={regime}>
                                        <div className="border rounded p-3 bg-light">
                                            <h6 className="fw-bold mb-3">
                                                <i className={`${config.icon} me-2 text-warning`}></i>
                                                {config.label}
                                            </h6>
                                            
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-bold text-success">
                                                    <i className="fas fa-arrow-down me-1"></i>
                                                    Mínimo Normal
                                                </Form.Label>
                                                <div className="input-group">
                                                    <Form.Control
                                                        type="number"
                                                        min="30"
                                                        max="400"
                                                        value={notificationSettings.glucoseThresholds[regime]?.min || 70}
                                                        onChange={(e) => handleThresholdChange(regime, 'min', e.target.value)}
                                                    />
                                                    <span className="input-group-text">mg/dL</span>
                                                </div>
                                            </Form.Group>

                                            <Form.Group>
                                                <Form.Label className="small fw-bold text-danger">
                                                    <i className="fas fa-arrow-up me-1"></i>
                                                    Máximo Normal
                                                </Form.Label>
                                                <div className="input-group">
                                                    <Form.Control
                                                        type="number"
                                                        min="30"
                                                        max="400"
                                                        value={notificationSettings.glucoseThresholds[regime]?.max || 140}
                                                        onChange={(e) => handleThresholdChange(regime, 'max', e.target.value)}
                                                    />
                                                    <span className="input-group-text">mg/dL</span>
                                                </div>
                                            </Form.Group>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            <Alert variant="info" className="mt-4">
                                <i className="fas fa-info-circle me-2"></i>
                                <strong>Cores dos alertas:</strong>
                                <div className="mt-2">
                                    <Badge bg="success" className="me-2">Normal</Badge> Valores dentro dos limites
                                    <Badge bg="warning" text="dark" className="me-2">Cuidado</Badge> Valores ligeiramente fora dos limites
                                    <Badge bg="danger" className="me-2">Perigo</Badge> Valores muito fora dos limites
                                </div>
                            </Alert>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Save Button */}
            <div className="d-flex justify-content-end mt-4">
                <Button 
                    variant="primary" 
                    size="lg"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="px-4"
                >
                    {isSaving ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            A guardar...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-save me-2"></i>
                            Guardar Definições
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}