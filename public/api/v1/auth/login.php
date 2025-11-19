<?php
// Login endpoint connecté à la vraie base MariaDB clubcovoit_production
// Utilise la table `users` avec les colonnes `email` et `password_digest`

header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../db.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$email = isset($data['email']) ? trim($data['email']) : '';
$password = isset($data['password']) ? $data['password'] : '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email et mot de passe requis']);
    exit;
}

// Chercher l'utilisateur par email
$stmt = $pdo->prepare('SELECT id, email, display_name, password_digest FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Identifiants invalides']);
    exit;
}

// Vérifier le mot de passe avec password_verify (compatible bcrypt / password_digest Rails)
if (!password_verify($password, $user['password_digest'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Identifiants invalides']);
    exit;
}

// Login OK : renvoyer un token simple (localStorage côté front), plus quelques infos utiles
$token = bin2hex(random_bytes(16));

echo json_encode([
    'token' => $token,
    'user'  => [
        'id'           => $user['id'],
        'email'        => $user['email'],
        'display_name' => $user['display_name'],
    ],
]);
