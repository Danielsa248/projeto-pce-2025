import express from 'express';
import * as bd from '../db/perfil.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();


// Obter perfil do utilizador autenticado
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await bd.getUserByIdComplete(userId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Perfil não encontrado'
            });
        }

        const { password, ...safeProfile } = profile;
        
        return res.json({
            success: true,
            data: safeProfile
        });
    } catch (error) {
        console.error('Erro ao obter perfil:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});


// Rota para atualizar perfil do utilizador
router.put('/perfil', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const profileData = req.body;
        
        const updatedProfile = await bd.updateUserProfile(userId, profileData);
        
        if (!updatedProfile) {
            return res.status(404).json({
                success: false,
                message: 'Perfil não encontrado'
            });
        }

        const { password, ...safeProfile } = updatedProfile;
        
        return res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            data: safeProfile
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return res.status(500).json({
            success: false,
            message: 'A informação do perfil não pode ser atualizada',
        });
    }
});

export default router;