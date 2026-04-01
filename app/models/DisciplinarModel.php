<?php
declare(strict_types=1);

class DisciplinarModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $this->ensureAlunoDisciplinarColumn($pdo);

        $statements = [
            'CREATE TABLE IF NOT EXISTS disciplinar_conceito_faixas (
                id INT NOT NULL AUTO_INCREMENT,
                codigo VARCHAR(40) NOT NULL,
                nome VARCHAR(80) NOT NULL,
                nota_min DECIMAL(5,2) NOT NULL,
                nota_max DECIMAL(5,2) NOT NULL,
                ordem_exibicao INT NOT NULL DEFAULT 0,
                ativo TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_disciplinar_conceito_faixas_codigo (codigo),
                KEY idx_disciplinar_conceito_faixas_ordem (ordem_exibicao)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            'CREATE TABLE IF NOT EXISTS disciplinar_normas (
                id INT NOT NULL AUTO_INCREMENT,
                codigo VARCHAR(80) NOT NULL,
                tipo VARCHAR(30) NOT NULL,
                categoria VARCHAR(80) NOT NULL,
                titulo VARCHAR(180) NOT NULL,
                descricao LONGTEXT NULL,
                artigo_referencia VARCHAR(80) NULL,
                natureza ENUM("positivo", "negativo", "neutro") NOT NULL DEFAULT "neutro",
                pontuacao_padrao DECIMAL(6,2) NULL,
                pontuacao_min DECIMAL(6,2) NULL,
                pontuacao_max DECIMAL(6,2) NULL,
                ativo TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_disciplinar_normas_codigo (codigo),
                KEY idx_disciplinar_normas_tipo (tipo),
                KEY idx_disciplinar_normas_categoria (categoria)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            'CREATE TABLE IF NOT EXISTS disciplinar_cursos (
                id INT NOT NULL AUTO_INCREMENT,
                nome VARCHAR(120) NOT NULL,
                descricao TEXT NULL,
                status ENUM("ativo", "inativo") NOT NULL DEFAULT "ativo",
                data_inicio DATE NULL,
                data_fim DATE NULL,
                created_by INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_disciplinar_cursos_nome (nome),
                KEY idx_disciplinar_cursos_status (status),
                KEY idx_disciplinar_cursos_created_by (created_by),
                CONSTRAINT fk_disciplinar_cursos_created_by
                    FOREIGN KEY (created_by) REFERENCES usuarios(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            'CREATE TABLE IF NOT EXISTS disciplinar_curso_criterios (
                id INT NOT NULL AUTO_INCREMENT,
                curso_id INT NOT NULL,
                nome VARCHAR(120) NOT NULL,
                descricao TEXT NULL,
                valor_maximo DECIMAL(6,2) NOT NULL DEFAULT 10.00,
                peso DECIMAL(6,2) NOT NULL DEFAULT 1.00,
                ordem_exibicao INT NOT NULL DEFAULT 0,
                ativo TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_disciplinar_curso_criterios_nome (curso_id, nome),
                KEY idx_disciplinar_curso_criterios_curso (curso_id),
                CONSTRAINT fk_disciplinar_curso_criterios_curso
                    FOREIGN KEY (curso_id) REFERENCES disciplinar_cursos(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            'CREATE TABLE IF NOT EXISTS disciplinar_curso_matriculas (
                id INT NOT NULL AUTO_INCREMENT,
                curso_id INT NOT NULL,
                aluno_id INT NOT NULL,
                data_inicio DATE NULL,
                data_fim DATE NULL,
                status ENUM("ativo", "concluido", "cancelado") NOT NULL DEFAULT "ativo",
                observacoes TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_disciplinar_curso_matriculas (curso_id, aluno_id),
                KEY idx_disciplinar_curso_matriculas_aluno (aluno_id),
                CONSTRAINT fk_disciplinar_curso_matriculas_curso
                    FOREIGN KEY (curso_id) REFERENCES disciplinar_cursos(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT fk_disciplinar_curso_matriculas_aluno
                    FOREIGN KEY (aluno_id) REFERENCES alunos(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            'CREATE TABLE IF NOT EXISTS disciplinar_curso_notas (
                id INT NOT NULL AUTO_INCREMENT,
                matricula_id INT NOT NULL,
                criterio_id INT NOT NULL,
                nota DECIMAL(6,2) NOT NULL DEFAULT 0.00,
                observacoes TEXT NULL,
                data_lancamento DATE NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_disciplinar_curso_notas (matricula_id, criterio_id),
                KEY idx_disciplinar_curso_notas_criterio (criterio_id),
                CONSTRAINT fk_disciplinar_curso_notas_matricula
                    FOREIGN KEY (matricula_id) REFERENCES disciplinar_curso_matriculas(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT fk_disciplinar_curso_notas_criterio
                    FOREIGN KEY (criterio_id) REFERENCES disciplinar_curso_criterios(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            'CREATE TABLE IF NOT EXISTS disciplinar_registros (
                id INT NOT NULL AUTO_INCREMENT,
                tipo_registro VARCHAR(60) NOT NULL,
                titulo VARCHAR(180) NOT NULL,
                descricao LONGTEXT NULL,
                norma_id INT NULL,
                natureza ENUM("positivo", "negativo", "neutro") NOT NULL DEFAULT "neutro",
                pontos_variacao DECIMAL(6,2) NOT NULL DEFAULT 0.00,
                data_registro DATE NOT NULL,
                aluno_ids_json LONGTEXT NULL,
                turma_ids_json LONGTEXT NULL,
                documento_path VARCHAR(255) NULL,
                created_by INT NULL,
                updated_by INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_disciplinar_registros_tipo (tipo_registro),
                KEY idx_disciplinar_registros_norma (norma_id),
                KEY idx_disciplinar_registros_data (data_registro),
                CONSTRAINT fk_disciplinar_registros_norma
                    FOREIGN KEY (norma_id) REFERENCES disciplinar_normas(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE,
                CONSTRAINT fk_disciplinar_registros_created_by
                    FOREIGN KEY (created_by) REFERENCES usuarios(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE,
                CONSTRAINT fk_disciplinar_registros_updated_by
                    FOREIGN KEY (updated_by) REFERENCES usuarios(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
            'CREATE TABLE IF NOT EXISTS disciplinar_registro_alunos (
                id INT NOT NULL AUTO_INCREMENT,
                registro_id INT NOT NULL,
                aluno_id INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_disciplinar_registro_alunos (registro_id, aluno_id),
                KEY idx_disciplinar_registro_alunos_aluno (aluno_id),
                CONSTRAINT fk_disciplinar_registro_alunos_registro
                    FOREIGN KEY (registro_id) REFERENCES disciplinar_registros(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT fk_disciplinar_registro_alunos_aluno
                    FOREIGN KEY (aluno_id) REFERENCES alunos(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        ];

        foreach ($statements as $statement) {
            $pdo->exec($statement);
        }

        $this->seedConceitoFaixas($pdo);
        $this->seedNormas($pdo);
    }

    public function getDashboardData(): array
    {
        $this->ensureTableStructure();

        $alunoModel = new AlunoModel();
        $turmaModel = new TurmaModel();

        return [
            'faixas' => $this->getConceitoFaixas(),
            'normas' => $this->getNormas(),
            'cursos' => $this->getCursos(),
            'criterios' => $this->getCriterios(),
            'matriculas' => $this->getMatriculas(),
            'notas' => $this->getNotas(),
            'registros' => $this->getRegistros(),
            'conceitos' => $this->getConceitoResumo(),
            'alunos' => $alunoModel->getSimpleOptions(true),
            'turmas' => $turmaModel->getSimpleOptions(),
        ];
    }

    public function getConceitoFaixas(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query('SELECT id, codigo, nome, nota_min, nota_max, ordem_exibicao, ativo FROM disciplinar_conceito_faixas WHERE ativo = 1 ORDER BY ordem_exibicao ASC, nota_max DESC, id ASC');

        return $statement?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getNormas(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query('SELECT id, codigo, tipo, categoria, titulo, descricao, artigo_referencia, natureza, pontuacao_padrao, pontuacao_min, pontuacao_max, ativo, created_at, updated_at FROM disciplinar_normas WHERE ativo = 1 ORDER BY tipo ASC, categoria ASC, titulo ASC, id ASC');

        return $statement?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getCursos(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query(
            'SELECT c.id, c.nome, c.descricao, c.status, c.data_inicio, c.data_fim, c.created_by, c.created_at, c.updated_at,
                    COALESCE(u.nome, "") AS created_by_nome,
                    COUNT(DISTINCT m.id) AS total_matriculas,
                    COUNT(DISTINCT cr.id) AS total_criterios
             FROM disciplinar_cursos c
             LEFT JOIN usuarios u ON u.id = c.created_by
             LEFT JOIN disciplinar_curso_matriculas m ON m.curso_id = c.id
             LEFT JOIN disciplinar_curso_criterios cr ON cr.curso_id = c.id
             GROUP BY c.id, c.nome, c.descricao, c.status, c.data_inicio, c.data_fim, c.created_by, c.created_at, c.updated_at, u.nome
             ORDER BY c.status ASC, c.nome ASC, c.id DESC'
        );

        return $statement?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getCriterios(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query('SELECT id, curso_id, nome, descricao, valor_maximo, peso, ordem_exibicao, ativo, created_at, updated_at FROM disciplinar_curso_criterios ORDER BY curso_id ASC, ordem_exibicao ASC, nome ASC, id ASC');

        return $statement?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getMatriculas(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query(
            'SELECT m.id, m.curso_id, m.aluno_id, m.data_inicio, m.data_fim, m.status, m.observacoes, m.created_at, m.updated_at,
                    c.nome AS curso_nome,
                    a.nome AS aluno_nome,
                    a.matricula AS aluno_matricula,
                    a.turma_id,
                    a.turma AS turma_nome
             FROM disciplinar_curso_matriculas m
             INNER JOIN disciplinar_cursos c ON c.id = m.curso_id
             INNER JOIN alunos a ON a.id = m.aluno_id
             ORDER BY c.nome ASC, a.nome ASC, m.id DESC'
        );

        return $statement?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getNotas(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query(
            'SELECT n.id, n.matricula_id, n.criterio_id, n.nota, n.observacoes, n.data_lancamento, n.created_at, n.updated_at,
                    m.curso_id,
                    m.aluno_id,
                    cr.nome AS criterio_nome,
                    cr.valor_maximo,
                    cr.peso,
                    a.nome AS aluno_nome
             FROM disciplinar_curso_notas n
             INNER JOIN disciplinar_curso_matriculas m ON m.id = n.matricula_id
             INNER JOIN disciplinar_curso_criterios cr ON cr.id = n.criterio_id
             INNER JOIN alunos a ON a.id = m.aluno_id
             ORDER BY m.curso_id ASC, a.nome ASC, cr.ordem_exibicao ASC, cr.nome ASC, n.id DESC'
        );

        return $statement?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getRegistros(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query(
            'SELECT r.id, r.tipo_registro, r.titulo, r.descricao, r.norma_id, r.natureza, r.pontos_variacao, r.data_registro,
                    r.aluno_ids_json, r.turma_ids_json, r.documento_path, r.created_by, r.updated_by, r.created_at, r.updated_at,
                    COALESCE(n.titulo, "") AS norma_titulo,
                    COALESCE(uc.nome, "") AS criado_por_nome,
                    COUNT(DISTINCT ra.aluno_id) AS total_alunos,
                    GROUP_CONCAT(DISTINCT a.nome ORDER BY a.nome SEPARATOR " | ") AS alunos_nomes
             FROM disciplinar_registros r
             LEFT JOIN disciplinar_normas n ON n.id = r.norma_id
             LEFT JOIN usuarios uc ON uc.id = r.created_by
             LEFT JOIN disciplinar_registro_alunos ra ON ra.registro_id = r.id
             LEFT JOIN alunos a ON a.id = ra.aluno_id
             GROUP BY r.id, r.tipo_registro, r.titulo, r.descricao, r.norma_id, r.natureza, r.pontos_variacao, r.data_registro,
                      r.aluno_ids_json, r.turma_ids_json, r.documento_path, r.created_by, r.updated_by, r.created_at, r.updated_at,
                      n.titulo, uc.nome
             ORDER BY r.data_registro DESC, r.id DESC'
        );

        return $statement?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getConceitoResumo(array $alunoIds = []): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $params = [];
        $filterSql = '';
        $normalizedAlunoIds = $this->normalizeIdList($alunoIds);

        if ($normalizedAlunoIds !== []) {
            $placeholders = implode(',', array_fill(0, count($normalizedAlunoIds), '?'));
            $filterSql = ' WHERE a.id IN (' . $placeholders . ')';
            $params = $normalizedAlunoIds;
        }

        $statement = $pdo->prepare(
            'SELECT a.id, a.nome, a.matricula, a.turma_id, a.turma,
                    COALESCE(SUM(r.pontos_variacao), 0) AS variacao_total,
                    COUNT(DISTINCT ra.registro_id) AS registros_total,
                    MAX(r.updated_at) AS ultima_atualizacao
             FROM alunos a
             LEFT JOIN disciplinar_registro_alunos ra ON ra.aluno_id = a.id
             LEFT JOIN disciplinar_registros r ON r.id = ra.registro_id
             ' . $filterSql . '
             GROUP BY a.id, a.nome, a.matricula, a.turma_id, a.turma
             ORDER BY a.nome ASC, a.id ASC'
        );
        $statement->execute($params);

        $faixas = $this->getConceitoFaixas();
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(function (array $row) use ($faixas): array {
            $variacaoTotal = (float) ($row['variacao_total'] ?? 0);
            $notaAtual = 8.0 + $variacaoTotal;
            $classificacao = $this->resolveConceitoClassificacao($notaAtual, $faixas);

            return [
                'aluno_id' => (int) ($row['id'] ?? 0),
                'nome' => trim((string) ($row['nome'] ?? '')),
                'matricula' => trim((string) ($row['matricula'] ?? '')),
                'turma_id' => (int) ($row['turma_id'] ?? 0),
                'turma' => trim((string) ($row['turma'] ?? '')),
                'nota_base' => 8.0,
                'variacao_total' => round($variacaoTotal, 2),
                'nota_atual' => round($notaAtual, 2),
                'classificacao' => $classificacao,
                'registros_total' => (int) ($row['registros_total'] ?? 0),
                'ultima_atualizacao' => $row['ultima_atualizacao'] ?? null,
            ];
        }, $rows);
    }

    public function findRegistroById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, tipo_registro, titulo, descricao, norma_id, natureza, pontos_variacao, data_registro, aluno_ids_json, turma_ids_json, documento_path, created_by, updated_by, created_at, updated_at FROM disciplinar_registros WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    public function saveCurso(array $payload): int
    {
        $this->ensureTableStructure();

        $id = (int) ($payload['id'] ?? 0);
        $nome = trim((string) ($payload['nome'] ?? ''));
        $descricao = $this->normalizeNullableText($payload['descricao'] ?? null);
        $status = trim((string) ($payload['status'] ?? 'ativo'));
        $dataInicio = $this->normalizeDate($payload['data_inicio'] ?? null);
        $dataFim = $this->normalizeDate($payload['data_fim'] ?? null);
        $createdBy = (int) ($payload['created_by'] ?? 0);

        if ($nome === '') {
            throw new InvalidArgumentException('Informe o nome do curso.');
        }

        if (!in_array($status, ['ativo', 'inativo'], true)) {
            $status = 'ativo';
        }

        $pdo = Database::connection();
        if ($id > 0) {
            $statement = $pdo->prepare('UPDATE disciplinar_cursos SET nome = :nome, descricao = :descricao, status = :status, data_inicio = :data_inicio, data_fim = :data_fim WHERE id = :id');
            $statement->execute([
                'id' => $id,
                'nome' => $nome,
                'descricao' => $descricao,
                'status' => $status,
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
            ]);

            return $id;
        }

        $statement = $pdo->prepare('INSERT INTO disciplinar_cursos (nome, descricao, status, data_inicio, data_fim, created_by) VALUES (:nome, :descricao, :status, :data_inicio, :data_fim, :created_by)');
        $statement->execute([
            'nome' => $nome,
            'descricao' => $descricao,
            'status' => $status,
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'created_by' => $createdBy > 0 ? $createdBy : null,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function deleteCurso(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Curso inválido para exclusão.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM disciplinar_cursos WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function saveCriterio(array $payload): int
    {
        $this->ensureTableStructure();

        $id = (int) ($payload['id'] ?? 0);
        $cursoId = (int) ($payload['curso_id'] ?? 0);
        $nome = trim((string) ($payload['nome'] ?? ''));
        $descricao = $this->normalizeNullableText($payload['descricao'] ?? null);
        $valorMaximo = max(0, (float) ($payload['valor_maximo'] ?? 10));
        $peso = max(0.1, (float) ($payload['peso'] ?? 1));
        $ordem = (int) ($payload['ordem_exibicao'] ?? 0);
        $ativo = !empty($payload['ativo']) ? 1 : 0;

        if ($cursoId <= 0 || $nome === '') {
            throw new InvalidArgumentException('Informe o curso e o nome do critério.');
        }

        $pdo = Database::connection();
        if ($id > 0) {
            $statement = $pdo->prepare('UPDATE disciplinar_curso_criterios SET curso_id = :curso_id, nome = :nome, descricao = :descricao, valor_maximo = :valor_maximo, peso = :peso, ordem_exibicao = :ordem_exibicao, ativo = :ativo WHERE id = :id');
            $statement->execute([
                'id' => $id,
                'curso_id' => $cursoId,
                'nome' => $nome,
                'descricao' => $descricao,
                'valor_maximo' => $valorMaximo,
                'peso' => $peso,
                'ordem_exibicao' => $ordem,
                'ativo' => $ativo,
            ]);

            return $id;
        }

        $statement = $pdo->prepare('INSERT INTO disciplinar_curso_criterios (curso_id, nome, descricao, valor_maximo, peso, ordem_exibicao, ativo) VALUES (:curso_id, :nome, :descricao, :valor_maximo, :peso, :ordem_exibicao, :ativo)');
        $statement->execute([
            'curso_id' => $cursoId,
            'nome' => $nome,
            'descricao' => $descricao,
            'valor_maximo' => $valorMaximo,
            'peso' => $peso,
            'ordem_exibicao' => $ordem,
            'ativo' => $ativo,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function deleteCriterio(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Critério inválido para exclusão.');
        }

        $this->ensureTableStructure();
        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM disciplinar_curso_criterios WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function saveMatricula(array $payload): int
    {
        $this->ensureTableStructure();

        $id = (int) ($payload['id'] ?? 0);
        $cursoId = (int) ($payload['curso_id'] ?? 0);
        $alunoId = (int) ($payload['aluno_id'] ?? 0);
        $dataInicio = $this->normalizeDate($payload['data_inicio'] ?? null);
        $dataFim = $this->normalizeDate($payload['data_fim'] ?? null);
        $status = trim((string) ($payload['status'] ?? 'ativo'));
        $observacoes = $this->normalizeNullableText($payload['observacoes'] ?? null);

        if ($cursoId <= 0 || $alunoId <= 0) {
            throw new InvalidArgumentException('Selecione curso e estudante para a matrícula.');
        }

        if (!in_array($status, ['ativo', 'concluido', 'cancelado'], true)) {
            $status = 'ativo';
        }

        $pdo = Database::connection();
        if ($id > 0) {
            $statement = $pdo->prepare('UPDATE disciplinar_curso_matriculas SET curso_id = :curso_id, aluno_id = :aluno_id, data_inicio = :data_inicio, data_fim = :data_fim, status = :status, observacoes = :observacoes WHERE id = :id');
            $statement->execute([
                'id' => $id,
                'curso_id' => $cursoId,
                'aluno_id' => $alunoId,
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
                'status' => $status,
                'observacoes' => $observacoes,
            ]);

            return $id;
        }

        $statement = $pdo->prepare('INSERT INTO disciplinar_curso_matriculas (curso_id, aluno_id, data_inicio, data_fim, status, observacoes) VALUES (:curso_id, :aluno_id, :data_inicio, :data_fim, :status, :observacoes)');
        $statement->execute([
            'curso_id' => $cursoId,
            'aluno_id' => $alunoId,
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'status' => $status,
            'observacoes' => $observacoes,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function deleteMatricula(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Matrícula inválida para exclusão.');
        }

        $this->ensureTableStructure();
        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM disciplinar_curso_matriculas WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function saveNota(array $payload): int
    {
        $this->ensureTableStructure();

        $id = (int) ($payload['id'] ?? 0);
        $matriculaId = (int) ($payload['matricula_id'] ?? 0);
        $criterioId = (int) ($payload['criterio_id'] ?? 0);
        $nota = (float) ($payload['nota'] ?? 0);
        $observacoes = $this->normalizeNullableText($payload['observacoes'] ?? null);
        $dataLancamento = $this->normalizeDate($payload['data_lancamento'] ?? null);

        if ($matriculaId <= 0 || $criterioId <= 0) {
            throw new InvalidArgumentException('Selecione matrícula e critério para lançar a nota.');
        }

        $pdo = Database::connection();
        if ($id > 0) {
            $statement = $pdo->prepare('UPDATE disciplinar_curso_notas SET matricula_id = :matricula_id, criterio_id = :criterio_id, nota = :nota, observacoes = :observacoes, data_lancamento = :data_lancamento WHERE id = :id');
            $statement->execute([
                'id' => $id,
                'matricula_id' => $matriculaId,
                'criterio_id' => $criterioId,
                'nota' => $nota,
                'observacoes' => $observacoes,
                'data_lancamento' => $dataLancamento,
            ]);

            return $id;
        }

        $statement = $pdo->prepare('INSERT INTO disciplinar_curso_notas (matricula_id, criterio_id, nota, observacoes, data_lancamento) VALUES (:matricula_id, :criterio_id, :nota, :observacoes, :data_lancamento)');
        $statement->execute([
            'matricula_id' => $matriculaId,
            'criterio_id' => $criterioId,
            'nota' => $nota,
            'observacoes' => $observacoes,
            'data_lancamento' => $dataLancamento,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function deleteNota(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Nota inválida para exclusão.');
        }

        $this->ensureTableStructure();
        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM disciplinar_curso_notas WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function saveRegistro(array $payload): int
    {
        $this->ensureTableStructure();

        $id = (int) ($payload['id'] ?? 0);
        $tipoRegistro = trim((string) ($payload['tipo_registro'] ?? ''));
        $titulo = trim((string) ($payload['titulo'] ?? ''));
        $descricao = $this->normalizeNullableText($payload['descricao'] ?? null);
        $normaId = (int) ($payload['norma_id'] ?? 0);
        $natureza = trim((string) ($payload['natureza'] ?? 'neutro'));
        $pontosVariacao = (float) ($payload['pontos_variacao'] ?? 0);
        $dataRegistro = $this->normalizeDate($payload['data_registro'] ?? null) ?? date('Y-m-d');
        $alunoIds = $this->normalizeIdList($payload['aluno_ids'] ?? []);
        $turmaIds = $this->normalizeIdList($payload['turma_ids'] ?? []);
        $documentoPath = $this->normalizeNullableText($payload['documento_path'] ?? null);
        $createdBy = (int) ($payload['created_by'] ?? 0);
        $updatedBy = (int) ($payload['updated_by'] ?? 0);

        if ($tipoRegistro === '' || $titulo === '') {
            throw new InvalidArgumentException('Informe o tipo e o título do lançamento disciplinar.');
        }

        if (!in_array($natureza, ['positivo', 'negativo', 'neutro'], true)) {
            $natureza = 'neutro';
        }

        $resolvedAlunoIds = $this->resolveRegistroAlunoIds($alunoIds, $turmaIds);
        if ($resolvedAlunoIds === []) {
            throw new InvalidArgumentException('Selecione ao menos um estudante ou turma para o lançamento.');
        }

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            if ($id > 0) {
                $statement = $pdo->prepare('UPDATE disciplinar_registros SET tipo_registro = :tipo_registro, titulo = :titulo, descricao = :descricao, norma_id = :norma_id, natureza = :natureza, pontos_variacao = :pontos_variacao, data_registro = :data_registro, aluno_ids_json = :aluno_ids_json, turma_ids_json = :turma_ids_json, documento_path = :documento_path, updated_by = :updated_by WHERE id = :id');
                $statement->execute([
                    'id' => $id,
                    'tipo_registro' => $tipoRegistro,
                    'titulo' => $titulo,
                    'descricao' => $descricao,
                    'norma_id' => $normaId > 0 ? $normaId : null,
                    'natureza' => $natureza,
                    'pontos_variacao' => $pontosVariacao,
                    'data_registro' => $dataRegistro,
                    'aluno_ids_json' => $alunoIds !== [] ? json_encode($alunoIds, JSON_UNESCAPED_UNICODE) : null,
                    'turma_ids_json' => $turmaIds !== [] ? json_encode($turmaIds, JSON_UNESCAPED_UNICODE) : null,
                    'documento_path' => $documentoPath,
                    'updated_by' => $updatedBy > 0 ? $updatedBy : null,
                ]);
            } else {
                $statement = $pdo->prepare('INSERT INTO disciplinar_registros (tipo_registro, titulo, descricao, norma_id, natureza, pontos_variacao, data_registro, aluno_ids_json, turma_ids_json, documento_path, created_by, updated_by) VALUES (:tipo_registro, :titulo, :descricao, :norma_id, :natureza, :pontos_variacao, :data_registro, :aluno_ids_json, :turma_ids_json, :documento_path, :created_by, :updated_by)');
                $statement->execute([
                    'tipo_registro' => $tipoRegistro,
                    'titulo' => $titulo,
                    'descricao' => $descricao,
                    'norma_id' => $normaId > 0 ? $normaId : null,
                    'natureza' => $natureza,
                    'pontos_variacao' => $pontosVariacao,
                    'data_registro' => $dataRegistro,
                    'aluno_ids_json' => $alunoIds !== [] ? json_encode($alunoIds, JSON_UNESCAPED_UNICODE) : null,
                    'turma_ids_json' => $turmaIds !== [] ? json_encode($turmaIds, JSON_UNESCAPED_UNICODE) : null,
                    'documento_path' => $documentoPath,
                    'created_by' => $createdBy > 0 ? $createdBy : null,
                    'updated_by' => $updatedBy > 0 ? $updatedBy : null,
                ]);
                $id = (int) $pdo->lastInsertId();
            }

            $deleteStatement = $pdo->prepare('DELETE FROM disciplinar_registro_alunos WHERE registro_id = :registro_id');
            $deleteStatement->execute(['registro_id' => $id]);

            $insertStatement = $pdo->prepare('INSERT INTO disciplinar_registro_alunos (registro_id, aluno_id) VALUES (:registro_id, :aluno_id)');
            foreach ($resolvedAlunoIds as $alunoId) {
                $insertStatement->execute([
                    'registro_id' => $id,
                    'aluno_id' => $alunoId,
                ]);
            }

            $pdo->commit();
        } catch (Throwable $exception) {
            $pdo->rollBack();
            throw $exception;
        }

        $this->syncAlunoDisciplinarSnapshots($resolvedAlunoIds);

        return $id;
    }

    public function deleteRegistro(int $id): array
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Registro disciplinar inválido para exclusão.');
        }

        $this->ensureTableStructure();

        $existing = $this->findRegistroById($id);
        if (!is_array($existing)) {
            return [
                'documento_path' => null,
                'aluno_ids' => [],
            ];
        }

        $alunoIds = $this->getRegistroAlunoIds($id);

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM disciplinar_registros WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);

        $this->syncAlunoDisciplinarSnapshots($alunoIds);

        return [
            'documento_path' => $existing['documento_path'] ?? null,
            'aluno_ids' => $alunoIds,
        ];
    }

    public function getRegistroAlunoIds(int $registroId): array
    {
        $this->ensureTableStructure();

        if ($registroId <= 0) {
            return [];
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT aluno_id FROM disciplinar_registro_alunos WHERE registro_id = :registro_id');
        $statement->execute(['registro_id' => $registroId]);

        return $this->normalizeIdList($statement->fetchAll(PDO::FETCH_COLUMN) ?: []);
    }

    private function resolveRegistroAlunoIds(array $alunoIds, array $turmaIds): array
    {
        $resolved = [];
        foreach ($this->normalizeIdList($alunoIds) as $alunoId) {
            $resolved[$alunoId] = $alunoId;
        }

        if ($turmaIds !== []) {
            $alunoModel = new AlunoModel();
            foreach ($this->normalizeIdList($turmaIds) as $turmaId) {
                foreach ($alunoModel->getByTurmaId($turmaId, true) as $aluno) {
                    if (!is_array($aluno)) {
                        continue;
                    }
                    $alunoId = (int) ($aluno['id'] ?? 0);
                    if ($alunoId > 0) {
                        $resolved[$alunoId] = $alunoId;
                    }
                }
            }
        }

        ksort($resolved);

        return array_values($resolved);
    }

    private function syncAlunoDisciplinarSnapshots(array $alunoIds): void
    {
        $normalizedAlunoIds = $this->normalizeIdList($alunoIds);
        if ($normalizedAlunoIds === []) {
            return;
        }

        $summaries = $this->getConceitoResumo($normalizedAlunoIds);
        $summaryMap = [];
        foreach ($summaries as $summary) {
            if (!is_array($summary)) {
                continue;
            }

            $summaryMap[(int) ($summary['aluno_id'] ?? 0)] = [
                'nota_base' => (float) ($summary['nota_base'] ?? 8),
                'variacao_total' => (float) ($summary['variacao_total'] ?? 0),
                'nota_atual' => (float) ($summary['nota_atual'] ?? 8),
                'classificacao' => (string) ($summary['classificacao'] ?? 'Bom'),
                'registros_total' => (int) ($summary['registros_total'] ?? 0),
                'ultima_atualizacao' => $summary['ultima_atualizacao'] ?? null,
                'atualizado_em' => date('c'),
            ];
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE alunos SET disciplinar = :disciplinar WHERE id = :id');

        foreach ($normalizedAlunoIds as $alunoId) {
            $snapshot = $summaryMap[$alunoId] ?? [
                'nota_base' => 8.0,
                'variacao_total' => 0.0,
                'nota_atual' => 8.0,
                'classificacao' => 'Bom',
                'registros_total' => 0,
                'ultima_atualizacao' => null,
                'atualizado_em' => date('c'),
            ];

            $statement->execute([
                'disciplinar' => json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => $alunoId,
            ]);
        }
    }

    private function resolveConceitoClassificacao(float $notaAtual, array $faixas): string
    {
        foreach ($faixas as $faixa) {
            if (!is_array($faixa)) {
                continue;
            }

            $min = (float) ($faixa['nota_min'] ?? 0);
            $max = (float) ($faixa['nota_max'] ?? 0);
            if ($notaAtual >= $min && $notaAtual <= $max) {
                return trim((string) ($faixa['nome'] ?? 'Bom'));
            }
        }

        return $notaAtual >= 10 ? 'Excepcional' : 'Insuficiente';
    }

    private function seedConceitoFaixas(PDO $pdo): void
    {
        $total = (int) ($pdo->query('SELECT COUNT(*) FROM disciplinar_conceito_faixas')?->fetchColumn() ?: 0);
        if ($total > 0) {
            return;
        }

        $statement = $pdo->prepare('INSERT INTO disciplinar_conceito_faixas (codigo, nome, nota_min, nota_max, ordem_exibicao, ativo) VALUES (:codigo, :nome, :nota_min, :nota_max, :ordem_exibicao, 1)');
        foreach ([
            ['codigo' => 'excepcional', 'nome' => 'Excepcional', 'nota_min' => 10.00, 'nota_max' => 999.99, 'ordem_exibicao' => 1],
            ['codigo' => 'otimo', 'nome' => 'Ótimo', 'nota_min' => 9.00, 'nota_max' => 9.99, 'ordem_exibicao' => 2],
            ['codigo' => 'bom', 'nome' => 'Bom', 'nota_min' => 8.00, 'nota_max' => 8.99, 'ordem_exibicao' => 3],
            ['codigo' => 'regular', 'nome' => 'Regular', 'nota_min' => 6.00, 'nota_max' => 7.99, 'ordem_exibicao' => 4],
            ['codigo' => 'insuficiente', 'nome' => 'Insuficiente', 'nota_min' => 0.00, 'nota_max' => 5.99, 'ordem_exibicao' => 5],
        ] as $row) {
            $statement->execute($row);
        }
    }

    private function seedNormas(PDO $pdo): void
    {
        $total = (int) ($pdo->query('SELECT COUNT(*) FROM disciplinar_normas')?->fetchColumn() ?: 0);
        if ($total > 0) {
            return;
        }

        $statement = $pdo->prepare(
            'INSERT INTO disciplinar_normas (codigo, tipo, categoria, titulo, descricao, artigo_referencia, natureza, pontuacao_padrao, pontuacao_min, pontuacao_max, ativo)
             VALUES (:codigo, :tipo, :categoria, :titulo, :descricao, :artigo_referencia, :natureza, :pontuacao_padrao, :pontuacao_min, :pontuacao_max, 1)'
        );

        foreach ($this->getDefaultNormasSeed() as $row) {
            $statement->execute($row);
        }
    }

    private function getDefaultNormasSeed(): array
    {
        return [
            [
                'codigo' => 'conceito_inicial',
                'tipo' => 'conceito',
                'categoria' => 'conceito',
                'titulo' => 'Conceito disciplinar inicial',
                'descricao' => 'Ao ingressar no CEMIL, o estudante inicia com comportamento BOM e nota 8,00.',
                'artigo_referencia' => 'Art. 6',
                'natureza' => 'neutro',
                'pontuacao_padrao' => 8.00,
                'pontuacao_min' => 8.00,
                'pontuacao_max' => 8.00,
            ],
            [
                'codigo' => 'advertencia_escrita',
                'tipo' => 'sancao',
                'categoria' => 'advertencia',
                'titulo' => 'Advertência por escrito',
                'descricao' => 'Advertência formal sem pontuação negativa direta no conceito disciplinar.',
                'artigo_referencia' => 'Art. 12',
                'natureza' => 'neutro',
                'pontuacao_padrao' => 0.00,
                'pontuacao_min' => 0.00,
                'pontuacao_max' => 0.00,
            ],
            [
                'codigo' => 'md_leve',
                'tipo' => 'sancao',
                'categoria' => 'medida_disciplinar',
                'titulo' => 'MD Leve',
                'descricao' => 'Medida disciplinar leve para advertências consecutivas pelo mesmo motivo.',
                'artigo_referencia' => 'Art. 13',
                'natureza' => 'negativo',
                'pontuacao_padrao' => -0.20,
                'pontuacao_min' => -0.20,
                'pontuacao_max' => -0.20,
            ],
            [
                'codigo' => 'md_media',
                'tipo' => 'sancao',
                'categoria' => 'medida_disciplinar',
                'titulo' => 'MD Média',
                'descricao' => 'Medida disciplinar média por acúmulo de advertências leves ou médias.',
                'artigo_referencia' => 'Art. 13',
                'natureza' => 'negativo',
                'pontuacao_padrao' => -0.30,
                'pontuacao_min' => -0.30,
                'pontuacao_max' => -0.30,
            ],
            [
                'codigo' => 'md_grave',
                'tipo' => 'sancao',
                'categoria' => 'medida_disciplinar',
                'titulo' => 'MD Grave',
                'descricao' => 'Medida disciplinar grave aplicada a falta grave.',
                'artigo_referencia' => 'Art. 13',
                'natureza' => 'negativo',
                'pontuacao_padrao' => -0.50,
                'pontuacao_min' => -0.50,
                'pontuacao_max' => -0.50,
            ],
            [
                'codigo' => 'md_gravissima',
                'tipo' => 'sancao',
                'categoria' => 'medida_disciplinar',
                'titulo' => 'MD Gravíssima ou Eliminatória',
                'descricao' => 'Medida disciplinar gravíssima com faixa variável conforme a gravidade do fato.',
                'artigo_referencia' => 'Art. 13',
                'natureza' => 'negativo',
                'pontuacao_padrao' => -1.00,
                'pontuacao_min' => -2.00,
                'pontuacao_max' => -1.00,
            ],
            [
                'codigo' => 'elogio_nota',
                'tipo' => 'elogio',
                'categoria' => 'referencia_elogiosa',
                'titulo' => 'Referência elogiosa por nota',
                'descricao' => 'Cada nota 10 no boletim bimestral soma 0,02 ponto.',
                'artigo_referencia' => 'Art. 33, I',
                'natureza' => 'positivo',
                'pontuacao_padrao' => 0.02,
                'pontuacao_min' => 0.02,
                'pontuacao_max' => 0.02,
            ],
            [
                'codigo' => 'referencia_elogiosa',
                'tipo' => 'elogio',
                'categoria' => 'referencia_elogiosa',
                'titulo' => 'Referência elogiosa',
                'descricao' => 'Elogio por destaque interno, missão exercida com êxito ou seis meses sem sanções.',
                'artigo_referencia' => 'Art. 33, II',
                'natureza' => 'positivo',
                'pontuacao_padrao' => 0.20,
                'pontuacao_min' => 0.20,
                'pontuacao_max' => 0.20,
            ],
            [
                'codigo' => 'elogio_coletivo',
                'tipo' => 'elogio',
                'categoria' => 'elogio_coletivo',
                'titulo' => 'Elogio coletivo',
                'descricao' => 'Elogio por destaque coletivo, desfile, alamar, turma destaque ou liderança anual.',
                'artigo_referencia' => 'Art. 33, III',
                'natureza' => 'positivo',
                'pontuacao_padrao' => 0.30,
                'pontuacao_min' => 0.30,
                'pontuacao_max' => 0.30,
            ],
            [
                'codigo' => 'elogio_individual',
                'tipo' => 'elogio',
                'categoria' => 'elogio_individual',
                'titulo' => 'Elogio individual',
                'descricao' => 'Elogio por destaque estadual, alamar duplo, conselho de classe ou top 10 da companhia.',
                'artigo_referencia' => 'Art. 33, IV',
                'natureza' => 'positivo',
                'pontuacao_padrao' => 0.40,
                'pontuacao_min' => 0.40,
                'pontuacao_max' => 0.40,
            ],
            [
                'codigo' => 'mencao_honrosa',
                'tipo' => 'elogio',
                'categoria' => 'mencao_honrosa',
                'titulo' => 'Menção honrosa',
                'descricao' => 'Elogio de maior destaque para desempenho nacional ou internacional e primeira colocação.',
                'artigo_referencia' => 'Art. 33, V',
                'natureza' => 'positivo',
                'pontuacao_padrao' => 0.60,
                'pontuacao_min' => 0.60,
                'pontuacao_max' => 0.60,
            ],
            [
                'codigo' => 'faltas_leves',
                'tipo' => 'falta',
                'categoria' => 'classificacao',
                'titulo' => 'Faltas leves',
                'descricao' => 'Incluem atrasos, acessos sem permissão, descumprimentos simples e acessórios irregulares.',
                'artigo_referencia' => 'Art. 35, §1º',
                'natureza' => 'neutro',
                'pontuacao_padrao' => 0.00,
                'pontuacao_min' => 0.00,
                'pontuacao_max' => 0.00,
            ],
            [
                'codigo' => 'faltas_medias',
                'tipo' => 'falta',
                'categoria' => 'classificacao',
                'titulo' => 'Faltas médias',
                'descricao' => 'Incluem faltas injustificadas, desorganização, boatos e descumprimentos de natureza média.',
                'artigo_referencia' => 'Art. 35, §2º',
                'natureza' => 'negativo',
                'pontuacao_padrao' => -0.30,
                'pontuacao_min' => -0.30,
                'pontuacao_max' => -0.20,
            ],
            [
                'codigo' => 'faltas_graves',
                'tipo' => 'falta',
                'categoria' => 'classificacao',
                'titulo' => 'Faltas graves',
                'descricao' => 'Incluem agressão verbal, desacato, falsidade, celular indevido, cyberbullying e condutas graves.',
                'artigo_referencia' => 'Art. 35, §3º',
                'natureza' => 'negativo',
                'pontuacao_padrao' => -0.50,
                'pontuacao_min' => -0.50,
                'pontuacao_max' => -0.50,
            ],
            [
                'codigo' => 'faltas_gravissimas',
                'tipo' => 'falta',
                'categoria' => 'classificacao',
                'titulo' => 'Faltas gravíssimas ou eliminatórias',
                'descricao' => 'Incluem fraude, drogas, armas, vandalismo grave, assédio e invasão de sistemas disciplinares.',
                'artigo_referencia' => 'Art. 35, §4º',
                'natureza' => 'negativo',
                'pontuacao_padrao' => -1.00,
                'pontuacao_min' => -2.00,
                'pontuacao_max' => -1.00,
            ],
        ];
    }

    private function ensureAlunoDisciplinarColumn(PDO $pdo): void
    {
        $statement = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column');
        $statement->execute([
            'table' => 'alunos',
            'column' => 'disciplinar',
        ]);

        if ((int) ($statement->fetchColumn() ?: 0) > 0) {
            return;
        }

        $pdo->exec('ALTER TABLE alunos ADD COLUMN disciplinar LONGTEXT NULL AFTER desempenho');
    }

    private function normalizeIdList($values): array
    {
        $items = is_array($values) ? $values : [$values];
        $result = [];
        foreach ($items as $value) {
            if (is_array($value)) {
                foreach ($this->normalizeIdList($value) as $nestedId) {
                    $result[$nestedId] = $nestedId;
                }
                continue;
            }

            $id = (int) $value;
            if ($id > 0) {
                $result[$id] = $id;
            }
        }

        ksort($result);

        return array_values($result);
    }

    private function normalizeDate($value): ?string
    {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return null;
        }

        $date = date_create($raw);
        if ($date === false) {
            return null;
        }

        return $date->format('Y-m-d');
    }

    private function normalizeNullableText($value): ?string
    {
        $text = trim((string) ($value ?? ''));
        return $text !== '' ? $text : null;
    }
}