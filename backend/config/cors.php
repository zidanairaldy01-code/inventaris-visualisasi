<?php

$customOrigins = [];

$frontendUrl = env('FRONTEND_URL');
if (!empty($frontendUrl)) {
    foreach (explode(',', $frontendUrl) as $url) {
        $trimmed = trim(rtrim($url, '/'));
        if (!empty($trimmed)) {
            $customOrigins[] = $trimmed;
        }
    }
}

$corsAllowed = env('CORS_ALLOWED_ORIGINS');
if (!empty($corsAllowed)) {
    foreach (explode(',', $corsAllowed) as $origin) {
        $trimmed = trim(rtrim($origin, '/'));
        if (!empty($trimmed)) {
            $customOrigins[] = $trimmed;
        }
    }
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*', '*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_merge(
        $customOrigins,
        [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ]
    ))),

    'allowed_origins_patterns' => [
        '#^https://.*\.vercel\.app$#',
        '#^https://.*\.railway\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['*'],

    'max_age' => 86400,

    'supports_credentials' => true,

];
