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
            'can_access_cadastro_de_alunos' => $this->canAccessSubserviceByRules($authType, $rawServices, 'cadastro_de_alunos'),
            'can_access_corretor_de_gabaritos' => $this->canAccessSubserviceByRules($authType, $rawServices, 'corretor_de_gabaritos'),
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
