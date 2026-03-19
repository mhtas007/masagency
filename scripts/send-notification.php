<?php

/**
 * Send Firebase Cloud Messaging (FCM) Notification via HTTP v1 API
 * 
 * Note: The legacy FCM API is deprecated. This uses the new HTTP v1 API.
 * You will need a Service Account JSON file from Firebase Console.
 * 
 * Required library: google/auth (install via composer: composer require google/auth)
 */

require 'vendor/autoload.php';

use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;

function sendFCMNotification($tokens, $title, $body, $data = []) {
    // 1. Path to your service account JSON file
    $keyFilePath = __DIR__ . '/serviceAccountKey.json';
    
    // 2. Your Firebase Project ID
    $projectId = 'gen-lang-client-0753035912'; // Replace with your actual project ID

    // 3. Get OAuth 2.0 token
    $scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
    $credentials = new ServiceAccountCredentials($scopes, $keyFilePath);
    $token = $credentials->fetchAuthToken(HttpHandlerFactory::build());
    $accessToken = $token['access_token'];

    // 4. Prepare the message payload
    // The HTTP v1 API requires sending one message per token, or using topics.
    // For multiple tokens, you loop through them.
    
    $url = 'https://fcm.googleapis.com/v1/projects/' . $projectId . '/messages:send';
    
    $successCount = 0;
    $failureCount = 0;

    foreach ($tokens as $deviceToken) {
        $message = [
            'message' => [
                'token' => $deviceToken,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => $data,
                // Optional: iOS specific settings
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'sound' => 'default'
                        ]
                    ]
                ]
            ]
        ];

        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode == 200) {
            $successCount++;
        } else {
            $failureCount++;
            error_log("FCM Error: " . $response);
        }
    }

    return [
        'success' => $successCount,
        'failure' => $failureCount
    ];
}

// Example Usage:
// $tokens = ['DEVICE_TOKEN_1', 'DEVICE_TOKEN_2'];
// $result = sendFCMNotification($tokens, 'New Update', 'Check out the latest changes!');
// print_r($result);

?>
