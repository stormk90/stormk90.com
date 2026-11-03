<?php
/**
 * Plantilla del secreto del gate. Copiar a secrets.php (fuera de git) y rellenar:
 *   salt  = hex aleatorio de 16 bytes      -> openssl rand -hex 16
 *   check = PBKDF2-SHA256(clave, salt, iter, 64) en hex
 *     python3 -c "import hashlib;print(hashlib.pbkdf2_hmac('sha256',b'CLAVE',bytes.fromhex('SALT'),600000,64).hex())"
 * La clave en claro NO se escribe en ningún fichero.
 */
if (!defined('STORMK90_GATE')) { http_response_code(404); exit; }
return [
    'algo'  => 'sha256',
    'salt'  => 'REEMPLAZAR',
    'iter'  => 600000,
    'check' => 'REEMPLAZAR',
    'state_file' => __DIR__ . '/rl.json',
];
