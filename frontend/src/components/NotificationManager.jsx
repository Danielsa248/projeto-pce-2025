// Create: frontend/src/components/NotificationManager.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';
import * as agendaApi from '../api/agenda.js';

export default function NotificationManager() {
    const { isAuthenticated } = useAuth();
    const [permission, setPermission] = useState(Notification.permission);
    const [marcacoes, setMarcacoes] = useState([]);

    const fetchMarcacoes = async () => {
        if (!isAuthenticated) return;
        
        try {
            const data = await agendaApi.obterMarcacoes();
            console.log(`📅 NotificationManager: Fetched ${data.length} marcacoes`);
            setMarcacoes(data);
            
            // Clear notification cache when data updates to allow new notifications
            NotificationService.clearNotificationCache();
        } catch (error) {
            console.error('Error fetching marcacoes for notifications:', error);
        }
    };

    // Request permission on component mount
    useEffect(() => {
        if (isAuthenticated && permission === 'default') {
            console.log('🔔 Requesting notification permission...');
            NotificationService.requestPermission().then(granted => {
                const newPermission = granted ? 'granted' : 'denied';
                setPermission(newPermission);
                if (granted) {
                    console.log('✅ Notification permission granted');
                } else {
                    console.warn('❌ Notification permission denied');
                }
            });
        }
    }, [isAuthenticated, permission]);

    // Fetch marcacoes
    useEffect(() => {
        if (!isAuthenticated) return;

        fetchMarcacoes();
        const interval = setInterval(fetchMarcacoes, 30 * 1000); // Check every 30 seconds
        
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Listen for agenda updates
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'agenda_updated') {
                console.log('📅 Agenda updated via storage - refreshing notifications');
                fetchMarcacoes();
            }
        };

        const handleAgendaUpdate = () => {
            console.log('📅 Agenda updated via event - refreshing notifications');
            fetchMarcacoes();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('agendaUpdated', handleAgendaUpdate);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('agendaUpdated', handleAgendaUpdate);
        };
    }, []);

    // Start notification monitoring
    useEffect(() => {
        if (!isAuthenticated) {
            console.log('❌ Not authenticated - stopping notification monitoring');
            NotificationService.stopMonitoring();
            return;
        }

        if (permission !== 'granted') {
            console.log(`❌ Permission not granted (${permission}) - stopping notification monitoring`);
            NotificationService.stopMonitoring();
            return;
        }

        if (marcacoes.length === 0) {
            console.log('📭 No marcacoes available - not starting monitoring yet');
            return;
        }

        console.log(`🔔 Starting notification monitoring with ${marcacoes.length} marcacoes`);
        
        const getMarcacoes = () => {
            console.log(`📋 Providing ${marcacoes.length} marcacoes to NotificationService`);
            return marcacoes;
        };
        
        NotificationService.startMonitoring(getMarcacoes, 30 * 1000); // Check every 30 seconds

        return () => {
            NotificationService.stopMonitoring();
        };
    }, [isAuthenticated, permission, marcacoes]);

    // This component doesn't render anything
    return null;
}