// App.jsx - With StyleManager
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/layout/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import StyleManager from './StyleManager.jsx';

// Lazy load the form component
const FormRender = lazy(() => import('./FormRender.jsx'));

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Inicio />} />
                <Route
                    path="medicao-glicose/"
                    element={
                        <Suspense fallback={<div>Loading...</div>}>
                            <FormRender key="glicose" type="glicose" />
                        </Suspense>
                    }
                />
                <Route
                    path="medicao-insulina/"
                    element={
                        <Suspense fallback={<div>Loading...</div>}>
                            <FormRender key="insulina" type="insulina" />
                        </Suspense>
                    }
                />
                </Route>
            </Routes>
        </Router>
    );
}
