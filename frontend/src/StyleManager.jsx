// StyleManager.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function StyleManager() {
    const location = useLocation();

    useEffect(() => {
        // This function runs every time the route changes
        return () => {
            // Create a reset stylesheet to override any lingering form styles
            const resetStyle = document.createElement('style');
            resetStyle.id = 'form-style-reset';
            resetStyle.textContent = `
        /* Reset any theme palette colors that might have been set */
        :root {
          --primary-color: initial !important;
          --secondary-color: initial !important;
          --accent-color: initial !important;
          --background-color: initial !important;
        }
        
        /* Reset any form-specific styles */
        .form-control, .form-label, .form-title, .section-title, 
        .button-primary, .button-secondary {
          font-size: initial !important;
          font-weight: initial !important;
          text-align: initial !important;
          color: initial !important;
          background-color: initial !important;
        }
      `;

            // Remove any existing reset style
            const existingResetStyle = document.getElementById('form-style-reset');
            if (existingResetStyle) {
                document.head.removeChild(existingResetStyle);
            }

            // Apply the reset
            document.head.appendChild(resetStyle);

            // Optionally, remove it after a short delay to avoid flashing
            setTimeout(() => {
                const cleanupResetStyle = document.getElementById('form-style-reset');
                if (cleanupResetStyle) {
                    document.head.removeChild(cleanupResetStyle);
                }
            }, 100);
        };
    }, [location.pathname]);

    return null; // This component doesn't render anything
}