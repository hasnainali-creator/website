// @ts-nocheck
// notif-manager-init.js
// This script is completely lazy-loaded and non-blocking.
// It fetches the FCM token and sends it to our Bun backend for Cloudflare Push Workers
(async function initPush() {
    const TAG = '[End Level 🏆]';
    try {
        if (Notification.permission !== 'granted') return;
        
        if (window._omny_push_active) return;
        window._omny_push_active = true;

        let registration = null;
        if ('serviceWorker' in navigator) {
            try {
                // 1) Explicitly register the SW. Firebase's automatic default registration can fail or block.
                registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
                await navigator.serviceWorker.ready;
                console.log(`${TAG} Service worker successfully registered and ready!`);
            } catch (swErr) {
                console.error(`${TAG} Critical: Failed to manually register service worker:`, swErr);
                return; // Push cannot initialize if SW isn't ready
            }
        }

        console.log(`${TAG} Initializing secure push handshake...`);

        // Load Firebase SDK asynchronously
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

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

        // RETRY LOGIC: 3x Automated Handshake
        let token = null;
        let retries = 0;
        const maxRetries = 3;

        while (!token && retries < maxRetries) {
            try {
                token = await messaging.getToken({
                    vapidKey: 'BG8cX_gQzHwiMR-IC3b0oxTkFSFTrYGs_LtC1eEoSki5Ir6QZ6sCCSyem4_T6ZMEG7WAgwRi4W2UCkAjdV4w9s0',
                    serviceWorkerRegistration: registration
                });
            } catch (retryErr) {
                retries++;
                console.warn(`${TAG} Handshake attempt ${retries} failed. Retrying...`);
                await new Promise(r => setTimeout(r, 2000 * retries)); // Exponential backoff
            }
        }

        if (token) {
            console.log(`${TAG} Secure Token established. Verifying with Edge...`);
            
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });

            if (res.ok) {
                console.log(`${TAG} 100% VERIFIED. You are now subscribed to All Sports Alerts! 🏆`);
            } else {
                const errData = await res.json();
                console.error(`${TAG} Edge API Failed:`, errData);
                alert(`Push Error Backend:\n${errData.error}\n\nDebug: ${errData.debug || errData.message || 'Check Cloudflare settings'}`);
            }
        } else {
            console.error(`${TAG} Critical: Could not establish secure handshake after ${maxRetries} attempts.`);
        }

        // --- THE MISSING LOGIC: FOREGROUND PUSH HANDLING ---
        messaging.onMessage((payload) => {
            console.log(`${TAG} Live Alert Received:`, payload);
            if (Notification.permission === 'granted') {
                const title = payload.notification?.title || payload.data?.title || 'OmnySports Alert';
                const options = {
                    body: payload.notification?.body || payload.data?.body || 'New content available!',
                    icon: '/favicon-96x96.png',
                    image: payload.notification?.image || payload.data?.image,
                    badge: '/favicon-96x96.png',
                    data: {
                        url: payload.fcmOptions?.link || payload.data?.url || '/'
                    }
                };
                new Notification(title, options);
            }
        });

    } catch (error) {
        console.error(`${TAG} Fatal Initialization Error:`, error);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
})();
