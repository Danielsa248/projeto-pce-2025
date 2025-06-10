import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import './Perfil.css';


const MultiContactDisplay = ({ 
    title, 
    contacts = [], 
    primaryValue,
    isEditing, 
    onEditPrimary, 
    onContactChange,
    type,
    icon 
}) => {
    return (
        <Form.Group>
            <Form.Label className="fw-bold text-primary">
                <i className={`fas ${icon} me-2`}></i>
                {title} {isEditing && <i className="fas fa-edit text-success ms-1"></i>}
            </Form.Label>
            
            {isEditing ? (
                <div>
                    {contacts.map((contact, index) => (
                        <div key={`${title}-${index}`} className="d-flex align-items-center mb-2">
                            <Form.Control
                                type={type}
                                value={contact.valor || ''}
                                onChange={(e) => onContactChange(index, e.target.value)}
                                className="border-success me-2"
                                placeholder={type === 'email' ? 'exemplo@email.com' : 'Ex: +351 912 345 678'}
                            />
                            {index === 0 && (
                                <Badge bg="primary" className="me-2">Principal</Badge>
                            )}
                            {contacts.length > 1 && (
                                <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => onContactChange(index, null)}
                                >
                                    <i className="fas fa-trash"></i>
                                </Button>
                            )}
                        </div>
                    ))}
                    
                    <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => onContactChange(-1, '')}
                    >
                        <i className="fas fa-plus me-1"></i>
                        Adicionar {title.slice(0, -1)}
                    </Button>
                </div>
            ) : (
                <div>
                    {contacts.length > 0 ? (
                        contacts.map((contact, index) => (
                            <div key={`view-${index}`} className="d-flex align-items-center mb-1">
                                <span>{contact.valor}</span>
                                {index === 0 && (
                                    <Badge bg="primary" className="ms-2">Principal</Badge>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="mb-0 text-muted">-</p>
                    )}
                </div>
            )}
        </Form.Group>
    );
};

export default function Perfil() {
    const { getToken } = useAuth();
    const [profile, setProfile] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [editedProfile, setEditedProfile] = useState({});

    useEffect(() => {
        fetchProfileData();
    }, []);

    useEffect(() => {
        if (profile) {
            setEditedProfile({
                ...profile,
                emails: profile.emails || [],
                telefones: profile.telefones || []
            });
        }
    }, [profile]);

    const fetchProfileData = async () => {
        try {
            setIsLoading(true);
            const token = getToken();
            
            if (!token) {
                throw new Error('Token não encontrado');
            }

            const [profileResponse, statsResponse] = await Promise.all([
                fetch('http://localhost:3000/api/perfil/perfil', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }),
            ]);

            if (!profileResponse.ok) {
                throw new Error('Erro ao carregar dados do perfil');
            }

            const profileData = await profileResponse.json();

            if (profileData.success) {
                setProfile(profileData.data);
                setEditedProfile(profileData.data);
            } else {
                throw new Error('Erro ao processar dados');
            }
            console.log('Perfil carregado:', profileData.data);

        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditedProfile({
            ...profile,
            emails: profile.emails || [],
            telefones: profile.telefones || []
        });
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedProfile(profile);
        setError(null);
        setSuccess(null);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);
            
            const token = getToken();
            
            const editableFields = {
                altura: editedProfile.altura,
                peso: editedProfile.peso,
                emails: editedProfile.emails?.filter(email => email.valor && email.valor.trim() !== ''),
                telefones: editedProfile.telefones?.filter(telefone => telefone.valor && telefone.valor.trim() !== '')
            };
            
            console.log('Enviando dados:', editableFields);
            
            const response = await fetch('http://localhost:3000/api/perfil/perfil', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editableFields)
            });

            const data = await response.json();

            if (data.success) {
                setProfile(data.data);
                setEditedProfile(data.data);
                setIsEditing(false);
                setSuccess('Perfil atualizado com sucesso!');
            } else {
                throw new Error(data.message || 'Erro ao atualizar perfil');
            }

        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            setError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setEditedProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEmailChange = useCallback((index, newValue) => {
        if (newValue === null) {
            const newEmails = editedProfile.emails.filter((_, i) => i !== index);
            setEditedProfile(prev => ({
                ...prev,
                emails: newEmails
            }));
        } else if (index === -1) {
            const newEmails = [...(editedProfile.emails || []), { valor: '' }];
            setEditedProfile(prev => ({
                ...prev,
                emails: newEmails
            }));
        } else {
            const newEmails = [...(editedProfile.emails || [])];
            newEmails[index] = { valor: newValue };
            setEditedProfile(prev => ({
                ...prev,
                emails: newEmails
            }));
        }
    }, [editedProfile]);

    const handlePhoneChange = useCallback((index, newValue) => {
        if (newValue === null) {
            const newPhones = editedProfile.telefones.filter((_, i) => i !== index);
            setEditedProfile(prev => ({
                ...prev,
                telefones: newPhones
            }));
        } else if (index === -1) {
            const newPhones = [...(editedProfile.telefones || []), { valor: '' }];
            setEditedProfile(prev => ({
                ...prev,
                telefones: newPhones
            }));
        } else {
            const newPhones = [...(editedProfile.telefones || [])];
            newPhones[index] = { valor: newValue };
            setEditedProfile(prev => ({
                ...prev,
                telefones: newPhones
            }));
        }
    }, [editedProfile]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT');
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return '-';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    };

    // Funções para obter emails e telefones   
    const getAllEmails = (profile) => {
        return profile?.emails || [];
    };

    const getAllPhones = (profile) => {
        return profile?.telefones || [];
    };

    const getPrimaryEmail = (profile) => {
        return profile?.email || profile?.emails?.[0]?.valor || '';
    };

    const getPrimaryPhone = (profile) => { 
        return profile?.telefone || profile?.telefones?.[0]?.valor || '';
    };

    if (isLoading) {
        return (
            <Container className="py-4">
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">A carregar perfil...</p>
                </div>
            </Container>
        );
    }

    if (error && !profile) {
        return (
            <Container className="py-4">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao carregar perfil</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="outline-danger" onClick={fetchProfileData}>
                        Tentar novamente
                    </Button>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            {/* Header */}
            <div className="profile-header mb-4">
                <Row className="align-items-center">
                    <Col>
                        <h1 className="display-6 fw-bold text-primary mb-1">
                            <i className="fas fa-user-circle me-3"></i>
                            Meu Perfil
                        </h1>
                        <p className="text-muted mb-0">
                            Dados pessoais e informações médicas
                        </p>
                    </Col>
                    <Col xs="auto">
                        {!isEditing ? (
                            <Button variant="outline-primary" onClick={handleEdit}>
                                <i className="fas fa-edit me-2"></i>
                                Editar Dados
                            </Button>
                        ) : (
                            <div className="d-flex gap-2">
                                <Button 
                                    variant="success" 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <>
                                            <i className="fas fa-save me-2"></i>
                                            Guardar
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline-secondary" onClick={handleCancel}>
                                    <i className="fas fa-times me-2"></i>
                                    Cancelar
                                </Button>
                            </div>
                        )}
                    </Col>
                </Row>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            <Row className="g-4">
                {/* Informações Pessoais */}
                <Col lg={12}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-user me-2"></i>
                                Informações Pessoais
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="g-3">
                                {/* Nome Completo */}
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Nome Completo</Form.Label>
                                        <p className="mb-0 fs-5">{profile?.nome}</p>
                                    </Form.Group>
                                </Col>

                                {/* Nr Utente */}
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Número de Utente</Form.Label>
                                        <p className="mb-0 fs-5">{profile?.id}</p>
                                    </Form.Group>
                                </Col>

                                {/* Data de Nascimento */}
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Data de Nascimento</Form.Label>
                                        <p className="mb-0">
                                            {formatDate(profile?.data_nasc)}
                                            {profile?.data_nasc && (
                                                <Badge bg="info" className="ms-2">
                                                    {calculateAge(profile.data_nasc)} anos
                                                </Badge>
                                            )}
                                        </p>
                                    </Form.Group>
                                </Col>

                                {/* Género */}
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Género</Form.Label>
                                        <p className="mb-0">{profile?.genero}</p>
                                    </Form.Group>
                                </Col>
                                
                                {/* Email */}
                                <Col md={6}>
                                    <MultiContactDisplay
                                        title="Emails"
                                        contacts={isEditing ? editedProfile.emails || [] : getAllEmails(profile)}
                                        primaryValue={getPrimaryEmail(profile)}
                                        isEditing={isEditing}
                                        onContactChange={handleEmailChange}
                                        type="email"
                                        icon="fa-envelope"
                                    />
                                </Col>

                                {/* Telefone */}
                                <Col md={6}>
                                    <MultiContactDisplay
                                        title="Telefones"
                                        contacts={isEditing ? editedProfile.telefones || [] : getAllPhones(profile)}
                                        primaryValue={getPrimaryPhone(profile)}
                                        isEditing={isEditing}
                                        onContactChange={handlePhoneChange}
                                        type="tel"
                                        icon="fa-phone"
                                    />
                                </Col>

                                {/* Morada */}
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Morada</Form.Label>
                                        <p className="mb-0">{profile?.morada.endereco || '-'}</p>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Código-Postal</Form.Label>
                                        <p className="mb-0">{profile?.morada.cod_postal|| '-'}</p>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">País</Form.Label>
                                        <p className="mb-0">{profile?.morada.pais || '-'}</p>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Distrito</Form.Label>
                                        <p className="mb-0">{profile?.morada.distrito || '-'}</p>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-primary">Cidade</Form.Label>
                                        <p className="mb-0">{profile?.morada.cidade || '-'}</p>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Row className="g-4 mt-4">
                {/* Informações Médicas */}
                <Col lg={12}>
                    <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-danger text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-heartbeat me-2"></i>
                                Informações Médicas
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="g-3">
                                {/* Altura */}
                                <Col lg={4} md={6} sm={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-danger">
                                            Altura (cm) {isEditing && <i className="fas fa-edit text-success ms-1"></i>}
                                        </Form.Label>
                                        {isEditing ? (
                                            <Form.Control
                                                type="number"
                                                step="0.1"
                                                min="50"
                                                max="250"
                                                value={editedProfile.altura || ''}
                                                onChange={(e) => handleInputChange('altura', e.target.value)}
                                                className="border-success"
                                                placeholder="Ex: 175"
                                            />
                                        ) : (
                                            <p className="mb-0">
                                                {profile?.altura ? `${profile.altura} cm` : '-'}
                                            </p>
                                        )}
                                    </Form.Group>
                                </Col>

                                {/* Peso */}
                                <Col lg={4} md={6} sm={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-danger">
                                            Peso (kg) {isEditing && <i className="fas fa-edit text-success ms-1"></i>}
                                        </Form.Label>
                                        {isEditing ? (
                                            <Form.Control
                                                type="number"
                                                step="0.1"
                                                min="20"
                                                max="300"
                                                value={editedProfile.peso || ''}
                                                onChange={(e) => handleInputChange('peso', e.target.value)}
                                                className="border-success"
                                                placeholder="Ex: 70.5"
                                            />
                                        ) : (
                                            <p className="mb-0">
                                                {profile?.peso ? `${profile.peso} kg` : '-'}
                                            </p>
                                        )}
                                    </Form.Group>
                                </Col>

                                {/* IMC */}
                                <Col lg={4} md={6} sm={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-danger">IMC</Form.Label>
                                        <div className="mb-0">
                                            {profile?.peso && profile?.altura ? (
                                                (() => {
                                                    const imc = (profile.peso / Math.pow(profile.altura / 100, 2));
                                                    let variant = 'secondary';
                                                    let interpretation = '';
                                                    
                                                    if (imc < 18.5) {
                                                        variant = 'info';
                                                        interpretation = 'Peso Baixo';
                                                    } else if (imc >= 18.5 && imc < 25) {
                                                        variant = 'success';
                                                        interpretation = 'Normal';
                                                    } else if (imc >= 25 && imc < 30) {
                                                        variant = 'warning';
                                                        interpretation = 'Sobrepeso';
                                                    } else {
                                                        variant = 'danger';
                                                        interpretation = 'Obesidade';
                                                    }
                                                    
                                                    return (
                                                        <div>
                                                            <Badge bg={variant} className="mb-1">
                                                                {imc.toFixed(1)}
                                                            </Badge>
                                                            <br />
                                                            <small className="text-muted">{interpretation}</small>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Card de Informação sobre Edição */}
                <Col lg={12}>
                    <Card className="shadow-sm border-0 bg-light">
                        <Card.Body className="text-center py-3">
                            <div className="d-flex align-items-center justify-content-center">
                                <i className="fas fa-info-circle text-info me-2"></i>
                                <span className="text-muted">
                                    <strong>Campos editáveis:</strong> Email, Telefone, Altura e Peso. 
                                    Para alterar outros dados, contacte o administrador.
                                </span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}