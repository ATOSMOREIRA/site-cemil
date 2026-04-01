<?php
declare(strict_types=1);

class RefeitorioModel
{
    // ------------------------------------------------------------------
    // Bootstrap / migrações automáticas
    // ------------------------------------------------------------------

    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS refeitorio_tipos_refeicao (
                id          INT          NOT NULL AUTO_INCREMENT,
                nome        VARCHAR(80)  NOT NULL,
                descricao   VARCHAR(255) NULL,
                horario_ini TIME         NULL,
                horario_fim TIME         NULL,
                cor         VARCHAR(7)   NOT NULL DEFAULT \'#4a90d9\',
                ativo       TINYINT(1)   NOT NULL DEFAULT 1,
                created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_refeitorio_tipos_nome (nome)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS refeitorio_registros (
                id               INT          NOT NULL AUTO_INCREMENT,
                aluno_id         INT          NOT NULL,
                tipo_refeicao_id INT          NOT NULL,
                data             DATE         NOT NULL,
                horario          TIME         NOT NULL,
                usuario_id       INT          NULL,
                obs              VARCHAR(255) NULL,
                created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_refeitorio_aluno_tipo_data (aluno_id, tipo_refeicao_id, data),
                KEY idx_refeitorio_data       (data),
                KEY idx_refeitorio_tipo_data  (tipo_refeicao_id, data),
                KEY idx_refeitorio_aluno      (aluno_id),
                CONSTRAINT fk_refeitorio_reg_aluno FOREIGN KEY (aluno_id)
                    REFERENCES alunos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT fk_refeitorio_reg_tipo  FOREIGN KEY (tipo_refeicao_id)
                    REFERENCES refeitorio_tipos_refeicao (id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS auditoria_refeitorio (
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
                KEY idx_auditoria_refeitorio_entidade_data (entidade, created_at),
                KEY idx_auditoria_refeitorio_acao_data (acao, created_at),
                KEY idx_auditoria_refeitorio_usuario_data (usuario_id, created_at),
                KEY idx_auditoria_refeitorio_aluno_data (aluno_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $this->seedDefaultTipos();
    }

    private function seedDefaultTipos(): void
    {
        $pdo = Database::connection();
        $count = (int) ($pdo->query('SELECT COUNT(*) FROM refeitorio_tipos_refeicao')?->fetchColumn() ?: 0);
        if ($count > 0) {
            return;
        }

        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO refeitorio_tipos_refeicao (nome, descricao, horario_ini, horario_fim, cor)
             VALUES (:nome, :desc, :ini, :fim, :cor)'
        );

        $defaults = [
            ['Café da Manhã',    'Refeição matinal',           '07:00:00', '09:00:00', '#f59e0b'],
            ['Lanche da Manhã',  'Lanche intermediário',       '09:30:00', '10:00:00', '#10b981'],
            ['Almoço',           'Refeição do meio-dia',       '11:00:00', '13:30:00', '#3b82f6'],
            ['Lanche da Tarde',  'Lanche da tarde',            '15:00:00', '15:30:00', '#8b5cf6'],
            ['Jantar',           'Refeição noturna',           '18:00:00', '19:30:00', '#ec4899'],
        ];

        foreach ($defaults as [$nome, $desc, $ini, $fim, $cor]) {
            $stmt->execute([
                'nome' => $nome, 'desc' => $desc,
                'ini'  => $ini,  'fim'  => $fim,  'cor' => $cor,
            ]);
        }
    }

    // ------------------------------------------------------------------
    // Tipos de refeição
    // ------------------------------------------------------------------

    public function getTiposAtivos(): array
    {
        $pdo  = Database::connection();
        $stmt = $pdo->query(
            'SELECT id, nome, descricao, horario_ini, horario_fim, cor, ativo
               FROM refeitorio_tipos_refeicao
              WHERE ativo = 1
              ORDER BY horario_ini, nome'
        );
        return $stmt ? $stmt->fetchAll() : [];
    }

    public function getTodos(): array
    {
        $pdo  = Database::connection();
        $stmt = $pdo->query(
            'SELECT id, nome, descricao, horario_ini, horario_fim, cor, ativo
               FROM refeitorio_tipos_refeicao
              ORDER BY horario_ini, nome'
        );
        return $stmt ? $stmt->fetchAll() : [];
    }

    public function getTipoById(int $id): ?array
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT id, nome, descricao, horario_ini, horario_fim, cor, ativo
               FROM refeitorio_tipos_refeicao
              WHERE id = :id
              LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    public function salvarTipo(int $id, string $nome, string $descricao, string $horIni, string $horFim, string $cor, bool $ativo, ?int $usuarioId = null): int
    {
        $pdo = Database::connection();
        $tipoAnterior = $id > 0 ? $this->getTipoById($id) : null;

        if ($id > 0) {
            $stmt = $pdo->prepare(
                'UPDATE refeitorio_tipos_refeicao
                    SET nome = :nome, descricao = :desc,
                        horario_ini = :ini, horario_fim = :fim,
                        cor = :cor, ativo = :ativo
                  WHERE id = :id'
            );
            $stmt->execute([
                'nome' => $nome, 'desc' => ($descricao ?: null),
                'ini'  => ($horIni ?: null), 'fim' => ($horFim ?: null),
                'cor'  => $cor, 'ativo' => (int) $ativo, 'id' => $id,
            ]);

            $this->registrarAuditoria(
                'tipo_refeicao',
                'alteracao',
                $usuarioId,
                'Tipo de refeição atualizado: ' . $nome,
                [
                    'tipo_id' => $id,
                    'antes' => $tipoAnterior,
                    'depois' => [
                        'id' => $id,
                        'nome' => $nome,
                        'descricao' => $descricao ?: null,
                        'horario_ini' => $horIni ?: null,
                        'horario_fim' => $horFim ?: null,
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
            'INSERT INTO refeitorio_tipos_refeicao (nome, descricao, horario_ini, horario_fim, cor, ativo)
             VALUES (:nome, :desc, :ini, :fim, :cor, :ativo)'
        );
        $stmt->execute([
            'nome' => $nome, 'desc' => ($descricao ?: null),
            'ini'  => ($horIni ?: null), 'fim' => ($horFim ?: null),
            'cor'  => $cor, 'ativo' => (int) $ativo,
        ]);

        $novoId = (int) $pdo->lastInsertId();
        $this->registrarAuditoria(
            'tipo_refeicao',
            'inclusao',
            $usuarioId,
            'Tipo de refeição criado: ' . $nome,
            [
                'tipo_id' => $novoId,
                'nome' => $nome,
                'descricao' => $descricao ?: null,
                'horario_ini' => $horIni ?: null,
                'horario_fim' => $horFim ?: null,
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
        $pdo  = Database::connection();
        $tipo = $this->getTipoById($id);
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM refeitorio_registros WHERE tipo_refeicao_id = :id');
        $stmt->execute(['id' => $id]);
        if ((int) $stmt->fetchColumn() > 0) {
            throw new RuntimeException('Este tipo de refeição possui registros vinculados e não pode ser excluído. Desative-o em vez de excluir.');
        }
        $del = $pdo->prepare('DELETE FROM refeitorio_tipos_refeicao WHERE id = :id');
        $del->execute(['id' => $id]);

        if ($tipo !== null) {
            $this->registrarAuditoria(
                'tipo_refeicao',
                'exclusao',
                $usuarioId,
                'Tipo de refeição excluído: ' . (string) ($tipo['nome'] ?? 'Registro removido'),
                ['tipo' => $tipo],
                $id,
                null,
                $pdo
            );
        }
    }

    // ------------------------------------------------------------------
    // Busca de aluno por matrícula (QR code)
    // ------------------------------------------------------------------

    public function buscarAlunoPorMatricula(string $matricula): ?array
    {
        $anoAtual = (int) date('Y');
        $pdo  = Database::connection();
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
        $pdo  = Database::connection();
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

    // ------------------------------------------------------------------
    // Pesquisa de aluno por nome ou turma (busca manual)
    // ------------------------------------------------------------------

    public function pesquisarAlunos(string $q, int $turmaId, int $tipoId): array
    {
        $pdo   = Database::connection();
        $anoAtual = (int) date('Y');
        $today = date('Y-m-d');
        $like  = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';

        $where  = '(a.nome LIKE :q1 OR a.turma LIKE :q2)';
        $params = ['q1' => $like, 'q2' => $like, 'today' => $today, 'tipo' => $tipoId, 'ano_letivo' => $anoAtual];

        if ($turmaId > 0) {
            $where  .= ' AND a.turma_id = :turma_id';
            $params['turma_id'] = $turmaId;
        }

        $stmt = $pdo->prepare(
            "SELECT a.id, a.nome, a.matricula, a.turma,
                    CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS ja_consumiu
               FROM alunos a
                JOIN turmas t ON t.id = a.turma_id
               LEFT JOIN refeitorio_registros r
                    ON r.aluno_id = a.id
                   AND r.tipo_refeicao_id = :tipo
                   AND r.data = :today
              WHERE {$where}
                 AND a.ativo = 1
                  AND t.ano_letivo = :ano_letivo
              ORDER BY a.nome
              LIMIT 25"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // ------------------------------------------------------------------
    // Verificar se já consumiu hoje
    // ------------------------------------------------------------------

    public function jaConsumiu(int $alunoId, int $tipoId, string $data): bool
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT id FROM refeitorio_registros
              WHERE aluno_id = :aluno AND tipo_refeicao_id = :tipo AND data = :data
              LIMIT 1'
        );
        $stmt->execute(['aluno' => $alunoId, 'tipo' => $tipoId, 'data' => $data]);
        return $stmt->fetch() !== false;
    }

    // ------------------------------------------------------------------
    // Registrar consumo
    // ------------------------------------------------------------------

    public function registrarConsumo(int $alunoId, int $tipoId, string $data, string $horario, ?int $usuarioId, string $obs = ''): int
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO refeitorio_registros
                (aluno_id, tipo_refeicao_id, data, horario, usuario_id, obs)
             VALUES (:aluno, :tipo, :data, :horario, :usuario, :obs)'
        );
        $stmt->execute([
            'aluno'   => $alunoId,
            'tipo'    => $tipoId,
            'data'    => $data,
            'horario' => $horario,
            'usuario' => $usuarioId ?: null,
            'obs'     => ($obs !== '' ? $obs : null),
        ]);

        $novoId = (int) $pdo->lastInsertId();
        $aluno = $this->buscarAlunoPorId($alunoId);
        $tipo = $this->getTipoById($tipoId);

        $this->registrarAuditoria(
            'registro',
            'inclusao',
            $usuarioId,
            'Consumo registrado para ' . (string) ($aluno['nome'] ?? 'estudante') . ' em ' . (string) ($tipo['nome'] ?? 'refeição'),
            [
                'registro_id' => $novoId,
                'aluno' => $aluno,
                'tipo_refeicao' => $tipo,
                'data' => $data,
                'horario' => $horario,
                'obs' => $obs !== '' ? $obs : null,
            ],
            $novoId,
            $alunoId,
            $pdo
        );

        return $novoId;
    }

    // ------------------------------------------------------------------
    // Dashboard — resumo do dia
    // ------------------------------------------------------------------

    public function resumoHoje(string $data): array
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT t.id, t.nome, t.cor,
                    COUNT(r.id) AS total
               FROM refeitorio_tipos_refeicao t
               LEFT JOIN refeitorio_registros r
                      ON r.tipo_refeicao_id = t.id AND r.data = :data
              WHERE t.ativo = 1
              GROUP BY t.id, t.nome, t.cor
              ORDER BY t.horario_ini, t.nome'
        );
        $stmt->execute(['data' => $data]);
        return $stmt->fetchAll();
    }

    // ------------------------------------------------------------------
    // Relatório por período
    // ------------------------------------------------------------------

    public function relatorio(string $dataInicio, string $dataFim, ?int $tipoId = null, ?string $turmaId = null): array
    {
        $pdo    = Database::connection();
        $wheres = ['r.data BETWEEN :ini AND :fim'];
        $params = ['ini' => $dataInicio, 'fim' => $dataFim];

        if ($tipoId !== null && $tipoId > 0) {
            $wheres[]          = 'r.tipo_refeicao_id = :tipo';
            $params['tipo']    = $tipoId;
        }

        if ($turmaId !== null && $turmaId !== '') {
            $wheres[]          = 'a.turma_id = :turma';
            $params['turma']   = (int) $turmaId;
        }

        $where = implode(' AND ', $wheres);

        $stmt = $pdo->prepare(
            "SELECT r.id, r.data, r.horario, r.tipo_refeicao_id,
                a.nome AS aluno_nome, a.matricula, a.turma, a.turma_id,
                    t.nome AS refeicao_nome, t.cor AS refeicao_cor,
                    r.obs
               FROM refeitorio_registros r
               JOIN alunos a ON a.id = r.aluno_id
               JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id
              WHERE {$where}
              ORDER BY r.data DESC, r.horario DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function totalPorTipoNoPeriodo(string $dataInicio, string $dataFim, ?int $tipoId = null, ?string $turmaId = null): array
    {
        $pdo    = Database::connection();
        $params = ['ini' => $dataInicio, 'fim' => $dataFim];
        $where  = ['t.ativo = 1'];
        $countExpr = 'SUM(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END)';

        if ($tipoId !== null && $tipoId > 0) {
            $where[] = 't.id = :tipo';
            $params['tipo'] = $tipoId;
        }

        if ($turmaId !== null && $turmaId !== '') {
            $countExpr = 'SUM(CASE WHEN r.id IS NOT NULL AND a.turma_id = :turma THEN 1 ELSE 0 END)';
            $params['turma'] = (int) $turmaId;
        }

        $sql = 'SELECT t.id, t.nome, t.cor,
                       COALESCE(' . $countExpr . ', 0) AS total
                  FROM refeitorio_tipos_refeicao t
                  LEFT JOIN refeitorio_registros r
                         ON r.tipo_refeicao_id = t.id
                        AND r.data BETWEEN :ini AND :fim
                  LEFT JOIN alunos a ON a.id = r.aluno_id
                 WHERE ' . implode(' AND ', $where) . '
                 GROUP BY t.id, t.nome, t.cor
                 ORDER BY t.horario_ini, t.nome';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // ------------------------------------------------------------------
    // Últimas entradas do dia (para polling)
    // ------------------------------------------------------------------

    public function ultimasEntradasHoje(string $data, int $limit = 10): array
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT r.id, r.horario,
                    a.nome AS aluno_nome, a.turma,
                    t.nome AS tipo_nome, t.cor AS tipo_cor
               FROM refeitorio_registros r
               JOIN alunos a ON a.id = r.aluno_id
               JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id
              WHERE r.data = :data
              ORDER BY r.id DESC
              LIMIT ' . max(1, $limit)
        );
        $stmt->execute(['data' => $data]);
        return $stmt->fetchAll();
    }

    // ------------------------------------------------------------------
    // Alunos para emissão de QR code
    // ------------------------------------------------------------------

    public function listarAlunosParaQr(?int $turmaId = null): array
    {
        $pdo  = Database::connection();
        $anoAtual = (int) date('Y');

        $where  = 'WHERE a.ativo = 1 AND t.ano_letivo = :ano_letivo';
        $params = ['ano_letivo' => $anoAtual];

        if ($turmaId !== null && $turmaId > 0) {
            $where          .= ' AND a.turma_id = :turma';
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

    // ------------------------------------------------------------------
    // Gerenciamento manual de registros
    // ------------------------------------------------------------------

    public function buscarRegistroPorId(int $id): ?array
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare(
            "SELECT r.id, r.data, r.horario, r.obs, r.tipo_refeicao_id,
                    a.nome AS aluno_nome
               FROM refeitorio_registros r
               JOIN alunos a ON a.id = r.aluno_id
              WHERE r.id = :id
              LIMIT 1"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function salvarRegistro(int $id, string $data, string $horario, int $tipoId, string $obs, ?int $usuarioId = null): void
    {
        $pdo  = Database::connection();
        $registroAnterior = $this->buscarRegistroAuditoriaPorId($id);
        $stmt = $pdo->prepare(
            'UPDATE refeitorio_registros
                SET data             = :data,
                    horario          = :horario,
                    tipo_refeicao_id = :tipo,
                    obs              = :obs
              WHERE id = :id'
        );
        $stmt->execute([
            'data'    => $data,
            'horario' => $horario,
            'tipo'    => $tipoId,
            'obs'     => $obs,
            'id'      => $id,
        ]);

        $registroAtual = $this->buscarRegistroAuditoriaPorId($id);
        if ($registroAtual !== null) {
            $this->registrarAuditoria(
                'registro',
                'alteracao',
                $usuarioId,
                'Registro de refeição atualizado para ' . (string) ($registroAtual['aluno_nome'] ?? 'estudante'),
                [
                    'registro_id' => $id,
                    'antes' => $registroAnterior,
                    'depois' => $registroAtual,
                ],
                $id,
                (int) ($registroAtual['aluno_id'] ?? 0),
                $pdo
            );
        }
    }

    public function excluirRegistro(int $id, ?int $usuarioId = null): void
    {
        $pdo  = Database::connection();
        $registro = $this->buscarRegistroAuditoriaPorId($id);
        $stmt = $pdo->prepare('DELETE FROM refeitorio_registros WHERE id = :id');
        $stmt->execute(['id' => $id]);

        if ($registro !== null) {
            $this->registrarAuditoria(
                'registro',
                'exclusao',
                $usuarioId,
                'Registro de refeição excluído para ' . (string) ($registro['aluno_nome'] ?? 'estudante'),
                [
                    'registro' => $registro,
                ],
                $id,
                (int) ($registro['aluno_id'] ?? 0),
                $pdo
            );
        }
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
            $wheres[] = '(a.resumo LIKE :busca OR COALESCE(u.nome, u.usuario, "") LIKE :busca OR COALESCE(al.nome, "") LIKE :busca)';
        }

        $stmt = $pdo->prepare(
            'SELECT a.id, a.entidade, a.acao, a.referencia_id, a.aluno_id, a.usuario_id,
                    a.resumo, a.detalhes_json, a.created_at,
                    COALESCE(u.nome, u.usuario, "") AS usuario_nome,
                    COALESCE(al.nome, "") AS aluno_nome
               FROM auditoria_refeitorio a
               LEFT JOIN usuarios u ON u.id = a.usuario_id
               LEFT JOIN alunos al ON al.id = a.aluno_id
              WHERE ' . implode(' AND ', $wheres) . '
              ORDER BY a.created_at DESC, a.id DESC'
        );
        $stmt->execute($params);

        return $stmt->fetchAll() ?: [];
    }

    private function buscarRegistroAuditoriaPorId(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT r.id, r.aluno_id, r.tipo_refeicao_id, r.data, r.horario, r.usuario_id, r.obs, r.created_at,
                    a.nome AS aluno_nome, a.turma, a.matricula,
                    t.nome AS refeicao_nome, t.cor AS refeicao_cor,
                    COALESCE(u.nome, u.usuario, "") AS usuario_nome
               FROM refeitorio_registros r
               JOIN alunos a ON a.id = r.aluno_id
               JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id
               LEFT JOIN usuarios u ON u.id = r.usuario_id
              WHERE r.id = :id
              LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row !== false ? $row : null;
    }

    private function registrarAuditoria(string $entidade, string $acao, ?int $usuarioId, string $resumo, array $detalhes = [], ?int $referenciaId = null, ?int $alunoId = null, ?PDO $pdo = null): void
    {
        $pdo = $pdo ?: Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO auditoria_refeitorio
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
}
