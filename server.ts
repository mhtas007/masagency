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
      const { title, body, data, targetRole } = req.body;
      
      // Fetch users based on targetRole or all users
      let usersQuery: admin.firestore.Query = admin.firestore().collection('users');
      if (targetRole) {
         usersQuery = usersQuery.where('role', '==', targetRole);
      }
      
      const snapshot = await usersQuery.get();
      let allTokens: string[] = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = allTokens.concat(userData.fcmTokens);
        }
      });

      if (allTokens.length === 0) {
        return res.status(200).json({ message: "No tokens found to send notifications to." });
      }

      // FCM limits multicast to 500 tokens per request
      const maxTokensPerRequest = 500;
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < allTokens.length; i += maxTokensPerRequest) {
        const tokenBatch = allTokens.slice(i, i + maxTokensPerRequest);
        const message = {
          notification: {
            title,
            body,
          },
          data: data || {},
          tokens: tokenBatch,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;
      }

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
