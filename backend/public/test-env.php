<?php
// Test file untuk cek environment variables di Railway
// HAPUS FILE INI setelah selesai testing!

header('Content-Type: application/json');

echo json_encode([
    'message' => 'Environment Variables Test',
    'getenv_APP_URL' => getenv('APP_URL'),
    'dollar_ENV_APP_URL' => $_ENV['APP_URL'] ?? 'not set',
    'dollar_SERVER_APP_URL' => $_SERVER['APP_URL'] ?? 'not set',
    'all_env_keys' => array_keys($_ENV),
    'app_url_variations' => [
        'getenv' => getenv('APP_URL'),
        '$_ENV' => $_ENV['APP_URL'] ?? null,
        '$_SERVER' => $_SERVER['APP_URL'] ?? null,
    ],
], JSON_PRETTY_PRINT);
