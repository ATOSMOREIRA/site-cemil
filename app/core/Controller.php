<?php
declare(strict_types=1);

class Controller
{
    public function dispatch(string $method, string $path): void
    {
        if ($this->handleTesterSandboxRoute($path)) {
            return;
        }

        $this->$method();
    }

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

    protected function isTesterUser(): bool
    {
        $authType = mb_strtolower(trim((string) ($_SESSION['auth']['tipo'] ?? '')), 'UTF-8');

        return $authType === 'tester';
    }

    protected function canAccessAdministrativeArea(): bool
    {
        $authType = mb_strtolower(trim((string) ($_SESSION['auth']['tipo'] ?? '')), 'UTF-8');

        return in_array($authType, ['admin', 'tester'], true);
    }

    private function handleTesterSandboxRoute(string $path): bool
    {
        if (!$this->isTesterUser() || $this->isTesterAllowedRoute($path)) {
            return false;
        }

        $requestMethod = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $sandboxMessage = 'Modo Tester: ação simulada sem leitura ou gravação no banco de dados.';

        if ($requestMethod === 'POST') {
            if ($this->isAjaxRequestLike()) {
                $this->sendJson($this->buildTesterSandboxPayload($path, $sandboxMessage), 200);
            }

            $redirectTarget = $this->resolveTesterRedirectPath($path);
            header('Location: ' . rtrim(BASE_URL, '/') . $redirectTarget);
            exit;
        }

        $this->sendJson($this->buildTesterSandboxPayload($path, $sandboxMessage), 200);

        return true;
    }

    private function isTesterAllowedRoute(string $path): bool
    {
        return in_array($path, [
            '/',
            '/manifest.webmanifest',
            '/sw.js',
            '/api/instagram-posts',
            '/api/chatbot',
            '/404',
            '/sobre',
            '/informacoes',
            '/institucional',
            '/institucional/subservico',
            '/institucional/subservico/conteudo',
            '/institucional/estudantes',
            '/institucional/turmas',
            '/institucional/modulacao',
            '/institucional/corretor-gabaritos',
            '/institucional/avaliacoes',
            '/institucional/notas-desempenho',
            '/institucional/gerenciamento-cardapio',
            '/institucional/cardapio',
            '/institucional/agendamento',
            '/institucional/meus-agendamentos',
            '/institucional/refeitorio',
            '/institucional/entrada-saida',
            '/paineladministrativo',
            '/paineladministrativo/modal-conteudo',
            '/meus-dados',
            '/sair',
        ], true);
    }

