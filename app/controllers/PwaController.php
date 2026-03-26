<?php
declare(strict_types=1);

class PwaController extends Controller
{
    public function manifest(): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/manifest+json; charset=UTF-8');
            header('Cache-Control: public, max-age=86400');
        }

        $baseUrl = rtrim(BASE_URL, '/');
        $scope   = $baseUrl === '' ? '/' : $baseUrl . '/';

        $manifest = [
            'name'             => APP_NAME,
            'short_name'       => 'CEMIL',
            'description'      => 'Sistema de gestão escolar do CEMIL – Jardenir Jorge Frederico.',
            'start_url'        => $scope,
            'scope'            => $scope,
            'display'          => 'standalone',
            'orientation'      => 'portrait-primary',
            'background_color' => '#1d4e89',
            'theme_color'      => '#1d4e89',
            'icons'            => [
                [
                    'src'     => $baseUrl . '/public/assets/img/logo-cemil.png',
                    'sizes'   => 'any',
                    'type'    => 'image/png',
                    'purpose' => 'any',
                ],
                [
                    'src'     => $baseUrl . '/public/assets/img/logo-cemil.png',
                    'sizes'   => 'any',
                    'type'    => 'image/png',
                    'purpose' => 'maskable',
                ],
            ],
        ];

        echo json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public function serviceWorker(): void
    {
        $swFile = __DIR__ . '/../../public/sw.js';

        if (!headers_sent()) {
            header('Content-Type: application/javascript; charset=UTF-8');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            $scope = BASE_URL === '' ? '/' : rtrim(BASE_URL, '/') . '/';
            header('Service-Worker-Allowed: ' . $scope);
        }

        $version = is_file($swFile) ? (string) filemtime($swFile) : '1';

        echo 'var _SW_BASE_URL = ' . json_encode(BASE_URL, JSON_UNESCAPED_SLASHES) . ';' . PHP_EOL;
        echo 'var _SW_VERSION  = ' . json_encode($version) . ';' . PHP_EOL;

        if (is_file($swFile)) {
            readfile($swFile);
        }

        exit;
    }
}
