import admin from 'firebase-admin';
import fs from 'fs';

try {
    const raw = fs.readFileSync('/var/www/bid-backend/Bid-app-Backend/src/config/firebase-service-account.json', 'utf8');
    const sa = JSON.parse(raw);
    console.log("Project ID:", sa.project_id);
    console.log("Client Email:", sa.client_email);
    console.log("Private key starts with:", sa.private_key?.substring(0, 30));

    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
    console.log("🎉 FIREBASE ADMIN INITIALIZED SUCCESSFULLY!");
} catch (e) {
    console.error("❌ Firebase Test Error:", e);
}
