import express from 'express';
import * as bd from '../db/agenda.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/agenda
router.get('/', authenticateToken, async (req, res) => {
    const utilizadorId = req.user.id;
    
    try {
        const agenda = await bd.listarAgenda(utilizadorId);
        res.json(agenda);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao obter agenda' });
    }
});

// POST /api/agenda
router.post('/', authenticateToken, async (req, res) => {
    const utilizador = req.user.id; // Obter do token
    const { tipo_registo, data_evento, notas } = req.body;
    
    if (!tipo_registo || !data_evento) {
        return res.status(400).json({ erro: 'Dados em falta' });
    }

    const eventDate = new Date(data_evento);
    const now = new Date();
    
    if (eventDate < now) {
        return res.status(400).json({ 
            erro: 'Não é possível agendar eventos para datas que já passaram.' 
        });
    }

    try {
        const nova = await bd.criarMarcacao({ utilizador, tipo_registo, data_evento, notas });
        res.status(201).json(nova);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar marcação' });
    }
});

// PATCH /api/agenda/:id/status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { realizado } = req.body;
    const utilizadorId = req.user.id;

    if (typeof realizado !== 'boolean') {
        return res.status(400).json({ erro: 'Status deve ser true ou false' });
    }

    try {
        const agenda = await bd.listarAgenda(utilizadorId);
        const marcacao = agenda.find(item => item.id === id);
        
        if (!marcacao) {
            return res.status(404).json({ erro: 'Marcação não encontrada' });
        }

        const atualizada = await bd.alterarStatusRealizado(id, realizado);
        res.json(atualizada);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao alterar status' });
    }
});

// DELETE /api/agenda/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const utilizadorId = req.user.id;

    try {
        const agenda = await bd.listarAgenda(utilizadorId);
        const marcacao = agenda.find(item => item.id === id);
        
        if (!marcacao) {
            return res.status(404).json({ erro: 'Marcação não encontrada' });
        }

        await bd.apagarMarcacao(id);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao apagar marcação' });
    }
});

export default router;
