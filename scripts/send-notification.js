const admin = require('firebase-admin');

// TODO: Replace with the path to your service account key JSON file
// You can download this from Firebase Console -> Project Settings -> Service Accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Send a push notification to specific device tokens
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional custom data payload
 */
async function sendNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.log('No tokens provided.');
    return;
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data,
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(response.successCount + ' messages were sent successfully');
    
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error('Failed to send to token:', tokens[idx], resp.error);
        }
      });
      // You might want to remove failed tokens from your database here
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Example usage:
// sendNotification(
//   ['USER_DEVICE_TOKEN_HERE'], 
//   'New Message', 
//   'You have a new update in your portal!'
// );

module.exports = { sendNotification };
