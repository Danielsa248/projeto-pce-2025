// Create a new file: frontend/src/services/NotificationService.js
class NotificationService {
    constructor() {
        this.permission = Notification.permission;
        this.checkInterval = null;
        this.dismissedNotifications = new Set(); // Track dismissed notifications
    }

    // Request notification permission
    async requestPermission() {
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        return this.permission === 'granted';
    }

    // Send a basic notification
    sendNotification(title, body = '') {
        if (this.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return null;
        }

        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            tag: 'diabetes-reminder'
        });

        // Auto-close after 8 seconds
        setTimeout(() => {
            if (notification) {
                notification.close();
            }
        }, 8000);

        // Handle notification click - focus window and go to agenda
        notification.onclick = () => {
            window.focus();
            window.location.href = window.location.origin + '/agenda';
            notification.close();
        };

        return notification;
    }

    // Get pending notifications for bell icon
    getPendingNotifications(marcacoes) {
        const now = new Date();
        const pendingNotifications = [];

        marcacoes.forEach(marcacao => {
            if (marcacao.realizado) return; // Skip completed measurements
            if (this.dismissedNotifications.has(marcacao.id)) return; // Skip dismissed

            const eventTime = new Date(marcacao.data_evento);
            const diffInMinutes = Math.round((eventTime - now) / (1000 * 60));
            
            let shouldNotify = false;
            let notificationType = '';
            let priority = 0;

            // Determine notification type and priority
            if (diffInMinutes <= 0) {
                // Overdue or happening now
                shouldNotify = true;
                notificationType = diffInMinutes === 0 ? 'now' : 'overdue';
                priority = diffInMinutes === 0 ? 4 : 5; // Highest priority for overdue
            } else if (diffInMinutes <= 5) {
                // 5 minutes or less
                shouldNotify = true;
                notificationType = '5min';
                priority = 3;
            } else if (diffInMinutes <= 15) {
                // 15 minutes or less
                shouldNotify = true;
                notificationType = '15min';
                priority = 2;
            } else if (diffInMinutes <= 30) {
                // 30 minutes or less
                shouldNotify = true;
                notificationType = '30min';
                priority = 1;
            }

            if (shouldNotify) {
                const typeLabel = marcacao.tipo_registo === 'Glucose' ? 'Glicose' : 'Insulina';
                const timeStr = eventTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                
                let title, urgency;
                
                switch (notificationType) {
                    case 'overdue':
                        title = `${typeLabel} - Em atraso!`;
                        urgency = 'danger';
                        break;
                    case 'now':
                        title = `${typeLabel} - Agora!`;
                        urgency = 'danger';
                        break;
                    case '5min':
                    case '15min':
                    case '30min':
                        // Remove the time reference, just show the type
                        title = typeLabel;
                        urgency = notificationType === '5min' ? 'warning' : 'info';
                        break;
                }

                pendingNotifications.push({
                    id: marcacao.id,
                    title,
                    time: timeStr,
                    notes: marcacao.notas,
                    urgency,
                    priority,
                    diffInMinutes,
                    type: marcacao.tipo_registo
                });
            }
        });

        // Sort by priority (highest first)
        return pendingNotifications.sort((a, b) => b.priority - a.priority);
    }

    // Dismiss a notification
    dismissNotification(marcacaoId) {
        this.dismissedNotifications.add(marcacaoId);
        console.log(`📱 Notification dismissed for marcacao ${marcacaoId}`);
    }

    // Clear dismissed notifications (when marcacoes are updated)
    clearDismissedNotifications() {
        this.dismissedNotifications.clear();
        console.log('🔄 Dismissed notifications cleared');
    }

    // Start monitoring for upcoming events
    startMonitoring(getMarcacoes, interval = 60000) {
        this.stopMonitoring();

        this.checkInterval = setInterval(() => {
            const marcacoes = getMarcacoes();
            if (marcacoes && marcacoes.length > 0) {
                // Send browser notifications for immediate/overdue events
                const pendingNotifications = this.getPendingNotifications(marcacoes);
                
                pendingNotifications.forEach(notification => {
                    if (notification.urgency === 'danger' && notification.diffInMinutes <= 0) {
                        // Only send browser notification for overdue/now events
                        this.sendNotification(notification.title, `Agendado para ${notification.time}`);
                    }
                });
            }
        }, interval);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

export default new NotificationService();