// @ts-nocheck
/* eslint-disable */
/* global importScripts, firebase, self */
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
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon-96x96.png',
        image: payload.notification.image || payload.data?.image, // Large Image Support
        badge: '/favicon-96x96.png',
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

    return self.registration.showNotification(notificationTitle, notificationOptions);
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
