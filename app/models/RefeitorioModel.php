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

    public function salvarTipo(int $id, string $nome, string $descricao, string $horIni, string $horFim, string $cor, bool $ativo): int
    {
        $pdo = Database::connection();

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
        return (int) $pdo->lastInsertId();
    }

    public function excluirTipo(int $id): void
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM refeitorio_registros WHERE tipo_refeicao_id = :id');
        $stmt->execute(['id' => $id]);
        if ((int) $stmt->fetchColumn() > 0) {
            throw new RuntimeException('Este tipo de refeição possui registros vinculados e não pode ser excluído. Desative-o em vez de excluir.');
        }
        $del = $pdo->prepare('DELETE FROM refeitorio_tipos_refeicao WHERE id = :id');
        $del->execute(['id' => $id]);
    }

    // ------------------------------------------------------------------
    // Busca de aluno por matrícula (QR code)
    // ------------------------------------------------------------------

    public function buscarAlunoPorMatricula(string $matricula): ?array
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT a.id, a.nome, a.matricula, a.turma, a.turma_id, a.data_saida
               FROM alunos a
              WHERE a.matricula = :matricula
              LIMIT 1'
        );
        $stmt->execute(['matricula' => $matricula]);
        $row = $stmt->fetch();
        return $row !== false ? $row : null;
    }

    // ------------------------------------------------------------------
    // Pesquisa de aluno por nome ou turma (busca manual)
    // ------------------------------------------------------------------

    public function pesquisarAlunos(string $q, int $turmaId, int $tipoId): array
    {
        $pdo   = Database::connection();
        $today = date('Y-m-d');
        $like  = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';

        $where  = '(a.nome LIKE :q1 OR a.turma LIKE :q2)';
        $params = ['q1' => $like, 'q2' => $like, 'today' => $today, 'tipo' => $tipoId];

        if ($turmaId > 0) {
            $where  .= ' AND a.turma_id = :turma_id';
            $params['turma_id'] = $turmaId;
        }

        $stmt = $pdo->prepare(
            "SELECT a.id, a.nome, a.matricula, a.turma,
                    CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS ja_consumiu
               FROM alunos a
               LEFT JOIN refeitorio_registros r
                    ON r.aluno_id = a.id
                   AND r.tipo_refeicao_id = :tipo
                   AND r.data = :today
              WHERE {$where}
                AND (a.data_saida IS NULL OR a.data_saida > :today)
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
        return (int) $pdo->lastInsertId();
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
            "SELECT r.id, r.data, r.horario,
                    a.nome AS aluno_nome, a.matricula, a.turma,
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

        $where  = 'WHERE (a.data_saida IS NULL OR a.data_saida >= CURDATE())';
        $params = [];

        if ($turmaId !== null && $turmaId > 0) {
            $where          .= ' AND a.turma_id = :turma';
            $params['turma'] = $turmaId;
        }

        $stmt = $pdo->prepare(
            "SELECT a.id, a.nome, a.matricula, a.turma
               FROM alunos a
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

    public function salvarRegistro(int $id, string $data, string $horario, int $tipoId, string $obs): void
    {
        $pdo  = Database::connection();
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
    }

    public function excluirRegistro(int $id): void
    {
        $pdo  = Database::connection();
        $stmt = $pdo->prepare('DELETE FROM refeitorio_registros WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}
