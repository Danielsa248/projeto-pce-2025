// =============================================
// NOTIFICATION SERVICE
// =============================================

// Constants
const DEFAULT_SETTINGS = {
    enabled: false,
    times: { first: 30, second: 15, third: 5 },
    browserNotifications: true,
    bellNotifications: true
};

const NOTIFICATION_CONFIG = {
    ICON: '/favicon.ico',
    TAG: 'diabetes-reminder',
    AUTO_CLOSE_DELAY: 8000,
    CACHE_CLEANUP_HOURS: 2
};

const URGENCY_LEVELS = {
    DANGER: 'danger',
    WARNING: 'warning', 
    INFO: 'info'
};

// =============================================
// MAIN SERVICE CLASS
// =============================================

class NotificationService {
    constructor() {
        this.permission = Notification.permission;
        this.checkInterval = null;
        this.dismissedNotifications = new Set();
        this.sentBrowserNotifications = new Map();
        this.settings = { ...DEFAULT_SETTINGS };
        
        this.loadSettings();
    }

    // =============================================
    // SETTINGS MANAGEMENT
    // =============================================

    loadSettings() {
        try {
            const saved = localStorage.getItem('notificationSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                this.settings.enabled = this.permission === 'granted';
            }
        } catch (error) {
            // Silent fail - use defaults
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.settings.enabled = this.permission === 'granted';
    }

    // =============================================
    // PERMISSION HANDLING
    // =============================================

    async requestPermission() {
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        this.settings.enabled = this.permission === 'granted';
        return this.permission === 'granted';
    }

    // =============================================
    // NOTIFICATION CREATION
    // =============================================

    sendNotification(title, body = '') {
        if (!this.canSendNotifications()) return null;

        const notification = new Notification(title, {
            body: body,
            icon: NOTIFICATION_CONFIG.ICON,
            tag: NOTIFICATION_CONFIG.TAG,
            requireInteraction: false
        });

        this.setupNotificationHandlers(notification);
        return notification;
    }

    canSendNotifications() {
        return this.permission === 'granted' && this.settings.browserNotifications;
    }

    setupNotificationHandlers(notification) {
        setTimeout(() => notification?.close(), NOTIFICATION_CONFIG.AUTO_CLOSE_DELAY);
        
        notification.onclick = () => {
            window.focus();
            window.location.href = window.location.origin + '/agenda';
            notification.close();
        };
    }

    // =============================================
    // PENDING NOTIFICATIONS LOGIC
    // =============================================

    getPendingNotifications(marcacoes) {
        if (!Array.isArray(marcacoes)) return [];
        
        const now = new Date();
        const pending = [];

        marcacoes.forEach(marcacao => {
            if (this.shouldSkipMarcacao(marcacao)) return;

            const notificationData = this.calculateNotificationTiming(marcacao, now);
            if (notificationData.shouldNotify) {
                pending.push(this.createNotificationObject(marcacao, notificationData));
            }
        });

        return this.sortNotificationsByPriority(pending);
    }

    shouldSkipMarcacao(marcacao) {
        return marcacao.realizado || this.dismissedNotifications.has(marcacao.id);
    }

    calculateNotificationTiming(marcacao, now) {
        const eventTime = new Date(marcacao.data_evento);
        const diffInMinutes = Math.round((eventTime - now) / (1000 * 60));
        const { first, second, third } = this.settings.times;
        
        // Add tolerance to catch edge cases
        const tolerances = {
            first: first + 1,
            second: second + 1,
            third: third + 1
        };

        if (diffInMinutes <= 0) {
            return {
                shouldNotify: true,
                notificationType: diffInMinutes === 0 ? 'now' : 'overdue',
                priority: diffInMinutes === 0 ? 5 : 6,
                urgency: URGENCY_LEVELS.DANGER
            };
        } else if (diffInMinutes <= tolerances.third) {
            return {
                shouldNotify: true,
                notificationType: 'third',
                priority: 4,
                urgency: URGENCY_LEVELS.WARNING
            };
        } else if (diffInMinutes <= tolerances.second) {
            return {
                shouldNotify: true,
                notificationType: 'second',
                priority: 3,
                urgency: URGENCY_LEVELS.INFO
            };
        } else if (diffInMinutes <= tolerances.first) {
            return {
                shouldNotify: true,
                notificationType: 'first',
                priority: 2,
                urgency: URGENCY_LEVELS.INFO
            };
        }

        return { shouldNotify: false };
    }

    createNotificationObject(marcacao, notificationData) {
        const typeLabel = marcacao.tipo_registo === 'G' ? 'Glicose' : 'Insulina';
        const eventTime = new Date(marcacao.data_evento);
        const timeStr = eventTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
        const title = this.generateNotificationTitle(typeLabel, notificationData.notificationType);

        return {
            id: marcacao.id,
            title,
            time: timeStr,
            notes: marcacao.notas,
            urgency: notificationData.urgency,
            priority: notificationData.priority,
            diffInMinutes: Math.round((eventTime - new Date()) / (1000 * 60)),
            type: marcacao.tipo_registo,
            notificationType: notificationData.notificationType
        };
    }

    generateNotificationTitle(typeLabel, notificationType) {
        switch (notificationType) {
            case 'overdue': return `${typeLabel} - Em atraso!`;
            case 'now': return `${typeLabel} - Agora!`;
            default: return typeLabel;
        }
    }

    sortNotificationsByPriority(pending) {
        return pending.sort((a, b) => b.priority - a.priority);
    }

    // =============================================
    // CACHE MANAGEMENT
    // =============================================

    wasNotificationSent(marcacaoId, notificationType) {
        return this.sentBrowserNotifications.has(`${marcacaoId}-${notificationType}`);
    }

    markNotificationAsSent(marcacaoId, notificationType) {
        this.sentBrowserNotifications.set(`${marcacaoId}-${notificationType}`, Date.now());
    }

    clearNotificationCache() {
        this.sentBrowserNotifications.clear();
    }

    cleanOldCacheEntries(marcacaoId) {
        const cutoffTime = Date.now() - (NOTIFICATION_CONFIG.CACHE_CLEANUP_HOURS * 60 * 60 * 1000);
        const keysToRemove = [];
        
        this.sentBrowserNotifications.forEach((timestamp, key) => {
            if (key.startsWith(`${marcacaoId}-`) && timestamp < cutoffTime) {
                keysToRemove.push(key);
            }
        });
        
        keysToRemove.forEach(key => this.sentBrowserNotifications.delete(key));
    }

    dismissNotification(marcacaoId) {
        this.dismissedNotifications.add(marcacaoId);
    }

    clearDismissedNotifications() {
        this.dismissedNotifications.clear();
    }

    // =============================================
    // MONITORING SYSTEM
    // =============================================

    startMonitoring(getMarcacoes, interval = 30000) {
        this.stopMonitoring();
        this.checkNotifications(getMarcacoes);
        this.checkInterval = setInterval(() => this.checkNotifications(getMarcacoes), interval);
    }

    checkNotifications(getMarcacoes) {
        const marcacoes = getMarcacoes();
        if (!marcacoes?.length) return;

        const pending = this.getPendingNotifications(marcacoes);
        
        pending.forEach(notification => {
            this.cleanOldCacheEntries(notification.id);
            
            if (!this.wasNotificationSent(notification.id, notification.notificationType)) {
                const browserMessage = this.createBrowserMessage(notification);
                
                if (this.sendNotification(browserMessage.title, browserMessage.body)) {
                    this.markNotificationAsSent(notification.id, notification.notificationType);
                }
            }
        });
    }

    // SUBSTITUIR: A função createBrowserMessage (linha ~277)
    createBrowserMessage(notification) {
        const { first, second, third } = this.settings.times;
        const typeLabel = notification.type === 'G' ? 'Glicose' : 'Insulina';
        let title, body;
        
        switch (notification.notificationType) {
            case 'overdue':
                title = notification.title;
                body = `Estava agendado para ${notification.time}`;
                break;
            case 'now':
                title = notification.title;
                body = `Agendado para ${notification.time}`;
                break;
            case 'third':
                title = `${typeLabel} em ${third} minutos`;
                body = `Agendado para ${notification.time}`;
                break;
            case 'second':
                title = `${typeLabel} em ${second} minutos`;
                body = `Agendado para ${notification.time}`;
                break;
            case 'first':
                title = `${typeLabel} em ${first} minutos`;
                body = `Agendado para ${notification.time}`;
                break;
            default:
                title = notification.title;
                body = `Agendado para ${notification.time}`;
        }
        
        if (notification.notes) {
            body += `\nNotas: ${notification.notes}`;
        }
        
        return { title, body };
    }

    refreshNotifications(getMarcacoes) {
        this.checkNotifications(getMarcacoes);
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

export default new NotificationService();