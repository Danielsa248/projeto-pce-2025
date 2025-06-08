// Create a new file: frontend/src/services/NotificationService.js
class NotificationService {
    constructor() {
        this.permission = Notification.permission;
        this.checkInterval = null;
        this.dismissedNotifications = new Set();
        this.sentBrowserNotifications = new Map();
        
        // Default settings - will be overridden by user preferences
        this.settings = {
            enabled: false,
            times: {
                first: 30,   // First notification time
                second: 15,  // Second notification time  
                third: 5     // Third notification time
            },
            browserNotifications: true,
            bellNotifications: true
        };
        
        // Load settings from localStorage
        this.loadSettings();
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('notificationSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                this.settings = {
                    ...this.settings,
                    ...parsed,
                    enabled: this.permission === 'granted' // Always sync with actual permission
                };
                console.log('📋 Loaded notification settings:', this.settings);
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    // Update settings (called from Opcoes page)
    updateSettings(newSettings) {
        this.settings = {
            ...this.settings,
            ...newSettings,
            enabled: this.permission === 'granted' // Always sync with actual permission
        };
        console.log('🔧 Updated notification settings:', this.settings);
    }

    // Request notification permission
    async requestPermission() {
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        
        // Update settings when permission changes
        this.settings.enabled = this.permission === 'granted';
        
        return this.permission === 'granted';
    }

    // Send a basic notification
    sendNotification(title, body = '') {
        if (this.permission !== 'granted' || !this.settings.browserNotifications) {
            console.warn('Browser notifications disabled or permission not granted');
            return null;
        }

        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            tag: 'diabetes-reminder',
            requireInteraction: false
        });

        setTimeout(() => {
            if (notification) {
                notification.close();
            }
        }, 8000);

        notification.onclick = () => {
            window.focus();
            window.location.href = window.location.origin + '/agenda';
            notification.close();
        };

        return notification;
    }

    // Get pending notifications for bell icon (using custom timings)
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

            // Use custom timing settings
            const { first, second, third } = this.settings.times;

            if (diffInMinutes <= 0) {
                shouldNotify = true;
                notificationType = diffInMinutes === 0 ? 'now' : 'overdue';
                priority = diffInMinutes === 0 ? 5 : 6; // Highest priority for overdue
            } else if (diffInMinutes <= third) {
                shouldNotify = true;
                notificationType = 'third';
                priority = 4;
            } else if (diffInMinutes <= second) {
                shouldNotify = true;
                notificationType = 'second';
                priority = 3;
            } else if (diffInMinutes <= first) {
                shouldNotify = true;
                notificationType = 'first';
                priority = 2;
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
                    case 'third':
                        title = typeLabel;
                        urgency = 'warning'; // Yellow for final warning
                        break;
                    case 'second':
                    case 'first':
                        title = typeLabel;
                        urgency = 'info'; // Blue for early warnings
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
    startMonitoring(getMarcacoes, interval = 30000) {
        console.log('🔔 Starting notification monitoring with settings:', this.settings);
        this.stopMonitoring();

        this.checkInterval = setInterval(() => {
            const marcacoes = getMarcacoes();
            if (!marcacoes || marcacoes.length === 0) {
                return;
            }

            const pendingNotifications = this.getPendingNotifications(marcacoes);
            
            pendingNotifications.forEach(notification => {
                if (!this.wasNotificationSent(notification.id, notification.notificationType)) {
                    let browserTitle, browserBody;
                    const { first, second, third } = this.settings.times;
                    
                    switch (notification.notificationType) {
                        case 'overdue':
                            browserTitle = notification.title;
                            browserBody = `Estava agendado para ${notification.time}`;
                            break;
                        case 'now':
                            browserTitle = notification.title;
                            browserBody = `Agendado para ${notification.time}`;
                            break;
                        case 'third':
                            browserTitle = `${notification.type === 'Glucose' ? 'Glicose' : 'Insulina'} em ${third} minutos`;
                            browserBody = `Agendado para ${notification.time}`;
                            break;
                        case 'second':
                            browserTitle = `${notification.type === 'Glucose' ? 'Glicose' : 'Insulina'} em ${second} minutos`;
                            browserBody = `Agendado para ${notification.time}`;
                            break;
                        case 'first':
                            browserTitle = `${notification.type === 'Glucose' ? 'Glicose' : 'Insulina'} em ${first} minutos`;
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