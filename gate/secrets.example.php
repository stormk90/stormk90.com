<?php
/**
 * Plantilla del secreto del gate. Copiar a secrets.php (fuera de git) y rellenar:
 *   salt  = hex aleatorio de 16 bytes      -> openssl rand -hex 16
 *   check = PBKDF2-SHA256(clave, salt, iter, 64) en hex
 *     python3 -c "import hashlib;print(hashlib.pbkdf2_hmac('sha256',b'CLAVE',b'SALT',600000,64).hex())"
 *     (el salt va como STRING en bytes, no bytes.fromhex: PHP lo trata como texto)
 *   session_cookie = valor EXACTO que admite la RewriteCond del vhost para
 *     la cookie stormk90_session en /utils/, /betting/ y /api/. Si se omite,
 *     login.php usa sha256(clave) y el vhost tendría que llevar ese valor.
 * La clave en claro NO se escribe en ningún fichero.
 */
if (!defined('STORMK90_GATE')) { http_response_code(404); exit; }
return [
    'algo'  => 'sha256',
    'salt'  => 'REEMPLAZAR',
    'iter'  => 600000,
    'check' => 'REEMPLAZAR',
    'state_file' => __DIR__ . '/rl.json',
    'session_cookie' => 'REEMPLAZAR-VALOR-QUE-ACEPTA-EL-VHOST',
];
