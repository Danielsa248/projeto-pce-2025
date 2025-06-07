// Create: frontend/src/components/NotificationManager.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';
import * as agendaApi from '../api/agenda.js';

export default function NotificationManager() {
    const { isAuthenticated } = useAuth();
    const [permission, setPermission] = useState(Notification.permission);
    const [marcacoes, setMarcacoes] = useState([]);

    // Fetch marcacoes for notifications
    const fetchMarcacoes = async () => {
        if (!isAuthenticated) return;
        
        try {
            const data = await agendaApi.obterMarcacoes();
            setMarcacoes(data);
            
            // Clear notification cache when data updates
            NotificationService.clearNotificationCache();
        } catch (error) {
            console.error('Error fetching marcacoes for notifications:', error);
        }
    };

    // Request permission on component mount
    useEffect(() => {
        if (isAuthenticated && permission === 'default') {
            NotificationService.requestPermission().then(granted => {
                setPermission(granted ? 'granted' : 'denied');
                if (granted) {
                    console.log('✅ Notification permission granted');
                } else {
                    console.warn('❌ Notification permission denied');
                }
            });
        }
    }, [isAuthenticated, permission]);

    // Fetch marcacoes more frequently
    useEffect(() => {
        if (!isAuthenticated) return;

        fetchMarcacoes(); // Initial fetch

        // Fetch every 1 minute instead of 5
        const interval = setInterval(fetchMarcacoes, 60 * 1000);
        
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Listen for storage events (when agenda is updated in another tab/component)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'agenda_updated') {
                console.log('📅 Agenda updated - refreshing notifications');
                fetchMarcacoes();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Listen for custom events within the same tab
    useEffect(() => {
        const handleAgendaUpdate = () => {
            console.log('📅 Agenda updated - refreshing notifications');
            fetchMarcacoes();
        };

        window.addEventListener('agendaUpdated', handleAgendaUpdate);
        return () => window.removeEventListener('agendaUpdated', handleAgendaUpdate);
    }, []);

    // Start notification monitoring
    useEffect(() => {
        if (!isAuthenticated || permission !== 'granted') {
            NotificationService.stopMonitoring();
            return;
        }

        const getMarcacoes = () => marcacoes;
        NotificationService.startMonitoring(getMarcacoes, 60 * 1000);

        return () => {
            NotificationService.stopMonitoring();
        };
    }, [isAuthenticated, permission, marcacoes]);

    // This component doesn't render anything
    return null;
}