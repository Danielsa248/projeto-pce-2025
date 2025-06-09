// =============================================
// NOTIFICATION MANAGER COMPONENT
// =============================================

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';
import * as agendaApi from '../api/agenda.js';

// Constants
const FETCH_INTERVAL = 30 * 1000;
const MONITORING_INTERVAL = 30 * 1000;

// =============================================
// MAIN COMPONENT
// =============================================

export default function NotificationManager() {
    const { isAuthenticated } = useAuth();
    const [permission, setPermission] = useState(Notification.permission);
    const [marcacoes, setMarcacoes] = useState([]);

    // =============================================
    // DATA FETCHING
    // =============================================

    const fetchMarcacoes = async () => {
        if (!isAuthenticated) return;
        
        try {
            const data = await agendaApi.obterMarcacoes();
            setMarcacoes(data);
            NotificationService.clearNotificationCache();
            
            if (NotificationService.checkInterval) {
                NotificationService.refreshNotifications(() => data);
            }
        } catch (error) {
            // Silent fail
        }
    };

    // =============================================
    // PERMISSION MANAGEMENT
    // =============================================

    useEffect(() => {
        if (isAuthenticated && permission === 'default') {
            NotificationService.requestPermission().then(granted => {
                setPermission(granted ? 'granted' : 'denied');
            });
        }
    }, [isAuthenticated, permission]);

    // =============================================
    // DATA SYNCHRONIZATION
    // =============================================

    useEffect(() => {
        if (!isAuthenticated) return;

        fetchMarcacoes();
        const interval = setInterval(fetchMarcacoes, FETCH_INTERVAL);
        
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'agenda_updated') fetchMarcacoes();
        };

        const handleAgendaUpdate = () => fetchMarcacoes();

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('agendaUpdated', handleAgendaUpdate);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('agendaUpdated', handleAgendaUpdate);
        };
    }, []);

    // =============================================
    // MONITORING CONTROL
    // =============================================

    useEffect(() => {
        if (!shouldStartMonitoring()) {
            NotificationService.stopMonitoring();
            return;
        }

        const getMarcacoes = () => marcacoes;
        NotificationService.startMonitoring(getMarcacoes, MONITORING_INTERVAL);

        return () => NotificationService.stopMonitoring();
    }, [isAuthenticated, permission, marcacoes]);

    // =============================================
    // HELPER FUNCTIONS
    // =============================================

    const shouldStartMonitoring = () => {
        return isAuthenticated && 
               permission === 'granted' && 
               marcacoes.length > 0;
    };

    // Component doesn't render anything
    return null;
}