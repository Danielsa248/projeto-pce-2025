import { useState } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export default function RegisterCredentials() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Simple validation
        if (!username.trim()) {
            setError('Nome de utilizador é obrigatório');
            return;
        }

        if (!password) {
            setError('Password é obrigatória');
            return;
        }

        if (password !== confirmPassword) {
            setError('As passwords não coincidem');
            return;
        }

        // Store credentials temporarily
        sessionStorage.setItem('registration_credentials', JSON.stringify({ 
            username, 
            password 
        }));

        // Navigate to the form with personal info
        navigate('/registo/info-pessoal');
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={6} lg={4}>
                    <Card className="shadow">
                        <Card.Body className="p-4">
                            <h2 className="text-center mb-4">Criar Conta</h2>
                            
                            {error && <Alert variant="danger">{error}</Alert>}
                            
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nome de utilizador</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Escolha um nome de utilizador"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Form.Group className="mb-3">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Escolha uma password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Form.Group className="mb-4">
                                    <Form.Label>Confirmar Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Confirme a password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Button variant="primary" type="submit" className="w-100">
                                    Continuar
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}