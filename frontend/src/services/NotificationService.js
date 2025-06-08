// Create a new file: frontend/src/services/NotificationService.js
class NotificationService {
    constructor() {
        this.permission = Notification.permission;
        this.checkInterval = null;
        this.dismissedNotifications = new Set();
        this.sentBrowserNotifications = new Map(); // Changed to Map to track timing stages
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
            tag: 'diabetes-reminder',
            requireInteraction: false // Changed to false for better UX
        });

        // Auto-close after 8 seconds
        setTimeout(() => {
            if (notification) {
                notification.close();
            }
        }, 8000);

        // Handle notification click
        notification.onclick = () => {
            window.focus();
            window.location.href = window.location.origin + '/agenda';
            notification.close();
        };

        return notification;
    }

    // Get pending notifications for bell icon
    getPendingNotifications(marcacoes) {
        if (!Array.isArray(marcacoes)) return [];
        
        const now = new Date();
        const pendingNotifications = [];

        marcacoes.forEach(marcacao => {
            if (marcacao.realizado) return;
            if (this.dismissedNotifications.has(marcacao.id)) return;

            const eventTime = new Date(marcacao.data_evento);
            const diffInMinutes = Math.round((eventTime - now) / (1000 * 60));
            
            let shouldNotify = false;
            let notificationType = '';
            let priority = 0;

            if (diffInMinutes <= 0) {
                shouldNotify = true;
                notificationType = diffInMinutes === 0 ? 'now' : 'overdue';
                priority = diffInMinutes === 0 ? 4 : 5;
            } else if (diffInMinutes <= 5) {
                shouldNotify = true;
                notificationType = '5min';
                priority = 3;
            } else if (diffInMinutes <= 15) {
                shouldNotify = true;
                notificationType = '15min';
                priority = 2;
            } else if (diffInMinutes <= 30) {
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
                    type: marcacao.tipo_registo,
                    notificationType
                });
            }
        });

        return pendingNotifications.sort((a, b) => b.priority - a.priority);
    }

    // Generate unique notification key for browser notifications
    generateNotificationKey(marcacaoId, notificationType) {
        return `${marcacaoId}-${notificationType}`;
    }

    // Check if notification was already sent for this timing
    wasNotificationSent(marcacaoId, notificationType) {
        const key = this.generateNotificationKey(marcacaoId, notificationType);
        return this.sentBrowserNotifications.has(key);
    }

    // Mark notification as sent
    markNotificationAsSent(marcacaoId, notificationType) {
        const key = this.generateNotificationKey(marcacaoId, notificationType);
        this.sentBrowserNotifications.set(key, Date.now());
        console.log(`📝 Marked notification as sent: ${key}`);
    }

    // Clear sent browser notifications when marcacoes are updated
    clearNotificationCache() {
        this.sentBrowserNotifications.clear();
        console.log('🔄 Browser notification cache cleared');
    }

    // Dismiss a notification
    dismissNotification(marcacaoId) {
        this.dismissedNotifications.add(marcacaoId);
        console.log(`📱 Notification dismissed for marcacao ${marcacaoId}`);
    }

    // Clear dismissed notifications
    clearDismissedNotifications() {
        this.dismissedNotifications.clear();
        console.log('🔄 Dismissed notifications cleared');
    }

    // Start monitoring for upcoming events
    startMonitoring(getMarcacoes, interval = 60000) {
        console.log('🔔 Starting notification monitoring...');
        this.stopMonitoring();

        this.checkInterval = setInterval(() => {
            const marcacoes = getMarcacoes();
            if (!marcacoes || marcacoes.length === 0) {
                console.log('📭 No marcacoes to check for notifications');
                return;
            }

            console.log(`🔍 Checking ${marcacoes.length} marcacoes for notifications...`);
            
            const pendingNotifications = this.getPendingNotifications(marcacoes);
            console.log(`📋 Found ${pendingNotifications.length} pending notifications`);
            
            pendingNotifications.forEach(notification => {
                if (!this.wasNotificationSent(notification.id, notification.notificationType)) {
                    let browserTitle, browserBody;
                    
                    switch (notification.notificationType) {
                        case 'overdue':
                            browserTitle = notification.title;
                            browserBody = `Estava agendado para ${notification.time}`;
                            break;
                        case 'now':
                            browserTitle = notification.title;
                            browserBody = `Agendado para ${notification.time}`;
                            break;
                        case '5min':
                            browserTitle = `${notification.type === 'Glucose' ? 'Glicose' : 'Insulina'} em 5 minutos`;
                            browserBody = `Agendado para ${notification.time}`;
                            break;
                        case '15min':
                            browserTitle = `${notification.type === 'Glucose' ? 'Glicose' : 'Insulina'} em 15 minutos`;
                            browserBody = `Agendado para ${notification.time}`;
                            break;
                        case '30min':
                            browserTitle = `${notification.type === 'Glucose' ? 'Glicose' : 'Insulina'} em 30 minutos`;
                            browserBody = `Agendado para ${notification.time}`;
                            break;
                    }
                    
                    if (notification.notes) {
                        browserBody += `\nNotas: ${notification.notes}`;
                    }
                    
                    console.log(`🔔 Sending browser notification: ${browserTitle} (${notification.notificationType}) for marcacao ${notification.id}`);
                    
                    const sentNotification = this.sendNotification(browserTitle, browserBody);
                    
                    if (sentNotification) {
                        this.markNotificationAsSent(notification.id, notification.notificationType);
                    }
                }
            });
        }, interval);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('🛑 Stopped notification monitoring');
        }
    }
}

export default new NotificationService();