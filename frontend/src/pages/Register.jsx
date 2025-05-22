import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';

const FormRender = lazy(() => import('../FormRender.jsx'));

export default function Register() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    // Check if we have credentials stored
    useEffect(() => {
        const credentials = sessionStorage.getItem('registration_credentials');
        if (!credentials) {
            // Redirect to credentials form if no credentials found
            navigate('/registo');
        }
    }, [navigate]);
    
    const handleSubmitComplete = async (formData) => {
        try {
            setIsSubmitting(true);
            setError(null);
            
            // Get stored credentials
            const credentialsStr = sessionStorage.getItem('registration_credentials');
            if (!credentialsStr) {
                throw new Error('Credenciais não encontradas');
            }
            
            const credentials = JSON.parse(credentialsStr);
            
            // Process the form data using the backend's extractUserInfo
            // Send both credentials and form data to the server
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: credentials.username,
                    password: credentials.password,
                    composition: formData
                }),
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Erro ao registar');
            }
            
            // Registration successful
            sessionStorage.removeItem('registration_credentials');
            alert('Conta criada com sucesso! Por favor, faça login.');
            navigate('/login');
            
        } catch (error) {
            console.error('Erro no registo:', error);
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="container">
            {error && (
                <Alert variant="danger" className="my-3">
                    {error}
                </Alert>
            )}
            
            <Suspense fallback={<div>Loading...</div>}>
                <FormRender 
                    key="individuo" 
                    type="individuo" 
                    onSubmitComplete={handleSubmitComplete}
                />
            </Suspense>
        </div>
    );
}