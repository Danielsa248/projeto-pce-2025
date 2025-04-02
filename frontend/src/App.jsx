// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Inicio from './pages/Inicio.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Inicio />} />
        </Route>
      </Routes>
    </Router>
  );
}

/*
 * <Route path="medicao-glicose/" element={<FormGlicose />} />
 * <Route path="medicao-insulina/" element={<FormInsulina />} />
 * <Route path="agenda/" element={<Agenda />} />
 * <Route path="historico/" element={<Historico />} />
 * <Route path="opcoes/" element={<Opcoes />} />
 */
