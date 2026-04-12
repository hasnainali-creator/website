// @ts-nocheck
/* eslint-disable */
/* global importScripts, firebase, self */

const CACHE_NAME = 'omnysports-v2';
const OFFLINE_URL = '/offline.html';

// 1. Install Event: Precache the offline page
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                OFFLINE_URL,
                '/favicon-96x96.png',
                '/favicon.svg',
                '/web-app-manifest-192x192.png'
            ]);
        })
    );
    self.skipWaiting();
});

// 2. Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
                );
            })
        ])
    );
});

// 3. Fetch Event: Advanced Offline Handling
self.addEventListener('fetch', (event) => {
    // Handle Navigation (HTML) requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(OFFLINE_URL);
            })
        );
        return;
    }

    // Handle other requests (Static Assets, JSON, etc.)
    // Strategy: Cache First, then Network
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// 4. Firebase Messaging Support
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
        const title = payload.notification?.title || payload.data?.title || 'OmnySports Breaking Alert';
        const bodyText = payload.notification?.body || payload.data?.body || 'New sports update available. Read now!';
        
        // Use high-quality icons and proper branding
        const notificationOptions = {
            body: bodyText,
            icon: '/favicon-96x96.png',
            image: payload.notification?.image || payload.data?.image,
            badge: '/favicon-96x96.png',
            tag: payload.data?.tag || 'omnysports-push',
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
    const urlToOpen = event.notification?.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
