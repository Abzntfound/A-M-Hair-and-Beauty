// A&M Hair and Beauty - Client-Side Error Handler
// error-handler.js - Handles page load errors and resource failures

(function() {
    'use strict';
    
    console.log('🛡️ Error handler initialized');
    
    // Track if critical resources failed to load
    let criticalErrors = 0;
    const MAX_CRITICAL_ERRORS = 3;
    
    // Track resource loading
    const resourcesLoaded = {
        homeAuth: false,
        reviews: false,
        index: false
    };
    
    // Check if essential scripts loaded
    setTimeout(() => {
        checkEssentialScripts();
    }, 3000);
    
    function checkEssentialScripts() {
        // Check if home-auth.js loaded
        if (typeof window.handleUserHeaderClick !== 'function') {
            console.warn('⚠️ home-auth.js did not load properly');
            criticalErrors++;
        } else {
            resourcesLoaded.homeAuth = true;
            console.log('✅ home-auth.js loaded successfully');
        }
        
        // Check if basic DOM elements exist
        const criticalElements = [
            'user-display-name',
            'important-message',
            'header'
        ];
        
        criticalElements.forEach(id => {
            if (!document.getElementById(id)) {
                console.warn(`⚠️ Critical element missing: ${id}`);
                criticalErrors++;
            }
        });
        
        // If too many critical errors, something is wrong
        if (criticalErrors >= MAX_CRITICAL_ERRORS) {
            console.error('❌ Too many critical errors detected');
            handleCriticalFailure();
        }
    }
    
    // Handle critical page failure
    function handleCriticalFailure() {
        console.error('🚨 Critical page failure - redirecting to 404');
        
        // Show user-friendly message
        const body = document.body;
        if (body) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                z-index: 999999;
                max-width: 400px;
                width: 90%;
            `;
            errorDiv.innerHTML = `
                <h2 style="color: #dba9c8; margin-bottom: 15px;">Loading Error</h2>
                <p style="color: #666; margin-bottom: 20px;">We're having trouble loading this page. You'll be redirected shortly.</p>
                <div style="font-size: 2rem; color: #dba9c8;" id="error-countdown">3</div>
            `;
            body.appendChild(errorDiv);
            
            let countdown = 3;
            const countdownEl = document.getElementById('error-countdown');
            const timer = setInterval(() => {
                countdown--;
                if (countdownEl) countdownEl.textContent = countdown;
                if (countdown <= 0) {
                    clearInterval(timer);
                    window.location.href = '/404.html';
                }
            }, 1000);
        } else {
            // If even body doesn't exist, force redirect
            setTimeout(() => {
                window.location.href = '/404.html';
            }, 2000);
        }
    }
    
    // Handle resource loading errors
    window.addEventListener('error', function(e) {
        if (e.target.tagName === 'SCRIPT') {
            const src = e.target.src;
            console.error('❌ Script failed to load:', src);
            
            // Track which script failed
            if (src.includes('home-auth.js')) {
                resourcesLoaded.homeAuth = false;
                criticalErrors++;
                console.warn('⚠️ Critical script home-auth.js failed to load');
            } else if (src.includes('reviews.js')) {
                resourcesLoaded.reviews = false;
            } else if (src.includes('index.js')) {
                resourcesLoaded.index = false;
            }
            
            // If critical scripts failed, redirect
            if (criticalErrors >= 2) {
                handleCriticalFailure();
            }
        }
    }, true);
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
        console.error('❌ Unhandled promise rejection:', e.reason);
    });
    
    // Fallback functions if scripts don't load
    setTimeout(() => {
        // Provide fallback for handleUserHeaderClick if it doesn't exist
        if (typeof window.handleUserHeaderClick !== 'function') {
            window.handleUserHeaderClick = function() {
                console.log('🔄 Using fallback navigation');
                window.location.href = 'https://auth.amhairandbeauty.com';
            };
        }
        
        // Provide fallback for dismissImportantMessage if it doesn't exist
        if (typeof window.dismissImportantMessage !== 'function') {
            window.dismissImportantMessage = function() {
                console.log('🔄 Using fallback message dismissal');
                const msg = document.getElementById('important-message');
                if (msg) msg.style.display = 'none';
            };
        }
    }, 2000);
    
    // Log page load success
    window.addEventListener('load', function() {
        console.log('✅ Page loaded successfully');
        
        // Final check after page load
        setTimeout(() => {
            if (criticalErrors >= MAX_CRITICAL_ERRORS) {
                handleCriticalFailure();
            } else {
                console.log('✅ All critical checks passed');
            }
        }, 1000);
    });
    
    console.log('✅ Error handler ready');
})();
