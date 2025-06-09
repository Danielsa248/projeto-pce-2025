import { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';

export default function Opcoes() {
    const { user } = useAuth();
    
    // State management
    const [notificationSettings, setNotificationSettings] = useState({
        enabled: Notification.permission === 'granted',
        times: {
            first: 30,
            second: 15,
            third: 5
        },
        browserNotifications: true,
        bellNotifications: true,
        glucoseThresholds: {
            jejum: { min: 65, max: 100 },
            posPrandial: { min: 70, max: 140 },
            prePrandial: { min: 70, max: 100 },
            aleatorio: { min: 70, max: 140 }
        }
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [permission, setPermission] = useState(Notification.permission);

    // Configuration constants
    const GLUCOSE_REGIMES = {
        jejum: { label: 'Jejum', icon: 'fas fa-moon' },
        posPrandial: { label: 'Pós-prandial', icon: 'fas fa-utensils' },
        prePrandial: { label: 'Pré-prandial', icon: 'fas fa-clock' },
        aleatorio: { label: 'Aleatório', icon: 'fas fa-random' }
    };

    // Effects
    useEffect(() => {
        loadSettingsFromStorage();
    }, []);

    useEffect(() => {
        setNotificationSettings(prev => ({
            ...prev,
            enabled: permission === 'granted'
        }));
    }, [permission]);

    // Helper functions
    const loadSettingsFromStorage = () => {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setNotificationSettings(prev => ({
                    ...prev,
                    ...parsed,
                    enabled: Notification.permission === 'granted'
                }));
            } catch (error) {
                console.error('Error loading notification settings:', error);
            }
        }
    };

    const showMessage = (message, isSuccess = true) => {
        setSaveMessage(message);
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const getPermissionStatus = () => {
        const statusMap = {
            granted: { variant: 'success', text: 'Ativadas', icon: 'fas fa-check-circle' },
            denied: { variant: 'danger', text: 'Negadas', icon: 'fas fa-times-circle' },
            default: { variant: 'warning', text: 'Pendentes', icon: 'fas fa-exclamation-circle' }
        };
        return statusMap[permission] || statusMap.default;
    };

    // Event handlers
    const handleTimeChange = (timeKey, value) => {
        const numValue = parseInt(value);
        if (numValue < 1 || numValue > 60) return;

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

    const handleThresholdChange = (regime, type, value) => {
        const numValue = parseInt(value);
        if (numValue < 30 || numValue > 400) return;

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

    const handleEnableNotifications = async () => {
        try {
            const granted = await NotificationService.requestPermission();
            const newPermission = granted ? 'granted' : 'denied';
            setPermission(newPermission);
            
            if (granted) {
                showMessage('Notificações ativadas com sucesso!');
            } else {
                showMessage('Permissão para notificações foi negada.', false);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            showMessage('Erro ao ativar notificações.', false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        
        try {
            // Save to localStorage
            localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
            
            // Update NotificationService
            NotificationService.updateSettings(notificationSettings);
            NotificationService.clearNotificationCache();
            
            // Trigger glucose thresholds update event
            window.dispatchEvent(new CustomEvent('glucoseThresholdsUpdated', { 
                detail: notificationSettings.glucoseThresholds 
            }));
            
            showMessage('Definições guardadas com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            showMessage('Erro ao guardar definições.', false);
        } finally {
            setIsSaving(false);
        }
    };

    // Render components
    const renderHeader = () => (
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
    );

    const renderSaveMessage = () => {
        if (!saveMessage) return null;
        
        return (
            <Alert variant={saveMessage.includes('sucesso') ? 'success' : 'danger'} className="mb-4">
                {saveMessage}
            </Alert>
        );
    };

    const renderPermissionCard = () => {
        const status = getPermissionStatus();
        
        return (
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
        );
    };

    const renderTimingCard = () => (
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
                    {[
                        { key: 'first', label: 'Primeiro Aviso', icon: 'fas fa-bell text-info', default: 30 },
                        { key: 'second', label: 'Segundo Aviso', icon: 'fas fa-bell text-warning', default: 15 },
                        { key: 'third', label: 'Terceiro Aviso', icon: 'fas fa-bell text-danger', default: 5 }
                    ].map(({ key, label, icon, default: defaultValue }) => (
                        <Col md={4} key={key}>
                            <Form.Group>
                                <Form.Label className="fw-bold">
                                    <i className={`${icon} me-2`}></i>
                                    {label}
                                </Form.Label>
                                <div className="input-group">
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={notificationSettings.times[key]}
                                        onChange={(e) => handleTimeChange(key, e.target.value)}
                                        disabled={!notificationSettings.enabled}
                                    />
                                    <span className="input-group-text">min antes</span>
                                </div>
                                <Form.Text className="text-muted">
                                    {key === 'first' ? 'Primeiro' : key === 'second' ? 'Segundo' : 'Último'} lembrete (padrão: {defaultValue} min)
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    ))}
                </Row>

                <Alert variant="info" className="mt-4">
                    <i className="fas fa-lightbulb me-2"></i>
                    <strong>Dica:</strong> Os valores devem estar em ordem decrescente. Além destes, sempre receberá notificações no momento exato e em caso de atraso.
                </Alert>
            </Card.Body>
        </Card>
    );

    const renderGlucoseThresholdsCard = () => (
        <Card className="shadow-sm border-0">
            <Card.Header className="bg-info text-white">
                <h5 className="mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Alertas de Glicose
                </h5>
            </Card.Header>
            <Card.Body>
                <p className="text-muted mb-4">
                    Configure os valores de referência para alertas visuais nas medições de glicose por tipo de regime.
                </p>

                <Row className="g-3">
                    {Object.entries(GLUCOSE_REGIMES).map(([regime, config]) => (
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
    );

    const renderSaveButton = () => (
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
    );

    // Main render
    return (
        <div className="container mt-4">
            {renderHeader()}
            {renderSaveMessage()}

            <Row className="g-4">
                <Col lg={12}>
                    {renderPermissionCard()}
                </Col>

                <Col lg={12}>
                    {renderTimingCard()}
                </Col>

                <Col lg={12}>
                    {renderGlucoseThresholdsCard()}
                </Col>
            </Row>

            {renderSaveButton()}
        </div>
    );
}