    private function buildTesterSandboxPayload(string $path, string $message): array
    {
        $today = date('Y-m-d');
        $month = date('Y-m');

        return match (true) {
            $path === '/institucional/estudantes/listar' => [
                'ok' => true,
                'data' => [],
            ],
            $path === '/institucional/turmas/listar' => [
                'ok' => true,
                'data' => [],
            ],
            $path === '/institucional/habilidades/listar' => [
                'ok' => true,
                'habilidades' => [],
                'disciplinas' => [],
            ],
            $path === '/institucional/modulacao/dados' => [
                'ok' => true,
                'data' => [
                    'professores' => [],
                    'usuarios_beneficios' => [],
                    'areas' => [],
                    'disciplinas' => [],
                    'turmas' => [],
                    'modulacoes' => [],
                    'configuracao_aulas' => [],
                    'horarios_semanais' => [],
                    'livre_docencias' => [],
                    'planejamentos' => [],
                ],
            ],
            $path === '/institucional/modulacao/horarios/gerar' => [
                'ok' => true,
                'message' => $message,
                'data' => [
                    'entries' => [],
                    'notes' => [$message],
                    'selected_professor_ids' => [],
                    'selected_turma_ids' => [],
                ],
            ],
            $path === '/institucional/notas-desempenho/dados' => [
                'ok' => true,
                'data' => [
                    'overview' => [
                        'total_alunos' => 0,
                        'total_avaliados' => 0,
                        'participacao' => 0,
                        'media_geral' => null,
                        'faixas' => [
                            'insuficiente' => 0,
                            'basico' => 0,
                            'adequado' => 0,
                            'avancado' => 0,
                        ],
                    ],
                    'disciplinas' => [],
                    'boletim' => [],
                    'diagnostico' => [],
                    'painel_grafico' => [
                        'disciplinas' => [],
                        'ranking_top' => [],
                        'ranking_alerta' => [],
                    ],
                    'entries' => [],
                    'turmas' => [],
                ],
            ],
            $path === '/institucional/notas-desempenho/correcao-disciplina/dados' => [
                'ok' => false,
                'message' => 'Modo Tester: nenhuma correção real está disponível.',
            ],
            $path === '/institucional/gerenciamento-cardapio/dados' => [
                'ok' => true,
                'data' => [
                    'data' => $today,
                    'tipos_refeicao' => [],
                    'itens' => [],
                    'cardapios' => [],
                    'reservas' => [],
                ],
            ],
            $path === '/institucional/gerenciamento-cardapio/resumo-mensal',
            $path === '/institucional/cardapio/resumo-mensal' => [
                'ok' => true,
                'data' => [
                    'mes' => $month,
                    'resumo' => [],
                ],
            ],
            $path === '/institucional/cardapio/dados' => [
                'ok' => true,
                'data' => [
                    'data' => $today,
                    'tipos_refeicao' => [],
                    'cardapios' => [],
                    'minhas_reservas' => [],
                ],
            ],
            $path === '/institucional/cardapio/minhas-reservas' => [
                'ok' => true,
                'data' => [
                    'reservas' => [],
                ],
            ],
            $path === '/institucional/agendamento/listar',
            $path === '/institucional/meus-agendamentos/listar' => [
                'ok' => true,
                'data' => [
                    'itens' => [],
                    'reservas' => [],
                ],
            ],
            $path === '/institucional/agendamento/responsaveis/listar' => [
                'ok' => true,
                'data' => [
                    'responsaveis' => [],
                ],
            ],
            $path === '/institucional/meus-agendamentos/disponibilidade' => [
                'ok' => true,
                'data' => [
                    'reservas' => [],
                ],
            ],
            $path === '/institucional/meus-agendamentos/locks/sync' => [
                'ok' => true,
                'data' => [
                    'accepted_slots' => [],
                    'rejected_slots' => [],
                    'expires_at' => null,
                ],
            ],
            $path === '/institucional/meus-agendamentos/locks/release' => [
                'ok' => true,
                'data' => ['released' => true],
            ],
            $path === '/institucional/agendamento/resumo-mensal' => [
                'ok' => true,
                'data' => [
                    'mes' => $month,
                    'resumo' => [],
                ],
            ],
            $path === '/institucional/refeitorio/dados' => [
                'ok' => true,
                'tipos' => [],
                'turmas' => [],
                'resumo' => [],
                'hoje' => $today,
            ],
            $path === '/institucional/refeitorio/poll' => [
                'ok' => true,
                'resumo_hoje' => [],
                'ultimas_entradas' => [],
            ],
            $path === '/institucional/refeitorio/pesquisar-alunos' => [
                'ok' => true,
                'alunos' => [],
            ],
            $path === '/institucional/refeitorio/relatorio' => [
                'ok' => true,
                'registros' => [],
                'totais' => [],
                'data_inicio' => $today,
                'data_fim' => $today,
            ],
            $path === '/institucional/refeitorio/qrcodes' => [
                'ok' => true,
                'alunos' => [],
            ],
            $path === '/institucional/refeitorio/buscar-aluno',
            $path === '/institucional/refeitorio/registro' => [
                'ok' => false,
                'message' => 'Modo Tester: nenhum estudante real está disponível.',
            ],
            $path === '/institucional/entrada-saida/dados' => [
                'ok' => true,
                'tipos' => [],
                'turmas' => [],
                'resumo' => [],
                'meta' => [],
                'liberacoes_ativas' => [],
                'hoje' => $today,
            ],
            $path === '/institucional/entrada-saida/poll' => [
                'ok' => true,
                'resumo_hoje' => [],
                'ultimas_entradas' => [],
                'meta' => [],
                'liberacoes_ativas' => [],
            ],
            $path === '/institucional/entrada-saida/pesquisar-alunos',
            $path === '/institucional/entrada-saida/pesquisar-alunos-liberacao' => [
                'ok' => true,
                'alunos' => [],
            ],
            $path === '/institucional/entrada-saida/relatorio' => [
                'ok' => true,
                'registros' => [],
                'totais' => [],
                'data_inicio' => $today,
                'data_fim' => $today,
            ],
            $path === '/institucional/entrada-saida/qrcodes' => [
                'ok' => true,
                'alunos' => [],
            ],
            $path === '/institucional/entrada-saida/buscar-aluno',
            $path === '/institucional/entrada-saida/registro' => [
                'ok' => false,
                'message' => 'Modo Tester: nenhum estudante real está disponível.',
            ],
            default => [
                'ok' => true,
                'message' => $message,
                'data' => [
                    'id' => 0,
                ],
            ],
        };
    }

    private function resolveTesterRedirectPath(string $path): string
    {
        return match (true) {
            str_starts_with($path, '/paineladministrativo/') => '/paineladministrativo',
            str_starts_with($path, '/institucional/gerenciamento-cardapio/') => '/institucional/gerenciamento-cardapio',
            str_starts_with($path, '/institucional/cardapio/') => '/institucional/cardapio',
            str_starts_with($path, '/institucional/refeitorio/') => '/institucional/refeitorio',
            str_starts_with($path, '/institucional/entrada-saida/') => '/institucional/entrada-saida',
            str_starts_with($path, '/institucional/meus-agendamentos/') => '/institucional/meus-agendamentos',
            str_starts_with($path, '/institucional/agendamento/') => '/institucional/agendamento',
            str_starts_with($path, '/institucional/notas-desempenho/') => '/institucional/notas-desempenho',
            str_starts_with($path, '/institucional/avaliacoes/') => '/institucional/avaliacoes',
            str_starts_with($path, '/institucional/modulacao/') => '/institucional/modulacao',
            str_starts_with($path, '/institucional/turmas/') => '/institucional/turmas',
            str_starts_with($path, '/institucional/estudantes/') => '/institucional/estudantes',
            default => '/',
        };
    }

    private function isAjaxRequestLike(): bool
    {
        return strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) === 'xmlhttprequest';
    }

    private function sendJson(array $payload, int $statusCode = 200): void
    {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=UTF-8');
        }

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
