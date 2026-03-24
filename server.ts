import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cors from "cors";
import fs from "fs";

// Initialize Firebase Admin
let isFirebaseAdminInitialized = false;
let firestoreDatabaseId: string | undefined = undefined;

try {
  let serviceAccount;
  
  // Try to load firebase-applet-config.json to get the databaseId
  if (fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'))) {
    const appletConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
    firestoreDatabaseId = appletConfig.firestoreDatabaseId;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else if (fs.existsSync(path.join(process.cwd(), 'service-account.json'))) {
    serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'service-account.json'), 'utf-8'));
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    isFirebaseAdminInitialized = true;
    console.log("Firebase Admin initialized successfully for project:", serviceAccount.project_id);
  } else {
    console.warn("Service account key missing. Push notifications will not be sent.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

// Helper to get the correct Firestore instance
const getDb = () => {
  if (firestoreDatabaseId) {
    return getFirestore(admin.app(), firestoreDatabaseId);
  }
  return getFirestore(admin.app());
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebaseAdmin: isFirebaseAdminInitialized });
  });

  // Process scheduled notifications every minute
  const processScheduledNotifications = async () => {
    if (!isFirebaseAdminInitialized) return;

    try {
      const db = getDb();
      const now = new Date().toISOString();
      const scheduledRef = db.collection('scheduled_notifications');
      const snapshot = await scheduledRef
        .where('status', '==', 'pending')
        .where('scheduled_for', '<=', now)
        .get();

      if (snapshot.empty) return;

      const usersSnap = await db.collection('users').get();
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const batch = db.batch();

      for (const docSnap of snapshot.docs) {
        const note = docSnap.data();
        let targetUsers: any[] = [];
        
        if (note.target === 'all') {
          targetUsers = allUsers;
        } else if (note.target === 'user') {
          targetUsers = allUsers.filter(u => u.id === note.targetUserId);
        } else if (note.target === 'group') {
          targetUsers = allUsers.filter(u => u.role === note.targetGroup);
        }

        // 1. Create in-app notifications
        targetUsers.forEach(user => {
          const newNotifRef = db.collection('notifications').doc();
          batch.set(newNotifRef, {
            title: note.title,
            message: note.message,
            url: note.url || null,
            type: 'info',
            user_id: user.id,
            read: false,
            created_at: new Date().toISOString()
          });
        });

        // 2. Send push notifications
        let allTokens: string[] = [];
        targetUsers.forEach(user => {
          if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
            allTokens.push(...user.fcmTokens);
          }
        });

        if (allTokens.length > 0) {
          const maxTokensPerRequest = 500;
          for (let i = 0; i < allTokens.length; i += maxTokensPerRequest) {
            const tokenBatch = allTokens.slice(i, i + maxTokensPerRequest);
            const message = {
              notification: { 
                title: note.title, 
                body: note.message
              },
              data: { url: note.url || '' },
              tokens: tokenBatch,
              webpush: {
                headers: { Urgency: 'high' },
                notification: {
                  title: note.title,
                  body: note.message,
                  icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png'
                },
                fcmOptions: {
                  link: note.url || '/'
                }
              },
              apns: {
                payload: {
                  aps: { sound: 'default', badge: 1 }
                }
              }
            };
            await admin.messaging().sendEachForMulticast(message).catch(err => console.error("FCM Error in scheduled:", err));
          }
        }

        // 3. Handle recurrence
        if (note.recurrence === 'daily') {
          const nextDate = new Date(note.scheduled_for);
          nextDate.setDate(nextDate.getDate() + 1);
          batch.update(docSnap.ref, { scheduled_for: nextDate.toISOString() });
        } else if (note.recurrence === 'weekly') {
          const nextDate = new Date(note.scheduled_for);
          nextDate.setDate(nextDate.getDate() + 7);
          batch.update(docSnap.ref, { scheduled_for: nextDate.toISOString() });
        } else if (note.recurrence === 'monthly') {
          const nextDate = new Date(note.scheduled_for);
          nextDate.setMonth(nextDate.getMonth() + 1);
          batch.update(docSnap.ref, { scheduled_for: nextDate.toISOString() });
        } else {
          batch.update(docSnap.ref, { status: 'sent' });
        }
      }

      await batch.commit();
      console.log(`Processed ${snapshot.size} scheduled notifications.`);
    } catch (error: any) {
      if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
        console.error("Firebase Admin SDK authentication failed. Disabling scheduled notifications. Please check your FIREBASE_SERVICE_ACCOUNT_KEY.");
        isFirebaseAdminInitialized = false;
      } else {
        console.error('Error processing scheduled notifications:', error);
      }
    }
  };

  setInterval(processScheduledNotifications, 60000);
  processScheduledNotifications(); // Run once on startup

  app.post("/api/send-notification", async (req, res) => {
    if (!isFirebaseAdminInitialized) {
      return res.status(500).json({ error: "Firebase Admin not initialized. Please add FIREBASE_SERVICE_ACCOUNT_KEY to your environment variables." });
    }

    try {
      const { title, body, data, targetRole, targetUserId } = req.body;
      
      // Fetch users based on targetRole, targetUserId, or all users
      const db = getDb();
      let usersQuery: admin.firestore.Query = db.collection('users');
      
      if (targetUserId) {
        // We can't query by document ID easily with where() in admin SDK without FieldPath.documentId(), 
        // so we'll just fetch the single document.
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
          return res.status(200).json({ message: "User not found." });
        }
        
        const userData = userDoc.data();
        let allTokens: string[] = [];
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = userData.fcmTokens;
        }
        
        if (allTokens.length === 0) {
          return res.status(200).json({ message: "No tokens found for this user." });
        }
        
        const message = {
          notification: { title, body },
          data: data || {},
          tokens: allTokens,
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              title,
              body,
              icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png'
            },
            fcmOptions: {
              link: data?.url || '/'
            }
          },
          apns: {
            payload: {
              aps: { sound: 'default', badge: 1 }
            }
          }
        };
        
        const response = await admin.messaging().sendEachForMulticast(message);
        return res.json({ success: true, successCount: response.successCount, failureCount: response.failureCount });
      }

      if (targetRole) {
        if (targetRole === 'Admin') {
          usersQuery = usersQuery.where('role', 'in', ['Admin', 'Super Admin']);
        } else {
          usersQuery = usersQuery.where('role', '==', targetRole);
        }
      }
      
      const snapshot = await usersQuery.get();
      
      // We need to keep track of which token belongs to which user to clean up invalid ones
      const tokenToUserMap = new Map<string, string>();
      let allTokens: string[] = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          userData.fcmTokens.forEach((token: string) => {
            tokenToUserMap.set(token, doc.id);
            allTokens.push(token);
          });
        }
      });

      if (allTokens.length === 0) {
        return res.status(200).json({ message: "No tokens found to send notifications to." });
      }

      // FCM limits multicast to 500 tokens per request
      const maxTokensPerRequest = 500;
      let successCount = 0;
      let failureCount = 0;
      const invalidTokensToCleanup: { userId: string, token: string }[] = [];

      for (let i = 0; i < allTokens.length; i += maxTokensPerRequest) {
        const tokenBatch = allTokens.slice(i, i + maxTokensPerRequest);
        const message = {
          notification: {
            title,
            body
          },
          data: data || {},
          tokens: tokenBatch,
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              title,
              body,
              icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png'
            },
            fcmOptions: {
              link: data?.url || '/'
            }
          },
          apns: {
            payload: {
              aps: { sound: 'default', badge: 1 }
            }
          }
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;
        
        // Check for invalid tokens to clean up
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (errorCode === 'messaging/invalid-registration-token' || 
                  errorCode === 'messaging/registration-token-not-registered') {
                const failedToken = tokenBatch[idx];
                const userId = tokenToUserMap.get(failedToken);
                if (userId) {
                  invalidTokensToCleanup.push({ userId, token: failedToken });
                }
              }
            }
          });
        }
      }
      
      // Clean up invalid tokens from Firestore
      if (invalidTokensToCleanup.length > 0) {
        const db = getDb();
        const batch = db.batch();
        // Group by user
        const userTokenMap = new Map<string, string[]>();
        invalidTokensToCleanup.forEach(({ userId, token }) => {
          if (!userTokenMap.has(userId)) userTokenMap.set(userId, []);
          userTokenMap.get(userId)!.push(token);
        });
        
        userTokenMap.forEach((tokens, userId) => {
          const userRef = db.collection('users').doc(userId);
          batch.update(userRef, {
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokens)
          });
        });
        
        try {
          await batch.commit();
          console.log(`Cleaned up ${invalidTokensToCleanup.length} invalid tokens.`);
        } catch (cleanupError) {
          console.error("Error cleaning up tokens:", cleanupError);
        }
      }

      res.json({ success: true, successCount, failureCount });
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.code === 'messaging/project-not-found' || error.message?.includes('NOT_FOUND')) {
        return res.status(500).json({ 
          error: "Firebase Cloud Messaging API is not enabled for this project. Please go to the Google Cloud Console, select your project, and enable the 'Firebase Cloud Messaging API'." 
        });
      }
      res.status(500).json({ error: "Failed to send notification." });
    }
  });

  // Check expiring subscriptions every hour
  const checkExpiringSubscriptions = async () => {
    if (!isFirebaseAdminInitialized) return;
    try {
      const db = getDb();
      const settingsDoc = await db.collection('settings').doc('mas_menu').get();
      if (!settingsDoc.exists) return;
      
      const settings = settingsDoc.data();
      const botToken = settings?.telegramBotToken;
      const chatId = settings?.telegramChatId;
      
      if (!botToken || !chatId) return;

      const invoicesSnap = await db.collection('mas_menu_invoices').get();
      const now = new Date();
      
      for (const doc of invoicesSnap.docs) {
        const invoice = doc.data();
        if (invoice.subscription?.active && invoice.subscription.expirationDate) {
          const expirationDate = new Date(invoice.subscription.expirationDate);
          const diffTime = expirationDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Check if it expires in exactly 3 days or 1 day, or today, and hasn't been notified today
          const lastNotified = invoice.subscription.lastNotified;
          const todayStr = now.toISOString().split('T')[0];
          
          if (lastNotified !== todayStr && (diffDays === 3 || diffDays === 1 || diffDays <= 0)) {
            // Send Telegram message
            const message = `
⚠️ <b>ئاگاداری بەسەرچوونی بەشداریکردن</b>
کڕیار: ${invoice.clientName}
بەرواری بەسەرچوون: ${invoice.subscription.expirationDate}
ماوەی ماوە: ${diffDays <= 0 ? 'بەسەرچووە' : diffDays + ' ڕۆژ'}
تێچووی مانگانە: $${invoice.subscription.monthlyCostUSD}
            `;
            
            const https = require('https');
            const data = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });
            const req = https.request(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
            }, (res) => {
              res.on('data', () => {});
            });
            req.on('error', (e) => console.error('Telegram Error:', e));
            req.write(data);
            req.end();

            // Send in-app notification to Super Admin
            const adminSnap = await db.collection('users').where('role', '==', 'Super Admin').get();
            const batch = db.batch();
            adminSnap.docs.forEach(adminDoc => {
              const newNotifRef = db.collection('notifications').doc();
              batch.set(newNotifRef, {
                userId: adminDoc.id,
                title: 'بەسەرچوونی بەشداریکردن',
                message: `کڕیار ${invoice.clientName} بەشداریکردنەکەی ${diffDays <= 0 ? 'بەسەرچووە' : 'نزیکە لە بەسەرچوون'}.`,
                isRead: false,
                createdAt: new Date().toISOString(),
                type: 'system'
              });
            });

            // Update lastNotified
            batch.update(db.collection('mas_menu_invoices').doc(doc.id), {
              'subscription.lastNotified': todayStr
            });
            
            await batch.commit();
          }
        }
      }
    } catch (error: any) {
      if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
        console.error("Firebase Admin SDK authentication failed. Disabling subscription checks. Please check your FIREBASE_SERVICE_ACCOUNT_KEY.");
        isFirebaseAdminInitialized = false;
      } else {
        console.error("Error checking expiring subscriptions:", error);
      }
    }
  };

  setInterval(checkExpiringSubscriptions, 60 * 60 * 1000); // Every hour
  setTimeout(checkExpiringSubscriptions, 5000); // Run once shortly after startup

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
