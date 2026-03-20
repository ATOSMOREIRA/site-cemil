<?php
declare(strict_types=1);

class AdminController extends HomeController
{
    private function isCurrentUserAdmin(): bool
    {
        return $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? '')) === 'admin';
    }

    private function canAccessAvaliacoesManagement(): bool
    {
        if ($this->isCurrentUserAdmin()) {
            return true;
        }

        if ($this->canAccessSubservice('avaliacoes')
            || $this->canAccessSubservice('cadastro_de_avaliacoes')
            || $this->canAccessSubservice('gerenciar_avaliacoes')) {
            return true;
        }

        $currentUserId = $this->getCurrentAuthUserId();
        if ($currentUserId <= 0) {
            return false;
        }

        try {
            $avaliacaoModel = new AvaliacaoModel();
            return $avaliacaoModel->hasAccessibleAvaliacaoForUser($currentUserId);
        } catch (Throwable) {
            return false;
        }
    }

    private function getCurrentAuthUserId(): int
    {
        return (int) ($_SESSION['auth']['id'] ?? 0);
    }

    private function canEditAvaliacoesManagement(): bool
    {
        return $this->isCurrentUserAdmin()
            || $this->canAccessSubservice('avaliacoes')
            || $this->canAccessSubservice('cadastro_de_avaliacoes')
            || $this->canAccessSubservice('gerenciar_avaliacoes');
    }

    private function canManageOwnedAvaliacao(?array $avaliacao): bool
    {
        if (!is_array($avaliacao)) {
            return false;
        }

        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        if ($authType === 'admin') {
            return true;
        }

        $currentUserId = $this->getCurrentAuthUserId();
        $ownerId = (int) ($avaliacao['autor_id'] ?? 0);

        return $currentUserId > 0 && $ownerId > 0 && $ownerId === $currentUserId;
    }

    private function canAccessAvaliacaoCorrecao(?array $avaliacao): bool
    {
        if (!is_array($avaliacao)) {
            return false;
        }

        if ($this->canManageOwnedAvaliacao($avaliacao)) {
            return true;
        }

        $currentUserId = $this->getCurrentAuthUserId();
        $aplicadoresIds = is_array($avaliacao['aplicadores_relacionados_ids'] ?? null)
            ? $avaliacao['aplicadores_relacionados_ids']
            : [];

        if ($aplicadoresIds === []) {
            $aplicadorId = (int) ($avaliacao['aplicador_id'] ?? 0);
            if ($aplicadorId > 0) {
                $aplicadoresIds = [$aplicadorId];
            }
        }

        return $currentUserId > 0 && in_array($currentUserId, $aplicadoresIds, true);
    }

    private function getAvaliacaoAplicadoresOptions(): array
    {
        try {
            $pdo = Database::connection();
            $rows = $pdo->query('SELECT id, nome, usuario, email FROM usuarios ORDER BY nome ASC')?->fetchAll() ?: [];
        } catch (Throwable) {
            $rows = [];
        }

        $options = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            if ($id <= 0) {
                continue;
            }

            $nome = trim((string) ($row['nome'] ?? ''));
            if ($nome === '') {
                $nome = trim((string) ($row['usuario'] ?? ''));
            }
            if ($nome === '') {
                $nome = trim((string) ($row['email'] ?? ''));
            }

            if ($nome === '') {
                continue;
            }

            $options[] = [
                'id' => $id,
                'nome' => $nome,
            ];
        }

        return $options;
    }

    private function getAvaliacoesRedirectPath(): string
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        return $authType === 'admin' ? '/paineladministrativo' : '/institucional/avaliacoes';
    }

    public function painelAdministrativo(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));

        if ($authType !== 'admin') {
            $this->redirect('/404');
        }

        $this->ensureAdminSessionServicesCleanup();

        $this->render('home/paineladministrativo', [
            'schoolName' => SCHOOL_NAME,
        ]);
    }

    public function painelAdministrativoModalConteudo(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));

        if ($authType !== 'admin') {
            $this->redirect('/404');
        }

        $this->ensureAdminSessionServicesCleanup();

        $viewKey = $this->normalizePermissionToken((string) ($_GET['view'] ?? ''));

        $allowedViews = [
            'gerenciamento_usuarios' => 'gerenciamento-usuarios.html',
            'gerenciamento_servicos_subservicos' => 'gerenciamento-servicos-subservicos.html',
            'gerenciamento_informacoes' => 'gerenciamento-informacoes.html',
            'gerenciamento_avaliacoes' => 'gerenciamento-avaliacoes.html',
            'gerenciamento_turmas' => 'gerenciamento-turmas.html',
            'gerenciamento_alunos' => 'gerenciamento-alunos.html',
            'ferramentas_administrativas' => 'ferramentas-administrativas.html',
        ];

        if (!isset($allowedViews[$viewKey])) {
            $this->redirect('/404');
        }

        $filePath = __DIR__ . '/../views/home/Painel Administrativo/' . $allowedViews[$viewKey];

        if (!is_file($filePath)) {
            $this->redirect('/404');
        }

        if (!headers_sent()) {
            header('Content-Type: text/html; charset=UTF-8');
        }

        if ($viewKey === 'gerenciamento_usuarios') {
            $csrfToken = $this->ensureCsrfToken();
            $adminUsersSuccess = (string) ($_SESSION['admin_users_success'] ?? '');
            $adminUsersError = (string) ($_SESSION['admin_users_error'] ?? '');
            unset($_SESSION['admin_users_success'], $_SESSION['admin_users_error']);
            $hasUserCargaHorariaColumn = $this->hasUsuariosColumn('cargaHoraria');

            $departments = $this->getAdminDepartments();
            $functions = $this->getAdminFunctions();
            $servicesData = $this->getAdminServicesAndSubservices();

            $this->renderAdminModalFile($filePath, [
                'csrfToken' => $csrfToken,
                'adminUsersSuccess' => $adminUsersSuccess,
                'adminUsersError' => $adminUsersError,
                'adminUsers' => $this->getAdminUsers($departments, $functions),
                'adminUsersHasCargaHoraria' => $hasUserCargaHorariaColumn,
                'adminDepartments' => $departments,
                'adminFunctions' => $functions,
                'adminUserTypes' => ['admin', 'servidor', 'aluno'],
                'adminServiceOptions' => $servicesData['services'],
                'adminSubserviceOptions' => $servicesData['subservices'],
            ]);
            exit;
        }

        if ($viewKey === 'gerenciamento_servicos_subservicos') {
            $csrfToken = $this->ensureCsrfToken();
            $servicesData = $this->getAdminServicesAndSubservices();

            $this->renderAdminModalFile($filePath, [
                'csrfToken' => $csrfToken,
                'adminServices' => $servicesData['services'],
                'adminSubservices' => $servicesData['subservices'],
                'adminServiceOptions' => $servicesData['services'],
            ]);
            exit;
        }

        if ($viewKey === 'gerenciamento_informacoes') {
            $csrfToken = $this->ensureCsrfToken();
            $informacaoModel = new InformacaoModel();

            try {
                $this->migrateInformacoesMediaNaming($informacaoModel);
                $posts = $informacaoModel->getAllOrderedByInsertionDate();
            } catch (Throwable) {
                $posts = [];
            }

            $this->renderAdminModalFile($filePath, [
                'csrfToken' => $csrfToken,
                'informacoesPosts' => $posts,
            ]);
            exit;
        }

        if ($viewKey === 'gerenciamento_avaliacoes') {
            $csrfToken = $this->ensureCsrfToken();
            $avaliacaoModel = new AvaliacaoModel();
            $turmaModel = new TurmaModel();

            try {
                $avaliacoes = $avaliacaoModel->getAllOrdered();
            } catch (Throwable) {
                $avaliacoes = [];
            }

            try {
                $turmas = $turmaModel->getSimpleOptions();
            } catch (Throwable) {
                $turmas = [];
            }

            $this->renderAdminModalFile($filePath, [
                'csrfToken' => $csrfToken,
                'avaliacoes' => $avaliacoes,
                'turmas' => $turmas,
                'usuariosAplicadores' => $this->getAvaliacaoAplicadoresOptions(),
            ]);
            exit;
        }

        $this->renderAdminModalFile($filePath);
        exit;
    }

    public function painelAdministrativoUsuariosSalvar(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        $isAjax = $this->isAjaxRequest();

        if ($authType !== 'admin' || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $_SESSION['admin_users_error'] = 'Sessão inválida. Atualize a página e tente novamente.';
            $this->redirect('/paineladministrativo');
        }

        $userId = (int) ($_POST['id'] ?? 0);
        $nome = trim((string) ($_POST['nome'] ?? ''));
        $usuario = trim((string) ($_POST['usuario'] ?? ''));
        $email = trim((string) ($_POST['email'] ?? ''));
        $cpf = trim((string) ($_POST['cpf'] ?? ''));
        $senha = (string) ($_POST['senha'] ?? '');
        $tipo = $this->normalizePermissionToken((string) ($_POST['tipo'] ?? ''));
        $departamentoId = (int) ($_POST['departamento'] ?? 0);
        $funcaoId = (int) ($_POST['funcao'] ?? 0);
        $rawCargaHoraria = trim((string) ($_POST['cargaHoraria'] ?? ''));
        $rawServicesPayload = (string) ($_POST['servicos'] ?? '');
        $hasCargaHorariaColumn = $this->hasUsuariosColumn('cargaHoraria');

        $allowedTypes = ['admin', 'servidor', 'aluno'];
        $finalServicos = '';

        $existingUser = null;

        if ($userId > 0) {
            try {
                $pdo = Database::connection();
                $existingSql = $hasCargaHorariaColumn
                    ? 'SELECT id, tipo, departamento, funcao, nome, usuario, email, servicos, cargaHoraria, cpf_encrypted, cpf_hash FROM usuarios WHERE id = :id LIMIT 1'
                    : 'SELECT id, tipo, departamento, funcao, nome, usuario, email, servicos, cpf_encrypted, cpf_hash FROM usuarios WHERE id = :id LIMIT 1';
                $existingUserStatement = $pdo->prepare($existingSql);
                $existingUserStatement->execute(['id' => $userId]);
                $existingRow = $existingUserStatement->fetch();
                $existingUser = is_array($existingRow) ? $existingRow : null;
            } catch (Throwable) {
                $existingUser = null;
            }

            if ($existingUser === null) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Usuário não encontrado.'], 404);
                }

                $_SESSION['admin_users_error'] = 'Usuário não encontrado.';
                $this->redirect('/paineladministrativo');
            }
        }

        $finalNome = $userId > 0 && $nome === '' ? (string) ($existingUser['nome'] ?? '') : $nome;
        $finalUsuario = $userId > 0 && $usuario === '' ? (string) ($existingUser['usuario'] ?? '') : $usuario;
        $finalEmail = $userId > 0 && $email === '' ? (string) ($existingUser['email'] ?? '') : $email;
        $finalTipo = $userId > 0 && !in_array($tipo, $allowedTypes, true)
            ? $this->normalizePermissionToken((string) ($existingUser['tipo'] ?? 'aluno'))
            : $tipo;
        $finalDepartamentoId = $userId > 0 && $departamentoId <= 0
            ? (int) ($existingUser['departamento'] ?? 0)
            : $departamentoId;
        $finalFuncaoId = $userId > 0 && $funcaoId <= 0
            ? (int) ($existingUser['funcao'] ?? 0)
            : $funcaoId;
        $finalCargaHoraria = $userId > 0 && $rawCargaHoraria === ''
            ? max(0, (int) ($existingUser['cargaHoraria'] ?? 40))
            : ($rawCargaHoraria === '' ? 40 : filter_var($rawCargaHoraria, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]));

        if ($finalNome === '' || $finalUsuario === '' || $finalEmail === '' || !in_array($finalTipo, $allowedTypes, true) || $finalDepartamentoId <= 0 || $finalFuncaoId <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Preencha todos os campos obrigatórios.'], 422);
            }

            $_SESSION['admin_users_error'] = 'Preencha todos os campos obrigatórios.';
            $this->redirect('/paineladministrativo');
        }

        if ($hasCargaHorariaColumn && $finalCargaHoraria === false) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Informe uma carga horária válida.'], 422);
            }

            $_SESSION['admin_users_error'] = 'Informe uma carga horária válida.';
            $this->redirect('/paineladministrativo');
        }

        if (!filter_var($finalEmail, FILTER_VALIDATE_EMAIL)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Informe um e-mail válido.'], 422);
            }

            $_SESSION['admin_users_error'] = 'Informe um e-mail válido.';
            $this->redirect('/paineladministrativo');
        }

        try {
            $finalServicos = $this->normalizeUserServicesPayload($rawServicesPayload);
        } catch (InvalidArgumentException) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Permissões de serviços inválidas.'], 422);
            }

            $_SESSION['admin_users_error'] = 'Permissões de serviços inválidas.';
            $this->redirect('/paineladministrativo');
        }

        $finalCpfHash = $userId > 0
            ? (($existingUser['cpf_hash'] ?? null) !== null ? (string) $existingUser['cpf_hash'] : null)
            : null;
        $finalCpfEncrypted = $userId > 0
            ? (($existingUser['cpf_encrypted'] ?? null) !== null ? (string) $existingUser['cpf_encrypted'] : null)
            : null;

        if ($cpf !== '') {
            $normalizedCpf = $this->normalizeCpf($cpf);

            if ($normalizedCpf === '') {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Informe um CPF válido com 11 dígitos.'], 422);
                }

                $_SESSION['admin_users_error'] = 'Informe um CPF válido com 11 dígitos.';
                $this->redirect('/paineladministrativo');
            }

            $finalCpfHash = hash('sha256', $normalizedCpf);
            $finalCpfEncrypted = $this->encryptCpf($normalizedCpf);

            if ($finalCpfEncrypted === null) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Não foi possível proteger o CPF informado.'], 500);
                }

                $_SESSION['admin_users_error'] = 'Não foi possível proteger o CPF informado.';
                $this->redirect('/paineladministrativo');
            }
        }

        try {
            $pdo = Database::connection();
            $emailCheck = $pdo->prepare('SELECT id FROM usuarios WHERE email = :email LIMIT 1');
            $emailCheck->execute(['email' => $finalEmail]);
            $existingEmailUserId = (int) ($emailCheck->fetchColumn() ?: 0);
        } catch (Throwable) {
            $existingEmailUserId = 0;
        }

        if ($existingEmailUserId > 0 && $existingEmailUserId !== $userId) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Já existe um usuário com este e-mail.'], 409);
            }

            $_SESSION['admin_users_error'] = 'Já existe um usuário com este e-mail.';
            $this->redirect('/paineladministrativo');
        }

        if ($userId <= 0 && $senha === '') {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Informe uma senha para o novo usuário.'], 422);
            }

            $_SESSION['admin_users_error'] = 'Informe uma senha para o novo usuário.';
            $this->redirect('/paineladministrativo');
        }

        try {
            $pdo = Database::connection();

            if ($userId > 0) {
                if ($senha !== '') {
                    $hashedPassword = password_hash($senha, PASSWORD_DEFAULT);
                    $updateSql = $hasCargaHorariaColumn
                        ? 'UPDATE usuarios SET tipo = :tipo, departamento = :departamento, funcao = :funcao, nome = :nome, usuario = :usuario, email = :email, servicos = :servicos, cargaHoraria = :cargaHoraria, cpf_encrypted = :cpf_encrypted, cpf_hash = :cpf_hash, senha = :senha WHERE id = :id'
                        : 'UPDATE usuarios SET tipo = :tipo, departamento = :departamento, funcao = :funcao, nome = :nome, usuario = :usuario, email = :email, servicos = :servicos, cpf_encrypted = :cpf_encrypted, cpf_hash = :cpf_hash, senha = :senha WHERE id = :id';
                    $statement = $pdo->prepare($updateSql);
                    $params = [
                        'tipo' => $finalTipo,
                        'departamento' => (string) $finalDepartamentoId,
                        'funcao' => (string) $finalFuncaoId,
                        'nome' => $finalNome,
                        'usuario' => $finalUsuario,
                        'email' => $finalEmail,
                        'servicos' => $finalServicos,
                        'cpf_encrypted' => $finalCpfEncrypted,
                        'cpf_hash' => $finalCpfHash,
                        'senha' => $hashedPassword,
                        'id' => $userId,
                    ];
                    if ($hasCargaHorariaColumn) {
                        $params['cargaHoraria'] = (int) $finalCargaHoraria;
                    }
                    $statement->execute($params);
                } else {
                    $updateSql = $hasCargaHorariaColumn
                        ? 'UPDATE usuarios SET tipo = :tipo, departamento = :departamento, funcao = :funcao, nome = :nome, usuario = :usuario, email = :email, servicos = :servicos, cargaHoraria = :cargaHoraria, cpf_encrypted = :cpf_encrypted, cpf_hash = :cpf_hash WHERE id = :id'
                        : 'UPDATE usuarios SET tipo = :tipo, departamento = :departamento, funcao = :funcao, nome = :nome, usuario = :usuario, email = :email, servicos = :servicos, cpf_encrypted = :cpf_encrypted, cpf_hash = :cpf_hash WHERE id = :id';
                    $statement = $pdo->prepare($updateSql);
                    $params = [
                        'tipo' => $finalTipo,
                        'departamento' => (string) $finalDepartamentoId,
                        'funcao' => (string) $finalFuncaoId,
                        'nome' => $finalNome,
                        'usuario' => $finalUsuario,
                        'email' => $finalEmail,
                        'servicos' => $finalServicos,
                        'cpf_encrypted' => $finalCpfEncrypted,
                        'cpf_hash' => $finalCpfHash,
                        'id' => $userId,
                    ];
                    if ($hasCargaHorariaColumn) {
                        $params['cargaHoraria'] = (int) $finalCargaHoraria;
                    }
                    $statement->execute($params);
                }

                $_SESSION['admin_users_success'] = 'Usuário atualizado com sucesso.';

                if ($isAjax) {
                    $this->respondJson(['ok' => true, 'message' => 'Usuário atualizado com sucesso.']);
                }
            } else {
                $hashedPassword = password_hash($senha, PASSWORD_DEFAULT);
                $insertSql = $hasCargaHorariaColumn
                    ? 'INSERT INTO usuarios (tipo, departamento, funcao, nome, usuario, senha, email, servicos, cargaHoraria, cpf_encrypted, cpf_hash) VALUES (:tipo, :departamento, :funcao, :nome, :usuario, :senha, :email, :servicos, :cargaHoraria, :cpf_encrypted, :cpf_hash)'
                    : 'INSERT INTO usuarios (tipo, departamento, funcao, nome, usuario, senha, email, servicos, cpf_encrypted, cpf_hash) VALUES (:tipo, :departamento, :funcao, :nome, :usuario, :senha, :email, :servicos, :cpf_encrypted, :cpf_hash)';
                $statement = $pdo->prepare($insertSql);
                $params = [
                    'tipo' => $finalTipo,
                    'departamento' => (string) $finalDepartamentoId,
                    'funcao' => (string) $finalFuncaoId,
                    'nome' => $finalNome,
                    'usuario' => $finalUsuario,
                    'senha' => $hashedPassword,
                    'email' => $finalEmail,
                    'servicos' => $finalServicos,
                    'cpf_encrypted' => $finalCpfEncrypted,
                    'cpf_hash' => $finalCpfHash,
                ];
                if ($hasCargaHorariaColumn) {
                    $params['cargaHoraria'] = (int) $finalCargaHoraria;
                }
                $statement->execute($params);

                $_SESSION['admin_users_success'] = 'Usuário criado com sucesso.';

                if ($isAjax) {
                    $this->respondJson(['ok' => true, 'message' => 'Usuário criado com sucesso.']);
                }
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar o usuário agora.'], 500);
            }

            $_SESSION['admin_users_error'] = 'Não foi possível salvar o usuário agora.';
        }

        $this->redirect('/paineladministrativo');
    }

    public function painelAdministrativoUsuariosExcluir(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        $isAjax = $this->isAjaxRequest();

        if ($authType !== 'admin' || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $_SESSION['admin_users_error'] = 'Sessão inválida. Atualize a página e tente novamente.';
            $this->redirect('/paineladministrativo');
        }

        $userId = (int) ($_POST['id'] ?? 0);
        if ($userId <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Usuário inválido para exclusão.'], 422);
            }

            $_SESSION['admin_users_error'] = 'Usuário inválido para exclusão.';
            $this->redirect('/paineladministrativo');
        }

        $currentUserId = (int) ($_SESSION['auth']['id'] ?? 0);
        if ($currentUserId > 0 && $currentUserId === $userId) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não é permitido excluir o próprio usuário logado.'], 409);
            }

            $_SESSION['admin_users_error'] = 'Não é permitido excluir o próprio usuário logado.';
            $this->redirect('/paineladministrativo');
        }

        try {
            $pdo = Database::connection();
            $statement = $pdo->prepare('DELETE FROM usuarios WHERE id = :id LIMIT 1');
            $statement->execute(['id' => $userId]);
            $_SESSION['admin_users_success'] = 'Usuário excluído com sucesso.';

            if ($isAjax) {
                $this->respondJson(['ok' => true, 'message' => 'Usuário excluído com sucesso.']);
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir o usuário agora.'], 500);
            }

            $_SESSION['admin_users_error'] = 'Não foi possível excluir o usuário agora.';
        }

        $this->redirect('/paineladministrativo');
    }

    public function painelAdministrativoServicosSubservicosSalvar(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        $isAjax = $this->isAjaxRequest();

        if ($authType !== 'admin' || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect('/paineladministrativo');
        }

        $entity = $this->normalizePermissionToken((string) ($_POST['entity'] ?? ''));
        $recordId = (int) ($_POST['id'] ?? 0);
        $nome = trim((string) ($_POST['nome'] ?? ''));
        $servicoId = (int) ($_POST['servico'] ?? 0);
        $subserviceTable = $this->sanitizeSqlIdentifier((string) ($_POST['table'] ?? ''));

        if (!in_array($entity, ['servico', 'subservico'], true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Tipo de registro inválido.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        if ($nome === '') {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Informe o nome.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        if ($entity === 'subservico' && $servicoId <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Selecione o serviço vinculado ao subserviço.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        try {
            $pdo = Database::connection();
            if ($entity === 'subservico') {
                $serviceStatement = $pdo->prepare('SELECT * FROM servicos WHERE id = :id LIMIT 1');
                $serviceStatement->execute(['id' => $servicoId]);
                $serviceRow = $serviceStatement->fetch();

                if (!is_array($serviceRow)) {
                    if ($isAjax) {
                        $this->respondJson(['ok' => false, 'message' => 'Serviço vinculado não encontrado.'], 422);
                    }

                    $this->redirect('/paineladministrativo');
                }

                $targetTable = $this->sanitizeSqlIdentifier($this->normalizePermissionToken($nome));
                if ($targetTable === '') {
                    if ($isAjax) {
                        $this->respondJson(['ok' => false, 'message' => 'Não foi possível gerar um nome de tabela válido para o subserviço.'], 422);
                    }

                    $this->redirect('/paineladministrativo');
                }

                if ($subserviceTable === '') {
                    if ($this->tableExists($targetTable)) {
                        if ($isAjax) {
                            $this->respondJson(['ok' => false, 'message' => 'Já existe um subserviço com este identificador de tabela.'], 409);
                        }

                        $this->redirect('/paineladministrativo');
                    }

                    $this->createSubserviceTable($targetTable);
                    $this->upsertSubserviceTableMetadata($targetTable, $nome, $servicoId);
                    $this->runUsersServicesAnalysis();

                    if ($isAjax) {
                        $this->respondJson(['ok' => true, 'message' => 'Subserviço criado com sucesso.']);
                    }
                } else {
                    if (!$this->tableExists($subserviceTable)) {
                        if ($isAjax) {
                            $this->respondJson(['ok' => false, 'message' => 'Tabela do subserviço não encontrada para edição.'], 404);
                        }

                        $this->redirect('/paineladministrativo');
                    }

                    $oldSubserviceKey = $this->normalizePermissionToken($subserviceTable);
                    $oldServiceId = $this->resolveParentServiceIdFromTable($subserviceTable);

                    $currentTable = $subserviceTable;
                    if ($targetTable !== $subserviceTable) {
                        if ($this->tableExists($targetTable)) {
                            if ($isAjax) {
                                $this->respondJson(['ok' => false, 'message' => 'Já existe outra tabela de subserviço com este nome.'], 409);
                            }

                            $this->redirect('/paineladministrativo');
                        }

                        $this->renameSubserviceTable($subserviceTable, $targetTable);
                        $currentTable = $targetTable;
                    }

                    $this->upsertSubserviceTableMetadata($currentTable, $nome, $servicoId);

                    $newSubserviceKey = $this->normalizePermissionToken($currentTable);
                    if ($oldSubserviceKey !== '' && ($oldSubserviceKey !== $newSubserviceKey || $oldServiceId !== $servicoId)) {
                        $this->syncUsersServicesForSubserviceMutation($oldSubserviceKey, $newSubserviceKey, $oldServiceId, $servicoId);
                    }
                    $this->runUsersServicesAnalysis();

                    if ($isAjax) {
                        $this->respondJson(['ok' => true, 'message' => 'Subserviço atualizado com sucesso.']);
                    }
                }

                $this->redirect('/paineladministrativo');
            }

            $hasTipoColumn = $this->hasServicosColumn('tipo');
            $serviceParentColumn = $this->getServicosParentColumn();

            if ($recordId > 0) {
                $existingStatement = $pdo->prepare('SELECT * FROM servicos WHERE id = :id LIMIT 1');
                $existingStatement->execute(['id' => $recordId]);
                $existingRow = $existingStatement->fetch();

                if (!is_array($existingRow)) {
                    if ($isAjax) {
                        $this->respondJson(['ok' => false, 'message' => 'Registro não encontrado para edição.'], 404);
                    }

                    $this->redirect('/paineladministrativo');
                }

                $existingIsSubservice = $hasTipoColumn
                    ? str_starts_with($this->normalizePermissionToken((string) ($existingRow['tipo'] ?? 'servico')), 'subserv')
                    : ($serviceParentColumn !== null && (int) ($existingRow[$serviceParentColumn] ?? 0) > 0);
                $editingSubservice = false;

                if ($existingIsSubservice !== $editingSubservice) {
                    if ($isAjax) {
                        $this->respondJson(['ok' => false, 'message' => 'Registro incompatível com o tipo informado.'], 409);
                    }

                    $this->redirect('/paineladministrativo');
                }

                $updatePayload = $this->buildServicosPayload($entity, $nome, $servicoId, is_array($existingRow) ? $existingRow : []);
                $this->updateServicosRecord($recordId, $updatePayload);
                $this->runUsersServicesAnalysis();

                if ($isAjax) {
                    $this->respondJson(['ok' => true, 'message' => 'Registro atualizado com sucesso.']);
                }
            } else {
                $insertPayload = $this->buildServicosPayload($entity, $nome, $servicoId, null);
                $this->insertServicosRecord($insertPayload);
                $this->runUsersServicesAnalysis();

                if ($isAjax) {
                    $this->respondJson(['ok' => true, 'message' => 'Registro criado com sucesso.']);
                }
            }
        } catch (Throwable $exception) {
            if ($isAjax) {
                $this->respondJson([
                    'ok' => false,
                    'message' => 'Não foi possível salvar agora. ' . $exception->getMessage(),
                ], 500);
            }
        }

        $this->redirect('/paineladministrativo');
    }

    private function normalizeUserServicesPayload(string $rawPayload): string
    {
        $payload = trim($rawPayload);
        if ($payload === '') {
            return '';
        }

        $decoded = json_decode($payload, true);
        if (!is_array($decoded)) {
            throw new InvalidArgumentException('Invalid services payload.');
        }

        $normalized = [];

        foreach ($decoded as $serviceKey => $subservices) {
            $normalizedService = $this->normalizePermissionToken((string) $serviceKey);
            if ($normalizedService === '') {
                continue;
            }

            if (!is_array($subservices) || $subservices === []) {
                $normalized[$normalizedService] = [];
                continue;
            }

            $normalizedSubservices = [];
            foreach ($subservices as $subservice) {
                $token = $this->normalizePermissionToken((string) $subservice);
                if ($token !== '') {
                    $normalizedSubservices[] = $token;
                }
            }

            $normalized[$normalizedService] = array_values(array_unique($normalizedSubservices));
        }

        if ($normalized === []) {
            return '';
        }

        $json = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new InvalidArgumentException('Invalid services payload.');
        }

        return $json;
    }

    private function decodeStoredUserServices(string $rawServices): array
    {
        $raw = trim($rawServices);
        if ($raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $this->normalizeServicesMap($decoded);
        }

        $services = [];
        if (preg_match_all('/([^;\[\]]+)\[([^\]]*)\]/u', $raw, $matches, PREG_SET_ORDER) !== false) {
            foreach ($matches as $match) {
                $serviceKey = $this->normalizePermissionToken((string) ($match[1] ?? ''));
                if ($serviceKey === '') {
                    continue;
                }

                $subservicesRaw = trim((string) ($match[2] ?? ''));
                $subservices = [];

                if ($subservicesRaw !== '') {
                    $parts = preg_split('/\s*,\s*/', $subservicesRaw) ?: [];
                    foreach ($parts as $part) {
                        $token = $this->normalizePermissionToken((string) $part);
                        if ($token !== '') {
                            $subservices[] = $token;
                        }
                    }
                }

                $services[$serviceKey] = array_values(array_unique($subservices));
            }
        }

        return $services;
    }

    private function normalizeServicesMap(array $map): array
    {
        $normalized = [];

        foreach ($map as $serviceKey => $subservices) {
            $serviceToken = $this->normalizePermissionToken((string) $serviceKey);
            if ($serviceToken === '') {
                continue;
            }

            if (!is_array($subservices) || $subservices === []) {
                $normalized[$serviceToken] = [];
                continue;
            }

            $normalizedSubservices = [];
            foreach ($subservices as $subservice) {
                $subToken = $this->normalizePermissionToken((string) $subservice);
                if ($subToken !== '') {
                    $normalizedSubservices[] = $subToken;
                }
            }

            $normalized[$serviceToken] = array_values(array_unique($normalizedSubservices));
        }

        return $normalized;
    }

    private function encodeServicesMap(array $map): string
    {
        $normalized = $this->normalizeServicesMap($map);
        if ($normalized === []) {
            return '';
        }

        $encoded = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return is_string($encoded) ? $encoded : '';
    }

    private function rewriteUsersServices(callable $mutator): void
    {
        try {
            $pdo = Database::connection();
            $rows = $pdo->query("SELECT id, servicos FROM usuarios WHERE servicos IS NOT NULL AND TRIM(servicos) <> ''")?->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable) {
            $rows = [];
        }

        if (!is_array($rows) || $rows === []) {
            return;
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $userId = (int) ($row['id'] ?? 0);
            if ($userId <= 0) {
                continue;
            }

            $originalRaw = (string) ($row['servicos'] ?? '');
            $servicesMap = $this->decodeStoredUserServices($originalRaw);
            $mutatedMap = $mutator($servicesMap);

            if (!is_array($mutatedMap)) {
                continue;
            }

            $newRaw = $this->encodeServicesMap($mutatedMap);
            if ($newRaw === trim($originalRaw)) {
                continue;
            }

            try {
                $pdo = Database::connection();
                $statement = $pdo->prepare('UPDATE usuarios SET servicos = :servicos WHERE id = :id LIMIT 1');
                $statement->execute([
                    'servicos' => $newRaw,
                    'id' => $userId,
                ]);
            } catch (Throwable) {
            }
        }
    }

    private function syncUsersServicesForSubserviceMutation(string $oldSubserviceKey, string $newSubserviceKey, int $oldServiceId, int $newServiceId): void
    {
        $oldKey = $this->normalizePermissionToken($oldSubserviceKey);
        $newKey = $this->normalizePermissionToken($newSubserviceKey);

        if ($oldKey === '' || $newKey === '') {
            return;
        }

        $newServiceKey = (string) $newServiceId;

        $this->rewriteUsersServices(function (array $servicesMap) use ($oldKey, $newKey, $oldServiceId, $newServiceKey): array {
            $hasOldPermission = false;

            foreach ($servicesMap as $serviceKey => $subservices) {
                if (!is_array($subservices)) {
                    $servicesMap[$serviceKey] = [];
                    continue;
                }

                $normalizedSubservices = array_values(array_unique(array_filter(array_map(
                    fn(string $value): string => $this->normalizePermissionToken($value),
                    array_map('strval', $subservices)
                ), static fn(string $value): bool => $value !== '')));

                if (in_array($oldKey, $normalizedSubservices, true)) {
                    $hasOldPermission = true;
                }

                $servicesMap[$serviceKey] = array_values(array_filter(
                    $normalizedSubservices,
                    static fn(string $value): bool => $value !== $oldKey
                ));
            }

            if (!$hasOldPermission) {
                return $servicesMap;
            }

            if (!isset($servicesMap[$newServiceKey]) || !is_array($servicesMap[$newServiceKey])) {
                $servicesMap[$newServiceKey] = [];
            }

            $servicesMap[$newServiceKey][] = $newKey;
            $servicesMap[$newServiceKey] = array_values(array_unique(array_filter(
                array_map(fn(string $value): string => $this->normalizePermissionToken($value), array_map('strval', $servicesMap[$newServiceKey])),
                static fn(string $value): bool => $value !== ''
            )));

            if ($oldServiceId > 0) {
                $oldServiceKey = (string) $oldServiceId;
                if (isset($servicesMap[$oldServiceKey]) && is_array($servicesMap[$oldServiceKey])) {
                    $servicesMap[$oldServiceKey] = array_values(array_filter(
                        $servicesMap[$oldServiceKey],
                        static fn(string $value): bool => $value !== $oldKey
                    ));
                }
            }

            return $servicesMap;
        });
    }

    private function removeSubserviceFromUsersServices(string $subserviceKey): void
    {
        $targetKey = $this->normalizePermissionToken($subserviceKey);
        if ($targetKey === '') {
            return;
        }

        $this->rewriteUsersServices(function (array $servicesMap) use ($targetKey): array {
            foreach ($servicesMap as $serviceKey => $subservices) {
                if (!is_array($subservices) || $subservices === []) {
                    continue;
                }

                $servicesMap[$serviceKey] = array_values(array_filter(
                    array_map(fn(string $value): string => $this->normalizePermissionToken($value), array_map('strval', $subservices)),
                    static fn(string $value): bool => $value !== '' && $value !== $targetKey
                ));
            }

            return $servicesMap;
        });
    }

    private function removeServiceFromUsersServices(int $serviceId): void
    {
        if ($serviceId <= 0) {
            return;
        }

        $serviceKey = (string) $serviceId;

        $this->rewriteUsersServices(function (array $servicesMap) use ($serviceKey): array {
            if (isset($servicesMap[$serviceKey])) {
                unset($servicesMap[$serviceKey]);
            }

            return $servicesMap;
        });
    }

    private function cleanupLegacyUsersServicesPermissions(array $servicesData): void
    {
        $services = is_array($servicesData['services'] ?? null) ? $servicesData['services'] : [];
        $subservices = is_array($servicesData['subservices'] ?? null) ? $servicesData['subservices'] : [];

        $serviceAliasMap = [];
        $knownServiceIds = [];

        foreach ($services as $service) {
            if (!is_array($service)) {
                continue;
            }

            $serviceId = (int) ($service['id'] ?? 0);
            if ($serviceId <= 0) {
                continue;
            }

            $canonicalServiceKey = (string) $serviceId;
            $knownServiceIds[$canonicalServiceKey] = true;

            $aliases = [
                $canonicalServiceKey,
                $this->normalizePermissionToken((string) ($service['nome'] ?? '')),
            ];

            foreach ($aliases as $alias) {
                $normalizedAlias = $this->normalizePermissionToken((string) $alias);
                if ($normalizedAlias !== '') {
                    $serviceAliasMap[$normalizedAlias] = $canonicalServiceKey;
                }
            }
        }

        $subserviceAliasByService = [];
        foreach ($subservices as $subservice) {
            if (!is_array($subservice)) {
                continue;
            }

            $serviceId = (int) ($subservice['servico_id'] ?? 0);
            if ($serviceId <= 0) {
                continue;
            }

            $serviceKey = (string) $serviceId;
            $canonicalSubserviceKey = $this->normalizePermissionToken((string) ($subservice['key'] ?? $subservice['table'] ?? ''));
            if ($canonicalSubserviceKey === '') {
                continue;
            }

            if (!isset($subserviceAliasByService[$serviceKey])) {
                $subserviceAliasByService[$serviceKey] = [];
            }

            $aliases = [
                $canonicalSubserviceKey,
                $this->normalizePermissionToken((string) ($subservice['table'] ?? '')),
                $this->normalizePermissionToken((string) ($subservice['nome'] ?? '')),
            ];

            foreach ($aliases as $alias) {
                if ($alias !== '') {
                    $subserviceAliasByService[$serviceKey][$alias] = $canonicalSubserviceKey;
                }
            }
        }

        $this->rewriteUsersServices(function (array $servicesMap) use ($serviceAliasMap, $knownServiceIds, $subserviceAliasByService): array {
            $cleaned = [];

            foreach ($servicesMap as $serviceKey => $subservices) {
                $normalizedServiceKey = $this->normalizePermissionToken((string) $serviceKey);
                if ($normalizedServiceKey === '') {
                    continue;
                }

                $canonicalServiceKey = $serviceAliasMap[$normalizedServiceKey] ?? null;
                if ($canonicalServiceKey === null) {
                    if (isset($knownServiceIds[$normalizedServiceKey])) {
                        $canonicalServiceKey = $normalizedServiceKey;
                    } else {
                        continue;
                    }
                }

                if (!isset($cleaned[$canonicalServiceKey])) {
                    $cleaned[$canonicalServiceKey] = [];
                }

                if (!is_array($subservices) || $subservices === []) {
                    continue;
                }

                foreach ($subservices as $subserviceKey) {
                    $normalizedSubserviceKey = $this->normalizePermissionToken((string) $subserviceKey);
                    if ($normalizedSubserviceKey === '') {
                        continue;
                    }

                    $canonicalSubserviceKey = $subserviceAliasByService[$canonicalServiceKey][$normalizedSubserviceKey] ?? null;
                    if ($canonicalSubserviceKey === null) {
                        continue;
                    }

                    $cleaned[$canonicalServiceKey][] = $canonicalSubserviceKey;
                }

                $cleaned[$canonicalServiceKey] = array_values(array_unique($cleaned[$canonicalServiceKey]));
            }

            return $cleaned;
        });
    }

    private function ensureAdminSessionServicesCleanup(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        if ($authType !== 'admin') {
            return;
        }

        $pending = $_SESSION['admin_services_cleanup_pending'] ?? null;
        if ($pending === false) {
            return;
        }

        $servicesData = $this->getAdminServicesAndSubservices();
        $this->cleanupLegacyUsersServicesPermissions($servicesData);
        $_SESSION['admin_services_cleanup_pending'] = false;
    }

    private function runUsersServicesAnalysis(): void
    {
        try {
            $servicesData = $this->getAdminServicesAndSubservices();
            $this->cleanupLegacyUsersServicesPermissions($servicesData);
        } catch (Throwable) {
        }
    }

    public function painelAdministrativoServicosSubservicosExcluir(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        $isAjax = $this->isAjaxRequest();

        if ($authType !== 'admin' || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect('/paineladministrativo');
        }

        $entity = $this->normalizePermissionToken((string) ($_POST['entity'] ?? ''));
        $recordId = (int) ($_POST['id'] ?? 0);
        $subserviceTable = $this->sanitizeSqlIdentifier((string) ($_POST['table'] ?? ''));

        if (!in_array($entity, ['servico', 'subservico'], true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Registro inválido para exclusão.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        if ($entity === 'subservico' && $subserviceTable === '') {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Tabela do subserviço inválida para exclusão.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        if ($entity === 'servico' && $recordId <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Serviço inválido para exclusão.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        try {
            $pdo = Database::connection();

            if ($entity === 'subservico') {
                if (!$this->tableExists($subserviceTable)) {
                    if ($isAjax) {
                        $this->respondJson(['ok' => false, 'message' => 'Tabela do subserviço não encontrada para exclusão.'], 404);
                    }

                    $this->redirect('/paineladministrativo');
                }

                $this->removeSubserviceFromUsersServices($this->normalizePermissionToken($subserviceTable));
                $this->dropSubserviceTable($subserviceTable);
                $this->runUsersServicesAnalysis();

                if ($isAjax) {
                    $this->respondJson(['ok' => true, 'message' => 'Subserviço excluído com sucesso.']);
                }

                $this->redirect('/paineladministrativo');
            }

            $hasTipoColumn = $this->hasServicosColumn('tipo');
            $serviceParentColumn = $this->getServicosParentColumn();
            $recordStatement = $pdo->prepare('SELECT * FROM servicos WHERE id = :id LIMIT 1');
            $recordStatement->execute(['id' => $recordId]);
            $record = $recordStatement->fetch();

            if (!is_array($record)) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Registro não encontrado para exclusão.'], 404);
                }

                $this->redirect('/paineladministrativo');
            }

            $isSubservice = $hasTipoColumn
                ? str_starts_with($this->normalizePermissionToken((string) ($record['tipo'] ?? 'servico')), 'subserv')
                : ($serviceParentColumn !== null && (int) ($record[$serviceParentColumn] ?? 0) > 0);
            if (($entity === 'subservico') !== $isSubservice) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Registro incompatível com o tipo informado.'], 409);
                }

                $this->redirect('/paineladministrativo');
            }

            if ($entity === 'servico') {
                if ($serviceParentColumn !== null) {
                    if ($hasTipoColumn) {
                        $childrenCountStatement = $pdo->prepare('SELECT COUNT(*) FROM servicos WHERE ' . $serviceParentColumn . ' = :servico AND LOWER(tipo) LIKE :tipo');
                        $childrenCountStatement->execute([
                            'servico' => $recordId,
                            'tipo' => 'subserv%',
                        ]);
                    } else {
                        $childrenCountStatement = $pdo->prepare('SELECT COUNT(*) FROM servicos WHERE ' . $serviceParentColumn . ' = :servico');
                        $childrenCountStatement->execute([
                            'servico' => $recordId,
                        ]);
                    }

                    $childrenCount = (int) ($childrenCountStatement->fetchColumn() ?: 0);
                } else {
                    $childrenCount = 0;
                }

                $childrenCount += $this->countSubserviceTablesByServiceId($recordId);

                if ($childrenCount > 0) {
                    if ($isAjax) {
                        $this->respondJson(['ok' => false, 'message' => 'Este serviço possui subserviços vinculados e não pode ser excluído.'], 409);
                    }

                    $this->redirect('/paineladministrativo');
                }
            }

            $deleteStatement = $pdo->prepare('DELETE FROM servicos WHERE id = :id LIMIT 1');
            $deleteStatement->execute(['id' => $recordId]);
            $this->removeServiceFromUsersServices($recordId);
            $this->runUsersServicesAnalysis();

            if ($isAjax) {
                $this->respondJson(['ok' => true, 'message' => 'Registro excluído com sucesso.']);
            }
        } catch (Throwable $exception) {
            if ($isAjax) {
                $this->respondJson([
                    'ok' => false,
                    'message' => 'Não foi possível excluir agora. ' . $exception->getMessage(),
                ], 500);
            }
        }

        $this->redirect('/paineladministrativo');
    }

    public function painelAdministrativoInformacoesSalvar(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        $isAjax = $this->isAjaxRequest();

        if ($authType !== 'admin' || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect('/paineladministrativo');
        }

        $id = (int) ($_POST['id'] ?? 0);
        $titulo = trim((string) ($_POST['titulo'] ?? ''));
        $conteudoHtml = trim((string) ($_POST['conteudo_html'] ?? ''));
        $removeImagem = (string) ($_POST['remover_imagem'] ?? '') === '1';
        $removeVideo = (string) ($_POST['remover_video'] ?? '') === '1';

        if ($titulo === '') {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Informe o título da informação.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        $informacaoModel = new InformacaoModel();

        try {
            $existing = $id > 0 ? $informacaoModel->findById($id) : null;
        } catch (Throwable) {
            $existing = null;
        }

        if ($id > 0 && $existing === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Publicação não encontrada.'], 404);
            }

            $this->redirect('/paineladministrativo');
        }

        $safeHtml = $this->sanitizeInformacaoHtml($conteudoHtml);

        $isNewPost = $id <= 0;
        $createdPostId = 0;

        if ($isNewPost) {
            try {
                $autorId = (int) ($_SESSION['auth']['id'] ?? 0);
                $createdPostId = $informacaoModel->create(
                    $titulo,
                    $safeHtml,
                    null,
                    null,
                    $autorId > 0 ? $autorId : null
                );
                $id = $createdPostId;
                $existing = [
                    'imagem_path' => '',
                    'video_path' => '',
                ];
            } catch (Throwable) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Não foi possível criar a publicação agora.'], 500);
                }

                $this->redirect('/paineladministrativo');
            }
        }

        $imagemPath = $existing !== null ? (string) ($existing['imagem_path'] ?? '') : '';
        $videoPath = $existing !== null ? (string) ($existing['video_path'] ?? '') : '';
        $newUploadedImage = null;
        $newUploadedVideo = null;

        try {
            if (!$removeImagem && isset($_FILES['imagem']) && is_array($_FILES['imagem'])) {
                $newUploadedImage = $this->handleInformacaoUpload($_FILES['imagem'], 'imagem', $id, 1);
            }

            if (!$removeVideo && isset($_FILES['video']) && is_array($_FILES['video'])) {
                $newUploadedVideo = $this->handleInformacaoUpload($_FILES['video'], 'video', $id, 1);
            }
        } catch (RuntimeException $exception) {
            if ($newUploadedImage !== null) {
                $this->deleteInformacaoMediaFileByPath($newUploadedImage);
            }

            if ($newUploadedVideo !== null) {
                $this->deleteInformacaoMediaFileByPath($newUploadedVideo);
            }

            if ($createdPostId > 0) {
                try {
                    $informacaoModel->delete($createdPostId);
                } catch (Throwable) {
                }
            }

            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        if ($removeImagem || $newUploadedImage !== null) {
            if ($imagemPath !== '') {
                $this->deleteInformacaoMediaFileByPath($imagemPath);
            }
            $imagemPath = '';
        }

        if ($removeVideo || $newUploadedVideo !== null) {
            if ($videoPath !== '') {
                $this->deleteInformacaoMediaFileByPath($videoPath);
            }
            $videoPath = '';
        }

        if ($newUploadedImage !== null) {
            $imagemPath = $newUploadedImage;
        }

        if ($newUploadedVideo !== null) {
            $videoPath = $newUploadedVideo;
        }

        try {
            $informacaoModel->update(
                $id,
                $titulo,
                $safeHtml,
                $imagemPath !== '' ? $imagemPath : null,
                $videoPath !== '' ? $videoPath : null
            );

            if ($isAjax) {
                $this->respondJson([
                    'ok' => true,
                    'message' => $isNewPost ? 'Informação publicada com sucesso.' : 'Informação atualizada com sucesso.',
                ]);
            }
        } catch (Throwable) {
            if ($newUploadedImage !== null) {
                $this->deleteInformacaoMediaFileByPath($newUploadedImage);
            }

            if ($newUploadedVideo !== null) {
                $this->deleteInformacaoMediaFileByPath($newUploadedVideo);
            }

            if ($createdPostId > 0) {
                try {
                    $informacaoModel->delete($createdPostId);
                } catch (Throwable) {
                }
            }

            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a informação agora.'], 500);
            }
        }

        $this->redirect('/paineladministrativo');
    }

    public function painelAdministrativoInformacoesExcluir(): void
    {
        $authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
        $isAjax = $this->isAjaxRequest();

        if ($authType !== 'admin' || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect('/paineladministrativo');
        }

        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Publicação inválida para exclusão.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        $informacaoModel = new InformacaoModel();

        try {
            $post = $informacaoModel->findById($id);
        } catch (Throwable) {
            $post = null;
        }

        if ($post === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Publicação não encontrada.'], 404);
            }

            $this->redirect('/paineladministrativo');
        }

        try {
            $informacaoModel->delete($id);
            $this->deleteInformacaoMediaFileByPath((string) ($post['imagem_path'] ?? ''));
            $this->deleteInformacaoMediaFileByPath((string) ($post['video_path'] ?? ''));

            if ($isAjax) {
                $this->respondJson(['ok' => true, 'message' => 'Informação excluída com sucesso.']);
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a informação agora.'], 500);
            }
        }

        $this->redirect('/paineladministrativo');
    }

    public function painelAdministrativoAvaliacoesSalvar(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $id = (int) ($_POST['id'] ?? 0);
        $nome = trim((string) ($_POST['nome'] ?? ''));
        $isRecuperacao = (string) ($_POST['is_recuperacao'] ?? '') === '1';
        $cicloRaw = (int) ($_POST['ciclo'] ?? 0);
        $isSimulado = (string) ($_POST['is_simulado'] ?? '') === '1';
        $bimestre = (int) ($_POST['bimestre'] ?? 0);
        $aplicacao = trim((string) ($_POST['aplicacao'] ?? ''));
        $turma = trim((string) ($_POST['turma'] ?? ''));
        $turmasRelacionadasRaw = $_POST['turmas_relacionadas'] ?? [];
        $alunosRelacionadosRaw = $_POST['alunos_relacionados'] ?? [];
        $descricao = trim((string) ($_POST['descricao'] ?? ''));
        $gabaritoRaw = trim((string) ($_POST['gabarito'] ?? ''));
        $aplicadoresRaw = $_POST['aplicador_ids'] ?? ($_POST['aplicador_id'] ?? []);
        $autorIdFromRequest = (int) ($_POST['autor_id'] ?? 0);

        if (!is_array($turmasRelacionadasRaw)) {
            $turmasRelacionadasRaw = [];
        }

        if (!is_array($alunosRelacionadosRaw)) {
            $alunosRelacionadosRaw = [];
        }

        if (!is_array($aplicadoresRaw)) {
            $aplicadoresRaw = [$aplicadoresRaw];
        }

        $turmasRelacionadasIds = [];
        foreach ($turmasRelacionadasRaw as $turmaIdRaw) {
            $turmaId = (int) $turmaIdRaw;
            if ($turmaId > 0 && !in_array($turmaId, $turmasRelacionadasIds, true)) {
                $turmasRelacionadasIds[] = $turmaId;
            }
        }

        $alunosRelacionadosIds = [];
        foreach ($alunosRelacionadosRaw as $alunoIdRaw) {
            $alunoId = (int) $alunoIdRaw;
            if ($alunoId > 0 && !in_array($alunoId, $alunosRelacionadosIds, true)) {
                $alunosRelacionadosIds[] = $alunoId;
            }
        }

        $aplicadoresIds = [];
        foreach ($aplicadoresRaw as $aplicadorIdRaw) {
            $aplicadorId = (int) $aplicadorIdRaw;
            if ($aplicadorId > 0 && !in_array($aplicadorId, $aplicadoresIds, true)) {
                $aplicadoresIds[] = $aplicadorId;
            }
        }

        $resolvedTurmaNomes = [];
        if ($turmasRelacionadasIds !== []) {
            $turmaModel = new TurmaModel();

            try {
                $turmasDisponiveis = $turmaModel->getSimpleOptions();
            } catch (Throwable) {
                $turmasDisponiveis = [];
            }

            $turmasMap = [];
            foreach ($turmasDisponiveis as $turmaOption) {
                if (!is_array($turmaOption)) {
                    continue;
                }

                $optionId = (int) ($turmaOption['id'] ?? 0);
                $optionNome = trim((string) ($turmaOption['nome'] ?? ''));
                if ($optionId > 0 && $optionNome !== '') {
                    $turmasMap[$optionId] = $optionNome;
                }
            }

            foreach ($turmasRelacionadasIds as $turmaId) {
                if (isset($turmasMap[$turmaId])) {
                    $resolvedTurmaNomes[] = $turmasMap[$turmaId];
                }
            }

            if ($resolvedTurmaNomes === []) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Selecione turmas válidas para relacionar à avaliação.'], 422);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }

            if ($alunosRelacionadosIds !== []) {
                $alunoModel = new AlunoModel();

                try {
                    $alunosDisponiveis = $alunoModel->getSimpleOptions();
                } catch (Throwable) {
                    $alunosDisponiveis = [];
                }

                $alunosPermitidos = [];
                foreach ($alunosDisponiveis as $alunoOption) {
                    if (!is_array($alunoOption)) {
                        continue;
                    }

                    $optionId = (int) ($alunoOption['id'] ?? 0);
                    $optionTurmaId = (int) ($alunoOption['turma_id'] ?? 0);

                    if ($optionId > 0 && $optionTurmaId > 0 && in_array($optionTurmaId, $turmasRelacionadasIds, true)) {
                        $alunosPermitidos[] = $optionId;
                    }
                }

                $alunosRelacionadosIds = array_values(array_filter(
                    $alunosRelacionadosIds,
                    static fn (int $alunoId): bool => in_array($alunoId, $alunosPermitidos, true)
                ));
            }
        } else {
            $alunosRelacionadosIds = [];
        }

        $turmaResumo = $resolvedTurmaNomes !== []
            ? implode(', ', $resolvedTurmaNomes)
            : ($turma !== '' ? $turma : null);

        if ($nome === '') {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Informe o nome da avaliação.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if ($bimestre < 1 || $bimestre > 4) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Informe um bimestre válido para a avaliação.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $ciclo = null;
        if (!$isRecuperacao) {
            if ($cicloRaw < 1 || $cicloRaw > 2) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Informe o ciclo (1º ou 2º) para avaliações que não são recuperação.'], 422);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }

            $ciclo = $cicloRaw;
            if ($ciclo !== 2) {
                $isSimulado = false;
            }
        } else {
            $isSimulado = false;
        }

        $aplicadoresDisponiveis = $this->getAvaliacaoAplicadoresOptions();
        $usuariosDisponiveisIds = array_values(array_filter(array_map(
            static fn (array $item): int => (int) ($item['id'] ?? 0),
            $aplicadoresDisponiveis
        )));

        foreach ($aplicadoresIds as $aplicadorId) {
            if (!in_array($aplicadorId, $usuariosDisponiveisIds, true)) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Selecione apenas aplicadores válidos.'], 422);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }
        }

        $isAdmin = $this->isCurrentUserAdmin();
        $autorId = $isAdmin ? $autorIdFromRequest : 0;
        if ($isAdmin && $autorId > 0 && !in_array($autorId, $usuariosDisponiveisIds, true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Selecione um autor válido.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $aplicacaoDate = null;
        if ($aplicacao !== '') {
            $dateObject = date_create($aplicacao);
            if ($dateObject === false) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Data de aplicação inválida.'], 422);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }

            $aplicacaoDate = $dateObject->format('Y-m-d');
        }

        $decodedGabarito = null;
        $gabaritoConfig = null;
        if ($gabaritoRaw !== '') {
            $decodedGabarito = json_decode($gabaritoRaw, true);
            if (!is_array($decodedGabarito)) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Configuração de gabarito inválida.'], 422);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }

            $gabaritoConfig = json_encode($decodedGabarito, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $avaliacaoModel = new AvaliacaoModel();

        try {
            $existing = $id > 0 ? $avaliacaoModel->findById($id) : null;
        } catch (Throwable) {
            $existing = null;
        }

        if ($id > 0 && $existing === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if ($id > 0 && !$this->canManageOwnedAvaliacao($existing)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você só pode editar avaliações criadas por você.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $isNew = $id <= 0;

        if ($isNew) {
            $currentAutorId = $this->getCurrentAuthUserId();
            $autorId = $isAdmin && $autorId > 0
                ? $autorId
                : ($currentAutorId > 0 ? $currentAutorId : null);
        } else {
            $autorId = $isAdmin
                ? ($autorId > 0 ? $autorId : (int) ($existing['autor_id'] ?? 0))
                : (int) ($existing['autor_id'] ?? 0);
        }

        if ($isNew && !$this->canEditAvaliacoesManagement()) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você não tem permissão para criar avaliações.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        try {
            if ($isNew) {
                $avaliacaoModel->create(
                    $nome,
                    $isRecuperacao,
                    $ciclo,
                    $isSimulado,
                    $bimestre,
                    $aplicacaoDate,
                    $turmaResumo,
                    $turmasRelacionadasIds,
                    $alunosRelacionadosIds,
                    $descricao !== '' ? strip_tags($descricao) : null,
                    $gabaritoConfig,
                    $autorId > 0 ? $autorId : null,
                    $aplicadoresIds
                );
            } else {
                $avaliacaoModel->update(
                    $id,
                    $nome,
                    $isRecuperacao,
                    $ciclo,
                    $isSimulado,
                    $bimestre,
                    $aplicacaoDate,
                    $turmaResumo,
                    $turmasRelacionadasIds,
                    $alunosRelacionadosIds,
                    $descricao !== '' ? strip_tags($descricao) : null,
                    $gabaritoConfig,
                    $aplicadoresIds,
                    $autorId > 0 ? $autorId : null
                );
            }

            $cleanupAvaliacaoId = $isNew ? null : $id;
            if ($cleanupAvaliacaoId !== null && $cleanupAvaliacaoId > 0) {
                $this->cleanupAvaliacaoLayoutOrphanFiles($cleanupAvaliacaoId, $decodedGabarito);
            }

            if ($isAjax) {
                $this->respondJson([
                    'ok' => true,
                    'message' => $isNew ? 'Avaliação cadastrada com sucesso.' : 'Avaliação atualizada com sucesso.',
                ]);
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a avaliação agora.'], 500);
            }
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    public function painelAdministrativoAvaliacoesSalvarGabarito(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $id = (int) ($_POST['id'] ?? 0);
        $gabaritoRaw = trim((string) ($_POST['gabarito'] ?? ''));

        if ($id <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação inválida para salvar o gabarito.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $decodedGabarito = null;
        $gabaritoConfig = null;
        if ($gabaritoRaw !== '') {
            $decodedGabarito = json_decode($gabaritoRaw, true);
            if (!is_array($decodedGabarito)) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Configuração de gabarito inválida.'], 422);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }

            $gabaritoConfig = json_encode($decodedGabarito, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $avaliacaoModel = new AvaliacaoModel();

        try {
            $existing = $avaliacaoModel->findById($id);
        } catch (Throwable) {
            $existing = null;
        }

        if ($existing === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$this->canManageOwnedAvaliacao($existing)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você só pode alterar o gabarito de avaliações criadas por você.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        try {
            $avaliacaoModel->updateGabarito($id, $gabaritoConfig);
            $this->cleanupAvaliacaoLayoutOrphanFiles($id, $decodedGabarito);

            if ($isAjax) {
                $this->respondJson([
                    'ok' => true,
                    'message' => 'Gabarito salvo com sucesso.',
                ]);
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar o gabarito agora.'], 500);
            }
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    public function painelAdministrativoAvaliacoesCorrecoesListar(): void
    {
        if (!$this->canAccessAvaliacoesManagement()) {
            $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
        }

        $avaliacaoId = (int) ($_GET['id'] ?? 0);
        if ($avaliacaoId <= 0) {
            $this->respondJson(['ok' => false, 'message' => 'Avaliação inválida.'], 422);
        }

        $avaliacaoModel = new AvaliacaoModel();
        $avaliacao = $avaliacaoModel->findById($avaliacaoId);
        if ($avaliacao === null) {
            $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
        }

        if (!$this->canAccessAvaliacaoCorrecao($avaliacao)) {
            $this->respondJson(['ok' => false, 'message' => 'Você não pode acessar as correções desta avaliação.'], 403);
        }

        $correcaoModel = new AvaliacaoCorrecaoModel();
        $rows = $correcaoModel->listByAvaliacaoId($avaliacaoId);
        $total = count($rows);
        $totalQuestoes = 0;
        $mediaPercentual = 0.0;
        if ($total > 0) {
            $mediaPercentual = array_reduce($rows, static function (float $carry, array $item): float {
                return $carry + (float) ($item['percentual'] ?? 0);
            }, 0.0) / $total;
            $totalQuestoes = (int) ($rows[0]['total_questoes'] ?? 0);
        }

        $this->respondJson([
            'ok' => true,
            'rows' => $rows,
            'stats' => [
                'total' => $total,
                'total_questoes' => $totalQuestoes,
                'media_percentual' => round($mediaPercentual, 2),
            ],
        ]);
    }

    public function painelAdministrativoAvaliacoesCorrecoesVerificar(): void
    {
        if (!$this->canAccessAvaliacoesManagement()) {
            $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
        }

        $avaliacaoId = (int) ($_GET['avaliacao_id'] ?? 0);
        $alunoId = (int) ($_GET['aluno_id'] ?? 0);
        $turmaId = (int) ($_GET['turma_id'] ?? 0);
        if ($avaliacaoId <= 0 || $alunoId <= 0 || $turmaId <= 0) {
            $this->respondJson(['ok' => false, 'message' => 'Parâmetros inválidos.'], 422);
        }

        $avaliacaoModel = new AvaliacaoModel();
        $avaliacao = $avaliacaoModel->findById($avaliacaoId);
        if ($avaliacao === null) {
            $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
        }

        if (!$this->canAccessAvaliacaoCorrecao($avaliacao)) {
            $this->respondJson(['ok' => false, 'message' => 'Você não pode acessar as correções desta avaliação.'], 403);
        }

        $correcaoModel = new AvaliacaoCorrecaoModel();
        $existing = $correcaoModel->findByComposite($avaliacaoId, $alunoId, $turmaId);

        $this->respondJson([
            'ok' => true,
            'exists' => $existing !== null,
            'row' => $existing,
            'message' => $existing !== null
                ? 'Já existe uma correção salva para esta folha.'
                : 'Nenhuma correção salva para esta folha.',
        ]);
    }

    public function painelAdministrativoAvaliacoesCorrecoesExcluir(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $correcaoId = (int) ($_POST['id'] ?? 0);
        if ($correcaoId <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Correção inválida.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $correcaoModel = new AvaliacaoCorrecaoModel();
        $correcao = $correcaoModel->findById($correcaoId);
        if ($correcao === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Correção não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $avaliacaoModel = new AvaliacaoModel();
        $avaliacao = $avaliacaoModel->findById((int) ($correcao['avaliacao_id'] ?? 0));
        if ($avaliacao === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação vinculada não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$this->canAccessAvaliacaoCorrecao($avaliacao)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você não pode excluir esta correção.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$correcaoModel->deleteById($correcaoId)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a correção agora.'], 500);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        try {
            $this->removeAlunoDesempenhoFromCorrecao($correcao);
        } catch (Throwable) {
        }

        if ($isAjax) {
            $rows = $correcaoModel->listByAvaliacaoId((int) ($correcao['avaliacao_id'] ?? 0));
            $total = count($rows);
            $mediaPercentual = $total > 0
                ? array_reduce($rows, static function (float $carry, array $item): float {
                    return $carry + (float) ($item['percentual'] ?? 0);
                }, 0.0) / $total
                : 0.0;

            $this->respondJson([
                'ok' => true,
                'message' => 'Correção excluída com sucesso.',
                'rows' => $rows,
                'stats' => [
                    'total' => $total,
                    'total_questoes' => $total > 0 ? (int) ($rows[0]['total_questoes'] ?? 0) : 0,
                    'media_percentual' => round($mediaPercentual, 2),
                ],
            ]);
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    public function painelAdministrativoAvaliacoesCorrecoesAtualizar(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $correcaoId = (int) ($_POST['id'] ?? 0);
        $numeracao = trim((string) ($_POST['numeracao'] ?? ''));
        $qrPayload = trim((string) ($_POST['qr_payload'] ?? ''));
        $respostasJson = trim((string) ($_POST['respostas_json'] ?? ''));
        $correcoesJson = trim((string) ($_POST['correcoes_json'] ?? ''));
        $acertos = (int) ($_POST['acertos'] ?? 0);
        $totalQuestoes = (int) ($_POST['total_questoes'] ?? 0);
        $pontuacao = (float) ($_POST['pontuacao'] ?? 0);
        $pontuacaoTotal = (float) ($_POST['pontuacao_total'] ?? 0);
        $percentual = (float) ($_POST['percentual'] ?? 0);

        if ($correcaoId <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Correção inválida.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $decodedRespostas = $respostasJson !== '' ? json_decode($respostasJson, true) : [];
        $decodedCorrecoes = $correcoesJson !== '' ? json_decode($correcoesJson, true) : [];
        if (($respostasJson !== '' && !is_array($decodedRespostas)) || ($correcoesJson !== '' && !is_array($decodedCorrecoes))) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Detalhes da correção inválidos.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $correcaoModel = new AvaliacaoCorrecaoModel();
        $correcao = $correcaoModel->findById($correcaoId);
        if ($correcao === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Correção não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $avaliacaoModel = new AvaliacaoModel();
        $avaliacao = $avaliacaoModel->findById((int) ($correcao['avaliacao_id'] ?? 0));
        if ($avaliacao === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação vinculada não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$this->canAccessAvaliacaoCorrecao($avaliacao)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você não pode editar esta correção.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$correcaoModel->updateById($correcaoId, [
            'numeracao' => $numeracao,
            'qr_payload' => $qrPayload,
            'respostas_json' => $respostasJson !== '' ? json_encode($decodedRespostas, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'correcoes_json' => $correcoesJson !== '' ? json_encode($decodedCorrecoes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'acertos' => max(0, $acertos),
            'total_questoes' => max(0, $totalQuestoes),
            'pontuacao' => max(0, $pontuacao),
            'pontuacao_total' => max(0, $pontuacaoTotal),
            'percentual' => max(0, $percentual),
            'corrigido_em' => date('Y-m-d H:i:s'),
        ])) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível atualizar a correção agora.'], 500);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        try {
            $updatedCorrecao = $correcaoModel->findById($correcaoId);
            if (is_array($updatedCorrecao)) {
                $this->syncAlunoDesempenhoFromCorrecao($avaliacao, $updatedCorrecao);
            }
        } catch (Throwable) {
        }

        if ($isAjax) {
            $rows = $correcaoModel->listByAvaliacaoId((int) ($correcao['avaliacao_id'] ?? 0));
            $total = count($rows);
            $mediaPercentual = $total > 0
                ? array_reduce($rows, static function (float $carry, array $item): float {
                    return $carry + (float) ($item['percentual'] ?? 0);
                }, 0.0) / $total
                : 0.0;

            $this->respondJson([
                'ok' => true,
                'message' => 'Correção atualizada com sucesso.',
                'rows' => $rows,
                'stats' => [
                    'total' => $total,
                    'total_questoes' => $total > 0 ? (int) ($rows[0]['total_questoes'] ?? 0) : 0,
                    'media_percentual' => round($mediaPercentual, 2),
                ],
            ]);
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    public function painelAdministrativoAvaliacoesCorrecoesSalvar(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $avaliacaoId = (int) ($_POST['avaliacao_id'] ?? 0);
        $alunoId = (int) ($_POST['aluno_id'] ?? 0);
        $turmaId = (int) ($_POST['turma_id'] ?? 0);
        $numeracao = trim((string) ($_POST['numeracao'] ?? ''));
        $qrPayload = trim((string) ($_POST['qr_payload'] ?? ''));
        $respostasJson = trim((string) ($_POST['respostas_json'] ?? ''));
        $correcoesJson = trim((string) ($_POST['correcoes_json'] ?? ''));
        $acertos = (int) ($_POST['acertos'] ?? 0);
        $totalQuestoes = (int) ($_POST['total_questoes'] ?? 0);
        $pontuacao = (float) ($_POST['pontuacao'] ?? 0);
        $pontuacaoTotal = (float) ($_POST['pontuacao_total'] ?? 0);
        $percentual = (float) ($_POST['percentual'] ?? 0);

        if ($avaliacaoId <= 0 || $alunoId <= 0 || $turmaId <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Dados da correção inválidos.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $avaliacaoModel = new AvaliacaoModel();
        $avaliacao = $avaliacaoModel->findById($avaliacaoId);
        if ($avaliacao === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$this->canAccessAvaliacaoCorrecao($avaliacao)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você não pode corrigir esta avaliação.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $alunoModel = new AlunoModel();
        $aluno = $alunoModel->findById($alunoId);
        if (!is_array($aluno)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Aluno não encontrado.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $alunoTurmaId = (int) ($aluno['turma_id'] ?? 0);
        if ($alunoTurmaId <= 0 || $alunoTurmaId !== $turmaId) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Aluno incompatível com a turma informada.'], 409);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $turmasRelacionadasIds = is_array($avaliacao['turmas_relacionadas_ids'] ?? null) ? $avaliacao['turmas_relacionadas_ids'] : [];
        $alunosRelacionadosIds = is_array($avaliacao['alunos_relacionados_ids'] ?? null) ? $avaliacao['alunos_relacionados_ids'] : [];
        if ($turmasRelacionadasIds !== [] && !in_array($turmaId, $turmasRelacionadasIds, true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'A turma não está vinculada a esta avaliação.'], 409);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if ($alunosRelacionadosIds !== [] && !in_array($alunoId, $alunosRelacionadosIds, true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'O aluno não está relacionado a esta avaliação.'], 409);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $decodedRespostas = $respostasJson !== '' ? json_decode($respostasJson, true) : [];
        $decodedCorrecoes = $correcoesJson !== '' ? json_decode($correcoesJson, true) : [];
        if (($respostasJson !== '' && !is_array($decodedRespostas)) || ($correcoesJson !== '' && !is_array($decodedCorrecoes))) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Detalhes da correção inválidos.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $correcaoModel = new AvaliacaoCorrecaoModel();
        $existing = $correcaoModel->findByComposite($avaliacaoId, $alunoId, $turmaId);
        if ($existing !== null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Banco de dados: já existe uma correção salva para este aluno/turma nesta avaliação.'], 409);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        try {
            $correcaoModel->create([
                'avaliacao_id' => $avaliacaoId,
                'aluno_id' => $alunoId,
                'turma_id' => $turmaId,
                'avaliacao_nome' => trim((string) ($avaliacao['nome'] ?? '')),
                'aluno_nome' => trim((string) ($aluno['nome'] ?? '')),
                'turma_nome' => trim((string) ($aluno['turma'] ?? $avaliacao['turma'] ?? '')),
                'numeracao' => $numeracao,
                'qr_payload' => $qrPayload,
                'respostas_json' => $respostasJson !== '' ? json_encode($decodedRespostas, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'correcoes_json' => $correcoesJson !== '' ? json_encode($decodedCorrecoes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'acertos' => max(0, $acertos),
                'total_questoes' => max(0, $totalQuestoes),
                'pontuacao' => max(0, $pontuacao),
                'pontuacao_total' => max(0, $pontuacaoTotal),
                'percentual' => max(0, $percentual),
                'corrigido_em' => date('Y-m-d H:i:s'),
            ]);

            try {
                $savedCorrecao = $correcaoModel->findByComposite($avaliacaoId, $alunoId, $turmaId);
                if (is_array($savedCorrecao)) {
                    $this->syncAlunoDesempenhoFromCorrecao($avaliacao, $savedCorrecao);
                }
            } catch (Throwable) {
            }

            if ($isAjax) {
                $rows = $correcaoModel->listByAvaliacaoId($avaliacaoId);
                $this->respondJson([
                    'ok' => true,
                    'message' => 'Prova corrigida com sucesso.',
                    'rows' => $rows,
                ]);
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a correção agora.'], 500);
            }
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    private function syncAlunoDesempenhoFromCorrecao(array $avaliacao, array $correcao): void
    {
        $service = new AlunoDesempenhoService();
        $service->syncAutomaticRecord($avaliacao, $correcao);
    }

    private function removeAlunoDesempenhoFromCorrecao(array $correcao): void
    {
        $service = new AlunoDesempenhoService();
        $service->removeAutomaticRecordBySource(
            (int) ($correcao['aluno_id'] ?? 0),
            (int) ($correcao['avaliacao_id'] ?? 0),
            (int) ($correcao['turma_id'] ?? 0)
        );
    }

    public function painelAdministrativoAvaliacoesFundoGabaritoPadrao(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->isCurrentUserAdmin() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $presetModel = new GabaritoPadraoModel();

        try {
            $currentPreset = $presetModel->getConfig();
        } catch (Throwable) {
            $currentPreset = null;
        }

        $oldPresetPaths = $this->collectDefaultGabaritoPresetPaths(is_array($currentPreset) ? $currentPreset : null);
        $action = $this->normalizePermissionToken((string) ($_POST['action'] ?? 'save'));

        if ($action === 'clear' || $action === 'remove' || $action === 'remover') {
            try {
                $presetModel->clearConfig();
                $this->cleanupDefaultGabaritoPresetPaths($oldPresetPaths);

                if ($isAjax) {
                    $this->respondJson([
                        'ok' => true,
                        'message' => 'Plano de fundo padrão removido com sucesso.',
                        'preset' => null,
                    ]);
                }
            } catch (Throwable) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Não foi possível remover o plano de fundo padrão agora.'], 500);
                }
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $gabaritoRaw = trim((string) ($_POST['gabarito'] ?? ''));
        if ($gabaritoRaw === '') {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Nenhuma configuração de gabarito foi enviada.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $decodedGabarito = json_decode($gabaritoRaw, true);
        if (!is_array($decodedGabarito)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Configuração de gabarito inválida.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $background = $decodedGabarito['background'] ?? null;
        if (!is_array($background)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Selecione um plano de fundo antes de definir o padrão.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $sourceRelativePath = $this->normalizeAvaliacaoGabaritoPath((string) ($background['path'] ?? ''));
        if ($sourceRelativePath === '') {
            $sourceRelativePath = $this->normalizeAvaliacaoGabaritoPath((string) ($background['url'] ?? ''));
        }

        if ($sourceRelativePath === '') {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'O plano de fundo precisa estar salvo no sistema antes de virar padrão.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $backgroundLayout = $decodedGabarito['background_layout'] ?? null;

        try {
            $storedBackground = $this->copyDefaultGabaritoBackgroundAsset($sourceRelativePath);
            $preset = [
                'background' => $storedBackground,
                'background_layout' => is_array($backgroundLayout) ? $backgroundLayout : [],
            ];

            $presetModel->saveConfig($preset);
            $this->cleanupDefaultGabaritoPresetPaths($oldPresetPaths, $this->collectDefaultGabaritoPresetPaths($preset));

            if ($isAjax) {
                $this->respondJson([
                    'ok' => true,
                    'message' => 'Plano de fundo padrão salvo com sucesso.',
                    'preset' => $preset,
                ]);
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar o plano de fundo padrão agora.'], 500);
            }
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    public function painelAdministrativoAvaliacoesUploadFundoGabarito(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Salve a avaliação antes de enviar o plano de fundo.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $avaliacaoModel = new AvaliacaoModel();

        try {
            $existing = $avaliacaoModel->findById($id);
        } catch (Throwable) {
            $existing = null;
        }

        if ($existing === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$this->canManageOwnedAvaliacao($existing)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você só pode enviar plano de fundo para avaliações criadas por você.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $file = $_FILES['fundo'] ?? null;
        if (!is_array($file)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Selecione uma imagem para o plano de fundo.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errorCode !== UPLOAD_ERR_OK) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Falha no upload da imagem de fundo.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Arquivo enviado inválido.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $maxBackgroundUploadSize = 25 * 1024 * 1024;
        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size > $maxBackgroundUploadSize) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'O plano de fundo deve ter até 25MB.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $originalName = (string) ($file['name'] ?? 'fundo');
        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
        $allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
        if (!in_array($extension, $allowedExt, true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Formato inválido. Use JPG, PNG, WEBP ou PDF.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = strtolower((string) $finfo->file($tmpName));
        $allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!in_array($mime, $allowedMime, true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Tipo de arquivo inválido para plano de fundo.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        $targetDir = dirname(__DIR__, 2) . '/uploads/gabaritos';
        if (!is_dir($targetDir) && !mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível preparar o diretório de gabaritos.'], 500);
            }

            $this->redirect('/paineladministrativo');
        }

        foreach (glob($targetDir . '/avaliacao-' . $id . '.*') ?: [] as $oldFilePath) {
            if (is_file($oldFilePath)) {
                @unlink($oldFilePath);
            }
        }

        $filename = '';
        $targetPath = '';

        if ($extension === 'pdf' || $mime === 'application/pdf') {
            if (!class_exists('Imagick')) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'O servidor não possui suporte para converter PDF em imagem (Imagick).'], 500);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }

            try {
                $imagickClass = 'Imagick';
                $imagick = new $imagickClass();
                $imagick->setResolution(200, 200);
                $imagick->readImage($tmpName . '[0]');
                if (defined('Imagick::ALPHACHANNEL_REMOVE')) {
                    $imagick->setImageAlphaChannel((int) constant('Imagick::ALPHACHANNEL_REMOVE'));
                }
                $imagick->setImageBackgroundColor('white');

                if (defined('Imagick::LAYERMETHOD_FLATTEN')) {
                    $imagick = $imagick->mergeImageLayers((int) constant('Imagick::LAYERMETHOD_FLATTEN'));
                }

                $imagick->setImageFormat('png');

                $filename = sprintf('avaliacao-%d.png', $id);
                $targetPath = $targetDir . '/' . $filename;
                $imagick->writeImage($targetPath);
                $imagick->clear();
                $imagick->destroy();
            } catch (Throwable) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Não foi possível converter o PDF em imagem.'], 500);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }
        } else {
            $filename = sprintf('avaliacao-%d.%s', $id, $extension);
            $targetPath = $targetDir . '/' . $filename;

            if (!move_uploaded_file($tmpName, $targetPath)) {
                if ($isAjax) {
                    $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a imagem de fundo.'], 500);
                }

                $this->redirect($this->getAvaliacoesRedirectPath());
            }
        }

        $relativePath = 'uploads/gabaritos/' . $filename;
        $publicUrl = rtrim((string) BASE_URL, '/') . '/' . $relativePath;

        if ($isAjax) {
            $this->respondJson([
                'ok' => true,
                'message' => 'Plano de fundo enviado com sucesso.',
                'path' => $relativePath,
                'url' => $publicUrl,
            ]);
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    public function painelAdministrativoAvaliacoesUploadImagemLayout(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Salve a avaliação antes de enviar imagens do layout.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $avaliacaoModel = new AvaliacaoModel();

        try {
            $existing = $avaliacaoModel->findById($id);
        } catch (Throwable) {
            $existing = null;
        }

        if ($existing === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$this->canManageOwnedAvaliacao($existing)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você só pode enviar imagens para avaliações criadas por você.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $file = $_FILES['fundo'] ?? null;
        if (!is_array($file)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Selecione uma imagem para inserir no layout.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errorCode !== UPLOAD_ERR_OK) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Falha no upload da imagem de layout.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Arquivo enviado inválido.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size > (12 * 1024 * 1024)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'A imagem deve ter até 12MB.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $originalName = (string) ($file['name'] ?? 'imagem-layout');
        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
        $allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($extension, $allowedExt, true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Formato inválido. Use JPG, JPEG, PNG ou WEBP.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = strtolower((string) $finfo->file($tmpName));
        $allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($mime, $allowedMime, true)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Tipo de arquivo inválido para imagem do layout.'], 422);
            }

            $this->redirect('/paineladministrativo');
        }

        $targetDir = dirname(__DIR__, 2) . '/uploads/gabaritos';
        if (!is_dir($targetDir) && !mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível preparar o diretório de gabaritos.'], 500);
            }

            $this->redirect('/paineladministrativo');
        }

        $uniqueToken = str_replace('.', '', uniqid((string) mt_rand(1000, 9999), true));
        $filename = sprintf('avaliacao-%d-layout-%s.%s', $id, $uniqueToken, $extension);
        $targetPath = $targetDir . '/' . $filename;

        if (!move_uploaded_file($tmpName, $targetPath)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a imagem de layout.'], 500);
            }

            $this->redirect('/paineladministrativo');
        }

        $relativePath = 'uploads/gabaritos/' . $filename;
        $publicUrl = rtrim((string) BASE_URL, '/') . '/' . $relativePath;

        if ($isAjax) {
            $this->respondJson([
                'ok' => true,
                'message' => 'Imagem de layout enviada com sucesso.',
                'path' => $relativePath,
                'url' => $publicUrl,
            ]);
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    public function painelAdministrativoAvaliacoesExcluir(): void
    {
        $isAjax = $this->isAjaxRequest();

        if (!$this->canAccessAvaliacoesManagement() || (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST')) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
            }

            $this->redirect('/404');
        }

        $csrfToken = (string) ($_POST['csrf_token'] ?? '');
        $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

        if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação inválida para exclusão.'], 422);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $avaliacaoModel = new AvaliacaoModel();

        try {
            $avaliacao = $avaliacaoModel->findById($id);
        } catch (Throwable) {
            $avaliacao = null;
        }

        if ($avaliacao === null) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        if (!$this->canManageOwnedAvaliacao($avaliacao)) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Você só pode excluir avaliações criadas por você.'], 403);
            }

            $this->redirect($this->getAvaliacoesRedirectPath());
        }

        $referencedPaths = [];
        $avaliacaoGabaritoRaw = trim((string) ($avaliacao['gabarito'] ?? ''));
        if ($avaliacaoGabaritoRaw !== '') {
            $decodedAvaliacaoGabarito = json_decode($avaliacaoGabaritoRaw, true);
            if (is_array($decodedAvaliacaoGabarito)) {
                $referencedPaths = $this->collectAvaliacaoGabaritoReferencedPaths($decodedAvaliacaoGabarito);
            }
        }

        try {
            $avaliacaoModel->delete($id);

            foreach ($referencedPaths as $relativePath) {
                try {
                    $isReferencedElsewhere = $avaliacaoModel->isGabaritoPathReferencedByOtherAvaliacao($relativePath, $id);
                } catch (Throwable) {
                    $isReferencedElsewhere = true;
                }

                if (!$isReferencedElsewhere) {
                    $this->deleteAvaliacaoGabaritoByPath($relativePath);
                }
            }

            if ($isAjax) {
                $this->respondJson(['ok' => true, 'message' => 'Avaliação excluída com sucesso.']);
            }
        } catch (Throwable) {
            if ($isAjax) {
                $this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a avaliação agora.'], 500);
            }
        }

        $this->redirect($this->getAvaliacoesRedirectPath());
    }

    private function sanitizeInformacaoHtml(string $html): string
    {
        $value = trim($html);
        if ($value === '') {
            return '';
        }

        $value = preg_replace('#<\s*(script|style|iframe|object|embed|meta|link)[^>]*>.*?<\s*/\s*\1\s*>#is', '', $value) ?? '';
        $value = preg_replace('#<\s*(script|style|iframe|object|embed|meta|link)[^>]*/?\s*>#is', '', $value) ?? '';
        $value = preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $value) ?? '';

        $value = preg_replace_callback('/\s(href|src)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', static function (array $match): string {
            $attr = strtolower((string) ($match[1] ?? ''));
            $raw = trim((string) ($match[2] ?? ''), "\"'");

            if ($raw === '') {
                return ' ' . $attr . '="#"';
            }

            if (preg_match('#^(https?://|mailto:|tel:|/|\./|\../)#i', $raw) !== 1) {
                return ' ' . $attr . '="#"';
            }

            return ' ' . $attr . '="' . htmlspecialchars($raw, ENT_QUOTES, 'UTF-8') . '"';
        }, $value) ?? '';

        $allowed = '<p><br><strong><b><em><i><u><s><ul><ol><li><blockquote><h1><h2><h3><h4><h5><h6><a><span><div>';
        $value = strip_tags($value, $allowed);

        return trim($value);
    }

    private function handleInformacaoUpload(array $file, string $type, int $postId, int $slot = 1): ?string
    {
        $errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errorCode === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if ($postId <= 0) {
            throw new RuntimeException('Post inválido para anexar arquivo.');
        }

        $safeSlot = max(1, $slot);

        if ($errorCode !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Falha no upload do arquivo.');
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            throw new RuntimeException('Arquivo enviado é inválido.');
        }

        $originalName = (string) ($file['name'] ?? 'arquivo');
        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = strtolower((string) $finfo->file($tmpName));

        if ($type === 'imagem') {
            $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            $allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $maxSize = 10 * 1024 * 1024;
            $relativeDir = 'uploads/imagens';
        } elseif ($type === 'video') {
            $allowedExt = ['mp4', 'webm', 'ogg', 'mov'];
            $allowedMime = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
            $maxSize = 60 * 1024 * 1024;
            $relativeDir = 'uploads/videos';
        } else {
            throw new RuntimeException('Tipo de upload não suportado.');
        }

        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size > $maxSize) {
            throw new RuntimeException('Arquivo excede o tamanho permitido.');
        }

        if (!in_array($extension, $allowedExt, true) || !in_array($mime, $allowedMime, true)) {
            throw new RuntimeException('Formato de arquivo não permitido.');
        }

        $targetDir = dirname(__DIR__, 2) . '/' . $relativeDir;
        if (!is_dir($targetDir) && !mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
            throw new RuntimeException('Não foi possível preparar o diretório de upload.');
        }

        if ($type === 'imagem') {
            $prefix = sprintf('info-%d-img%d', $postId, $safeSlot);
        } else {
            $prefix = sprintf('info-%d-video%d', $postId, $safeSlot);
        }

        foreach (glob($targetDir . '/' . $prefix . '.*') ?: [] as $existingFilePath) {
            if (is_file($existingFilePath)) {
                @unlink($existingFilePath);
            }
        }

        $filename = $prefix . '.' . $extension;
        $absolutePath = $targetDir . '/' . $filename;

        if (!move_uploaded_file($tmpName, $absolutePath)) {
            throw new RuntimeException('Não foi possível salvar o arquivo enviado.');
        }

        return $relativeDir . '/' . $filename;
    }

    private function deleteInformacaoMediaFileByPath(string $relativePath): void
    {
        $path = trim($relativePath);
        if ($path === '') {
            return;
        }

        $normalized = str_replace('\\', '/', $path);
        if (!str_starts_with($normalized, 'uploads/imagens/') && !str_starts_with($normalized, 'uploads/videos/')) {
            return;
        }

        $absolutePath = dirname(__DIR__, 2) . '/' . $normalized;
        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    private function migrateInformacoesMediaNaming(InformacaoModel $informacaoModel): void
    {
        try {
            $posts = $informacaoModel->getAllOrderedByInsertionDate();
        } catch (Throwable) {
            return;
        }

        foreach ($posts as $post) {
            if (!is_array($post)) {
                continue;
            }

            $postId = (int) ($post['id'] ?? 0);
            if ($postId <= 0) {
                continue;
            }

            $currentImage = trim((string) ($post['imagem_path'] ?? ''));
            $currentVideo = trim((string) ($post['video_path'] ?? ''));

            $newImage = $this->migrateSingleInformacaoMediaPath($postId, $currentImage, 'imagem', 1);
            $newVideo = $this->migrateSingleInformacaoMediaPath($postId, $currentVideo, 'video', 1);

            if ($newImage !== $currentImage || $newVideo !== $currentVideo) {
                try {
                    $informacaoModel->updateMediaPaths(
                        $postId,
                        $newImage !== '' ? $newImage : null,
                        $newVideo !== '' ? $newVideo : null
                    );
                } catch (Throwable) {
                }
            }
        }
    }

    private function migrateSingleInformacaoMediaPath(int $postId, string $currentPath, string $type, int $slot): string
    {
        $path = trim($currentPath);
        if ($postId <= 0 || $path === '') {
            return $path;
        }

        $normalized = str_replace('\\', '/', $path);
        $expectedPrefix = $type === 'imagem'
            ? ('uploads/imagens/info-' . $postId . '-img' . max(1, $slot) . '.')
            : ('uploads/videos/info-' . $postId . '-video' . max(1, $slot) . '.');

        if (str_starts_with($normalized, $expectedPrefix)) {
            return $normalized;
        }

        $absoluteSource = dirname(__DIR__, 2) . '/' . $normalized;
        if (!is_file($absoluteSource)) {
            return $normalized;
        }

        $extension = strtolower((string) pathinfo($normalized, PATHINFO_EXTENSION));
        if ($extension === '') {
            return $normalized;
        }

        if ($type === 'imagem') {
            $dir = 'uploads/imagens';
            $filename = sprintf('info-%d-img%d.%s', $postId, max(1, $slot), $extension);
        } else {
            $dir = 'uploads/videos';
            $filename = sprintf('info-%d-video%d.%s', $postId, max(1, $slot), $extension);
        }

        $targetDir = dirname(__DIR__, 2) . '/' . $dir;
        if (!is_dir($targetDir) && !mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
            return $normalized;
        }

        $targetAbsolute = $targetDir . '/' . $filename;
        $targetRelative = $dir . '/' . $filename;

        if ($absoluteSource === $targetAbsolute) {
            return $targetRelative;
        }

        foreach (glob($targetDir . '/' . pathinfo($filename, PATHINFO_FILENAME) . '.*') ?: [] as $existingTargetPath) {
            if ($existingTargetPath !== $absoluteSource && is_file($existingTargetPath)) {
                @unlink($existingTargetPath);
            }
        }

        $renamed = @rename($absoluteSource, $targetAbsolute);
        if (!$renamed) {
            $copied = @copy($absoluteSource, $targetAbsolute);
            if (!$copied) {
                return $normalized;
            }

            @unlink($absoluteSource);
        }

        return $targetRelative;
    }

    private function handleAvaliacaoGabaritoUpload(array $file, int $avaliacaoId): ?string
    {
        $errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errorCode === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if ($avaliacaoId <= 0) {
            throw new RuntimeException('Avaliação inválida para anexar gabarito.');
        }

        if ($errorCode !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Falha no upload do arquivo de gabarito.');
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            throw new RuntimeException('Arquivo de gabarito enviado é inválido.');
        }

        $originalName = (string) ($file['name'] ?? 'arquivo');
        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = strtolower((string) $finfo->file($tmpName));

        $allowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
        $allowedMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        $maxSize = 20 * 1024 * 1024;

        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size > $maxSize) {
            throw new RuntimeException('Arquivo de gabarito excede o tamanho permitido.');
        }

        if (!in_array($extension, $allowedExt, true) || !in_array($mime, $allowedMime, true)) {
            throw new RuntimeException('Formato de gabarito não permitido.');
        }

        $relativeDir = 'uploads/gabaritos';
        $targetDir = dirname(__DIR__, 2) . '/' . $relativeDir;
        if (!is_dir($targetDir) && !mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
            throw new RuntimeException('Não foi possível preparar o diretório de gabaritos.');
        }

        $prefix = sprintf('avaliacao-%d-gabarito', $avaliacaoId);

        foreach (glob($targetDir . '/' . $prefix . '.*') ?: [] as $existingFilePath) {
            if (is_file($existingFilePath)) {
                @unlink($existingFilePath);
            }
        }

        $filename = $prefix . '.' . $extension;
        $absolutePath = $targetDir . '/' . $filename;

        if (!move_uploaded_file($tmpName, $absolutePath)) {
            throw new RuntimeException('Não foi possível salvar o gabarito enviado.');
        }

        return $relativeDir . '/' . $filename;
    }

    private function cleanupAvaliacaoLayoutOrphanFiles(int $avaliacaoId, ?array $decodedGabarito): void
    {
        if ($avaliacaoId <= 0) {
            return;
        }

        $targetDir = dirname(__DIR__, 2) . '/uploads/gabaritos';
        if (!is_dir($targetDir)) {
            return;
        }

        $referenced = [];
        if (is_array($decodedGabarito)) {
            $layout = $decodedGabarito['avaliacao_layout'] ?? null;
            if (is_array($layout)) {
                $images = $layout['images'] ?? null;
                if (is_array($images)) {
                    foreach ($images as $image) {
                        if (!is_array($image)) {
                            continue;
                        }

                        $pathCandidate = $this->normalizeAvaliacaoGabaritoPath((string) ($image['path'] ?? ''));
                        if ($pathCandidate !== '') {
                            $referenced[$pathCandidate] = true;
                        }

                        $urlCandidate = $this->normalizeAvaliacaoGabaritoPath((string) ($image['url'] ?? ''));
                        if ($urlCandidate !== '') {
                            $referenced[$urlCandidate] = true;
                        }
                    }
                }
            }
        }

        $avaliacaoModel = new AvaliacaoModel();

        $prefix = sprintf('avaliacao-%d-layout-', $avaliacaoId);
        foreach (glob($targetDir . '/' . $prefix . '*.*') ?: [] as $filePath) {
            if (!is_file($filePath)) {
                continue;
            }

            $relativePath = 'uploads/gabaritos/' . basename($filePath);
            if (!isset($referenced[$relativePath])) {
                try {
                    $isReferencedElsewhere = $avaliacaoModel->isGabaritoPathReferencedByOtherAvaliacao($relativePath, $avaliacaoId);
                } catch (Throwable) {
                    $isReferencedElsewhere = true;
                }

                if (!$isReferencedElsewhere) {
                    @unlink($filePath);
                }
            }
        }
    }

    private function normalizeAvaliacaoGabaritoPath(string $rawPath): string
    {
        $value = trim($rawPath);
        if ($value === '') {
            return '';
        }

        $normalized = str_replace('\\', '/', $value);
        $normalized = explode('?', $normalized, 2)[0];
        $normalized = trim($normalized);

        if (str_starts_with($normalized, 'uploads/gabaritos/')) {
            return $normalized;
        }

        if (str_starts_with($normalized, '/uploads/gabaritos/')) {
            return ltrim($normalized, '/');
        }

        if (preg_match('#^https?://#i', $normalized) === 1) {
            $pathPart = (string) parse_url($normalized, PHP_URL_PATH);
            $pathPart = str_replace('\\', '/', $pathPart);
            $needle = '/uploads/gabaritos/';
            $position = strpos($pathPart, $needle);
            if ($position !== false) {
                return ltrim(substr($pathPart, $position + 1), '/');
            }
        }

        return '';
    }

    private function collectAvaliacaoGabaritoReferencedPaths(array $decodedGabarito): array
    {
        $paths = [];

        $addPath = function (string $value) use (&$paths): void {
            $normalized = $this->normalizeAvaliacaoGabaritoPath($value);
            if ($normalized !== '') {
                $paths[$normalized] = true;
            }
        };

        $background = $decodedGabarito['background'] ?? null;
        if (is_array($background)) {
            $addPath((string) ($background['path'] ?? ''));
            $addPath((string) ($background['url'] ?? ''));
        }

        $layout = $decodedGabarito['avaliacao_layout'] ?? null;
        if (is_array($layout)) {
            $layoutBackground = $layout['background'] ?? null;
            if (is_array($layoutBackground)) {
                $addPath((string) ($layoutBackground['path'] ?? ''));
                $addPath((string) ($layoutBackground['url'] ?? ''));
            }

            $images = $layout['images'] ?? null;
            if (is_array($images)) {
                foreach ($images as $image) {
                    if (!is_array($image)) {
                        continue;
                    }

                    $addPath((string) ($image['path'] ?? ''));
                    $addPath((string) ($image['url'] ?? ''));
                }
            }
        }

        return array_keys($paths);
    }

    private function deleteAvaliacaoGabaritoByPath(string $relativePath): void
    {
        $path = trim($relativePath);
        if ($path === '') {
            return;
        }

        $normalized = str_replace('\\', '/', $path);
        if (!str_starts_with($normalized, 'uploads/gabaritos/')) {
            return;
        }

        if ($this->isGabaritoPathReferencedByDefaultPreset($normalized)) {
            return;
        }

        $absolutePath = dirname(__DIR__, 2) . '/' . $normalized;
        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    private function collectDefaultGabaritoPresetPaths(?array $preset): array
    {
        if (!is_array($preset)) {
            return [];
        }

        $background = $preset['background'] ?? null;
        if (!is_array($background)) {
            return [];
        }

        $paths = [];
        $pathCandidates = [
            (string) ($background['path'] ?? ''),
            (string) ($background['url'] ?? ''),
        ];

        foreach ($pathCandidates as $candidate) {
            $normalized = $this->normalizeAvaliacaoGabaritoPath($candidate);
            if ($normalized !== '') {
                $paths[$normalized] = true;
            }
        }

        return array_keys($paths);
    }

    private function copyDefaultGabaritoBackgroundAsset(string $sourceRelativePath): array
    {
        $normalizedSourcePath = $this->normalizeAvaliacaoGabaritoPath($sourceRelativePath);
        if ($normalizedSourcePath === '') {
            throw new RuntimeException('Plano de fundo padrão inválido.');
        }

        $sourceAbsolutePath = dirname(__DIR__, 2) . '/' . $normalizedSourcePath;
        if (!is_file($sourceAbsolutePath)) {
            throw new RuntimeException('O arquivo do plano de fundo não foi encontrado no servidor.');
        }

        $extension = strtolower((string) pathinfo($sourceAbsolutePath, PATHINFO_EXTENSION));
        if ($extension === '') {
            $extension = 'png';
        }

        $targetDir = dirname(__DIR__, 2) . '/uploads/gabaritos';
        if (!is_dir($targetDir) && !mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
            throw new RuntimeException('Não foi possível preparar o diretório do plano de fundo padrão.');
        }

        $filename = sprintf('gabarito-default-%s-%s.%s', date('YmdHis'), substr(bin2hex(random_bytes(4)), 0, 8), $extension);
        $targetAbsolutePath = $targetDir . '/' . $filename;

        if (!@copy($sourceAbsolutePath, $targetAbsolutePath)) {
            throw new RuntimeException('Não foi possível copiar o plano de fundo padrão.');
        }

        $relativePath = 'uploads/gabaritos/' . $filename;

        return [
            'path' => $relativePath,
            'url' => rtrim((string) BASE_URL, '/') . '/' . $relativePath,
            'cache_bust' => (string) time(),
        ];
    }

    private function cleanupDefaultGabaritoPresetPaths(array $paths, array $protectedPaths = []): void
    {
        $avaliacaoModel = new AvaliacaoModel();
        $protectedMap = [];

        foreach ($protectedPaths as $protectedPath) {
            $normalizedProtected = $this->normalizeAvaliacaoGabaritoPath((string) $protectedPath);
            if ($normalizedProtected !== '') {
                $protectedMap[$normalizedProtected] = true;
            }
        }

        foreach ($paths as $path) {
            $normalizedPath = $this->normalizeAvaliacaoGabaritoPath((string) $path);
            if ($normalizedPath === '' || isset($protectedMap[$normalizedPath])) {
                continue;
            }

            try {
                $isReferenced = $avaliacaoModel->isGabaritoPathReferencedByOtherAvaliacao($normalizedPath, 0);
            } catch (Throwable) {
                $isReferenced = true;
            }

            if (!$isReferenced) {
                $this->deleteAvaliacaoGabaritoByPath($normalizedPath);
            }
        }
    }

    private function isGabaritoPathReferencedByDefaultPreset(string $relativePath): bool
    {
        $normalizedPath = $this->normalizeAvaliacaoGabaritoPath($relativePath);
        if ($normalizedPath === '') {
            return false;
        }

        $presetModel = new GabaritoPadraoModel();

        try {
            $preset = $presetModel->getConfig();
        } catch (Throwable) {
            $preset = null;
        }

        if (!is_array($preset)) {
            return false;
        }

        return in_array($normalizedPath, $this->collectDefaultGabaritoPresetPaths($preset), true);
    }
}
