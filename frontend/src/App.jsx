import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/layout/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import RegisterCredentials from './pages/RegisterCredentials.jsx'; // Add this import
import StyleManager from './StyleManager.jsx';
import Historico from './pages/Historico.jsx';
import Estatisticas from './pages/Estatisticas.jsx';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/Assistant/ChatWidget.jsx'; 

// Lazy load the form component
const FormRender = lazy(() => import('./FormRender.jsx'));

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <StyleManager />
                <Routes>
                    <Route path="/" element={<Layout />}>

                        <Route path="login" element={<Login />} />
                        {/* Update registration routes */}
                        <Route path="registo" element={<RegisterCredentials />} />
                        <Route path="registo/info-pessoal" element={<Register />} />
                        
                        <Route path="/" element={
                            <ProtectedRoute>
                                <Inicio />
                            </ProtectedRoute>
                        } index />
                        
                        <Route path="medicao-glicose/" element={
                            <ProtectedRoute>
                                <Suspense fallback={<div>Loading...</div>}>
                                    <FormRender key="glicose" type="glicose" />
                                </Suspense>
                            </ProtectedRoute>
                        } />
                        
                        <Route path="medicao-insulina/" element={
                            <ProtectedRoute>
                                <Suspense fallback={<div>Loading...</div>}>
                                    <FormRender key="insulina" type="insulina" />
                                </Suspense>
                            </ProtectedRoute>
                        } />

                        <Route path='estatisticas' element={
                            <ProtectedRoute>
                                <Estatisticas />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="historico" element={
                            <ProtectedRoute>
                                <Historico />
                            </ProtectedRoute>
                        } />
                    </Route>
                </Routes>
                <ChatWidget />
            </Router>
        </AuthProvider>
    );
}
