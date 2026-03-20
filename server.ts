import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import cors from "cors";
import fs from "fs";

// Initialize Firebase Admin
let isFirebaseAdminInitialized = false;

try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else if (fs.existsSync(path.join(process.cwd(), 'service-account.json'))) {
    serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'service-account.json'), 'utf-8'));
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseAdminInitialized = true;
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("Service account key missing. Push notifications will not be sent.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

/**
 * Removes an invalid FCM token from a user document in Firestore.
 */
async function removeInvalidToken(token: string) {
  try {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('fcmTokens', 'array-contains', token).get();
    if (snapshot.empty) return;
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, {
        fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
      });
    });
    await batch.commit();
    console.log(`[FCM] Removed stale token: ${token.substring(0, 20)}...`);
  } catch (err) {
    console.error('[FCM] Error removing stale token:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebaseAdmin: isFirebaseAdminInitialized });
  });

  app.post("/api/send-notification", async (req, res) => {
    if (!isFirebaseAdminInitialized) {
      return res.status(500).json({ error: "Firebase Admin not initialized. Please add FIREBASE_SERVICE_ACCOUNT_KEY to your environment variables." });
    }

    try {
      const { title, body, data, targetRole, userId } = req.body;
      
      let allTokens: string[] = [];
      const db = admin.firestore();

      if (userId) {
        // Target a single specific user
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = userData.fcmTokens;
        }
      } else {
        // Target all users or users with a specific role
        let usersQuery: admin.firestore.Query = db.collection('users');
        if (targetRole) {
          usersQuery = usersQuery.where('role', '==', targetRole);
        }
        const snapshot = await usersQuery.get();
        snapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
            allTokens = allTokens.concat(userData.fcmTokens);
          }
        });
      }

      if (allTokens.length === 0) {
        console.log('[FCM] No tokens found. Notification not sent.');
        return res.status(200).json({ message: "No FCM tokens found. User may not have granted notification permission yet." });
      }

      console.log(`[FCM] Sending to ${allTokens.length} token(s)...`);

      // FCM limits multicast to 500 tokens per request
      const maxTokensPerRequest = 500;
      let successCount = 0;
      let failureCount = 0;
      const staleTokens: string[] = [];

      for (let i = 0; i < allTokens.length; i += maxTokensPerRequest) {
        const tokenBatch = allTokens.slice(i, i + maxTokensPerRequest);
        const message = {
          notification: {
            title,
            body,
          },
          data: data || {},
          tokens: tokenBatch,
          // Apple Push Notification Service (APNS) config — required for iOS PWA
          apns: {
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert',
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                'mutable-content': 1,
                'content-available': 1,
              },
            },
          },
          // Android config
          android: {
            priority: 'high' as const,
            notification: {
              sound: 'default',
              priority: 'max' as const,
            },
          },
          // Web Push config
          webpush: {
            headers: {
              Urgency: 'high',
            },
            notification: {
              requireInteraction: true,
              icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
              badge: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
            },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Collect stale/invalid tokens for cleanup
        response.responses.forEach((result, index) => {
          if (!result.success) {
            const errorCode = result.error?.code;
            console.error(`[FCM] Token failed (${errorCode}): ${tokenBatch[index].substring(0, 20)}...`);
            // These error codes mean the token is permanently invalid
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              staleTokens.push(tokenBatch[index]);
            }
          }
        });
      }

      // Clean up invalid tokens asynchronously (don't await, fire-and-forget)
      if (staleTokens.length > 0) {
        console.log(`[FCM] Cleaning up ${staleTokens.length} stale token(s)...`);
        staleTokens.forEach(token => removeInvalidToken(token));
      }

      console.log(`[FCM] Done: ${successCount} success, ${failureCount} failed.`);
      res.json({ success: true, successCount, failureCount });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send notification." });
    }
  });

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
