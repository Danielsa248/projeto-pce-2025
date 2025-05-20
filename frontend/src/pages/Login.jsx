import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            // Backend stuff que not done:
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Falha na autenticação');
            }
            
            // Login with user data and token
            login(data.user, data.token);
            

            navigate(from, { replace: true });
            
        } catch (err) {
            setError(err.message || 'Utilizador ou senha incorretos. Tente novamente.');
            console.error('Erro de login:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-4">
                    <div className="card shadow">
                        <div className="card-body p-5">
                            <h2 className="text-center mb-4">Login</h2>
                            
                            {error && <Alert variant="danger">{error}</Alert>}
                            
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nome de utilizador</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Inserir utilizador"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                
                                <Form.Group className="mb-4">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                
                                <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
                                    {isLoading ? 'A carregar...' : 'Entrar'}
                                </Button>
                            </Form>
                            
                            <div className="mt-4 text-center">
                                <p>Não tem conta? <Link to="/registo" style={{ color: "#0056b3" }}>Registar</Link></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}