<?php
// Connexion PDO à la base MariaDB de production
// ⚠️ IMPORTANT : remplis HOST, USER et PASSWORD directement sur le serveur (Plesk)
// et évite de committer tes identifiants réels dans Git.

$DB_HOST = 'localhost';        // à adapter selon ta config Plesk
$DB_NAME = 'clubcovoit_production';
$DB_USER = 'CHANGE_ME_USER';   // remplace par l’utilisateur MariaDB
$DB_PASS = 'CHANGE_ME_PASS';   // remplace par le mot de passe MariaDB

$dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'DB connection failed']);
    exit;
}
