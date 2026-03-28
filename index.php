<?php

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header('Permissions-Policy: unload=(self "https://www.instagram.com")');
}

require_once __DIR__ . '/config/app.php';
$routes = require __DIR__ . '/config/routes.php';

spl_autoload_register(static function (string $className): void {
    $safeClassName = preg_replace('/[^a-zA-Z0-9_]/', '', $className) ?: '';
    if ($safeClassName === '') {
        return;
    }

    $directories = [
        __DIR__ . '/app/core/',
        __DIR__ . '/app/models/',
        __DIR__ . '/app/controllers/',
    ];

    foreach ($directories as $directory) {
        $filePath = $directory . $safeClassName . '.php';
        if (is_file($filePath)) {
            require_once $filePath;
            return;
        }
    }
});

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php')), '/');

if ($basePath !== '' && $basePath !== '/' && str_starts_with($path, $basePath)) {
    $path = substr($path, strlen($basePath));
}

$path = '/' . trim((string) $path, '/');
$path = preg_replace('#/+#', '/', $path) ?: '/';

if (str_starts_with($path, '/index.php/')) {
    $path = substr($path, strlen('/index.php'));
}

if ($path === '/index.php') {
    $path = '/';
}

$path = preg_replace('#/+#', '/', $path) ?: '/';

if (isset($routes[$path])) {
    [$controllerClass, $method] = $routes[$path];

    if (class_exists($controllerClass) && method_exists($controllerClass, $method)) {
        $controller = new $controllerClass();
        $controller->dispatch($method, $path);
        exit;
    }
}

$fallbackController = new HomeController();
$fallbackController->notFound();
exit;
