<?php
declare(strict_types=1);

class HomeController extends Controller
{
    use InstitutionalAccessTrait;

    private HomeModel $homeModel;
    private AuthModel $authModel;
    private InstagramLinkModel $instagramLinkModel;
    private InformacaoModel $informacaoModel;
    private const PASSWORD_RESET_SESSION_KEY = 'password_reset_challenge';

    public function __construct()
    {
        $this->homeModel = new HomeModel();
        $this->authModel = new AuthModel();
        $this->instagramLinkModel = new InstagramLinkModel();
        $this->informacaoModel = new InformacaoModel();
    }

    public function index(): void
    {
        $configuredInstagramLinks = $this->getConfiguredInstagramLinks(3);
        $homeData = $this->homeModel->getHomeData($configuredInstagramLinks, false);
        $homeData['hasInstagramLinks'] = $configuredInstagramLinks !== [];
        $homeData['instagramLinksCount'] = count($configuredInstagramLinks);
        $this->render('home/index', $homeData);
    }

    public function instagramPosts(): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
        }

        $postLinks = $this->getConfiguredInstagramLinks(3);

        if ($postLinks === []) {
            $posts = [];
        } else {
            try {
                $posts = $this->homeModel->getInstagramPosts($postLinks);
            } catch (Throwable) {
                $posts = [];
            }
        }

        echo json_encode([
            'posts' => $posts,
            'hasConfiguredLinks' => $postLinks !== [],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    private function getConfiguredInstagramLinks(int $limit = 3): array
    {
        $resolvedLinks = [];

        try {
            $resolvedLinks = $this->instagramLinkModel->getLinks($limit);
        } catch (Throwable) {
            $resolvedLinks = [];
        }

        if ($resolvedLinks === [] && is_array(INSTAGRAM_EMBED_POSTS)) {
            $resolvedLinks = array_values(array_slice(INSTAGRAM_EMBED_POSTS, 0, $limit));
        }

        $normalized = [];

        foreach ($resolvedLinks as $link) {
            $url = trim((string) $link);
            if ($url !== '') {
                $normalized[] = $url;
            }
        }

        return array_values(array_slice($normalized, 0, $limit));
    }

    public function entrar(): void
    {
        if (isset($_SESSION['auth'])) {
            $this->redirect('/');
        }

        $error = null;
        $oldCredential = '';
        $forgotPasswordError = null;
        $forgotPasswordSuccess = null;
        $forgotPasswordEmail = '';
        $showForgotPasswordForm = false;
        $passwordResetInfo = null;
        $passwordResetChallenge = $this->getPasswordResetChallenge();

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $credential = trim((string) ($_POST['email'] ?? ''));
            $senha = (string) ($_POST['senha'] ?? '');
            $oldCredential = $credential;

            if ($credential === '' || $senha === '') {
                $error = 'Informe usuário/e-mail e senha.';
            } else {
                try {
                    $user = $this->authModel->findByCredential($credential);
                } catch (Throwable) {
                    $user = null;
                }

                $isValidUser = false;

                if ($user !== null && isset($user['senha'])) {
                    $storedPassword = (string) $user['senha'];
                    $isValidUser = password_verify($senha, $storedPassword) || hash_equals($storedPassword, $senha);
                }

                if ($isValidUser) {
                    if ($this->requiresPasswordChange($user)) {
                        $expiresAt = trim((string) ($user['senha_temporaria_ate'] ?? ''));
                        if ($expiresAt === '' || strtotime($expiresAt) === false || strtotime($expiresAt) < time()) {
                            $error = 'Sua senha temporaria expirou. Solicite uma nova recuperacao.';
                        } else {
                            $this->beginPasswordResetChallenge($user);
                            $passwordResetChallenge = $this->getPasswordResetChallenge();
                            $passwordResetInfo = 'Senha temporaria validada. Defina agora uma nova senha para continuar.';
                        }
                    } else {
                        $this->clearPasswordResetChallenge();
                        $this->startAuthenticatedSession($user, $credential);
                        $this->redirect('/');
                    }
                }

                if ($error === null && $passwordResetInfo === null) {
                    $error = 'Credenciais inválidas.';
                }
            }
        }

        $this->render('auth/login', [
            'schoolName' => SCHOOL_NAME,
            'error' => $error,
            'oldEmail' => $oldCredential,
            'forgotPasswordError' => $forgotPasswordError,
            'forgotPasswordSuccess' => $forgotPasswordSuccess,
            'forgotPasswordEmail' => $forgotPasswordEmail,
            'showForgotPasswordForm' => $showForgotPasswordForm,
            'showResetPasswordForm' => $passwordResetChallenge !== null,
            'passwordResetInfo' => $passwordResetInfo,
            'passwordResetEmail' => (string) ($passwordResetChallenge['email'] ?? ''),
        ]);
    }

    public function sobre(): void
    {
        $this->render('home/Sobre', [
            'schoolName' => SCHOOL_NAME,
        ]);
    }

    public function esqueciMinhaSenha(): void
    {
        if (isset($_SESSION['auth'])) {
            $this->redirect('/');
        }

        $error = null;
        $success = null;
        $email = trim((string) ($_POST['recovery_email'] ?? ''));

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            $this->redirect('/entrar');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
        $isAjaxRequest = $this->isAjaxRequest();

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            $error = 'Sessao invalida. Atualize a pagina e tente novamente.';
        } elseif ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Informe um e-mail valido para recuperar a senha.';
        } else {
            try {
                $user = $this->authModel->findByEmail($email);
            } catch (Throwable) {
                $user = null;
            }

            if ($user !== null) {
                $temporaryPassword = $this->generateTemporaryPassword();
                $expiresAt = new DateTimeImmutable('+' . max(5, TEMP_PASSWORD_EXPIRATION_MINUTES) . ' minutes');

                try {
                    SmtpMailer::fromConfig()->sendTemporaryPassword(
                        (string) ($user['email'] ?? $email),
                        (string) ($user['nome'] ?? 'Usuário'),
                        $temporaryPassword,
                        $expiresAt
                    );

                    $this->authModel->storeTemporaryPassword((int) ($user['id'] ?? 0), $temporaryPassword, $expiresAt);
                } catch (Throwable) {
                    $error = 'Nao foi possivel enviar a senha temporaria agora. Tente novamente em instantes.';
                }
            }

            if ($error === null) {
                $success = 'Se o e-mail estiver cadastrado, uma senha temporaria foi enviada e devera ser trocada no primeiro acesso.';
            }
        }

        if ($isAjaxRequest) {
            if ($error !== null) {
                $this->respondJson([
                    'ok' => false,
                    'message' => $error,
                ], 422);
            }

            $this->respondJson([
                'ok' => true,
                'message' => $success,
            ]);
        }

        $this->render('auth/login', [
            'schoolName' => SCHOOL_NAME,
            'error' => null,
            'oldEmail' => '',
            'forgotPasswordError' => $error,
            'forgotPasswordSuccess' => $success,
            'forgotPasswordEmail' => $email,
            'showForgotPasswordForm' => $error !== null,
            'showResetPasswordForm' => $this->getPasswordResetChallenge() !== null,
            'passwordResetInfo' => null,
            'passwordResetEmail' => (string) (($this->getPasswordResetChallenge() ?? [])['email'] ?? ''),
        ]);
    }

    public function redefinirSenha(): void
    {
        if (isset($_SESSION['auth'])) {
            $this->redirect('/');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            $this->redirect('/entrar');
        }

        $challenge = $this->getPasswordResetChallenge();
        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
        $newPassword = (string) ($_POST['nova_senha'] ?? '');
        $confirmPassword = (string) ($_POST['confirmar_nova_senha'] ?? '');
        $error = null;

        if ($challenge === null) {
            $error = 'Sua validacao de senha temporaria nao esta mais ativa. Entre novamente com a senha temporaria.';
        } elseif ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            $error = 'Sessao invalida. Atualize a pagina e tente novamente.';
        } elseif (strlen($newPassword) < 8) {
            $error = 'A nova senha deve ter pelo menos 8 caracteres.';
        } elseif ($newPassword !== $confirmPassword) {
            $error = 'A confirmacao da nova senha nao confere.';
        }

        if ($error !== null) {
            $this->render('auth/login', [
                'schoolName' => SCHOOL_NAME,
                'error' => null,
                'oldEmail' => '',
                'forgotPasswordError' => null,
                'forgotPasswordSuccess' => null,
                'forgotPasswordEmail' => '',
                'showForgotPasswordForm' => false,
                'showResetPasswordForm' => true,
                'passwordResetInfo' => $error,
                'passwordResetInfoIsError' => true,
                'passwordResetEmail' => (string) ($challenge['email'] ?? ''),
            ]);
            return;
        }

        $userId = (int) ($challenge['user_id'] ?? 0);

        try {
            $this->authModel->updatePasswordAfterTemporaryReset($userId, $newPassword);
            $user = $this->authModel->findById($userId);
        } catch (Throwable) {
            $user = null;
        }

        if ($user === null) {
            $this->render('auth/login', [
                'schoolName' => SCHOOL_NAME,
                'error' => null,
                'oldEmail' => '',
                'forgotPasswordError' => null,
                'forgotPasswordSuccess' => null,
                'forgotPasswordEmail' => '',
                'showForgotPasswordForm' => false,
                'showResetPasswordForm' => true,
                'passwordResetInfo' => 'Nao foi possivel atualizar sua senha agora. Tente novamente.',
                'passwordResetInfoIsError' => true,
                'passwordResetEmail' => (string) ($challenge['email'] ?? ''),
            ]);
            return;
        }

        $this->clearPasswordResetChallenge();
        $this->startAuthenticatedSession($user, (string) ($user['email'] ?? ''));
        $this->redirect('/');
    }

    public function sair(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }

        session_destroy();
        $this->redirect('/entrar');
    }

    public function meusDados(): void
    {
        if (!isset($_SESSION['auth'])) {
            $this->respondJson(['ok' => false, 'message' => 'Usuário não autenticado.'], 401);
        }

        $userId = (int) ($_SESSION['auth']['id'] ?? 0);
        if ($userId <= 0) {
            $this->respondJson(['ok' => false, 'message' => 'Sessão inválida.'], 401);
        }

        try {
            $user = $this->authModel->findById($userId);
        } catch (Throwable) {
            $user = null;
        }

        if ($user === null) {
            $this->respondJson(['ok' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $cpfRaw = $this->decryptCpf((string) ($user['cpf_encrypted'] ?? ''));

        $this->respondJson([
            'ok' => true,
            'data' => [
                'nome' => (string) ($user['nome'] ?? ''),
                'email' => (string) ($user['email'] ?? ''),
                'usuario' => (string) ($user['usuario'] ?? ''),
                'cpf' => $this->maskCpf($cpfRaw),
            ],
        ]);
    }

    public function salvarMeusDados(): void
    {
        if (!isset($_SESSION['auth'])) {
            $this->respondJson(['ok' => false, 'message' => 'Usuário não autenticado.'], 401);
        }

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            $this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
        }

        $userId = (int) ($_SESSION['auth']['id'] ?? 0);
        if ($userId <= 0) {
            $this->respondJson(['ok' => false, 'message' => 'Sessão inválida.'], 401);
        }

        $nome = trim((string) ($_POST['nome'] ?? ''));
        $email = trim((string) ($_POST['email'] ?? ''));
        $senha = (string) ($_POST['senha'] ?? '');

        if ($nome === '' || $email === '') {
            $this->respondJson(['ok' => false, 'message' => 'Nome e e-mail são obrigatórios.'], 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->respondJson(['ok' => false, 'message' => 'Informe um e-mail válido.'], 422);
        }

        try {
            if ($this->authModel->existsEmailForAnotherUser($email, $userId)) {
                $this->respondJson(['ok' => false, 'message' => 'Já existe um usuário com este e-mail.'], 409);
            }

            $this->authModel->updateProfile($userId, $nome, $email, $senha === '' ? null : $senha);
        } catch (Throwable) {
            $this->respondJson(['ok' => false, 'message' => 'Não foi possível atualizar seus dados agora.'], 500);
        }

        $_SESSION['auth']['nome'] = $nome;
        $_SESSION['auth']['email'] = $email;

        $this->respondJson(['ok' => true, 'message' => 'Dados atualizados com sucesso.']);
    }

    private function startAuthenticatedSession(array $user, string $credential): void
    {
        session_regenerate_id(true);

        $authType = $this->normalizePermissionToken((string) ($user['tipo'] ?? 'usuario'));
        if ($authType === '') {
            $authType = 'usuario';
        }
        $rawServices = (string) ($user['servicos'] ?? '');

        $_SESSION['auth'] = [
            'id' => $user['id'] ?? null,
            'nome' => $user['nome'] ?? 'Usuário',
            'email' => $user['email'] ?? $credential,
            'tipo' => $authType,
            'servicos' => $rawServices,
            'can_view_institucional' => $this->canAccessInstitutionalAreaByRules($authType, $rawServices),
            'can_access_cadastro_de_estudantes' => $this->canAccessSubserviceByRules($authType, $rawServices, 'cadastro_de_estudantes'),
            'can_access_corretor_de_gabaritos' => $this->canAccessSubserviceByRules($authType, $rawServices, 'corretor_de_gabaritos'),
            'can_access_admin_panel' => in_array($authType, ['admin', 'tester'], true),
        ];

        if ($authType === 'admin') {
            $_SESSION['admin_services_cleanup_pending'] = true;
        }
    }

    private function requiresPasswordChange(array $user): bool
    {
        return (int) ($user['exige_troca_senha'] ?? 0) === 1;
    }

    private function beginPasswordResetChallenge(array $user): void
    {
        $_SESSION[self::PASSWORD_RESET_SESSION_KEY] = [
            'user_id' => (int) ($user['id'] ?? 0),
            'email' => (string) ($user['email'] ?? ''),
            'nome' => (string) ($user['nome'] ?? ''),
            'validated_at' => time(),
        ];
    }

    private function getPasswordResetChallenge(): ?array
    {
        $challenge = $_SESSION[self::PASSWORD_RESET_SESSION_KEY] ?? null;
        return is_array($challenge) ? $challenge : null;
    }

    private function clearPasswordResetChallenge(): void
    {
        unset($_SESSION[self::PASSWORD_RESET_SESSION_KEY]);
    }

    private function generateTemporaryPassword(int $length = 10): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        $password = '';
        $maxIndex = strlen($alphabet) - 1;

        for ($index = 0; $index < $length; $index += 1) {
            $password .= $alphabet[random_int(0, $maxIndex)];
        }

        return $password;
    }

    public function informacoes(): void
    {
        $page = (int) ($_GET['pagina'] ?? 1);
        $month = (int) ($_GET['mes'] ?? 0);
        $year = (int) ($_GET['ano'] ?? 0);
        $perPage = 6;

        $selectedMonth = ($month >= 1 && $month <= 12) ? $month : null;
        $selectedYear = ($year >= 2000 && $year <= 2100) ? $year : null;

        try {
            $totalPosts = $this->informacaoModel->countByPeriod($selectedMonth, $selectedYear);
            $totalPages = max(1, (int) ceil($totalPosts / $perPage));
            $currentPage = max(1, min($page, $totalPages));

            $informacoesPosts = $this->informacaoModel->getPaginatedByPeriod($currentPage, $perPage, $selectedMonth, $selectedYear);
            $availableYears = $this->informacaoModel->getAvailableYears();
        } catch (Throwable) {
            $informacoesPosts = [];
            $availableYears = [];
            $totalPosts = 0;
            $totalPages = 1;
            $currentPage = 1;
        }

        $this->render('home/informacoes', [
            'schoolName' => SCHOOL_NAME,
            'informacoesPosts' => $informacoesPosts,
            'informacoesFilterMonth' => $selectedMonth,
            'informacoesFilterYear' => $selectedYear,
            'informacoesAvailableYears' => $availableYears,
            'informacoesCurrentPage' => $currentPage,
            'informacoesTotalPages' => $totalPages,
            'informacoesTotalPosts' => $totalPosts,
        ]);
    }

    public function notFound(): void
    {
        http_response_code(404);

        $this->render('errors/404', [
            'schoolName' => SCHOOL_NAME,
        ]);
    }

    public function gerenciarLinksInstagram(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            $this->redirect('/');
        }

        $isAdmin = isset($_SESSION['auth']) && (($_SESSION['auth']['tipo'] ?? '') === 'admin');

        if (!$isAdmin) {
            $this->redirect('/');
        }

        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
        $csrfToken = (string) ($_POST['csrf_token'] ?? '');

        if ($sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            $_SESSION['instagram_manage_error'] = 'Sessão inválida. Atualize a página e tente novamente.';
            $_SESSION['open_instagram_manage_modal'] = true;
            $this->redirect('/');
        }

        $links = [
            trim((string) ($_POST['link_1'] ?? '')),
            trim((string) ($_POST['link_2'] ?? '')),
            trim((string) ($_POST['link_3'] ?? '')),
        ];

        $_SESSION['instagram_manage_old'] = $links;

        foreach ($links as $link) {
            if ($link === '') {
                continue;
            }

            if (!filter_var($link, FILTER_VALIDATE_URL)) {
                $_SESSION['instagram_manage_error'] = 'Um ou mais links são inválidos.';
                $_SESSION['open_instagram_manage_modal'] = true;
                $this->redirect('/');
            }

            if (!preg_match('#^https?://(www\.)?instagram\.com/(?:[^/]+/)?(p|reel)/#i', $link)) {
                $_SESSION['instagram_manage_error'] = 'Use links de post/reel do Instagram.';
                $_SESSION['open_instagram_manage_modal'] = true;
                $this->redirect('/');
            }
        }

        try {
            $this->instagramLinkModel->saveLinks($links);
            unset($_SESSION['instagram_manage_old']);
            $_SESSION['instagram_manage_success'] = 'Links atualizados com sucesso.';
        } catch (Throwable) {
            $_SESSION['instagram_manage_error'] = 'Não foi possível salvar agora. Tente novamente.';
            $_SESSION['open_instagram_manage_modal'] = true;
        }

        $this->redirect('/');
    }

    protected function normalizePermissionToken(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }

        $value = strtr($value, [
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A',
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
            'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
            'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
            'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
            'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'Ç' => 'C', 'ç' => 'c',
        ]);

        $value = preg_replace('/\s+/u', '_', $value) ?? $value;

        return mb_strtolower($value, 'UTF-8');
    }

    protected function ensureCsrfToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return (string) $_SESSION['csrf_token'];
    }

    protected function renderAdminModalFile(string $filePath, array $data = []): void
    {
        extract($data, EXTR_SKIP);
        ob_start();
        require $filePath;
        echo (string) ob_get_clean();
    }

    protected function renderStandaloneEmbeddedFile(string $filePath, array $data = []): void
    {
        extract($data, EXTR_SKIP);

        $title = trim((string) ($standaloneTitle ?? APP_NAME));
        $bodyClass = trim((string) ($standaloneBodyClass ?? 'embedded-standalone-page'));
        $cssPath = __DIR__ . '/../../public/assets/css/style.css';
        $cssVersion = is_file($cssPath) ? (string) filemtime($cssPath) : (string) time();

        if (!headers_sent()) {
            header('Content-Type: text/html; charset=UTF-8');
        }

        echo '<!doctype html>';
        echo '<html lang="pt-BR">';
        echo '<head>';
        echo '<meta charset="UTF-8">';
        echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
        echo '<title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</title>';
        echo '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">';
        echo '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/css/line-awesome.min.css">';
        echo '<link rel="stylesheet" href="' . rtrim(BASE_URL, '/') . '/public/assets/css/style.css?v=' . rawurlencode($cssVersion) . '">';
        echo '<style>html,body{height:100%;}body.' . htmlspecialchars($bodyClass, ENT_QUOTES, 'UTF-8') . '{margin:0;background:transparent;overflow:hidden;}</style>';
        echo '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>';
        echo '</head>';
        echo '<body class="' . htmlspecialchars($bodyClass, ENT_QUOTES, 'UTF-8') . '">';

        ob_start();
        require $filePath;
        echo (string) ob_get_clean();

        echo '</body>';
        echo '</html>';
    }

    protected function getAdminDepartments(): array
    {
        try {
            $pdo = Database::connection();
            $rows = $pdo->query('SELECT id, nome FROM departamentos ORDER BY nome ASC')?->fetchAll() ?: [];
        } catch (Throwable) {
            $rows = [];
        }

        $result = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            $nome = trim((string) ($row['nome'] ?? ''));
            if ($id > 0) {
                $result[] = ['id' => $id, 'nome' => $nome !== '' ? $nome : ('Departamento ' . $id)];
            }
        }

        return $result;
    }

    protected function getAdminFunctions(): array
    {
        try {
            $pdo = Database::connection();
            $rows = $pdo->query('SELECT id, nome FROM funcoes ORDER BY nome ASC')?->fetchAll() ?: [];
        } catch (Throwable) {
            $rows = [];
        }

        $result = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            $nome = trim((string) ($row['nome'] ?? ''));
            if ($id > 0) {
                $result[] = ['id' => $id, 'nome' => $nome !== '' ? $nome : ('Função ' . $id)];
            }
        }

        return $result;
    }

    protected function getAdminUserTypes(): array
    {
        try {
            $model = new AdminCatalogModel();
            return $model->listUserTypes();
        } catch (Throwable) {
            return [
                ['id' => 0, 'chave' => 'admin', 'nome' => 'Administrador', 'protegido' => true],
                ['id' => 0, 'chave' => 'servidor', 'nome' => 'Servidor', 'protegido' => true],
                ['id' => 0, 'chave' => 'aluno', 'nome' => 'Aluno', 'protegido' => true],
            ];
        }
    }

    protected function getAdminUsers(array $departments, array $functions, array $userTypes = []): array
    {
        $hasCargaHorariaColumn = $this->hasUsuariosColumn('cargaHoraria');

        try {
            $pdo = Database::connection();
            $sql = $hasCargaHorariaColumn
                ? 'SELECT id, tipo, departamento, funcao, nome, usuario, email, servicos, cargaHoraria FROM usuarios ORDER BY nome ASC'
                : 'SELECT id, tipo, departamento, funcao, nome, usuario, email, servicos, 40 AS cargaHoraria FROM usuarios ORDER BY nome ASC';
            $rows = $pdo->query($sql)?->fetchAll() ?: [];
        } catch (Throwable) {
            $rows = [];
        }

        $departmentMap = [];
        foreach ($departments as $department) {
            $departmentMap[(int) ($department['id'] ?? 0)] = (string) ($department['nome'] ?? '');
        }

        $functionMap = [];
        foreach ($functions as $function) {
            $functionMap[(int) ($function['id'] ?? 0)] = (string) ($function['nome'] ?? '');
        }

        $userTypeMap = [];
        foreach ($userTypes as $userType) {
            if (!is_array($userType)) {
                continue;
            }

            $key = $this->normalizePermissionToken((string) ($userType['chave'] ?? ''));
            $name = trim((string) ($userType['nome'] ?? ''));
            if ($key !== '' && $name !== '') {
                $userTypeMap[$key] = $name;
            }
        }

        $users = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $departmentId = (int) ($row['departamento'] ?? 0);
            $functionId = (int) ($row['funcao'] ?? 0);
            $userTypeKey = $this->normalizePermissionToken((string) ($row['tipo'] ?? 'aluno'));

            $users[] = [
                'id' => (int) ($row['id'] ?? 0),
                'tipo' => $userTypeKey,
                'tipo_nome' => $userTypeMap[$userTypeKey] ?? ucfirst($userTypeKey),
                'departamento_id' => $departmentId,
                'departamento_nome' => $departmentMap[$departmentId] ?? 'Não informado',
                'funcao_id' => $functionId,
                'funcao_nome' => $functionMap[$functionId] ?? 'Não informado',
                'nome' => (string) ($row['nome'] ?? ''),
                'usuario' => (string) ($row['usuario'] ?? ''),
                'email' => (string) ($row['email'] ?? ''),
                'servicos' => (string) ($row['servicos'] ?? ''),
                'cargaHoraria' => max(0, (int) ($row['cargaHoraria'] ?? 40)),
            ];
        }

        return $users;
    }

    protected function getAdminServicesAndSubservices(): array
    {
        $services = [];
        $subservices = [];

        try {
            $pdo = Database::connection();
            $rows = $pdo->query('SELECT * FROM servicos ORDER BY nome ASC')?->fetchAll() ?: [];
        } catch (Throwable) {
            $rows = [];
        }

        $parentColumn = $this->getServicosParentColumn();
        $hasTipoColumn = $this->hasServicosColumn('tipo');

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            $nome = trim((string) ($row['nome'] ?? ''));

            if ($id <= 0 || $nome === '') {
                continue;
            }

            $tipo = $this->normalizePermissionToken((string) ($row['tipo'] ?? 'servico'));
            $parentId = $this->getParentServiceIdFromServicosRow($row, $parentColumn);
            $isSubservice = str_starts_with($tipo, 'subserv') || (!$hasTipoColumn && $parentId > 0);

            if ($isSubservice) {
                continue;
            }

            $services[] = [
                'id' => $id,
                'nome' => $nome,
                'tipo' => 'servico',
            ];
        }

        $subserviceTables = $this->discoverServiceTablesWithShowCommands();
        $serviceMap = [];
        foreach ($services as $service) {
            $serviceMap[(int) ($service['id'] ?? 0)] = (string) ($service['nome'] ?? '');
        }

        foreach ($subserviceTables as $tableName) {
            $safeTable = $this->sanitizeSqlIdentifier((string) $tableName);
            if ($safeTable === '' || in_array($safeTable, ['servicos', 'usuarios'], true)) {
                continue;
            }

            if (!$this->isValidSubserviceTable($safeTable)) {
                continue;
            }

            $parentId = $this->resolveParentServiceIdFromTable($safeTable);
            $subName = $this->resolveSubserviceNameFromTable($safeTable);

            $subservices[] = [
                'id' => 0,
                'table' => $safeTable,
                'key' => $this->normalizePermissionToken($safeTable),
                'nome' => $subName,
                'tipo' => 'subservico',
                'servico_id' => $parentId,
                'servico_nome' => $serviceMap[$parentId] ?? ('Serviço ' . $parentId),
            ];
        }

        return [
            'services' => $services,
            'subservices' => $subservices,
        ];
    }

    protected function isValidSubserviceTable(string $tableName): bool
    {
        $safeTable = $this->sanitizeSqlIdentifier($tableName);
        if ($safeTable === '') {
            return false;
        }

        try {
            $pdo = Database::connection();
            $query = sprintf('SHOW COLUMNS FROM `%s`', $safeTable);
            $columns = $pdo->query($query)?->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable) {
            $columns = [];
        }

        if (!is_array($columns) || $columns === []) {
            return false;
        }

        $required = ['id', 'nome', 'tipo', 'servico'];
        $available = [];

        foreach ($columns as $column) {
            if (!is_array($column)) {
                continue;
            }

            $field = strtolower(trim((string) ($column['Field'] ?? '')));
            if ($field !== '') {
                $available[$field] = true;
            }
        }

        foreach ($required as $field) {
            if (!isset($available[$field])) {
                return false;
            }
        }

        return true;
    }

    protected function sanitizeSqlIdentifier(string $value): string
    {
        return preg_replace('/[^a-zA-Z0-9_]/', '', trim($value)) ?: '';
    }

    protected function tableExists(string $tableName): bool
    {
        $safeTable = $this->sanitizeSqlIdentifier($tableName);
        if ($safeTable === '') {
            return false;
        }

        try {
            $pdo = Database::connection();
            $statement = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
            $statement->execute(['table' => $safeTable]);
            return ((int) ($statement->fetchColumn() ?: 0)) > 0;
        } catch (Throwable) {
            return false;
        }
    }

    protected function createSubserviceTable(string $tableName): void
    {
        $safeTable = $this->sanitizeSqlIdentifier($tableName);
        if ($safeTable === '') {
            throw new RuntimeException('Nome de tabela inválido.');
        }

        $pdo = Database::connection();
        $sql = sprintf(
            'CREATE TABLE `%s` (`id` INT NOT NULL AUTO_INCREMENT, `nome` VARCHAR(255) NOT NULL, `tipo` VARCHAR(50) NOT NULL, `servico` INT NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            $safeTable
        );
        $pdo->exec($sql);
    }

    protected function renameSubserviceTable(string $fromTable, string $toTable): void
    {
        $safeFrom = $this->sanitizeSqlIdentifier($fromTable);
        $safeTo = $this->sanitizeSqlIdentifier($toTable);

        if ($safeFrom === '' || $safeTo === '') {
            throw new RuntimeException('Nome de tabela inválido para renomeação.');
        }

        $pdo = Database::connection();
        $sql = sprintf('RENAME TABLE `%s` TO `%s`', $safeFrom, $safeTo);
        $pdo->exec($sql);
    }

    protected function upsertSubserviceTableMetadata(string $tableName, string $nome, int $servicoId): void
    {
        $safeTable = $this->sanitizeSqlIdentifier($tableName);
        if ($safeTable === '') {
            throw new RuntimeException('Tabela de subserviço inválida.');
        }

        $pdo = Database::connection();
        $countSql = sprintf('SELECT COUNT(*) FROM `%s`', $safeTable);
        $count = (int) ($pdo->query($countSql)?->fetchColumn() ?: 0);

        if ($count > 0) {
            $updateSql = sprintf('UPDATE `%s` SET nome = :nome, tipo = :tipo, servico = :servico', $safeTable);
            $statement = $pdo->prepare($updateSql);
            $statement->execute([
                'nome' => $nome,
                'tipo' => 'subservico',
                'servico' => $servicoId,
            ]);
            return;
        }

        $insertSql = sprintf('INSERT INTO `%s` (nome, tipo, servico) VALUES (:nome, :tipo, :servico)', $safeTable);
        $statement = $pdo->prepare($insertSql);
        $statement->execute([
            'nome' => $nome,
            'tipo' => 'subservico',
            'servico' => $servicoId,
        ]);
    }

    protected function dropSubserviceTable(string $tableName): void
    {
        $safeTable = $this->sanitizeSqlIdentifier($tableName);
        if ($safeTable === '') {
            throw new RuntimeException('Tabela de subserviço inválida para exclusão.');
        }

        $pdo = Database::connection();
        $sql = sprintf('DROP TABLE `%s`', $safeTable);
        $pdo->exec($sql);
    }

    protected function countSubserviceTablesByServiceId(int $serviceId): int
    {
        if ($serviceId <= 0) {
            return 0;
        }

        $count = 0;
        $tables = $this->discoverServiceTablesWithShowCommands();

        foreach ($tables as $tableName) {
            $safeTable = $this->sanitizeSqlIdentifier((string) $tableName);
            if ($safeTable === '' || !$this->isValidSubserviceTable($safeTable)) {
                continue;
            }

            if ($this->resolveParentServiceIdFromTable($safeTable) === $serviceId) {
                $count += 1;
            }
        }

        return $count;
    }

    protected function getServicosParentColumn(): ?string
    {
        $columns = $this->getServicosTableColumns();

        if (!is_array($columns) || $columns === []) {
            return null;
        }

        $available = [];
        $normalizedMap = [];

        foreach ($columns as $column) {
            if (!is_array($column)) {
                continue;
            }

            $field = trim((string) ($column['Field'] ?? ''));
            if ($field === '') {
                continue;
            }

            $available[strtolower($field)] = $field;

            $normalized = $this->normalizePermissionToken($field);
            $normalized = str_replace('_', '', $normalized);
            if ($normalized !== '') {
                $normalizedMap[$normalized] = $field;
            }
        }

        foreach (['servico', 'servico_id', 'id_servico', 'idservico', 'servicos', 'servicos_id', 'id_servicos', 'idservicos'] as $candidate) {
            if (isset($available[$candidate])) {
                return $available[$candidate];
            }

            $normalizedCandidate = str_replace('_', '', $this->normalizePermissionToken($candidate));
            if ($normalizedCandidate !== '' && isset($normalizedMap[$normalizedCandidate])) {
                return $normalizedMap[$normalizedCandidate];
            }
        }

        foreach ($normalizedMap as $normalizedField => $originalField) {
            if (str_contains($normalizedField, 'servico') && !str_starts_with($normalizedField, 'subservico')) {
                return $originalField;
            }
        }

        return null;
    }

    protected function hasServicosColumn(string $columnName): bool
    {
        $normalizedTarget = strtolower(trim($columnName));
        if ($normalizedTarget === '') {
            return false;
        }

        $columns = $this->getServicosTableColumns();
        foreach ($columns as $column) {
            $field = strtolower((string) ($column['Field'] ?? ''));
            if ($field === $normalizedTarget) {
                return true;
            }
        }

        return false;
    }

    protected function hasUsuariosColumn(string $columnName): bool
    {
        $normalizedTarget = strtolower(trim($columnName));
        if ($normalizedTarget === '') {
            return false;
        }

        $columns = $this->getUsuariosTableColumns();
        foreach ($columns as $column) {
            $field = strtolower((string) ($column['Field'] ?? ''));
            if ($field === $normalizedTarget) {
                return true;
            }
        }

        return false;
    }

    protected function getUsuariosTableColumns(): array
    {
        try {
            $pdo = Database::connection();
            $columns = $pdo->query('SHOW COLUMNS FROM usuarios')?->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable) {
            $columns = [];
        }

        return is_array($columns) ? $columns : [];
    }

    protected function getServicosTableColumns(): array
    {
        try {
            $pdo = Database::connection();
            $columns = $pdo->query('SHOW COLUMNS FROM servicos')?->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable) {
            $columns = [];
        }

        return is_array($columns) ? $columns : [];
    }

    protected function buildServicosPayload(string $entity, string $nome, int $servicoId, ?array $existingRow): array
    {
        $columns = $this->getServicosTableColumns();
        $payload = [];

        $hasTipoColumn = false;
        $hasNomeColumn = false;
        $parentColumn = $this->getServicosParentColumn();

        foreach ($columns as $column) {
            $field = (string) ($column['Field'] ?? '');
            if ($field === 'tipo') {
                $hasTipoColumn = true;
            }
            if ($field === 'nome') {
                $hasNomeColumn = true;
            }
        }

        if ($hasNomeColumn) {
            $payload['nome'] = $nome;
        }

        if ($hasTipoColumn) {
            $payload['tipo'] = $entity === 'subservico' ? 'subservico' : 'servico';
        }

        if ($parentColumn !== null) {
            $payload[$parentColumn] = $entity === 'subservico' ? $servicoId : 0;
        }

        foreach ($columns as $column) {
            if (!is_array($column)) {
                continue;
            }

            $field = (string) ($column['Field'] ?? '');
            if ($field === '' || isset($payload[$field])) {
                continue;
            }

            $isNullable = strtoupper((string) ($column['Null'] ?? 'NO')) === 'YES';
            $defaultValue = $column['Default'] ?? null;
            $extra = strtolower((string) ($column['Extra'] ?? ''));

            if ($field === 'id' || str_contains($extra, 'auto_increment')) {
                continue;
            }

            if ($existingRow !== null && array_key_exists($field, $existingRow)) {
                $payload[$field] = $existingRow[$field];
                continue;
            }

            if ($defaultValue !== null) {
                $payload[$field] = $defaultValue;
                continue;
            }

            if ($isNullable) {
                $payload[$field] = null;
                continue;
            }

            $type = strtolower((string) ($column['Type'] ?? ''));
            if (preg_match('/int|decimal|float|double|bit|bool/', $type) === 1) {
                $payload[$field] = 0;
            } elseif (preg_match('/date|time|year/', $type) === 1) {
                $payload[$field] = date('Y-m-d H:i:s');
            } else {
                $payload[$field] = '';
            }
        }

        return $payload;
    }

    protected function insertServicosRecord(array $payload): void
    {
        if ($payload === []) {
            throw new RuntimeException('Nenhum campo disponível para inserir em servicos.');
        }

        $pdo = Database::connection();
        $columns = array_keys($payload);
        $columnList = implode(', ', $columns);
        $placeholderList = implode(', ', array_map(static fn(string $column): string => ':' . $column, $columns));

        $statement = $pdo->prepare('INSERT INTO servicos (' . $columnList . ') VALUES (' . $placeholderList . ')');
        $statement->execute($payload);
    }

    protected function updateServicosRecord(int $id, array $payload): void
    {
        if ($id <= 0) {
            throw new RuntimeException('ID inválido para atualização de servicos.');
        }

        if ($payload === []) {
            throw new RuntimeException('Nenhum campo disponível para atualizar em servicos.');
        }

        $pdo = Database::connection();
        $setClause = implode(', ', array_map(static fn(string $column): string => $column . ' = :' . $column, array_keys($payload)));
        $payload['id'] = $id;

        $statement = $pdo->prepare('UPDATE servicos SET ' . $setClause . ' WHERE id = :id');
        $statement->execute($payload);
    }

    protected function normalizeCpf(string $cpf): string
    {
        $digitsOnly = preg_replace('/\D+/', '', $cpf);
        $digitsOnly = is_string($digitsOnly) ? $digitsOnly : '';

        if ($digitsOnly === '') {
            return '';
        }

        return strlen($digitsOnly) === 11 ? $digitsOnly : '';
    }

    private function maskCpf(string $cpf): string
    {
        $normalizedCpf = $this->normalizeCpf($cpf);
        if ($normalizedCpf === '') {
            return '';
        }

        return substr($normalizedCpf, 0, 3) . '.***.***-' . substr($normalizedCpf, -2);
    }

    private function getCpfEncryptionKey(): string
    {
        return hash('sha256', APP_NAME . '|' . DB_NAME . '|' . DB_USER, true);
    }

    protected function encryptCpf(string $cpf): ?string
    {
        if ($cpf === '' || !function_exists('openssl_encrypt')) {
            return null;
        }

        $ivLength = (int) openssl_cipher_iv_length('AES-256-CBC');
        if ($ivLength <= 0) {
            return null;
        }

        try {
            $iv = random_bytes($ivLength);
        } catch (Throwable) {
            return null;
        }

        $ciphertext = openssl_encrypt($cpf, 'AES-256-CBC', $this->getCpfEncryptionKey(), OPENSSL_RAW_DATA, $iv);
        if (!is_string($ciphertext) || $ciphertext === '') {
            return null;
        }

        return base64_encode($iv . $ciphertext);
    }

    private function decryptCpf(string $encodedValue): string
    {
        if ($encodedValue === '' || !function_exists('openssl_decrypt')) {
            return '';
        }

        $raw = base64_decode($encodedValue, true);
        if (!is_string($raw) || $raw === '') {
            return '';
        }

        $ivLength = (int) openssl_cipher_iv_length('AES-256-CBC');
        if ($ivLength <= 0 || strlen($raw) <= $ivLength) {
            return '';
        }

        $iv = substr($raw, 0, $ivLength);
        $ciphertext = substr($raw, $ivLength);
        if (!is_string($iv) || !is_string($ciphertext) || $ciphertext === '') {
            return '';
        }

        $decrypted = openssl_decrypt($ciphertext, 'AES-256-CBC', $this->getCpfEncryptionKey(), OPENSSL_RAW_DATA, $iv);

        return is_string($decrypted) ? $decrypted : '';
    }

    // =========================================================================
    // CHATBOT
    // =========================================================================

    public function apiChatbot(): void
    {
        if (!isset($_SESSION['auth'])) {
            $this->respondJson(['ok' => false, 'error' => 'Não autenticado.'], 401);
            return;
        }

        $raw   = file_get_contents('php://input');
        $input = is_string($raw) ? json_decode($raw, true) : null;

        if (!is_array($input)) {
            $this->respondJson(['ok' => false, 'error' => 'Payload inválido.'], 400);
            return;
        }

        $message = trim((string) ($input['message'] ?? ''));
        if ($message === '') {
            $this->respondJson(['ok' => false, 'error' => 'Mensagem vazia.'], 400);
            return;
        }

        $rawHistory = is_array($input['history'] ?? null) ? $input['history'] : [];
        $user       = $_SESSION['auth'];

        $turmasVinculadas = $this->getChatbotTurmasVinculadas((int) ($user['id'] ?? 0));
        $tools            = $this->getChatbotTools($user, $turmasVinculadas);
        $system           = $this->buildChatbotSystemPrompt($user, $turmasVinculadas);

        $directReply = $this->tryHandleChatbotDirectQuery($message, is_array($user) ? $user : [], $turmasVinculadas);
        if (is_string($directReply) && trim($directReply) !== '') {
            $this->respondJson(['ok' => true, 'reply' => trim($directReply)]);
            return;
        }

        $messages = [];
        foreach (array_slice($rawHistory, -10) as $entry) {
            $role    = (string) ($entry['role']    ?? '');
            $content = $entry['content'] ?? '';
            if ($role !== '' && $content !== '' && $content !== []) {
                $messages[] = ['role' => $role, 'content' => $content];
            }
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        $reply = $this->chatbotToolUseLoop($messages, $tools, $system, $turmasVinculadas);
        $this->respondJson(['ok' => true, 'reply' => $reply]);
    }

    private function getChatbotTurmasVinculadas(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        try {
            $pdo  = Database::connection();
            $stmt = $pdo->prepare(
                'SELECT DISTINCT pm.turma_id FROM professor_modulacoes pm WHERE pm.professor_id = :uid AND pm.turma_id IS NOT NULL'
            );
            $stmt->execute(['uid' => $userId]);
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
            return array_values(array_filter(array_map('intval', $rows), fn(int $id): bool => $id > 0));
        } catch (Throwable) {
            return [];
        }
    }

    private function tryHandleChatbotDirectQuery(string $message, array $user, array $turmasVinculadas): ?string
    {
        $normalized = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $message) ?? ''), 'UTF-8');
        if ($normalized === '') {
            return null;
        }

        $reply = $this->tryHandleChatbotShortAck($normalized);
        if ($reply !== null) {
            return $reply;
        }

        $reply = $this->tryHandleChatbotGroqStatusQuery($normalized);
        if ($reply !== null) {
            return $reply;
        }

        $isAdmin = ($user['tipo'] ?? '') === 'admin';
        $canAccessStudents = $isAdmin || !empty($user['can_access_cadastro_de_estudantes']);

        if ($canAccessStudents) {
            $reply = $this->tryHandleChatbotStudentCountQuery($normalized, $turmasVinculadas);
            if ($reply !== null) {
                return $reply;
            }

            $reply = $this->tryHandleChatbotStudentsByTurmaQuery($message, $normalized, $turmasVinculadas);
            if ($reply !== null) {
                return $reply;
            }
        }

        $canAccessAvaliacoes = $isAdmin
            || $this->canAccessSubservice('avaliacoes')
            || $this->canAccessSubservice('cadastro_de_avaliacoes')
            || $this->canAccessSubservice('gerenciar_avaliacoes');
        if ($canAccessAvaliacoes) {
            $reply = $this->tryHandleChatbotParticipationByBlocoQuery($message, $normalized);
            if ($reply !== null) {
                return $reply;
            }

            $reply = $this->tryHandleChatbotAvaliacaoHowToQuery($normalized, $isAdmin);
            if ($reply !== null) {
                return $reply;
            }

            $reply = $this->tryHandleChatbotAvaliacoesByDateQuery($message, $normalized);
            if ($reply !== null) {
                return $reply;
            }
        }

        return null;
    }

    private function tryHandleChatbotShortAck(string $normalizedMessage): ?string
    {
        $shortAcks = ['ok', 'blz', 'beleza', 'certo', 'ta bem', 'tá bem', 'entendi', 'obrigado', 'obrigada', 'valeu'];
        if (!in_array($normalizedMessage, $shortAcks, true)) {
            return null;
        }

        return 'Certo.';
    }

    private function tryHandleChatbotGroqStatusQuery(string $normalizedMessage): ?string
    {
        $asksAboutFallback = str_contains($normalizedMessage, 'fallback')
            || str_contains($normalizedMessage, 'modelo')
            || str_contains($normalizedMessage, 'groq')
            || str_contains($normalizedMessage, 'grock')
            || str_contains($normalizedMessage, 'usage')
            || str_contains($normalizedMessage, 'limite');
        if (!$asksAboutFallback) {
            return null;
        }

        $state = $this->getChatbotGroqRuntimeState();
        $primaryModel = trim((string) ($state['primary_model'] ?? ''));
        $fallbackModel = trim((string) ($state['fallback_model'] ?? ''));
        $usedModel = trim((string) ($state['used_model'] ?? ''));
        $usedFallback = !empty($state['used_fallback']);
        $lastError = trim((string) ($state['last_error'] ?? ''));
        $waitSeconds = (int) ($state['wait_seconds'] ?? 0);

        if (str_contains($normalizedMessage, 'vamos usar o fallback') || str_contains($normalizedMessage, 'usar o fallback')) {
            if ($fallbackModel === '') {
                return 'O sistema já tenta fallback automático quando o modelo principal falha, mas não há um fallback separado configurado além do padrão.';
            }

            return 'O sistema já tenta automaticamente o fallback ' . $fallbackModel . ' quando o modelo principal ' . ($primaryModel !== '' ? $primaryModel : 'da Groq') . ' está limitado.';
        }

        if (str_contains($normalizedMessage, 'usage') || str_contains($normalizedMessage, 'limite')) {
            if ($lastError !== '' && $this->isChatbotGroqRateLimitError($lastError)) {
                if ($waitSeconds > 0) {
                    return 'No momento a Groq está em rate limit. A última resposta pediu para aguardar cerca de ' . $waitSeconds . ' segundo(s).';
                }

                return 'No momento a Groq está em rate limit. O sistema tenta o fallback automaticamente quando possível.';
            }

            if ($usedModel !== '') {
                return 'No último uso da IA, o chatbot respondeu com o modelo ' . $usedModel . ($usedFallback ? ' em modo fallback.' : '.');
            }

            return 'Não há um uso recente de IA registrado nesta sessão. O modelo principal configurado é ' . ($primaryModel !== '' ? $primaryModel : 'o padrão da Groq') . '.';
        }

        if (str_contains($normalizedMessage, 'fallback') || str_contains($normalizedMessage, 'grock') || str_contains($normalizedMessage, 'groq') || str_contains($normalizedMessage, 'modelo')) {
            if ($usedModel !== '') {
                return 'Na última resposta por IA, o chatbot usou ' . $usedModel . ($usedFallback ? ' como fallback.' : ' como modelo principal.');
            }

            return 'O modelo principal configurado é ' . ($primaryModel !== '' ? $primaryModel : 'o padrão da Groq') . ($fallbackModel !== '' ? ', com fallback em ' . $fallbackModel . '.' : '.');
        }

        return null;
    }

    private function getChatbotGroqRuntimeState(): array
    {
        $state = is_array($_SESSION['chatbot_groq_state'] ?? null) ? $_SESSION['chatbot_groq_state'] : [];
        $candidates = $this->getChatbotGroqModelCandidates();

        if (!isset($state['primary_model']) && isset($candidates[0])) {
            $state['primary_model'] = $candidates[0];
        }
        if (!isset($state['fallback_model']) && isset($candidates[1])) {
            $state['fallback_model'] = $candidates[1];
        }

        return $state;
    }

    private function setChatbotGroqRuntimeState(array $state): void
    {
        $current = $this->getChatbotGroqRuntimeState();
        $_SESSION['chatbot_groq_state'] = array_merge($current, $state, [
            'updated_at' => date('c'),
        ]);
    }

    private function tryHandleChatbotStudentCountQuery(string $normalizedMessage, array $turmasVinculadas): ?string
    {
        $wantsTurmas = str_contains($normalizedMessage, 'quantas turma') || str_contains($normalizedMessage, 'qtd de turma');
        $wantsAlunos = str_contains($normalizedMessage, 'quantos alunos') || str_contains($normalizedMessage, 'qtd de alunos');
        if (!$wantsTurmas && !$wantsAlunos) {
            return null;
        }

        $year = 0;
        if (preg_match('/\b(20\d{2})\b/u', $normalizedMessage, $matches) === 1) {
            $year = (int) ($matches[1] ?? 0);
        }
        if ($year <= 0 && (str_contains($normalizedMessage, 'neste ano') || str_contains($normalizedMessage, 'esse ano') || str_contains($normalizedMessage, 'ano letivo atual'))) {
            $year = (int) date('Y');
        }
        if ($year <= 0) {
            return null;
        }

        try {
            $pdo = Database::connection();
            $parts = [];

            if ($wantsTurmas) {
                $stmt = $pdo->prepare('SELECT COUNT(*) FROM turmas WHERE ano_letivo = ?');
                $stmt->execute([$year]);
                $totalTurmas = (int) ($stmt->fetchColumn() ?: 0);
                $parts[] = 'Existem ' . $totalTurmas . ' turmas no ano letivo de ' . $year . '.';
            }

            if ($wantsAlunos) {
                $sql = 'SELECT COUNT(*) FROM alunos a JOIN turmas t ON t.id = a.turma_id WHERE a.ativo = 1 AND t.ano_letivo = ?';
                $params = [$year];
                if ($turmasVinculadas !== []) {
                    $placeholders = implode(',', array_fill(0, count($turmasVinculadas), '?'));
                    $sql .= " AND a.turma_id IN ({$placeholders})";
                    $params = array_merge($params, $turmasVinculadas);
                }
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $totalAlunos = (int) ($stmt->fetchColumn() ?: 0);
                $parts[] = 'Há ' . $totalAlunos . ' alunos ativos nesse ano letivo.';
            }

            return $parts !== [] ? implode(' ', $parts) : null;
        } catch (Throwable $e) {
            return 'Não consegui consultar as contagens agora. Motivo: ' . $this->formatChatbotToolError($e);
        }
    }

    private function tryHandleChatbotStudentsByTurmaQuery(string $rawMessage, string $normalizedMessage, array $turmasVinculadas): ?string
    {
        if (!str_contains($normalizedMessage, 'aluno') || !str_contains($normalizedMessage, 'turma')) {
            return null;
        }

        if (preg_match('/\bturma\s+([0-9]{1,3}(?:[\.\-][0-9]{1,2})?)\b/u', $rawMessage, $matches) !== 1) {
            return null;
        }

        $turmaRef = trim((string) ($matches[1] ?? ''));
        if ($turmaRef === '') {
            return null;
        }

        try {
            $pdo = Database::connection();
            $sql = 'SELECT id, nome, ano_letivo FROM turmas WHERE nome = ?';
            $params = [$turmaRef];
            if ($turmasVinculadas !== []) {
                $placeholders = implode(',', array_fill(0, count($turmasVinculadas), '?'));
                $sql .= " AND id IN ({$placeholders})";
                $params = array_merge($params, $turmasVinculadas);
            }
            $sql .= ' ORDER BY ano_letivo DESC, id DESC LIMIT 1';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $turma = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!is_array($turma)) {
                return 'Não encontrei a turma ' . $turmaRef . ' no seu escopo de acesso.';
            }

            $stmt = $pdo->prepare('SELECT nome FROM alunos WHERE ativo = 1 AND turma_id = ? ORDER BY nome ASC');
            $stmt->execute([(int) ($turma['id'] ?? 0)]);
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
            $names = array_values(array_filter(array_map(static fn($value): string => trim((string) $value), is_array($rows) ? $rows : []), static fn(string $value): bool => $value !== ''));

            $header = 'Turma ' . (string) ($turma['nome'] ?? $turmaRef) . ': ' . count($names) . ' aluno(s) ativo(s).';
            if ($names === []) {
                return $header;
            }

            return $header . "\n- " . implode("\n- ", $names);
        } catch (Throwable $e) {
            return 'Não consegui listar os alunos da turma ' . $turmaRef . '. Motivo: ' . $this->formatChatbotToolError($e);
        }
    }

    private function tryHandleChatbotAvaliacoesByDateQuery(string $rawMessage, string $normalizedMessage): ?string
    {
        if (!str_contains($normalizedMessage, 'avalia')) {
            return null;
        }

        if (preg_match('/\b(\d{2})\/(\d{2})\/(\d{4})\b/u', $rawMessage, $matches) === 1) {
            $targetDate = sprintf('%04d-%02d-%02d', (int) $matches[3], (int) $matches[2], (int) $matches[1]);
        } elseif (preg_match('/\b(\d{4})-(\d{2})-(\d{2})\b/u', $rawMessage, $matches) === 1) {
            $targetDate = sprintf('%04d-%02d-%02d', (int) $matches[1], (int) $matches[2], (int) $matches[3]);
        } else {
            return null;
        }

        try {
            $pdo = Database::connection();
            $stmt = $pdo->prepare('SELECT a.nome, a.turma, a.bimestre, a.aplicacao, a.is_recuperacao, a.is_simulado, u.nome AS autor FROM avaliacoes a LEFT JOIN usuarios u ON u.id = a.autor_id WHERE DATE(a.aplicacao) = ? ORDER BY a.aplicacao ASC, a.nome ASC LIMIT 100');
            $stmt->execute([$targetDate]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            if (!is_array($rows) || $rows === []) {
                return 'Não encontrei avaliações com aplicação em ' . date('d/m/Y', strtotime($targetDate)) . '.';
            }

            $lines = array_map(static function ($row): string {
                $nome = trim((string) ($row['nome'] ?? 'Avaliação'));
                $turma = trim((string) ($row['turma'] ?? 'Sem turma'));
                $bimestre = (int) ($row['bimestre'] ?? 0);
                $extras = [];
                if ($bimestre > 0) {
                    $extras[] = $bimestre . 'º bimestre';
                }
                if (!empty($row['is_recuperacao'])) {
                    $extras[] = 'recuperação';
                }
                if (!empty($row['is_simulado'])) {
                    $extras[] = 'simulado';
                }
                return '- ' . $nome . ' • ' . $turma . ($extras !== [] ? ' • ' . implode(' • ', $extras) : '');
            }, $rows);

            return 'Avaliações previstas para ' . date('d/m/Y', strtotime($targetDate)) . ':' . "\n" . implode("\n", $lines);
        } catch (Throwable $e) {
            return 'Não consegui consultar as avaliações dessa data. Motivo: ' . $this->formatChatbotToolError($e);
        }
    }

    private function tryHandleChatbotParticipationByBlocoQuery(string $rawMessage, string $normalizedMessage): ?string
    {
        $mentionsParticipacao = str_contains($normalizedMessage, 'particip')
            || str_contains($normalizedMessage, 'fizeram')
            || str_contains($normalizedMessage, 'realizaram');
        if (!$mentionsParticipacao || !str_contains($normalizedMessage, 'bloco')) {
            return null;
        }

        if (!str_contains($normalizedMessage, 'estudante') && !str_contains($normalizedMessage, 'aluno')) {
            return null;
        }

        if (preg_match('/\bbloco\s+(\d{1,2})\b/u', $rawMessage, $matches) !== 1) {
            return null;
        }

        $bloco = (int) ($matches[1] ?? 0);
        $ciclo = $this->extractChatbotOrdinalNumber($normalizedMessage, 'ciclo');
        $bimestre = $this->extractChatbotOrdinalNumber($normalizedMessage, 'bimestre');
        if ($bloco <= 0 || $ciclo <= 0 || $bimestre <= 0) {
            return null;
        }

        try {
            $pdo = Database::connection();
            $blocoNeedle = '%bloco ' . $bloco . '%';
            $stmt = $pdo->prepare(
                'SELECT a.id
                 FROM avaliacoes a
                 WHERE a.bimestre = ?
                   AND a.ciclo = ?
                   AND COALESCE(a.is_recuperacao, 0) = 0
                   AND (
                        LOWER(a.nome) LIKE ?
                        OR LOWER(COALESCE(a.descricao, "")) LIKE ?
                   )
                 ORDER BY a.id DESC'
            );
            $stmt->execute([$bimestre, $ciclo, $blocoNeedle, $blocoNeedle]);
            $avaliacaoIds = array_values(array_filter(array_map(
                static fn(array $row): int => (int) ($row['id'] ?? 0),
                $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []
            ), static fn(int $value): bool => $value > 0));

            if ($avaliacaoIds === []) {
                return 'Não encontrei avaliações do bloco ' . $bloco . ', ciclo ' . $ciclo . ', ' . $bimestre . 'º bimestre.';
            }

            $placeholders = implode(',', array_fill(0, count($avaliacaoIds), '?'));
            $stmt = $pdo->prepare(
                'SELECT COUNT(DISTINCT aluno_id) AS total_estudantes, COUNT(*) AS total_correcoes
                 FROM avaliacao_correcoes
                 WHERE avaliacao_id IN (' . $placeholders . ')'
            );
            $stmt->execute($avaliacaoIds);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            $totalEstudantes = (int) ($stats['total_estudantes'] ?? 0);
            $totalCorrecoes = (int) ($stats['total_correcoes'] ?? 0);
            $totalAvaliacoes = count($avaliacaoIds);

            return 'No bloco ' . $bloco . ' do ' . $ciclo . 'º ciclo do ' . $bimestre . 'º bimestre, ' . $totalEstudantes . ' estudante(s) participaram, considerando ' . $totalAvaliacoes . ' avaliação(ões) com ' . $totalCorrecoes . ' correção(ões) salva(s).';
        } catch (Throwable $e) {
            return 'Não consegui consultar a participação desse bloco agora. Motivo: ' . $this->formatChatbotToolError($e);
        }
    }

    private function extractChatbotOrdinalNumber(string $normalizedMessage, string $context): int
    {
        if (preg_match('/\b(\d{1,2})\s*(?:º|o)?\s+' . preg_quote($context, '/') . '\b/u', $normalizedMessage, $matches) === 1) {
            return (int) ($matches[1] ?? 0);
        }

        $ordinalMap = [
            'primeiro' => 1,
            'segundo' => 2,
            'terceiro' => 3,
            'quarto' => 4,
        ];
        foreach ($ordinalMap as $label => $value) {
            if (preg_match('/\b' . preg_quote($label, '/') . '\s+' . preg_quote($context, '/') . '\b/u', $normalizedMessage) === 1) {
                return $value;
            }
        }

        return 0;
    }

    private function tryHandleChatbotAvaliacaoHowToQuery(string $normalizedMessage, bool $isAdmin): ?string
    {
        $asksHowTo = str_contains($normalizedMessage, 'como cadastrar')
            || str_contains($normalizedMessage, 'como criar')
            || str_contains($normalizedMessage, 'como lançar')
            || str_contains($normalizedMessage, 'onde cadastrar');
        if (!$asksHowTo || !str_contains($normalizedMessage, 'avalia')) {
            return null;
        }

        $canEditAvaliacoes = $isAdmin
            || $this->canAccessSubservice('avaliacoes')
            || $this->canAccessSubservice('cadastro_de_avaliacoes')
            || $this->canAccessSubservice('gerenciar_avaliacoes');

        if (!$canEditAvaliacoes) {
            return 'O cadastro de avaliação é feito na tela de avaliações, em /institucional/avaliacoes, mas o botão de criação só aparece para usuários com permissão de editar avaliações.';
        }

        return 'Para cadastrar uma avaliação, acesse /institucional/avaliacoes, clique em Nova avaliação, informe pelo menos o bimestre, a data da aplicação e as turmas relacionadas, e depois clique em Salvar avaliação.';
    }

    private function buildChatbotSystemPrompt(array $user, array $turmasVinculadas): string
    {
        $nome = (string) ($user['nome'] ?? 'Usuário');
        $tipo = (string) ($user['tipo'] ?? 'usuario');

        $prompt  = "Você é o assistente da escola CEMIL - Jardenir Jorge Frederico.\n";
        $prompt .= "Seu foco é apoiar rotinas escolares, pedagógicas e administrativas com respostas práticas.\n";
        $prompt .= "Responda sempre em português brasileiro, de forma clara, objetiva e curta.\n";
        $prompt .= "Prefira respostas com no máximo 5 itens ou 1 parágrafo curto, salvo se o usuário pedir detalhes.\n";
        $prompt .= "Use formatação markdown apenas quando isso realmente ajudar na leitura.\n\n";
        $prompt .= "Usuário logado: {$nome} (tipo: {$tipo})\n";
        $prompt .= 'Data de hoje: ' . date('d/m/Y') . "\n";

        if ($turmasVinculadas !== []) {
            $prompt .= 'Turmas vinculadas ao usuário (IDs): ' . implode(', ', $turmasVinculadas) . "\n";
            $prompt .= "Ao listar alunos, filtre sempre pelas turmas vinculadas deste usuário.\n";
        }

        $prompt .= "\nUse as ferramentas disponíveis para buscar dados reais antes de responder sempre que a pergunta depender de informações do sistema.\n";
        $prompt .= "Para perguntas de contagem, total ou quantidade, prefira ferramentas de agregação e contagem em vez de listar registros completos.\n";
        $prompt .= "Quando o usuário perguntar como fazer algo no sistema, responda com o caminho da tela e os passos objetivos, sem dizer que falta ferramenta se a ação existir na interface.\n";
        $prompt .= "Nunca invente nomes, números, registros ou resultados.\n";
        $prompt .= "Quando uma ferramenta falhar, informe o motivo de forma curta e específica, sem dizer apenas que houve erro.\n";
        $prompt .= "Quando houver limitação ou ausência de dados, explique isso em uma frase e diga o que falta para concluir.\n";
        $prompt .= "Se o usuário pedir análise pedagógica, destaque primeiro os pontos principais e depois as ações sugeridas.";

        return $prompt;
    }

    private function getChatbotTools(array $user, array $turmasVinculadas): array
    {
        $isAdmin = ($user['tipo'] ?? '') === 'admin';
        $tools   = [];

        // Sempre disponível
        $tools[] = [
            'name'         => 'estatisticas_gerais',
            'description'  => 'Retorna contagens gerais: total de alunos, turmas, avaliações, usuários e refeições de hoje.',
            'input_schema' => ['type' => 'object', 'properties' => (object) []],
        ];

        $tools[] = [
            'name'         => 'listar_turmas',
            'description'  => 'Lista turmas cadastradas. Filtra por ano_letivo se informado.',
            'input_schema' => [
                'type'       => 'object',
                'properties' => [
                    'ano_letivo' => ['type' => 'integer', 'description' => 'Filtrar por ano letivo (ex: 2025)'],
                ],
            ],
        ];

        // Alunos
        if ($isAdmin || !empty($user['can_access_cadastro_de_estudantes'])) {
            $desc = 'Lista alunos cadastrados.';
            if ($turmasVinculadas !== []) {
                $desc .= ' Filtrado automaticamente para as turmas vinculadas ao usuário.';
            }

            $tools[] = [
                'name'         => 'listar_alunos',
                'description'  => $desc . ' Aceita filtro adicional por nome.',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'nome'   => ['type' => 'string',  'description' => 'Filtro parcial pelo nome'],
                        'limite' => ['type' => 'integer', 'description' => 'Máximo de resultados (padrão 50)'],
                    ],
                ],
            ];

            $descContagem = 'Conta alunos cadastrados ativos.';
            if ($turmasVinculadas !== []) {
                $descContagem .= ' Filtrado automaticamente para as turmas vinculadas ao usuário.';
            }

            $tools[] = [
                'name'         => 'contar_alunos',
                'description'  => $descContagem . ' Pode filtrar por ano_letivo, turma_id e nome.',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'ano_letivo' => ['type' => 'integer', 'description' => 'Ano letivo da turma (ex: 2026)'],
                        'turma_id'   => ['type' => 'integer', 'description' => 'ID da turma'],
                        'nome'       => ['type' => 'string', 'description' => 'Filtro parcial pelo nome do aluno'],
                    ],
                ],
            ];

            $tools[] = [
                'name'         => 'buscar_aluno',
                'description'  => 'Busca um aluno pelo ID ou matrícula.',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'id'        => ['type' => 'integer', 'description' => 'ID do aluno'],
                        'matricula' => ['type' => 'string',  'description' => 'Matrícula'],
                    ],
                ],
            ];
        }

        // Avaliações
        if ($isAdmin
            || $this->canAccessSubservice('avaliacoes')
            || $this->canAccessSubservice('cadastro_de_avaliacoes')
        ) {
            $tools[] = [
                'name'         => 'listar_avaliacoes',
                'description'  => 'Lista avaliações cadastradas. Pode filtrar por bimestre e por data de aplicação.',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'bimestre' => [
                            'anyOf' => [
                                ['type' => 'integer'],
                                ['type' => 'string'],
                            ],
                            'description' => '1, 2, 3 ou 4',
                        ],
                        'aplicacao' => ['type' => 'string', 'description' => 'Data de aplicação no formato YYYY-MM-DD'],
                    ],
                ],
            ];
        }

        // Correções / Corretor de Gabaritos
        if ($isAdmin || !empty($user['can_access_corretor_de_gabaritos'])) {
            $tools[] = [
                'name'         => 'listar_correcoes',
                'description'  => 'Lista correções de avaliações. Filtra por avaliacao_id e/ou aluno_id.',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'avaliacao_id' => ['type' => 'integer'],
                        'aluno_id'     => ['type' => 'integer'],
                    ],
                ],
            ];
        }

        // Notas / Desempenho
        if ($isAdmin
            || $this->canAccessSubservice('notas_desempenho')
            || $this->canAccessSubservice('notas_e_desempenho')
        ) {
            $tools[] = [
                'name'         => 'desempenho_aluno',
                'description'  => 'Retorna notas e desempenho de um aluno pelo ID.',
                'input_schema' => [
                    'type'       => 'object',
                    'required'   => ['aluno_id'],
                    'properties' => [
                        'aluno_id' => ['type' => 'integer'],
                    ],
                ],
            ];
        }

        // Refeitório
        if ($isAdmin
            || $this->canAccessSubservice('refeitorio')
            || $this->canAccessSubservice('controle_de_refeitorio')
        ) {
            $tools[] = [
                'name'         => 'resumo_refeitorio',
                'description'  => 'Resumo de consumo do refeitório em uma data (padrão: hoje).',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'data' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                    ],
                ],
            ];

            $tools[] = [
                'name'         => 'relatorio_refeitorio',
                'description'  => 'Relatório de refeições em um período.',
                'input_schema' => [
                    'type'       => 'object',
                    'required'   => ['data_inicio', 'data_fim'],
                    'properties' => [
                        'data_inicio' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                        'data_fim'    => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                        'turma_id'    => ['type' => 'integer'],
                    ],
                ],
            ];
        }

        // Agendamento
        if ($isAdmin
            || $this->canAccessSubservice('agendamento')
            || $this->canAccessSubservice('meus_agendamentos')
        ) {
            $tools[] = [
                'name'         => 'listar_reservas',
                'description'  => 'Lista reservas de agendamento. Filtra por período.',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'data_inicio' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                        'data_fim'    => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                    ],
                ],
            ];
        }

        // Admin exclusivo
        if ($isAdmin) {
            $tools[] = [
                'name'         => 'listar_usuarios',
                'description'  => 'Lista usuários do sistema. Filtra por tipo.',
                'input_schema' => [
                    'type'       => 'object',
                    'properties' => [
                        'tipo' => ['type' => 'string', 'description' => 'Tipo do usuário (admin, servidor, etc.)'],
                    ],
                ],
            ];
        }

        return $tools;
    }

    private function chatbotToolUseLoop(array $messages, array $tools, string $system, array $turmasVinculadas): string
    {
        $messages = $this->normalizeChatbotMessagesForGroq($messages, $system);
        $tools    = $this->normalizeChatbotToolsForGroq($tools);
        $maxIter = 8;

        for ($i = 0; $i < $maxIter; $i++) {
            $response = $this->callGroqApi($messages, $tools);

            $responseError = trim((string) ($response['_error'] ?? ''));
            if ($responseError !== '') {
                return $responseError;
            }

            $choice   = is_array($response['choices'][0] ?? null) ? $response['choices'][0] : [];
            $message  = is_array($choice['message'] ?? null) ? $choice['message'] : [];
            $content  = trim((string) ($message['content'] ?? ''));
            $toolCalls = is_array($message['tool_calls'] ?? null) ? $message['tool_calls'] : [];

            $assistantMessage = ['role' => 'assistant'];
            if ($content !== '') {
                $assistantMessage['content'] = $content;
            }
            if ($toolCalls !== []) {
                $assistantMessage['tool_calls'] = $toolCalls;
            }
            $messages[] = $assistantMessage;

            if ($toolCalls === []) {
                return $content;
            }

            foreach ($toolCalls as $toolCall) {
                $toolName = (string) ($toolCall['function']['name'] ?? '');
                $rawArguments = (string) ($toolCall['function']['arguments'] ?? '{}');
                $toolInput = json_decode($rawArguments, true);
                $toolResult = '';

                $toolCallId = trim((string) ($toolCall['id'] ?? ''));
                if ($toolCallId === '' || $toolName === '') {
                    continue;
                }

                if (!is_array($toolInput)) {
                    $toolResult = json_encode([
                        'erro' => 'Falha ao interpretar os argumentos da ferramenta ' . $toolName . '.',
                        'detalhe' => 'O modelo enviou parâmetros em formato inválido.',
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    $toolResult = $this->executeChatbotTool($toolName, $toolInput, $turmasVinculadas);
                }

                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $toolCallId,
                    'content' => $toolResult,
                ];
            }
        }

        return 'Limite de operações atingido. Por favor, refaça a pergunta de forma mais específica.';
    }

    private function normalizeChatbotMessagesForGroq(array $messages, string $system): array
    {
        $normalized = [
            ['role' => 'system', 'content' => $system],
        ];

        foreach ($messages as $message) {
            $role = (string) ($message['role'] ?? '');
            $content = $message['content'] ?? '';

            if (($role !== 'user' && $role !== 'assistant') || !is_string($content) || trim($content) === '') {
                continue;
            }

            $normalized[] = [
                'role' => $role,
                'content' => trim($content),
            ];
        }

        return $normalized;
    }

    private function normalizeChatbotToolsForGroq(array $tools): array
    {
        $normalized = [];

        foreach ($tools as $tool) {
            $name = trim((string) ($tool['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $parameters = is_array($tool['input_schema'] ?? null) ? $tool['input_schema'] : ['type' => 'object', 'properties' => new stdClass()];
            if (!isset($parameters['type'])) {
                $parameters['type'] = 'object';
            }
            if (!isset($parameters['properties']) || !is_array($parameters['properties'])) {
                $parameters['properties'] = new stdClass();
            }

            $normalized[] = [
                'type' => 'function',
                'function' => [
                    'name' => $name,
                    'description' => (string) ($tool['description'] ?? ''),
                    'parameters' => $parameters,
                ],
            ];
        }

        return $normalized;
    }

    private function executeChatbotTool(string $name, array $input, array $turmaIds): string
    {
        try {
            $pdo = Database::connection();

            switch ($name) {
                case 'estatisticas_gerais':
                    $stats = [];
                    foreach ([
                        'alunos_total'  => 'SELECT COUNT(*) FROM alunos',
                        'alunos_ativos' => 'SELECT COUNT(*) FROM alunos WHERE ativo = 1',
                        'turmas'        => 'SELECT COUNT(*) FROM turmas',
                        'avaliacoes'    => 'SELECT COUNT(*) FROM avaliacoes',
                        'usuarios'      => 'SELECT COUNT(*) FROM usuarios',
                    ] as $key => $sql) {
                        try {
                            $stats[$key] = (int) ($pdo->query($sql)?->fetchColumn() ?: 0);
                        } catch (Throwable) {
                            $stats[$key] = null;
                        }
                    }

                    try {
                        $stats['refeicoes_hoje'] = (int) ($pdo->query(
                            "SELECT COUNT(*) FROM refeitorio_registros WHERE data = CURDATE()"
                        )?->fetchColumn() ?: 0);
                    } catch (Throwable) {
                        $stats['refeicoes_hoje'] = null;
                    }

                    return json_encode($stats, JSON_UNESCAPED_UNICODE);

                case 'listar_turmas':
                    $anoLetivo = (int) ($input['ano_letivo'] ?? 0);
                    $sql    = 'SELECT id, nome, ano_letivo, turno, capacidade, ano_escolar FROM turmas WHERE 1=1';
                    $params = [];
                    if ($anoLetivo > 0) {
                        $sql .= ' AND ano_letivo = ?';
                        $params[] = $anoLetivo;
                    }

                    $sql .= ' ORDER BY ano_letivo DESC, nome ASC';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE);

                case 'listar_alunos':
                    $nome   = trim((string) ($input['nome']   ?? ''));
                    $limite = max(1, min(200, (int) ($input['limite'] ?? 50)));
                    $sql    = 'SELECT id, nome, matricula, turma_id, turma, data_nascimento, responsavel, telefone, email FROM alunos WHERE ativo = 1';
                    $params = [];

                    if ($turmaIds !== []) {
                        $placeholders = implode(',', array_fill(0, count($turmaIds), '?'));
                        $sql    .= " AND turma_id IN ({$placeholders})";
                        $params  = array_merge($params, $turmaIds);
                    }

                    if ($nome !== '') {
                        $sql .= ' AND nome LIKE ?';
                        $params[] = "%{$nome}%";
                    }

                    $sql .= ' ORDER BY nome ASC LIMIT ?';
                    $params[] = $limite;
                    $stmt     = $pdo->prepare($sql);
                    $stmt->execute($params);
                    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE);

                case 'contar_alunos':
                    $anoLetivo = (int) ($input['ano_letivo'] ?? 0);
                    $turmaId   = (int) ($input['turma_id'] ?? 0);
                    $nome      = trim((string) ($input['nome'] ?? ''));
                    $sql       = 'SELECT COUNT(*) AS total FROM alunos a LEFT JOIN turmas t ON t.id = a.turma_id WHERE a.ativo = 1';
                    $params    = [];

                    if ($turmaIds !== []) {
                        $placeholders = implode(',', array_fill(0, count($turmaIds), '?'));
                        $sql .= " AND a.turma_id IN ({$placeholders})";
                        $params = array_merge($params, $turmaIds);
                    }

                    if ($anoLetivo > 0) {
                        $sql .= ' AND t.ano_letivo = ?';
                        $params[] = $anoLetivo;
                    }

                    if ($turmaId > 0) {
                        $sql .= ' AND a.turma_id = ?';
                        $params[] = $turmaId;
                    }

                    if ($nome !== '') {
                        $sql .= ' AND a.nome LIKE ?';
                        $params[] = "%{$nome}%";
                    }

                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $total = (int) ($stmt->fetchColumn() ?: 0);
                    return json_encode([
                        'total' => $total,
                        'filtros' => [
                            'ano_letivo' => $anoLetivo > 0 ? $anoLetivo : null,
                            'turma_id' => $turmaId > 0 ? $turmaId : null,
                            'nome' => $nome !== '' ? $nome : null,
                        ],
                    ], JSON_UNESCAPED_UNICODE);

                case 'buscar_aluno':
                    $id        = (int)    ($input['id']        ?? 0);
                    $matricula = trim((string) ($input['matricula'] ?? ''));

                    if ($id > 0) {
                        $stmt = $pdo->prepare('SELECT id, nome, matricula, turma_id, turma, data_nascimento, responsavel, telefone, email FROM alunos WHERE id = ? AND ativo = 1 LIMIT 1');
                        $stmt->execute([$id]);
                    } elseif ($matricula !== '') {
                        $stmt = $pdo->prepare('SELECT id, nome, matricula, turma_id, turma, data_nascimento, responsavel, telefone, email FROM alunos WHERE matricula = ? AND ativo = 1 LIMIT 1');
                        $stmt->execute([$matricula]);
                    } else {
                        return json_encode(['erro' => 'Informe id ou matricula.']);
                    }

                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    return json_encode($row ?: ['erro' => 'Aluno não encontrado.'], JSON_UNESCAPED_UNICODE);

                case 'listar_avaliacoes':
                    $bimestre = (int) ($input['bimestre'] ?? 0);
                    $aplicacao = trim((string) ($input['aplicacao'] ?? ''));
                    $sql      = 'SELECT a.id, a.nome, a.bimestre, a.aplicacao, a.turma, a.is_recuperacao, a.is_simulado, u.nome AS autor FROM avaliacoes a LEFT JOIN usuarios u ON u.id = a.autor_id WHERE 1=1';
                    $params   = [];
                    if ($bimestre > 0) {
                        $sql .= ' AND a.bimestre = ?';
                        $params[] = $bimestre;
                    }
                    if ($aplicacao !== '') {
                        $sql .= ' AND DATE(a.aplicacao) = ?';
                        $params[] = $aplicacao;
                    }

                    $sql .= ' ORDER BY a.aplicacao DESC, a.created_at DESC LIMIT 100';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE);

                case 'listar_correcoes':
                    $avalId  = (int) ($input['avaliacao_id'] ?? 0);
                    $alunoId = (int) ($input['aluno_id']     ?? 0);
                    $sql     = 'SELECT ac.id, ac.avaliacao_id, ac.aluno_id, al.nome AS aluno_nome, av.nome AS avaliacao_nome FROM avaliacao_correcoes ac JOIN alunos al ON al.id = ac.aluno_id AND al.ativo = 1 JOIN avaliacoes av ON av.id = ac.avaliacao_id WHERE 1=1';
                    $params  = [];
                    if ($avalId  > 0) { $sql .= ' AND ac.avaliacao_id = ?'; $params[] = $avalId; }
                    if ($alunoId > 0) { $sql .= ' AND ac.aluno_id = ?';     $params[] = $alunoId; }
                    $sql .= ' LIMIT 100';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE);

                case 'desempenho_aluno':
                    $alunoId = (int) ($input['aluno_id'] ?? 0);
                    if ($alunoId <= 0) {
                        return json_encode(['erro' => 'aluno_id inválido.']);
                    }

                    $stmt = $pdo->prepare('SELECT id, nome, matricula, turma, desempenho FROM alunos WHERE id = ? AND ativo = 1 LIMIT 1');
                    $stmt->execute([$alunoId]);
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (!$row) {
                        return json_encode(['erro' => 'Aluno não encontrado.']);
                    }

                    try {
                        $row['desempenho'] = json_decode((string) ($row['desempenho'] ?? ''), true) ?? [];
                    } catch (Throwable) {
                    }

                    return json_encode($row, JSON_UNESCAPED_UNICODE);

                case 'resumo_refeitorio':
                    $data = trim((string) ($input['data'] ?? '')) ?: date('Y-m-d');
                    $stmt = $pdo->prepare(
                        'SELECT t.nome AS refeicao, COUNT(r.id) AS total FROM refeitorio_tipos_refeicao t LEFT JOIN refeitorio_registros r ON r.tipo_refeicao_id = t.id AND r.data = ? WHERE t.ativo = 1 GROUP BY t.id, t.nome ORDER BY t.horario_ini'
                    );
                    $stmt->execute([$data]);
                    return json_encode(['data' => $data, 'resumo' => $stmt->fetchAll(PDO::FETCH_ASSOC)], JSON_UNESCAPED_UNICODE);

                case 'relatorio_refeitorio':
                    $ini     = trim((string) ($input['data_inicio'] ?? ''));
                    $fim     = trim((string) ($input['data_fim']    ?? ''));
                    $turmaId = (int) ($input['turma_id'] ?? 0);
                    if ($ini === '' || $fim === '') {
                        return json_encode(['erro' => 'data_inicio e data_fim são obrigatórios.']);
                    }

                    $sql    = 'SELECT r.data, r.horario, a.nome AS aluno, a.turma, t.nome AS refeicao, r.obs FROM refeitorio_registros r JOIN alunos a ON a.id = r.aluno_id AND a.ativo = 1 JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id WHERE r.data BETWEEN ? AND ?';
                    $params = [$ini, $fim];
                    if ($turmaId > 0) { $sql .= ' AND a.turma_id = ?'; $params[] = $turmaId; }
                    $sql .= ' ORDER BY r.data DESC, r.horario DESC LIMIT 500';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    return json_encode(['periodo' => "{$ini} a {$fim}", 'total' => count($rows), 'registros' => $rows], JSON_UNESCAPED_UNICODE);

                case 'listar_reservas':
                    $ini    = trim((string) ($input['data_inicio'] ?? ''));
                    $fim    = trim((string) ($input['data_fim']    ?? ''));
                    $sql    = 'SELECT r.id, i.nome AS item, r.responsavel_nome, r.inicio, r.fim, r.observacao FROM agendamento_reservas r JOIN agendamento_itens i ON i.id = r.item_id WHERE 1=1';
                    $params = [];
                    if ($ini !== '') { $sql .= ' AND r.inicio >= ?'; $params[] = $ini; }
                    if ($fim !== '') { $sql .= ' AND r.fim <= ?';    $params[] = $fim . ' 23:59:59'; }
                    $sql .= ' ORDER BY r.inicio ASC LIMIT 100';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE);

                case 'listar_usuarios':
                    $tipo   = trim((string) ($input['tipo'] ?? ''));
                    $sql    = 'SELECT id, nome, usuario, email, tipo, departamento FROM usuarios WHERE 1=1';
                    $params = [];
                    if ($tipo !== '') { $sql .= ' AND tipo = ?'; $params[] = $tipo; }
                    $sql .= ' ORDER BY nome ASC LIMIT 100';
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE);

                default:
                    return json_encode(['erro' => "Ferramenta '{$name}' não reconhecida."]);
            }
        } catch (Throwable $e) {
            return json_encode([
                'erro' => 'Falha na ferramenta ' . $name . '.',
                'detalhe' => $this->formatChatbotToolError($e),
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    private function formatChatbotToolError(Throwable $e): string
    {
        $message = trim($e->getMessage());
        if ($message === '') {
            return 'Erro interno sem mensagem detalhada.';
        }

        $message = preg_replace('/\s+/', ' ', $message);
        if (!is_string($message) || $message === '') {
            return 'Erro interno sem mensagem detalhada.';
        }

        if (stripos($message, 'SQLSTATE') !== false) {
            return $message;
        }

        return mb_substr($message, 0, 220);
    }

    private function callGroqApi(array $messages, array $tools): array
    {
        $apiKey = $this->getChatbotApiKey();
        if ($apiKey === '') {
            $this->setChatbotGroqRuntimeState([
                'last_error' => 'A chave da Groq não está configurada no servidor.',
                'used_model' => '',
                'used_fallback' => false,
                'wait_seconds' => 0,
            ]);
            return ['_error' => 'A chave da Groq não está configurada no servidor.'];
        }

        $lastError = 'Falha ao consultar a Groq.';
        $models = $this->getChatbotGroqModelCandidates();
        foreach ($models as $index => $model) {
            $result = $this->performChatbotGroqRequest($apiKey, $model, $messages, $tools);
            if (!isset($result['_error'])) {
                $this->setChatbotGroqRuntimeState([
                    'last_error' => '',
                    'used_model' => $model,
                    'used_fallback' => $index > 0,
                    'wait_seconds' => 0,
                    'primary_model' => $models[0] ?? $model,
                    'fallback_model' => $models[1] ?? '',
                ]);
                return $result;
            }

            $lastError = trim((string) ($result['_error'] ?? $lastError));
            $this->setChatbotGroqRuntimeState([
                'last_error' => $lastError,
                'used_model' => $model,
                'used_fallback' => $index > 0,
                'wait_seconds' => $this->extractChatbotGroqWaitSeconds($lastError),
                'primary_model' => $models[0] ?? $model,
                'fallback_model' => $models[1] ?? '',
            ]);
            if (!$this->isChatbotGroqRateLimitError($lastError)) {
                return ['_error' => $lastError];
            }
        }

        return ['_error' => $lastError];
    }

    private function getChatbotGroqModelCandidates(): array
    {
        $candidates = [
            app_env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
            app_env('GROQ_FALLBACK_MODEL', 'llama-3.1-8b-instant'),
            'llama-3.1-8b-instant',
        ];

        $models = [];
        foreach ($candidates as $candidate) {
            $model = trim((string) $candidate);
            if ($model === '' || in_array($model, $models, true)) {
                continue;
            }
            $models[] = $model;
        }

        return $models;
    }

    private function performChatbotGroqRequest(string $apiKey, string $model, array $messages, array $tools): array
    {
        $payload = json_encode([
            'model' => $model,
            'temperature' => 0.1,
            'max_tokens' => 700,
            'messages' => $messages,
            'tools' => $tools,
            'tool_choice' => 'auto',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!is_string($payload) || $payload === '') {
            return ['_error' => 'Falha ao montar a requisição do assistente.'];
        }

        $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
        ]);

        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return ['_error' => $curlError !== '' ? ('Falha ao consultar a Groq: ' . $curlError) : 'Falha ao consultar a Groq.'];
        }

        if ($code < 200 || $code >= 300) {
            return ['_error' => $this->extractChatbotGroqErrorMessage((string) $raw, $code)];
        }

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            return ['_error' => 'A resposta da Groq não pôde ser interpretada.'];
        }

        return $decoded;
    }

    private function isChatbotGroqRateLimitError(string $message): bool
    {
        return stripos($message, 'rate limit') !== false;
    }

    private function extractChatbotGroqWaitSeconds(string $message): int
    {
        if (preg_match('/cerca de\s+(\d+)\s+segundos?/i', $message, $matches) === 1) {
            return (int) ($matches[1] ?? 0);
        }

        if (preg_match('/try again in\s+([0-9.]+)s/i', $message, $matches) === 1) {
            return (int) ceil((float) ($matches[1] ?? 0));
        }

        return 0;
    }

    private function extractChatbotGroqErrorMessage(string $response, int $statusCode): string
    {
        $decoded = json_decode($response, true);
        $message = '';
        if (is_array($decoded)) {
            $message = trim((string) ($decoded['error']['message'] ?? $decoded['message'] ?? ''));
        }

        if ($message !== '' && stripos($message, 'rate limit') !== false) {
            $waitSeconds = 0.0;
            if (preg_match('/try again in\s+([0-9.]+)s/i', $message, $matches) === 1) {
                $waitSeconds = (float) ($matches[1] ?? 0);
            }

            if ($waitSeconds > 0) {
                return 'A Groq atingiu o limite momentâneo de uso. Tente novamente em cerca de ' . (string) ceil($waitSeconds) . ' segundos.';
            }

            return 'A Groq atingiu o limite momentâneo de uso. Tente novamente em instantes.';
        }

        if ($message !== '') {
            return 'Falha ao consultar a Groq: ' . $message;
        }

        return 'Falha ao consultar a Groq. Erro HTTP ' . $statusCode . '.';
    }

    private function getChatbotApiKey(): string
    {
        foreach ([
            app_env('GROQ_API_KEY', null),
            app_env('APIKEY_GROQ', null),
            app_env('API_KEY_GROQ', null),
            app_env('GROQ_KEY', null),
        ] as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return '';
    }

    protected function isAjaxRequest(): bool
    {
        $requestedWith = strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));

        return $requestedWith === 'xmlhttprequest';
    }

    protected function respondJson(array $payload, int $statusCode = 200): void
    {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=UTF-8');
        }

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
