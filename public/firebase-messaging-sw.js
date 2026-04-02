// @ts-nocheck
/* eslint-disable */
/* global importScripts, firebase, self */

// [End Level] Instant Activation: Force the new Service Worker to take over immediately.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyACPRRVLI7JX_ZNNo3No9G32LY2VSTBo30",
    authDomain: "omnysports-push-notifications.firebaseapp.com",
    projectId: "omnysports-push-notifications",
    storageBucket: "omnysports-push-notifications.firebasestorage.app",
    messagingSenderId: "881503140155",
    appId: "1:881503140155:web:e82d724251869f8fd39f1e",
    measurementId: "G-1J7VTX8EYJ"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const TAG = '[End Level 🏆]';
    console.log(`${TAG} Background Message Captured:`, payload);
    
    try {
        // PAYLOAD DEFENDER: Ensure we ALWAYS have a title and body
        const title = payload.notification?.title || payload.data?.title || 'OmnySports Breaking Alert';
        const bodyText = payload.notification?.body || payload.data?.body || 'New sports update available. Read now!';
        
        const notificationOptions = {
            body: bodyText,
            icon: '/favicon-96x96.png',
            image: payload.notification?.image || payload.data?.image,
            badge: '/favicon-96x96.png',
            tag: payload.data?.tag || 'omnysports-push', // Prevent notification stacking if desired
            data: {
                url: payload.fcmOptions?.link || payload.data?.url || '/'
            },
            actions: [
                {
                    action: 'open_url',
                    title: 'Read Now 🚀'
                }
            ]
        };

        return self.registration.showNotification(title, notificationOptions);
    } catch (fatalErr) {
        console.error(`${TAG} Service Worker crashed during display:`, fatalErr);
    }
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If the tab is already open, focus it
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
