// StyleManager.jsx - with forced reload
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function StyleManager() {
    const location = useLocation();
    const previousPath = useRef('');
    const navigatingFromForm = useRef(false);
    
    useEffect(() => {
        const currentPath = location.pathname;
        
        // When leaving form pages, force a reload
        if ((previousPath.current.includes('medicao-glicose') || 
             previousPath.current.includes('medicao-insulina')) && 
             !currentPath.includes('medicao-glicose') && 
             !currentPath.includes('medicao-insulina')) {
            
            console.log('🔄 Navigating away from form page, will reload');
            navigatingFromForm.current = true;
            
            // Use a short timeout to allow the navigation to complete first
            setTimeout(() => {
                window.location.reload();
            }, 50);
        }
        
        // Store current path for next comparison
        previousPath.current = currentPath;
    }, [location.pathname]);
    
    return null;
}