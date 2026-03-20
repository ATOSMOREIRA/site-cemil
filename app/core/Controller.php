<?php
declare(strict_types=1);

class Controller
{
    protected function render(string $view, array $data = []): void
    {
        $sharedData = [];
        $authUser = $_SESSION['auth'] ?? null;
        $isAuthenticated = is_array($authUser);
        $isAdmin = $isAuthenticated && (($authUser['tipo'] ?? '') === 'admin');

        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        $sharedData['authUser'] = $authUser;
        $sharedData['isAuthenticated'] = $isAuthenticated;
        $sharedData['isAdmin'] = $isAdmin;
        $sharedData['csrfToken'] = (string) $_SESSION['csrf_token'];
        $sharedData['instagramManageError'] = $_SESSION['instagram_manage_error'] ?? null;
        $sharedData['instagramManageSuccess'] = $_SESSION['instagram_manage_success'] ?? null;
        $sharedData['openInstagramManageModal'] = (bool) ($_SESSION['open_instagram_manage_modal'] ?? false);

        unset($_SESSION['instagram_manage_error'], $_SESSION['instagram_manage_success'], $_SESSION['open_instagram_manage_modal']);

        $defaultLinks = [];
        $configuredLinks = INSTAGRAM_EMBED_POSTS;

        if (is_array($configuredLinks)) {
            $defaultLinks = array_values(array_slice($configuredLinks, 0, 3));
        }

        while (count($defaultLinks) < 3) {
            $defaultLinks[] = '';
        }

        if ($isAdmin && class_exists('InstagramLinkModel')) {
            try {
                $instagramLinkModel = new InstagramLinkModel();
                $dbLinks = $instagramLinkModel->getLinks(3);

                if ($dbLinks !== []) {
                    $defaultLinks = array_values(array_slice($dbLinks, 0, 3));
                    while (count($defaultLinks) < 3) {
                        $defaultLinks[] = '';
                    }
                }
            } catch (Throwable) {
            }
        }

        if (isset($_SESSION['instagram_manage_old']) && is_array($_SESSION['instagram_manage_old'])) {
            $oldLinks = array_values(array_slice($_SESSION['instagram_manage_old'], 0, 3));
            while (count($oldLinks) < 3) {
                $oldLinks[] = '';
            }
            $defaultLinks = $oldLinks;
        }

        unset($_SESSION['instagram_manage_old']);

        $sharedData['instagramManageLinks'] = $defaultLinks;

        extract(array_merge($sharedData, $data), EXTR_SKIP);

        require __DIR__ . '/../views/layouts/header.html';
        require __DIR__ . '/../views/' . $view . '.html';
        require __DIR__ . '/../views/layouts/footer.html';
    }

    protected function redirect(string $path): void
    {
        header('Location: ' . rtrim(BASE_URL, '/') . $path);
        exit;
    }
}
