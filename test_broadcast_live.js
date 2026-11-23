import { PushNotificationService } from './src/services/pushNotificationService.js';

async function testBroadcast() {
    try {
        console.log("🚀 Testing FCM Broadcast System...");
        const result = await PushNotificationService.broadcastToAll({
            title: 'Test Broadcast Alert',
            message: 'Hello Iraq Bid Users! New auctions are now live.',
            destinationScreen: 'home'
        });
        console.log("✅ Broadcast Result:", result);
        process.exit(0);
    } catch (err) {
        console.error("❌ Broadcast Test Error:", err);
        process.exit(1);
    }
}

testBroadcast();
