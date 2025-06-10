import express from 'express';
import cors from 'cors';
import agendaRoutes from './routes/agenda.js';
import authRoutes from './routes/auth.js';
import perfilRoutes from './routes/perfil.js';
import registosRoutes from './routes/registos.js';
import fhirRoutes from './routes/fhir.js';
import botRoutes from './routes/bot.js';

const app = express();
const PORT = 3000;

app.use(cors()); // Permitir requisições do frontend
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/registos', registosRoutes);
app.use('/api/fhir', fhirRoutes);
app.use('/api/assistant', botRoutes);

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
