import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function StyleManager() {
    const location = useLocation();
    const previousPath = useRef('');
    const navigatingFromForm = useRef(false);
    
    useEffect(() => {
        const currentPath = location.pathname;
        
        // Check if previous path was a form page
        const wasOnFormPage = previousPath.current.includes('glicose') || 
                              previousPath.current.includes('insulina') ||
                              previousPath.current.includes('registo');
        
        // Check if current path is not a form page
        const isLeavingFormPage = !currentPath.includes('glicose') && 
                                  !currentPath.includes('insulina') &&
                                  !currentPath.includes('registo');
        
        // When leaving any form page, force a reload
        if (wasOnFormPage && isLeavingFormPage) {
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