// Create: frontend/src/utils/glucoseUtils.js

// Default glucose thresholds (mg/dL)
export const DEFAULT_GLUCOSE_THRESHOLDS = {
    jejum: { min: 70, max: 100 },
    'Jejum': { min: 70, max: 100 },
    posPrandial: { min: 70, max: 140 },
    'Pós-prandial': { min: 70, max: 140 },
    prePrandial: { min: 70, max: 100 },
    'Pré-prandial': { min: 70, max: 100 },
    aleatorio: { min: 70, max: 140 },
    'Aleatório': { min: 70, max: 140 }
};

// Get glucose level status
export const getGlucoseStatus = (value, regime, customThresholds = null) => {
    const thresholds = customThresholds || DEFAULT_GLUCOSE_THRESHOLDS;
    
    // Normalize regime name to match thresholds
    const normalizedRegime = normalizeRegimeName(regime);
    const threshold = thresholds[normalizedRegime] || thresholds.aleatorio;
    
    const glucoseValue = parseFloat(value);
    
    if (isNaN(glucoseValue)) {
        return { level: 'unknown', color: 'secondary', icon: 'fas fa-question', message: 'Valor inválido' };
    }
    
    const { min, max } = threshold;
    const warningMargin = 20; // 20 mg/dL margin for warning
    
    // Very low (dangerous)
    if (glucoseValue < min - warningMargin) {
        return {
            level: 'very-low',
            color: 'danger',
            bgColor: 'bg-danger',
            textColor: 'text-white',
            icon: 'fas fa-exclamation-triangle',
            message: 'Hipoglicemia severa',
            showAlert: true,
            alertType: 'danger'
        };
    }
    
    // Low (warning)
    if (glucoseValue < min) {
        return {
            level: 'low',
            color: 'warning',
            bgColor: 'bg-warning',
            textColor: 'text-dark',
            icon: 'fas fa-exclamation-triangle',
            message: 'Hipoglicemia',
            showAlert: true,
            alertType: 'warning'
        };
    }
    
    // High (warning)
    if (glucoseValue > max && glucoseValue <= max + warningMargin) {
        return {
            level: 'high',
            color: 'warning',
            bgColor: 'bg-warning',
            textColor: 'text-dark',
            icon: 'fas fa-exclamation-triangle',
            message: 'Hiperglicemia',
            showAlert: true,
            alertType: 'warning'
        };
    }
    
    // Very high (dangerous)
    if (glucoseValue > max + warningMargin) {
        return {
            level: 'very-high',
            color: 'danger',
            bgColor: 'bg-danger',
            textColor: 'text-white',
            icon: 'fas fa-exclamation-triangle',
            message: 'Hiperglicemia severa',
            showAlert: true,
            alertType: 'danger'
        };
    }
    
    // Normal
    return {
        level: 'normal',
        color: 'success',
        bgColor: 'bg-success',
        textColor: 'text-white',
        icon: 'fas fa-check-circle',
        message: 'Normal',
        showAlert: false,
        alertType: 'success'
    };
};

// Normalize regime names to match threshold keys
const normalizeRegimeName = (regime) => {
    if (!regime) return 'aleatorio';
    
    const regimeLower = regime.toLowerCase();
    
    if (regimeLower.includes('jejum')) return 'jejum';
    if (regimeLower.includes('pós') || regimeLower.includes('pos')) return 'posPrandial';
    if (regimeLower.includes('pré') || regimeLower.includes('pre')) return 'prePrandial';
    
    return 'aleatorio';
};

// Get glucose range text for display
export const getGlucoseRangeText = (regime, thresholds) => {
    const normalizedRegime = normalizeRegimeName(regime);
    const threshold = thresholds[normalizedRegime] || thresholds.aleatorio;
    return `${threshold.min}-${threshold.max} mg/dL`;
};

// Load glucose thresholds from localStorage
export const loadGlucoseThresholds = () => {
    try {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            return parsed.glucoseThresholds || DEFAULT_GLUCOSE_THRESHOLDS;
        }
    } catch (error) {
        console.error('Error loading glucose thresholds:', error);
    }
    return DEFAULT_GLUCOSE_THRESHOLDS;
};