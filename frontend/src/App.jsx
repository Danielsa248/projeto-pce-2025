import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/layout/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import RegisterCredentials from './pages/RegisterCredentials.jsx';
import StyleManager from './StyleManager.jsx';
import Historico from './pages/Historico.jsx';
import Estatisticas from './pages/Estatisticas.jsx';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/Assistant/ChatWidget.jsx'; 
import Agenda from './pages/Agenda.jsx';
import Perfil from './pages/Perfil.jsx';
import NotificationManager from './components/NotificationManager.jsx';
import Opcoes from './pages/Opcoes.jsx'; 

// Lazy load the form component
const FormRender = lazy(() => import('./FormRender.jsx'));

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <StyleManager />
                <NotificationManager /> 
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route path="login" element={<Login />} />
                        <Route path="registo" element={<RegisterCredentials />} />
                        <Route path="registo/info-pessoal" element={<Register />} />
                        
                        <Route path="/" element={
                            <ProtectedRoute>
                                <Inicio />
                            </ProtectedRoute>
                        } index />
                        
                        <Route path="glicose/" element={
                            <ProtectedRoute>
                                <Suspense fallback={<div>Loading...</div>}>
                                    <FormRender key="glicose" type="glicose" />
                                </Suspense>
                            </ProtectedRoute>
                        } />
                        
                        <Route path="insulina/" element={
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

                        <Route path="agenda" element={
                            <ProtectedRoute>
                                <Agenda />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="historico" element={
                            <ProtectedRoute>
                                <Historico />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="perfil" element={
                            <ProtectedRoute>
                                <Perfil />
                            </ProtectedRoute>
                        } />

                        <Route path="opcoes" element={
                            <ProtectedRoute>
                                <Opcoes />
                            </ProtectedRoute>
                        } />
                    </Route>
                </Routes>
                <ChatWidget />
            </Router>
        </AuthProvider>
    );
}
