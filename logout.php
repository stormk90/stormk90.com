<?php
/**
 * logout.php — invalida la cookie de sesión del hub.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
setcookie('stormk90_session', '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
echo json_encode(['ok' => true]);
