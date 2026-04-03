<?php
declare(strict_types=1);

class EntradaSaidaModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS entrada_saida_tipos_movimentacao (
                id          INT          NOT NULL AUTO_INCREMENT,
                nome        VARCHAR(80)  NOT NULL,
                natureza    VARCHAR(16)  NOT NULL DEFAULT \'entrada\',
                descricao   VARCHAR(255) NULL,
                horario_ini TIME         NULL,
                horario_fim TIME         NULL,
                cor         VARCHAR(7)   NOT NULL DEFAULT \'#2563eb\',
                ativo       TINYINT(1)   NOT NULL DEFAULT 1,
                created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_entrada_saida_tipos_nome (nome),
                KEY idx_entrada_saida_tipos_natureza (natureza)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS entrada_saida_registros (
                id                  INT          NOT NULL AUTO_INCREMENT,
                aluno_id            INT          NOT NULL,
                tipo_movimentacao_id INT         NOT NULL,
                data                DATE         NOT NULL,
                horario             TIME         NOT NULL,
                usuario_id          INT          NULL,
                obs                 VARCHAR(255) NULL,
                saida_automatica    TINYINT(1)   NOT NULL DEFAULT 0,
                created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_entrada_saida_data            (data),
                KEY idx_entrada_saida_tipo_data       (tipo_movimentacao_id, data),
                KEY idx_entrada_saida_aluno_data      (aluno_id, data),
                CONSTRAINT fk_entrada_saida_reg_aluno FOREIGN KEY (aluno_id)
                    REFERENCES alunos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT fk_entrada_saida_reg_tipo FOREIGN KEY (tipo_movimentacao_id)
                    REFERENCES entrada_saida_tipos_movimentacao (id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        try {
            $pdo->exec('ALTER TABLE entrada_saida_registros ADD COLUMN saida_automatica TINYINT(1) NOT NULL DEFAULT 0 AFTER obs');
        } catch (Throwable $e) {
            // Coluna já existente em bases migradas.
        }

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS entrada_saida_liberacoes (
                id                  INT          NOT NULL AUTO_INCREMENT,
                aluno_id            INT          NOT NULL,
                data                DATE         NOT NULL,
                usuario_id          INT          NULL,
                obs                 VARCHAR(255) NULL,
                status              VARCHAR(16)  NOT NULL DEFAULT 'pendente',
                usado_em            DATETIME     NULL,
                registro_saida_id   INT          NULL,
                created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_entrada_saida_lib_data_status       (data, status),
                KEY idx_entrada_saida_lib_aluno_data_status (aluno_id, data, status),
                CONSTRAINT fk_entrada_saida_lib_aluno FOREIGN KEY (aluno_id)
                    REFERENCES alunos (id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS auditoria_entrada_saida (
                id            INT           NOT NULL AUTO_INCREMENT,
                entidade      VARCHAR(32)   NOT NULL,
                acao          VARCHAR(24)   NOT NULL,
                referencia_id INT           NULL,
                aluno_id      INT           NULL,
                usuario_id    INT           NULL,
                resumo        VARCHAR(255)  NOT NULL,
                detalhes_json LONGTEXT      NULL,
                created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_auditoria_entidade_data (entidade, created_at),
                KEY idx_auditoria_acao_data (acao, created_at),
                KEY idx_auditoria_usuario_data (usuario_id, created_at),
                KEY idx_auditoria_aluno_data (aluno_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->seedDefaultTipos();
    }

    private function seedDefaultTipos(): void
    {
        $pdo = Database::connection();
        $count = (int) ($pdo->query('SELECT COUNT(*) FROM entrada_saida_tipos_movimentacao')?->fetchColumn() ?: 0);
        if ($count > 0) {
            return;
        }

        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO entrada_saida_tipos_movimentacao
                (nome, natureza, descricao, horario_ini, horario_fim, cor, ativo)
             VALUES (:nome, :natureza, :descricao, :horario_ini, :horario_fim, :cor, 1)'
        );

        $defaults = [
            ['Entrada', 'entrada', 'Registro de chegada do estudante', '06:00:00', '13:30:00', '#16a34a'],
            ['Saída', 'saida', 'Registro de liberação do estudante', '10:00:00', '19:00:00', '#dc2626'],
        ];

        foreach ($defaults as [$nome, $natureza, $descricao, $horarioIni, $horarioFim, $cor]) {
            $stmt->execute([
                'nome' => $nome,
                'natureza' => $natureza,
                'descricao' => $descricao,
                'horario_ini' => $horarioIni,
                'horario_fim' => $horarioFim,
                'cor' => $cor,
            ]);
        }
    }

    public function getTiposAtivos(): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query(
            'SELECT id, nome, natureza, descricao, horario_ini, horario_fim, cor, ativo
               FROM entrada_saida_tipos_movimentacao
              WHERE ativo = 1
              ORDER BY natureza, horario_ini, nome'
        );

        return $stmt ? $stmt->fetchAll() : [];
    }

    public function getTodos(): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query(
            'SELECT id, nome, natureza, descricao, horario_ini, horario_fim, cor, ativo
               FROM entrada_saida_tipos_movimentacao
              ORDER BY natureza, horario_ini, nome'
        );

        return $stmt ? $stmt->fetchAll() : [];
    }

    public function getTipoById(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT id, nome, natureza, descricao, horario_ini, horario_fim, cor, ativo
               FROM entrada_saida_tipos_movimentacao
              WHERE id = :id
              LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    public function salvarTipo(int $id, string $nome, string $natureza, string $descricao, string $horIni, string $horFim, string $cor, bool $ativo, ?int $usuarioId = null): int
    {
        $pdo = Database::connection();
        $natureza = $this->normalizeNatureza($natureza);
        $tipoAnterior = $id > 0 ? $this->getTipoById($id) : null;

        if ($id > 0) {
            $stmt = $pdo->prepare(
                'UPDATE entrada_saida_tipos_movimentacao
                    SET nome = :nome,
                        natureza = :natureza,
                        descricao = :descricao,
                        horario_ini = :horario_ini,
                        horario_fim = :horario_fim,
                        cor = :cor,
                        ativo = :ativo
                  WHERE id = :id'
            );
            $stmt->execute([
                'id' => $id,
                'nome' => $nome,
                'natureza' => $natureza,
                'descricao' => $descricao !== '' ? $descricao : null,
                'horario_ini' => $horIni !== '' ? $horIni : null,
                'horario_fim' => $horFim !== '' ? $horFim : null,
                'cor' => $cor,
                'ativo' => (int) $ativo,
            ]);

            $this->registrarAuditoria(
                'tipo_movimentacao',
                'alteracao',
                $usuarioId,
                'Tipo de movimentação atualizado: ' . $nome,
                [
                    'tipo_id' => $id,
                    'antes' => $tipoAnterior,
                    'depois' => [
                        'id' => $id,
                        'nome' => $nome,
                        'natureza' => $natureza,
                        'descricao' => $descricao !== '' ? $descricao : null,
                        'horario_ini' => $horIni !== '' ? $horIni : null,
                        'horario_fim' => $horFim !== '' ? $horFim : null,
                        'cor' => $cor,
                        'ativo' => (int) $ativo,
                    ],
                ],
                $id,
                null,
                $pdo
            );

            return $id;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO entrada_saida_tipos_movimentacao
                (nome, natureza, descricao, horario_ini, horario_fim, cor, ativo)
             VALUES (:nome, :natureza, :descricao, :horario_ini, :horario_fim, :cor, :ativo)'
        );
        $stmt->execute([
            'nome' => $nome,
            'natureza' => $natureza,
            'descricao' => $descricao !== '' ? $descricao : null,
            'horario_ini' => $horIni !== '' ? $horIni : null,
            'horario_fim' => $horFim !== '' ? $horFim : null,
            'cor' => $cor,
            'ativo' => (int) $ativo,
        ]);

        $novoId = (int) $pdo->lastInsertId();
        $this->registrarAuditoria(
            'tipo_movimentacao',
            'inclusao',
            $usuarioId,
            'Tipo de movimentação criado: ' . $nome,
            [
                'tipo_id' => $novoId,
                'nome' => $nome,
                'natureza' => $natureza,
                'descricao' => $descricao !== '' ? $descricao : null,
                'horario_ini' => $horIni !== '' ? $horIni : null,
                'horario_fim' => $horFim !== '' ? $horFim : null,
                'cor' => $cor,
                'ativo' => (int) $ativo,
            ],
            $novoId,
            null,
            $pdo
        );

        return $novoId;
    }

    public function excluirTipo(int $id, ?int $usuarioId = null): void
    {
        $pdo = Database::connection();
        $tipo = $this->getTipoById($id);
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM entrada_saida_registros WHERE tipo_movimentacao_id = :id');
        $stmt->execute(['id' => $id]);

        if ((int) $stmt->fetchColumn() > 0) {
            throw new RuntimeException('Este tipo de movimentação possui registros vinculados e não pode ser excluído. Desative-o em vez de excluir.');
        }

        $del = $pdo->prepare('DELETE FROM entrada_saida_tipos_movimentacao WHERE id = :id');
        $del->execute(['id' => $id]);

        $this->registrarAuditoria(
            'tipo_movimentacao',
            'exclusao',
            $usuarioId,
            'Tipo de movimentação excluído: ' . trim((string) ($tipo['nome'] ?? ('#' . $id))),
            [
                'tipo_id' => $id,
                'tipo' => $tipo,
            ],
            $id,
            null,
            $pdo
        );
    }

    public function buscarAlunoPorMatricula(string $matricula): ?array
    {
        $anoAtual = (int) date('Y');
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT a.id, a.nome, a.matricula, a.turma, a.turma_id, a.data_saida, a.ativo, a.situacao, t.ano_letivo
               FROM alunos a
               JOIN turmas t ON t.id = a.turma_id
              WHERE a.matricula = :matricula
                AND t.ano_letivo = :ano_letivo
              LIMIT 1'
        );
        $stmt->execute(['matricula' => $matricula, 'ano_letivo' => $anoAtual]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    public function buscarAlunoPorId(int $id): ?array
    {
        $anoAtual = (int) date('Y');
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT a.id, a.nome, a.matricula, a.turma, a.turma_id, a.data_saida, a.ativo, a.situacao, t.ano_letivo
               FROM alunos a
               JOIN turmas t ON t.id = a.turma_id
              WHERE a.id = :id
                AND t.ano_letivo = :ano_letivo
              LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'ano_letivo' => $anoAtual]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    public function pesquisarAlunos(string $q, int $turmaId, int $tipoId, string $data): array
    {
        $anoAtual = (int) date('Y');
        $pdo = Database::connection();
        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
        $where = '(a.nome LIKE :q1 OR a.turma LIKE :q2)';
        $params = [
            'q1' => $like,
            'q2' => $like,
            'ano_letivo' => $anoAtual,
        ];

        if ($turmaId > 0) {
            $where .= ' AND a.turma_id = :turma_id';
            $params['turma_id'] = $turmaId;
        }

        $stmt = $pdo->prepare(
            "SELECT a.id, a.nome, a.matricula, a.turma
               FROM alunos a
               JOIN turmas t ON t.id = a.turma_id
              WHERE {$where}
                AND a.ativo = 1
                AND t.ano_letivo = :ano_letivo
              ORDER BY a.nome
              LIMIT 25"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        if (!is_array($rows) || $rows === []) {
            return [];
        }

        $items = [];
        foreach ($rows as $row) {
            try {
                $avaliacao = $this->avaliarMovimentacao((int) $row['id'], $tipoId, $data);
            } catch (Throwable) {
                $avaliacao = [
                    'permitido' => false,
                    'message' => 'Não foi possível avaliar a movimentação deste estudante no momento.',
                    'ultima_movimentacao' => null,
                    'estado_atual' => 'sem_registro',
                ];
            }

            $items[] = [
                'id' => (int) $row['id'],
                'nome' => $row['nome'],
                'matricula' => $row['matricula'],
                'turma' => $row['turma'],
                'ja_consumiu' => $avaliacao['permitido'] ? 0 : 1,
                'mensagem_status' => $avaliacao['message'],
                'ultima_movimentacao' => $avaliacao['ultima_movimentacao'],
                'estado_atual' => $avaliacao['estado_atual'],
            ];
        }

        return $items;
    }

    public function pesquisarAlunosParaLiberacao(string $q, int $turmaId, string $data): array
    {
        $anoAtual = (int) date('Y');
        $pdo = Database::connection();
        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
        $where = '(a.nome LIKE :q1 OR a.turma LIKE :q2 OR a.matricula LIKE :q3)';
        $params = [
            'q1' => $like,
            'q2' => $like,
            'q3' => $like,
            'ano_letivo' => $anoAtual,
        ];

        if ($turmaId > 0) {
            $where .= ' AND a.turma_id = :turma_id';
            $params['turma_id'] = $turmaId;
        }

        $stmt = $pdo->prepare(
            "SELECT a.id, a.nome, a.matricula, a.turma
               FROM alunos a
               JOIN turmas t ON t.id = a.turma_id
              WHERE {$where}
                AND a.ativo = 1
                AND t.ano_letivo = :ano_letivo
              ORDER BY a.nome
              LIMIT 25"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        if (!is_array($rows) || $rows === []) {
            return [];
        }

        $items = [];
        foreach ($rows as $row) {
            try {
                $ultima = $this->buscarUltimaMovimentacaoDoDia((int) $row['id'], $data);
                $liberacao = $this->buscarLiberacaoSaidaAtiva((int) $row['id'], $data);
            } catch (Throwable) {
                $ultima = null;
                $liberacao = null;
            }

            $estadoAtual = 'sem_registro';
            if ($ultima !== null) {
                $estadoAtual = ($ultima['natureza'] ?? '') === 'saida' ? 'fora' : 'dentro';
            }

            $items[] = [
                'id' => (int) $row['id'],
                'nome' => $row['nome'],
                'matricula' => $row['matricula'],
                'turma' => $row['turma'],
                'estado_atual' => $estadoAtual,
                'ultima_movimentacao' => $ultima,
                'liberacao_ativa' => $liberacao !== null ? 1 : 0,
                'liberacao_obs' => $liberacao['obs'] ?? null,
            ];
        }

        return $items;
    }

    public function avaliarMovimentacao(int $alunoId, int $tipoId, string $data, ?string $horarioAtual = null): array
    {
        $tipo = $this->getTipoById($tipoId);
        if ($tipo === null) {
            throw new RuntimeException('Tipo de movimentação não encontrado.');
        }

        $ultima = $this->buscarUltimaMovimentacaoDoDia($alunoId, $data);
        $natureza = $this->normalizeNatureza((string) ($tipo['natureza'] ?? 'entrada'));
        $horarioAtual = $this->normalizeHorario($horarioAtual ?? date('H:i:s'));

        if ($natureza === 'saida') {
            if ($ultima === null) {
                return [
                    'permitido' => false,
                    'message' => 'Não há entrada registrada hoje para lançar a saída.',
                    'ultima_movimentacao' => null,
                    'estado_atual' => 'sem_registro',
                    'is_retorno' => false,
                    'liberacao_antecipada' => false,
                    'liberacao' => null,
                ];
            }

            if (($ultima['natureza'] ?? '') === 'saida') {
                return [
                    'permitido' => false,
                    'message' => 'A última movimentação de hoje já é uma saída.',
                    'ultima_movimentacao' => $ultima,
                    'estado_atual' => 'fora',
                    'is_retorno' => false,
                    'liberacao_antecipada' => false,
                    'liberacao' => null,
                ];
            }

            $liberacao = $this->buscarLiberacaoSaidaAtiva($alunoId, $data);
            if (!$this->saidaDentroDoHorario($tipo, $horarioAtual) && $liberacao === null) {
                $horarioMinimo = trim((string) ($tipo['horario_ini'] ?? ''));
                $horarioLabel = $horarioMinimo !== '' ? substr($horarioMinimo, 0, 5) : '';

                return [
                    'permitido' => false,
                    'message' => $horarioLabel !== ''
                        ? ('Saída disponível somente a partir das ' . $horarioLabel . ', salvo liberação antecipada.')
                        : 'Saída bloqueada até liberação da gestão.',
                    'ultima_movimentacao' => $ultima,
                    'estado_atual' => 'dentro',
                    'is_retorno' => false,
                    'liberacao_antecipada' => false,
                    'liberacao' => null,
                ];
            }

            return [
                'permitido' => true,
                'message' => $liberacao !== null
                    ? 'Saída liberada por autorização antecipada.'
                    : 'Saída liberada para registro.',
                'ultima_movimentacao' => $ultima,
                'estado_atual' => 'dentro',
                'is_retorno' => false,
                'liberacao_antecipada' => $liberacao !== null,
                'liberacao' => $liberacao,
            ];
        }

        if ($ultima !== null && ($ultima['natureza'] ?? '') === 'entrada') {
            return [
                'permitido' => false,
                'message' => 'Este estudante já possui entrada registrada hoje e ainda não saiu.',
                'ultima_movimentacao' => $ultima,
                'estado_atual' => 'dentro',
                'is_retorno' => false,
                'liberacao_antecipada' => false,
                'liberacao' => null,
            ];
        }

		$isRetorno = $ultima !== null && ($ultima['natureza'] ?? '') === 'saida';

        return [
            'permitido' => true,
            'message' => $isRetorno ? 'Retorno liberado para registro.' : 'Entrada liberada para registro.',
            'ultima_movimentacao' => $ultima,
            'estado_atual' => $ultima === null ? 'sem_registro' : 'fora',
            'is_retorno' => $isRetorno,
            'liberacao_antecipada' => false,
            'liberacao' => null,
        ];
    }

    public function registrarMovimentacao(int $alunoId, int $tipoId, string $data, string $horario, ?int $usuarioId, string $obs = ''): int
    {
        $pdo = Database::connection();
        $aluno = $this->buscarAlunoPorId($alunoId);
        $tipo = $this->getTipoById($tipoId);
        $stmt = $pdo->prepare(
            'INSERT INTO entrada_saida_registros
                (aluno_id, tipo_movimentacao_id, data, horario, usuario_id, obs, saida_automatica)
             VALUES (:aluno_id, :tipo_movimentacao_id, :data, :horario, :usuario_id, :obs, 0)'
        );
        $stmt->execute([
            'aluno_id' => $alunoId,
            'tipo_movimentacao_id' => $tipoId,
            'data' => $data,
            'horario' => $horario,
            'usuario_id' => $usuarioId ?: null,
            'obs' => $obs !== '' ? $obs : null,
        ]);

        $novoId = (int) $pdo->lastInsertId();
        $this->registrarAuditoria(
            'registro',
            'inclusao',
            $usuarioId,
            'Registro de movimentação incluído para ' . trim((string) ($aluno['nome'] ?? ('Aluno #' . $alunoId))),
            [
                'registro_id' => $novoId,
                'aluno' => $aluno,
                'tipo' => $tipo,
                'data' => $data,
                'horario' => $horario,
                'obs' => $obs !== '' ? $obs : null,
                'saida_automatica' => 0,
            ],
            $novoId,
            $alunoId,
            $pdo
        );

        return $novoId;
    }

    public function processarSaidasAutomaticasPendentes(?DateTimeImmutable $agora = null): int
    {
        $agora = $agora ?: new DateTimeImmutable('now');
        $dataLimite = $this->obterDataLimiteSaidasAutomaticas($agora);
        if ($dataLimite === null) {
            return 0;
        }

        $tipoSaida = $this->buscarTipoSaidaPadrao();
        if ($tipoSaida === null) {
            return 0;
        }

        $pdo = Database::connection();
        $pendentesStmt = $pdo->prepare(
            'SELECT r.id, r.aluno_id, r.data
               FROM entrada_saida_registros r
               JOIN entrada_saida_tipos_movimentacao t ON t.id = r.tipo_movimentacao_id
              WHERE r.data <= :data_limite
                AND t.natureza = "entrada"
                AND NOT EXISTS (
                    SELECT 1
                      FROM entrada_saida_registros r2
                      JOIN entrada_saida_tipos_movimentacao t2 ON t2.id = r2.tipo_movimentacao_id
                     WHERE r2.aluno_id = r.aluno_id
                       AND r2.data = r.data
                       AND (
                            r2.horario > r.horario
                            OR (r2.horario = r.horario AND r2.id > r.id)
                       )
                )
              ORDER BY r.data, r.aluno_id, r.id'
        );
        $pendentesStmt->execute(['data_limite' => $dataLimite]);
        $pendentes = $pendentesStmt->fetchAll();
        if (!is_array($pendentes) || $pendentes === []) {
            return 0;
        }

        $insertStmt = $pdo->prepare(
            'INSERT INTO entrada_saida_registros
                (aluno_id, tipo_movimentacao_id, data, horario, usuario_id, obs, saida_automatica)
             VALUES (:aluno_id, :tipo_movimentacao_id, :data, :horario, NULL, :obs, 1)'
        );

        $totalGerado = 0;
        foreach ($pendentes as $pendente) {
            $insertStmt->execute([
                'aluno_id' => (int) $pendente['aluno_id'],
                'tipo_movimentacao_id' => (int) $tipoSaida['id'],
                'data' => (string) $pendente['data'],
                'horario' => '23:59:59',
                'obs' => 'Saída automática gerada às 23:59 por ausência de registro de saída.',
            ]);
            $totalGerado += 1;
        }

        return $totalGerado;
    }

    public function concederLiberacaoSaida(int $alunoId, string $data, ?int $usuarioId, string $obs = ''): array
    {
        $ultima = $this->buscarUltimaMovimentacaoDoDia($alunoId, $data);
        if ($ultima === null || ($ultima['natureza'] ?? '') !== 'entrada') {
            throw new RuntimeException('A liberação antecipada só pode ser concedida para estudantes com entrada registrada e ainda sem saída hoje.');
        }

        $pdo = Database::connection();
        $aluno = $this->buscarAlunoPorId($alunoId);
        $existente = $this->buscarLiberacaoSaidaAtiva($alunoId, $data);
        if ($existente !== null) {
            $stmt = $pdo->prepare(
                'UPDATE entrada_saida_liberacoes
                    SET usuario_id = :usuario_id,
                        obs = :obs
                  WHERE id = :id'
            );
            $stmt->execute([
                'id' => (int) $existente['id'],
                'usuario_id' => $usuarioId ?: null,
                'obs' => $obs !== '' ? $obs : ($existente['obs'] ?? null),
            ]);

            $atualizada = $this->buscarLiberacaoSaidaAtiva($alunoId, $data) ?: $existente;
            $this->registrarAuditoria(
                'liberacao',
                'alteracao',
                $usuarioId,
                'Liberação atualizada para ' . trim((string) ($aluno['nome'] ?? ('Aluno #' . $alunoId))),
                [
                    'liberacao_id' => (int) $existente['id'],
                    'aluno' => $aluno,
                    'antes' => $existente,
                    'depois' => $atualizada,
                ],
                (int) $existente['id'],
                $alunoId,
                $pdo
            );

            return $atualizada;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO entrada_saida_liberacoes
                (aluno_id, data, usuario_id, obs, status)
             VALUES (:aluno_id, :data, :usuario_id, :obs, 'pendente')"
        );
        $stmt->execute([
            'aluno_id' => $alunoId,
            'data' => $data,
            'usuario_id' => $usuarioId ?: null,
            'obs' => $obs !== '' ? $obs : null,
        ]);

        $novaLiberacao = $this->buscarLiberacaoSaidaAtiva($alunoId, $data) ?: [
            'id' => (int) $pdo->lastInsertId(),
            'aluno_id' => $alunoId,
            'data' => $data,
            'usuario_id' => $usuarioId,
            'obs' => $obs !== '' ? $obs : null,
            'status' => 'pendente',
        ];
        $this->registrarAuditoria(
            'liberacao',
            'inclusao',
            $usuarioId,
            'Liberação criada para ' . trim((string) ($aluno['nome'] ?? ('Aluno #' . $alunoId))),
            [
                'liberacao' => $novaLiberacao,
                'aluno' => $aluno,
            ],
            (int) ($novaLiberacao['id'] ?? 0),
            $alunoId,
            $pdo
        );

        return $novaLiberacao;
    }

    public function consumirLiberacaoSaida(int $liberacaoId, int $registroSaidaId, ?int $usuarioId = null): void
    {
        $pdo = Database::connection();
        $stmtInfo = $pdo->prepare(
            'SELECT l.id, l.aluno_id, l.data, l.usuario_id, l.obs, l.status, l.created_at, a.nome AS aluno_nome
               FROM entrada_saida_liberacoes l
               JOIN alunos a ON a.id = l.aluno_id
              WHERE l.id = :id
              LIMIT 1'
        );
        $stmtInfo->execute(['id' => $liberacaoId]);
        $liberacao = $stmtInfo->fetch() ?: null;
        $stmt = $pdo->prepare(
            "UPDATE entrada_saida_liberacoes
                SET status = 'utilizada',
                    usado_em = NOW(),
                    registro_saida_id = :registro_saida_id
              WHERE id = :id
                AND status = 'pendente'"
        );
        $stmt->execute([
            'id' => $liberacaoId,
            'registro_saida_id' => $registroSaidaId,
        ]);

        if (is_array($liberacao)) {
            $this->registrarAuditoria(
                'liberacao',
                'consumo',
                $usuarioId,
                'Liberação consumida para registrar saída de ' . trim((string) ($liberacao['aluno_nome'] ?? ('Aluno #' . (int) $liberacao['aluno_id']))),
                [
                    'liberacao' => $liberacao,
                    'registro_saida_id' => $registroSaidaId,
                ],
                $liberacaoId,
                (int) ($liberacao['aluno_id'] ?? 0),
                $pdo
            );
        }
    }

    public function cancelarLiberacaoSaida(int $liberacaoId, ?int $usuarioId = null): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT id, aluno_id, data, status, registro_saida_id
               FROM entrada_saida_liberacoes
              WHERE id = :id
              LIMIT 1'
        );
        $stmt->execute(['id' => $liberacaoId]);
        $liberacao = $stmt->fetch();

        if (!$liberacao) {
            throw new RuntimeException('Liberação não encontrada.');
        }

        $status = (string) ($liberacao['status'] ?? '');
        if (!in_array($status, ['pendente', 'utilizada'], true)) {
            throw new RuntimeException('Esta liberação não pode mais ser cancelada.');
        }

        $pdo->beginTransaction();
        try {
            if ($status === 'utilizada' && !empty($liberacao['registro_saida_id'])) {
                $registroSaidaId = (int) $liberacao['registro_saida_id'];
                $alunoId = (int) $liberacao['aluno_id'];
                $data = (string) $liberacao['data'];
                $registroRemovido = $this->buscarRegistroPorId($registroSaidaId);

                $posteriorStmt = $pdo->prepare(
                    'SELECT COUNT(*)
                       FROM entrada_saida_registros
                      WHERE aluno_id = :aluno_id
                        AND data = :data
                        AND id > :registro_id'
                );
                $posteriorStmt->execute([
                    'aluno_id' => $alunoId,
                    'data' => $data,
                    'registro_id' => $registroSaidaId,
                ]);

                if ((int) ($posteriorStmt->fetchColumn() ?: 0) > 0) {
                    throw new RuntimeException('Não é possível cancelar esta liberação porque já existem movimentações posteriores para o estudante no dia.');
                }

                $deleteRegistroStmt = $pdo->prepare(
                    'DELETE FROM entrada_saida_registros
                      WHERE id = :id
                      LIMIT 1'
                );
                $deleteRegistroStmt->execute(['id' => $registroSaidaId]);

                $this->registrarAuditoria(
                    'registro',
                    'exclusao',
                    $usuarioId,
                    'Registro de saída removido ao cancelar liberação',
                    [
                        'motivo' => 'cancelamento_liberacao',
                        'registro' => $registroRemovido,
                        'liberacao_id' => $liberacaoId,
                    ],
                    $registroSaidaId,
                    $alunoId,
                    $pdo
                );
            }

            $deleteLiberacaoStmt = $pdo->prepare(
                'DELETE FROM entrada_saida_liberacoes
                  WHERE id = :id
                  LIMIT 1'
            );
            $deleteLiberacaoStmt->execute(['id' => $liberacaoId]);

            $this->registrarAuditoria(
                'liberacao',
                'cancelamento',
                $usuarioId,
                'Liberação cancelada',
                [
                    'liberacao' => $liberacao,
                ],
                $liberacaoId,
                (int) ($liberacao['aluno_id'] ?? 0),
                $pdo
            );

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public function listarLiberacoesDoDia(string $data, $status = null): array
    {
        $pdo = Database::connection();
        $params = ['data' => $data];
        $wheres = ['l.data = :data'];
        $statusList = $this->normalizeIdList($status);

        if (!empty($statusList)) {
            $placeholders = [];
            foreach ($statusList as $index => $statusValue) {
                $key = 'status_' . $index;
                $placeholders[] = ':' . $key;
                $params[$key] = $statusValue;
            }
            $wheres[] = 'l.status IN (' . implode(', ', $placeholders) . ')';
        }

        $stmt = $pdo->prepare(
            'SELECT l.id, l.aluno_id, l.data, l.obs, l.status, l.created_at, l.usado_em, l.registro_saida_id,
                l.usuario_id, a.nome AS aluno_nome, a.matricula, a.turma,
                CASE
                    WHEN l.usuario_id IS NULL THEN "Sistema"
                    ELSE COALESCE(NULLIF(u.nome, ""), NULLIF(u.usuario, ""), "Sistema")
                END AS usuario_nome
               FROM entrada_saida_liberacoes l
               JOIN alunos a ON a.id = l.aluno_id
               LEFT JOIN usuarios u ON u.id = l.usuario_id
              WHERE ' . implode(' AND ', $wheres) . '
              ORDER BY l.created_at DESC, l.id DESC'
        );
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public function listarLiberacoesAtivas(string $data): array
    {
        return $this->listarLiberacoesDoDia($data);
    }

    public function resumoHoje(string $data): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT t.id, t.nome, t.natureza, t.cor,
                    COUNT(r.id) AS total
               FROM entrada_saida_tipos_movimentacao t
               LEFT JOIN entrada_saida_registros r
                      ON r.tipo_movimentacao_id = t.id AND r.data = :data
              WHERE t.ativo = 1
              GROUP BY t.id, t.nome, t.natureza, t.cor
              ORDER BY t.natureza, t.horario_ini, t.nome'
        );
        $stmt->execute(['data' => $data]);

        return $stmt->fetchAll();
    }

    public function resumoPresencaHoje(string $data, ?int $turmaId = null): array
    {
        $pdo = Database::connection();
        $params = ['data' => $data];
        $turmaFilter = '';

        if ($turmaId !== null && $turmaId > 0) {
            $turmaFilter = ' AND a.turma_id = :turma_id';
            $params['turma_id'] = $turmaId;
        }

        $baseSql =
            'SELECT
                SUM(CASE WHEN t.natureza = \'entrada\' THEN 1 ELSE 0 END) AS total_entradas,
                SUM(CASE WHEN t.natureza = \'saida\' THEN 1 ELSE 0 END) AS total_saidas,
                COUNT(DISTINCT CASE WHEN t.natureza = \'entrada\' THEN r.aluno_id END) AS alunos_com_entrada,
                COUNT(DISTINCT a.turma_id) AS turmas_com_movimento
             FROM entrada_saida_registros r
             JOIN entrada_saida_tipos_movimentacao t ON t.id = r.tipo_movimentacao_id
             JOIN alunos a ON a.id = r.aluno_id
             WHERE r.data = :data' . $turmaFilter;

        $stmt = $pdo->prepare($baseSql);
        $stmt->execute($params);
        $base = $stmt->fetch() ?: [];

        $presentesSql =
            'SELECT COUNT(*)
               FROM (
                    SELECT r.aluno_id, MAX(r.id) AS max_id
                      FROM entrada_saida_registros r
                      JOIN alunos a ON a.id = r.aluno_id
                     WHERE r.data = :data' . $turmaFilter . '
                     GROUP BY r.aluno_id
               ) ult
               JOIN entrada_saida_registros r2 ON r2.id = ult.max_id
               JOIN entrada_saida_tipos_movimentacao t2 ON t2.id = r2.tipo_movimentacao_id
              WHERE t2.natureza = \'entrada\'';

        $presentesStmt = $pdo->prepare($presentesSql);
        $presentesStmt->execute($params);
        $presentesAgora = (int) ($presentesStmt->fetchColumn() ?: 0);

        return [
            'total_alunos_ativos' => $this->totalAlunosAtivos($turmaId),
            'total_entradas' => (int) ($base['total_entradas'] ?? 0),
            'total_saidas' => (int) ($base['total_saidas'] ?? 0),
            'alunos_com_entrada' => (int) ($base['alunos_com_entrada'] ?? 0),
            'turmas_com_movimento' => (int) ($base['turmas_com_movimento'] ?? 0),
            'presentes_agora' => $presentesAgora,
        ];
    }

    public function relatorio(string $dataInicio, string $dataFim, $tipoIds = null, $turmaIds = null): array
    {
        $pdo = Database::connection();
        $wheres = ['r.data BETWEEN :ini AND :fim'];
        $params = ['ini' => $dataInicio, 'fim' => $dataFim];
        $tipoList = $this->normalizeIdList($tipoIds);
        $turmaList = $this->normalizeIdList($turmaIds);

        if (!empty($tipoList)) {
            $wheres[] = 'r.tipo_movimentacao_id IN (' . $this->buildIntegerInClause($tipoList, 'tipo', $params) . ')';
        }

        if (!empty($turmaList)) {
            $wheres[] = 'a.turma_id IN (' . $this->buildIntegerInClause($turmaList, 'turma', $params) . ')';
        }

        $stmt = $pdo->prepare(
            'SELECT r.id, r.data, r.horario,
                a.nome AS aluno_nome, a.matricula, a.turma, a.turma_id,
                t.nome AS refeicao_nome, t.cor AS refeicao_cor,
                t.natureza,
                r.tipo_movimentacao_id AS tipo_refeicao_id,
                r.usuario_id,
                CASE
                    WHEN r.usuario_id IS NULL THEN "Sistema"
                    ELSE COALESCE(NULLIF(u.nome, ""), NULLIF(u.usuario, ""), "Sistema")
                END AS usuario_nome,
                                        CASE
                                                WHEN t.natureza = "entrada" AND EXISTS (
                                                        SELECT 1
                                                            FROM entrada_saida_registros r_prev
                                                            JOIN entrada_saida_tipos_movimentacao t_prev ON t_prev.id = r_prev.tipo_movimentacao_id
                                                         WHERE r_prev.aluno_id = r.aluno_id
                                                             AND r_prev.data = r.data
                                                             AND t_prev.natureza = "saida"
                                                             AND (r_prev.horario < r.horario OR (r_prev.horario = r.horario AND r_prev.id < r.id))
                                                ) THEN 1
                                                ELSE 0
                                        END AS is_retorno,
                    r.obs
               FROM entrada_saida_registros r
               JOIN alunos a ON a.id = r.aluno_id
               JOIN entrada_saida_tipos_movimentacao t ON t.id = r.tipo_movimentacao_id
               LEFT JOIN usuarios u ON u.id = r.usuario_id
              WHERE ' . implode(' AND ', $wheres) . '
              ORDER BY r.data DESC, r.horario DESC, r.id DESC'
        );
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public function totalPorTipoNoPeriodo(string $dataInicio, string $dataFim, $tipoIds = null, $turmaIds = null): array
    {
        $pdo = Database::connection();
        $params = ['ini' => $dataInicio, 'fim' => $dataFim];
        $where = ['t.ativo = 1'];
        $countExpr = 'SUM(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END)';
        $tipoList = $this->normalizeIdList($tipoIds);
        $turmaList = $this->normalizeIdList($turmaIds);

        if (!empty($tipoList)) {
            $where[] = 't.id IN (' . $this->buildIntegerInClause($tipoList, 'tipo_total', $params) . ')';
        }

        if (!empty($turmaList)) {
            $countExpr = 'SUM(CASE WHEN r.id IS NOT NULL AND a.turma_id IN (' . $this->buildIntegerInClause($turmaList, 'turma_total', $params) . ') THEN 1 ELSE 0 END)';
        }

        $sql = 'SELECT t.id, t.nome, t.cor, t.natureza,
                       COALESCE(' . $countExpr . ', 0) AS total
                  FROM entrada_saida_tipos_movimentacao t
                  LEFT JOIN entrada_saida_registros r
                         ON r.tipo_movimentacao_id = t.id
                        AND r.data BETWEEN :ini AND :fim
                  LEFT JOIN alunos a ON a.id = r.aluno_id
                 WHERE ' . implode(' AND ', $where) . '
                 GROUP BY t.id, t.nome, t.cor, t.natureza
                 ORDER BY t.natureza, t.horario_ini, t.nome';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public function resumoLiberacoesNoPeriodo(string $dataInicio, string $dataFim, $turmaIds = null): array
    {
        $pdo = Database::connection();
        $params = ['ini' => $dataInicio, 'fim' => $dataFim];
        $wheres = ['l.data BETWEEN :ini AND :fim', "l.status = 'utilizada'", 'l.registro_saida_id IS NOT NULL'];
        $turmaList = $this->normalizeIdList($turmaIds);

        if (!empty($turmaList)) {
            $wheres[] = 'a.turma_id IN (' . $this->buildIntegerInClause($turmaList, 'turma_lib', $params) . ')';
        }

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS total_liberacoes,
                    COUNT(DISTINCT l.aluno_id) AS alunos_com_liberacao
               FROM entrada_saida_liberacoes l
               JOIN alunos a ON a.id = l.aluno_id
              WHERE ' . implode(' AND ', $wheres)
        );
        $stmt->execute($params);

        $row = $stmt->fetch() ?: [];

        return [
            'total_saidas_com_liberacao' => (int) ($row['total_liberacoes'] ?? 0),
            'alunos_com_saida_liberada' => (int) ($row['alunos_com_liberacao'] ?? 0),
        ];
    }

    public function ultimasMovimentacoesHoje(string $data, int $limit = 10): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT r.id, r.horario,
                    a.nome AS aluno_nome, a.turma,
                    t.nome AS tipo_nome, t.cor AS tipo_cor, t.natureza,
                    r.usuario_id,
                    CASE
                        WHEN r.usuario_id IS NULL THEN "Sistema"
                        ELSE COALESCE(NULLIF(u.nome, ""), NULLIF(u.usuario, ""), "Sistema")
                    END AS usuario_nome,
                    r.saida_automatica,
                    CASE
                        WHEN t.natureza = "entrada" AND EXISTS (
                            SELECT 1
                              FROM entrada_saida_registros r_prev
                              JOIN entrada_saida_tipos_movimentacao t_prev ON t_prev.id = r_prev.tipo_movimentacao_id
                             WHERE r_prev.aluno_id = r.aluno_id
                               AND r_prev.data = r.data
                               AND t_prev.natureza = "saida"
                               AND (r_prev.horario < r.horario OR (r_prev.horario = r.horario AND r_prev.id < r.id))
                        ) THEN 1
                        ELSE 0
                    END AS is_retorno
               FROM entrada_saida_registros r
               JOIN alunos a ON a.id = r.aluno_id
               JOIN entrada_saida_tipos_movimentacao t ON t.id = r.tipo_movimentacao_id
               LEFT JOIN usuarios u ON u.id = r.usuario_id
              WHERE r.data = :data
              ORDER BY r.id DESC
              LIMIT ' . max(1, $limit)
        );
        $stmt->execute(['data' => $data]);

        return $stmt->fetchAll();
    }

    public function listarAlunosParaQr(?int $turmaId = null): array
    {
        $pdo = Database::connection();
        $anoAtual = (int) date('Y');
        $where = 'WHERE a.ativo = 1 AND t.ano_letivo = :ano_letivo';
        $params = ['ano_letivo' => $anoAtual];

        if ($turmaId !== null && $turmaId > 0) {
            $where .= ' AND a.turma_id = :turma';
            $params['turma'] = $turmaId;
        }

        $stmt = $pdo->prepare(
            "SELECT a.id, a.nome, a.matricula, a.turma
               FROM alunos a
               JOIN turmas t ON t.id = a.turma_id
               {$where}
              ORDER BY a.turma, a.nome"
        );
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public function buscarRegistroPorId(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT r.id, r.data, r.horario, r.obs,
                r.tipo_movimentacao_id AS tipo_refeicao_id,
                r.usuario_id,
                CASE
                    WHEN r.usuario_id IS NULL THEN "Sistema"
                    ELSE COALESCE(NULLIF(u.nome, ""), NULLIF(u.usuario, ""), "Sistema")
                END AS usuario_nome,
                r.saida_automatica,
                a.nome AS aluno_nome
               FROM entrada_saida_registros r
               JOIN alunos a ON a.id = r.aluno_id
               LEFT JOIN usuarios u ON u.id = r.usuario_id
              WHERE r.id = :id
              LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function salvarRegistro(int $id, string $data, string $horario, int $tipoId, string $obs, ?int $usuarioId = null): void
    {
        $pdo = Database::connection();
        $antes = $this->buscarRegistroPorId($id);
        $stmt = $pdo->prepare(
            'UPDATE entrada_saida_registros
                SET data = :data,
                    horario = :horario,
                    tipo_movimentacao_id = :tipo,
                    obs = :obs
              WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'data' => $data,
            'horario' => $horario,
            'tipo' => $tipoId,
            'obs' => $obs,
        ]);

        $depois = $this->buscarRegistroPorId($id);
        $this->registrarAuditoria(
            'registro',
            'alteracao',
            $usuarioId,
            'Registro atualizado de ' . trim((string) ($depois['aluno_nome'] ?? $antes['aluno_nome'] ?? ('#' . $id))),
            [
                'antes' => $antes,
                'depois' => $depois,
            ],
            $id,
            null,
            $pdo
        );
    }

    public function excluirRegistro(int $id, ?int $usuarioId = null): void
    {
        $pdo = Database::connection();
        $registro = $this->buscarRegistroPorId($id);
        $stmt = $pdo->prepare('DELETE FROM entrada_saida_registros WHERE id = :id');
        $stmt->execute(['id' => $id]);

        $this->registrarAuditoria(
            'registro',
            'exclusao',
            $usuarioId,
            'Registro excluído de ' . trim((string) ($registro['aluno_nome'] ?? ('#' . $id))),
            [
                'registro' => $registro,
            ],
            $id,
            null,
            $pdo
        );
    }

    public function listarAuditoria(string $dataInicio, string $dataFim, array $acoes = [], array $entidades = [], string $busca = ''): array
    {
        $pdo = Database::connection();
        $wheres = ['DATE(a.created_at) BETWEEN :ini AND :fim'];
        $params = ['ini' => $dataInicio, 'fim' => $dataFim];
        $acoes = $this->normalizeAuditValueList($acoes);
        $entidades = $this->normalizeAuditValueList($entidades);
        $busca = trim($busca);

        if (!empty($acoes)) {
            $wheres[] = 'a.acao IN (' . $this->buildStringInClause($acoes, 'acao_audit', $params) . ')';
        }

        if (!empty($entidades)) {
            $wheres[] = 'a.entidade IN (' . $this->buildStringInClause($entidades, 'entidade_audit', $params) . ')';
        }

        if ($busca !== '') {
            $params['busca'] = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $busca) . '%';
            $wheres[] = '(a.resumo LIKE :busca OR CASE WHEN a.usuario_id IS NULL THEN "Sistema" ELSE COALESCE(NULLIF(u.nome, ""), NULLIF(u.usuario, ""), "Sistema") END LIKE :busca OR COALESCE(al.nome, "") LIKE :busca)';
        }

        $stmt = $pdo->prepare(
            'SELECT a.id, a.entidade, a.acao, a.referencia_id, a.aluno_id, a.usuario_id,
                    a.resumo, a.detalhes_json, a.created_at,
                    CASE
                        WHEN a.usuario_id IS NULL THEN "Sistema"
                        ELSE COALESCE(NULLIF(u.nome, ""), NULLIF(u.usuario, ""), "Sistema")
                    END AS usuario_nome,
                    COALESCE(al.nome, "") AS aluno_nome
               FROM auditoria_entrada_saida a
               LEFT JOIN usuarios u ON u.id = a.usuario_id
               LEFT JOIN alunos al ON al.id = a.aluno_id
              WHERE ' . implode(' AND ', $wheres) . '
              ORDER BY a.created_at DESC, a.id DESC'
        );
        $stmt->execute($params);

        return $stmt->fetchAll() ?: [];
    }

    public function totalAlunosAtivos($turmaIds = null): int
    {
        $pdo = Database::connection();
        $anoAtual = (int) date('Y');
        $sql = 'SELECT COUNT(*) FROM alunos a JOIN turmas t ON t.id = a.turma_id WHERE a.ativo = 1 AND a.situacao = :situacao AND t.ano_letivo = :ano_letivo';
        $params = ['ano_letivo' => $anoAtual];
        $params['situacao'] = 'Cursando';
        $turmaList = $this->normalizeIdList($turmaIds);

        if (!empty($turmaList)) {
            $sql .= ' AND a.turma_id IN (' . $this->buildIntegerInClause($turmaList, 'turma_ativa', $params) . ')';
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) ($stmt->fetchColumn() ?: 0);
    }

    private function buscarUltimaMovimentacaoDoDia(int $alunoId, string $data): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT r.id, r.horario,
                    t.id AS tipo_id,
                    t.nome AS tipo_nome,
                    t.natureza,
                    r.saida_automatica,
                    CASE
                        WHEN t.natureza = "entrada" AND EXISTS (
                            SELECT 1
                              FROM entrada_saida_registros r_prev
                              JOIN entrada_saida_tipos_movimentacao t_prev ON t_prev.id = r_prev.tipo_movimentacao_id
                             WHERE r_prev.aluno_id = r.aluno_id
                               AND r_prev.data = r.data
                               AND t_prev.natureza = "saida"
                               AND (r_prev.horario < r.horario OR (r_prev.horario = r.horario AND r_prev.id < r.id))
                        ) THEN 1
                        ELSE 0
                    END AS is_retorno,
                    t.cor
               FROM entrada_saida_registros r
               JOIN entrada_saida_tipos_movimentacao t ON t.id = r.tipo_movimentacao_id
              WHERE r.aluno_id = :aluno_id
                AND r.data = :data
              ORDER BY r.horario DESC, r.id DESC
              LIMIT 1'
        );
        $stmt->execute([
            'aluno_id' => $alunoId,
            'data' => $data,
        ]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    private function buscarLiberacaoSaidaAtiva(int $alunoId, string $data): ?array
    {
        $pdo = Database::connection();
                $stmt = $pdo->prepare(
                        "SELECT id, aluno_id, data, usuario_id, obs, status, created_at
                             FROM entrada_saida_liberacoes
                            WHERE aluno_id = :aluno_id
                                AND data = :data
                                AND status = 'pendente'
                            ORDER BY id DESC
                            LIMIT 1"
                );
        $stmt->execute([
            'aluno_id' => $alunoId,
            'data' => $data,
        ]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    private function registrarAuditoria(string $entidade, string $acao, ?int $usuarioId, string $resumo, array $detalhes = [], ?int $referenciaId = null, ?int $alunoId = null, ?PDO $pdo = null): void
    {
        $pdo = $pdo ?: Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO auditoria_entrada_saida
                (entidade, acao, referencia_id, aluno_id, usuario_id, resumo, detalhes_json)
             VALUES (:entidade, :acao, :referencia_id, :aluno_id, :usuario_id, :resumo, :detalhes_json)'
        );
        $stmt->execute([
            'entidade' => substr(trim($entidade), 0, 32),
            'acao' => substr(trim($acao), 0, 24),
            'referencia_id' => $referenciaId ?: null,
            'aluno_id' => $alunoId ?: null,
            'usuario_id' => $usuarioId ?: null,
            'resumo' => mb_substr(trim($resumo), 0, 255),
            'detalhes_json' => !empty($detalhes) ? json_encode($detalhes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
        ]);
    }

    private function normalizeAuditValueList(array $values): array
    {
        $items = [];
        foreach ($values as $value) {
            $normalized = strtolower(trim((string) $value));
            if ($normalized === '') {
                continue;
            }
            $items[$normalized] = $normalized;
        }

        return array_values($items);
    }

    private function buildStringInClause(array $values, string $prefix, array &$params): string
    {
        $placeholders = [];
        foreach (array_values($values) as $index => $value) {
            $key = $prefix . '_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = (string) $value;
        }

        return implode(', ', $placeholders);
    }

    private function normalizeIdList($values): array
    {
        if ($values === null || $values === '') {
            return [];
        }

        if (!is_array($values)) {
            $values = explode(',', (string) $values);
        }

        $normalized = [];
        foreach ($values as $value) {
            $item = trim((string) $value);
            if ($item === '' || in_array($item, $normalized, true)) {
                continue;
            }
            $normalized[] = $item;
        }

        return $normalized;
    }

    private function buildIntegerInClause(array $values, string $prefix, array &$params): string
    {
        $placeholders = [];
        foreach ($values as $index => $value) {
            $key = $prefix . '_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = (int) $value;
        }

        return implode(', ', $placeholders);
    }

    private function obterDataLimiteSaidasAutomaticas(DateTimeImmutable $agora): ?string
    {
        $horaAtual = $agora->format('H:i:s');
        $intervaloDias = $horaAtual >= '23:59:00' ? 0 : 1;
        $dataLimite = $agora->setTime(0, 0, 0)->modify('-' . $intervaloDias . ' day');
        return $dataLimite->format('Y-m-d');
    }

    private function buscarTipoSaidaPadrao(): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query(
            "SELECT id, nome, natureza, descricao, horario_ini, horario_fim, cor, ativo
               FROM entrada_saida_tipos_movimentacao
              WHERE natureza = 'saida'
              ORDER BY ativo DESC, horario_ini, nome
              LIMIT 1"
        );
        $row = $stmt ? $stmt->fetch() : false;

        return $row !== false ? $row : null;
    }

    private function saidaDentroDoHorario(array $tipo, string $horarioAtual): bool
    {
        $horarioMinimo = trim((string) ($tipo['horario_ini'] ?? ''));
        if ($horarioMinimo === '') {
            return true;
        }

        return $this->normalizeHorario($horarioAtual) >= $this->normalizeHorario($horarioMinimo);
    }

    private function normalizeHorario(string $horario): string
    {
        $horario = trim($horario);
        if (preg_match('/^\d{2}:\d{2}$/', $horario)) {
            return $horario . ':00';
        }

        return preg_match('/^\d{2}:\d{2}:\d{2}$/', $horario) ? $horario : '00:00:00';
    }

    private function normalizeNatureza(string $natureza): string
    {
        $natureza = strtolower(trim($natureza));
        return $natureza === 'saida' ? 'saida' : 'entrada';
    }
}