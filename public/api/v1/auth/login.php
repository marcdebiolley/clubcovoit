<?php
// Simple fake login endpoint for Plesk (no DB)
// Accepts any non-empty email/password and returns a dummy token

header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$email = isset($data['email']) ? trim($data['email']) : '';
$password = isset($data['password']) ? $data['password'] : '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email et mot de passe requis']);
    exit;
}

// For now, accept any credentials and return a static token.
// Later, you can replace this with real DB checks.
$token = bin2hex(random_bytes(16));

echo json_encode(['token' => $token]);
