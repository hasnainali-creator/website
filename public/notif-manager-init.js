// @ts-nocheck
// notif-manager-init.js
// This script is completely lazy-loaded and non-blocking.
// It fetches the FCM token and sends it to our Bun backend for Cloudflare Push Workers
(async function initPush() {
    try {
        if (Notification.permission !== 'granted') return;

        // Load Firebase SDK asynchronously if not already loaded
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

        // Initialize Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyACPRRVLI7JX_ZNNo3No9G32LY2VSTBo30",
            authDomain: "omnysports-push-notifications.firebaseapp.com",
            projectId: "omnysports-push-notifications",
            storageBucket: "omnysports-push-notifications.firebasestorage.app",
            messagingSenderId: "881503140155",
            appId: "1:881503140155:web:e82d724251869f8fd39f1e"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const messaging = firebase.messaging();

        console.log('[Push Notifier] Requesting token...');
        
        // IMPORTANT: Replace the VAPID key below with your actual Web Push Key from Firebase Console
        // Go to Project Settings -> Cloud Messaging -> Web configuration -> Web Push certificates
        const token = await messaging.getToken({
            vapidKey: 'BG8cX_gQzHwiMR-IC3b0oxTkFSFTrYGs_LtC1eEoSki5Ir6QZ6sCCSyem4_T6ZMEG7WAgwRi4W2UCkAjdV4w9s0' // <-- Actual Web Push Certificate Key
        });

        if (token) {
            console.log('[Push Notifier] FCM Token valid. Sending to backend...');
            // Send to our backend to subscribe to topic 'all'
            await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });
            console.log('[Push Notifier] Successfully registered device for Sports Alerts!');
        } else {
            console.warn('[Push Notifier] No registration token available.');
        }

    } catch (error) {
        console.error('[Push Notifier] An error occurred while retrieving token:', error);
    }

    // Helper function to dynamically load SDK scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                return resolve(); // Already loaded
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
})();
