<?php
// Simple fake groups endpoint for Plesk
// Returns a small static list of clubs so the UI has something to display.

header('Content-Type: application/json');

$groups = [
    [
        'id' => 1,
        'name' => 'Club de Tennis',
        'description' => 'Exemple de club pour tester l’interface',
        'kind' => 'Club',
        'role' => 'owner',
        'events_count' => 2,
        'members_count' => 10,
    ],
    [
        'id' => 2,
        'name' => 'Club de Foot',
        'description' => 'Un autre exemple de club',
        'kind' => 'Club',
        'role' => 'member',
        'events_count' => 1,
        'members_count' => 15,
    ],
];

echo json_encode($groups);
