import type { APIRoute } from 'astro';
import admin from 'firebase-admin';

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    try {
        const certStr = process.env.FIREBASE_PRIVATE_KEY || import.meta.env.FIREBASE_PRIVATE_KEY || '';
        const privateKey = certStr.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || import.meta.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL || import.meta.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const token = body.token;

        if (!token) {
            return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
        }

        // Subscribe the device token to the "all" topic
        const response = await admin.messaging().subscribeToTopic([token], 'all');
        console.log('[Firebase API] Successfully subscribed to topic:', response);

        return new Response(JSON.stringify({ success: true, count: response.successCount }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('[Firebase API] Error subscribing to topic:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
