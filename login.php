<?php
/**
 * login.php — Validación SERVIDOR de la clave maestra del hub.
 * El cliente NO conoce ningún secreto: solo envía la clave por POST y
 * el servidor la verifica contra un PBKDF2-SHA256 almacenado fuera del HTTP
 * (gate/ está bloqueado por .htaccess) y emite la cookie de sesión.
 */
define('STORMK90_GATE', true);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === false) {
    http_response_code(415);
    echo json_encode(['ok' => false, 'error' => 'ctype']);
    exit;
}

$cfg = require __DIR__ . '/gate/secrets.php';

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 1024) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'body']);
    exit;
}
$body = json_decode($raw, true);
$pass = (is_array($body) && isset($body['pass']) && is_string($body['pass'])) ? $body['pass'] : '';

// --- Rate limit: 6 intentos por IP cada 15 minutos ---
$ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$now = time();
$state = @json_decode((string) @file_get_contents($cfg['state_file']), true);
if (!is_array($state)) { $state = []; }
$rec = is_array($state[$ip] ?? null) ? $state[$ip] : ['n' => 0, 'first' => $now];
if ($now - (int) ($rec['first'] ?? $now) > 900) { $rec = ['n' => 0, 'first' => $now]; }
if ((int) $rec['n'] >= 6) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'too_many']);
    exit;
}

$ok = $pass !== '' && strlen($pass) <= 200
    && hash_equals($cfg['check'], hash_pbkdf2($cfg['algo'], $pass, $cfg['salt'], (int) $cfg['iter'], 128));

if (!$ok) {
    $rec['n'] = (int) $rec['n'] + 1;
    $state[$ip] = $rec;
    @file_put_contents($cfg['state_file'], json_encode($state), LOCK_EX);
    usleep(400000); // frena bruteo y iguala tiempos
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'invalid']);
    exit;
}

unset($state[$ip]);
@file_put_contents($cfg['state_file'], json_encode($state), LOCK_EX);

// Cookie exigida por la regla del vhost: stormk90_session = sha256(clave)
setcookie('stormk90_session', hash('sha256', $pass), [
    'expires'  => $now + 2592000,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);

echo json_encode(['ok' => true]);
