<?php
declare(strict_types=1);

class AvaliacaoModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $columns = $this->getTableColumns();

        if ($columns === []) {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS avaliacoes (
                    id INT NOT NULL AUTO_INCREMENT,
                    nome VARCHAR(255) NOT NULL,
                    is_recuperacao TINYINT(1) NOT NULL DEFAULT 0,
                    ciclo TINYINT UNSIGNED NULL,
                    is_simulado TINYINT(1) NOT NULL DEFAULT 0,
                    bimestre TINYINT UNSIGNED NULL,
                    aplicacao DATE NULL,
                    turma VARCHAR(120) NULL,
                    turmas_relacionadas TEXT NULL,
                    alunos_relacionados TEXT NULL,
                    descricao TEXT NULL,
                    gabarito LONGTEXT NULL,
                    autor_id INT NULL,
                    aplicador_id INT NULL,
                    aplicadores_relacionados TEXT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );

            return;
        }

        $required = [
            'nome' => 'ADD COLUMN nome VARCHAR(255) NOT NULL DEFAULT ""',
            'is_recuperacao' => 'ADD COLUMN is_recuperacao TINYINT(1) NOT NULL DEFAULT 0 AFTER nome',
            'ciclo' => 'ADD COLUMN ciclo TINYINT UNSIGNED NULL AFTER is_recuperacao',
            'is_simulado' => 'ADD COLUMN is_simulado TINYINT(1) NOT NULL DEFAULT 0 AFTER ciclo',
            'bimestre' => 'ADD COLUMN bimestre TINYINT UNSIGNED NULL AFTER nome',
            'aplicacao' => 'ADD COLUMN aplicacao DATE NULL',
            'turma' => 'ADD COLUMN turma VARCHAR(120) NULL',
            'turmas_relacionadas' => 'ADD COLUMN turmas_relacionadas TEXT NULL',
            'alunos_relacionados' => 'ADD COLUMN alunos_relacionados TEXT NULL',
            'descricao' => 'ADD COLUMN descricao TEXT NULL',
            'gabarito' => 'ADD COLUMN gabarito LONGTEXT NULL',
            'autor_id' => 'ADD COLUMN autor_id INT NULL',
            'aplicador_id' => 'ADD COLUMN aplicador_id INT NULL',
            'aplicadores_relacionados' => 'ADD COLUMN aplicadores_relacionados TEXT NULL',
            'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];

        foreach ($required as $column => $sql) {
            if (!isset($columns[strtolower($column)])) {
                $pdo->exec('ALTER TABLE avaliacoes ' . $sql);
            }
        }
    }

    public function getAllOrdered(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query(
            'SELECT a.id, a.nome, a.is_recuperacao, a.ciclo, a.is_simulado, a.bimestre, a.aplicacao, a.turma, a.turmas_relacionadas, a.alunos_relacionados, a.descricao, a.gabarito, a.autor_id, a.aplicador_id, a.aplicadores_relacionados, a.created_at, a.updated_at,
                    u.nome AS autor_nome,
                    ua.nome AS aplicador_nome
             FROM avaliacoes a
             LEFT JOIN usuarios u ON u.id = a.autor_id
             LEFT JOIN usuarios ua ON ua.id = a.aplicador_id
             ORDER BY (a.aplicacao IS NULL), a.aplicacao DESC, a.created_at DESC, a.id DESC'
        );

        return $this->hydrateRelatedTurmas($statement?->fetchAll() ?: []);
    }

    public function getAllOrderedByAutorOrAplicadorId(int $userId): array
    {
        $this->ensureTableStructure();

        if ($userId <= 0) {
            return [];
        }

        $rows = $this->getAllOrdered();

        return array_values(array_filter($rows, function ($row) use ($userId): bool {
            if (!is_array($row)) {
                return false;
            }

            if ((int) ($row['autor_id'] ?? 0) === $userId) {
                return true;
            }

            $aplicadoresIds = is_array($row['aplicadores_relacionados_ids'] ?? null)
                ? $row['aplicadores_relacionados_ids']
                : $this->decodeRelatedAplicadores((string) ($row['aplicadores_relacionados'] ?? ''));

            if ($aplicadoresIds === []) {
                $legacyAplicadorId = (int) ($row['aplicador_id'] ?? 0);
                if ($legacyAplicadorId > 0) {
                    $aplicadoresIds = [$legacyAplicadorId];
                }
            }

            return in_array($userId, $aplicadoresIds, true);
        }));
    }

    public function hasAccessibleAvaliacaoForUser(int $userId): bool
    {
        $this->ensureTableStructure();

        if ($userId <= 0) {
            return false;
        }

        return $this->getAllOrderedByAutorOrAplicadorId($userId) !== [];
    }

    public function findById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, nome, is_recuperacao, ciclo, is_simulado, bimestre, aplicacao, turma, turmas_relacionadas, alunos_relacionados, descricao, gabarito, autor_id, aplicador_id, aplicadores_relacionados, created_at, updated_at FROM avaliacoes WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        $hydrated = $this->hydrateRelatedTurmas([$row]);

        return $hydrated[0] ?? null;
    }

    public function create(string $nome, bool $isRecuperacao, ?int $ciclo, bool $isSimulado, ?int $bimestre, ?string $aplicacao, ?string $turma, array $turmasRelacionadasIds, array $alunosRelacionadosIds, ?string $descricao, ?string $gabarito, ?int $autorId = null, array $aplicadoresIds = []): int
    {
        $this->ensureTableStructure();

        $relatedJson = $this->encodeRelatedTurmas($turmasRelacionadasIds);
        $alunosRelatedJson = $this->encodeRelatedAlunos($alunosRelacionadosIds);
        $aplicadoresRelatedJson = $this->encodeRelatedAplicadores($aplicadoresIds);
        $legacyAplicadorId = $aplicadoresIds !== [] ? (int) $aplicadoresIds[0] : null;

        $pdo = Database::connection();
        $statement = $pdo->prepare('INSERT INTO avaliacoes (nome, is_recuperacao, ciclo, is_simulado, bimestre, aplicacao, turma, turmas_relacionadas, alunos_relacionados, descricao, gabarito, autor_id, aplicador_id, aplicadores_relacionados) VALUES (:nome, :is_recuperacao, :ciclo, :is_simulado, :bimestre, :aplicacao, :turma, :turmas_relacionadas, :alunos_relacionados, :descricao, :gabarito, :autor_id, :aplicador_id, :aplicadores_relacionados)');
        $statement->execute([
            'nome' => $nome,
            'is_recuperacao' => $isRecuperacao ? 1 : 0,
            'ciclo' => $ciclo,
            'is_simulado' => $isSimulado ? 1 : 0,
            'bimestre' => $bimestre,
            'aplicacao' => $aplicacao,
            'turma' => $turma,
            'turmas_relacionadas' => $relatedJson,
            'alunos_relacionados' => $alunosRelatedJson,
            'descricao' => $descricao,
            'gabarito' => $gabarito,
            'autor_id' => $autorId,
            'aplicador_id' => $legacyAplicadorId,
            'aplicadores_relacionados' => $aplicadoresRelatedJson,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function update(int $id, string $nome, bool $isRecuperacao, ?int $ciclo, bool $isSimulado, ?int $bimestre, ?string $aplicacao, ?string $turma, array $turmasRelacionadasIds, array $alunosRelacionadosIds, ?string $descricao, ?string $gabarito, array $aplicadoresIds = [], ?int $autorId = null): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para atualização.');
        }

        $this->ensureTableStructure();

        $relatedJson = $this->encodeRelatedTurmas($turmasRelacionadasIds);
        $alunosRelatedJson = $this->encodeRelatedAlunos($alunosRelacionadosIds);
        $aplicadoresRelatedJson = $this->encodeRelatedAplicadores($aplicadoresIds);
        $legacyAplicadorId = $aplicadoresIds !== [] ? (int) $aplicadoresIds[0] : null;

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE avaliacoes SET nome = :nome, is_recuperacao = :is_recuperacao, ciclo = :ciclo, is_simulado = :is_simulado, bimestre = :bimestre, aplicacao = :aplicacao, turma = :turma, turmas_relacionadas = :turmas_relacionadas, alunos_relacionados = :alunos_relacionados, descricao = :descricao, gabarito = :gabarito, aplicador_id = :aplicador_id, aplicadores_relacionados = :aplicadores_relacionados, autor_id = COALESCE(:autor_id, autor_id) WHERE id = :id');
        $statement->execute([
            'nome' => $nome,
            'is_recuperacao' => $isRecuperacao ? 1 : 0,
            'ciclo' => $ciclo,
            'is_simulado' => $isSimulado ? 1 : 0,
            'bimestre' => $bimestre,
            'aplicacao' => $aplicacao,
            'turma' => $turma,
            'turmas_relacionadas' => $relatedJson,
            'alunos_relacionados' => $alunosRelatedJson,
            'descricao' => $descricao,
            'gabarito' => $gabarito,
            'aplicador_id' => $legacyAplicadorId,
            'aplicadores_relacionados' => $aplicadoresRelatedJson,
            'autor_id' => $autorId,
            'id' => $id,
        ]);
    }

    public function updateGabarito(int $id, ?string $gabarito): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para atualizar gabarito.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE avaliacoes SET gabarito = :gabarito WHERE id = :id');
        $statement->execute([
            'gabarito' => $gabarito,
            'id' => $id,
        ]);
    }

    public function delete(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para exclusão.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM avaliacoes WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function isGabaritoPathReferencedByOtherAvaliacao(string $relativePath, int $excludeAvaliacaoId = 0): bool
    {
        $path = trim($relativePath);
        if ($path === '') {
            return false;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $needle = '%' . $path . '%';
        $escapedNeedle = '%' . str_replace('/', '\\/', $path) . '%';

                if ($excludeAvaliacaoId > 0) {
                        $statement = $pdo->prepare(
                                'SELECT id FROM avaliacoes
                                 WHERE id <> :exclude_id
                                     AND gabarito IS NOT NULL
                                     AND (
                                         gabarito LIKE :needle
                                         OR gabarito LIKE :escaped_needle
                                     )
                                 LIMIT 1'
                        );

                        $statement->execute([
                                'exclude_id' => $excludeAvaliacaoId,
                                'needle' => $needle,
                                'escaped_needle' => $escapedNeedle,
                        ]);
                } else {
                        $statement = $pdo->prepare(
                                'SELECT id FROM avaliacoes
                                 WHERE gabarito IS NOT NULL
                                     AND (
                                         gabarito LIKE :needle
                                         OR gabarito LIKE :escaped_needle
                                     )
                                 LIMIT 1'
                        );

                        $statement->execute([
                                'needle' => $needle,
                                'escaped_needle' => $escapedNeedle,
                        ]);
                }

        return (bool) $statement->fetch(PDO::FETCH_ASSOC);
    }

    private function getTableColumns(): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
        $statement->execute(['table' => 'avaliacoes']);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $result = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $name = strtolower(trim((string) ($row['COLUMN_NAME'] ?? '')));
            if ($name !== '') {
                $result[$name] = true;
            }
        }

        return $result;
    }

    private function encodeRelatedTurmas(array $turmaIds): ?string
    {
        $normalizedIds = [];

        foreach ($turmaIds as $turmaId) {
            $id = (int) $turmaId;
            if ($id > 0 && !in_array($id, $normalizedIds, true)) {
                $normalizedIds[] = $id;
            }
        }

        if ($normalizedIds === []) {
            return null;
        }

        return json_encode($normalizedIds, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function decodeRelatedTurmas(?string $rawJson): array
    {
        $value = trim((string) $rawJson);
        if ($value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return [];
        }

        $result = [];
        foreach ($decoded as $item) {
            $id = (int) $item;
            if ($id > 0 && !in_array($id, $result, true)) {
                $result[] = $id;
            }
        }

        return $result;
    }

    private function encodeRelatedAlunos(array $alunoIds): ?string
    {
        $normalizedIds = [];

        foreach ($alunoIds as $alunoId) {
            $id = (int) $alunoId;
            if ($id > 0 && !in_array($id, $normalizedIds, true)) {
                $normalizedIds[] = $id;
            }
        }

        if ($normalizedIds === []) {
            return null;
        }

        return json_encode($normalizedIds, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function decodeRelatedAlunos(?string $rawJson): array
    {
        $value = trim((string) $rawJson);
        if ($value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return [];
        }

        $result = [];
        foreach ($decoded as $item) {
            $id = (int) $item;
            if ($id > 0 && !in_array($id, $result, true)) {
                $result[] = $id;
            }
        }

        return $result;
    }

    private function encodeRelatedAplicadores(array $aplicadoresIds): ?string
    {
        $normalizedIds = [];

        foreach ($aplicadoresIds as $aplicadorId) {
            $id = (int) $aplicadorId;
            if ($id > 0 && !in_array($id, $normalizedIds, true)) {
                $normalizedIds[] = $id;
            }
        }

        if ($normalizedIds === []) {
            return null;
        }

        return json_encode($normalizedIds, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function decodeRelatedAplicadores(?string $rawJson): array
    {
        $value = trim((string) $rawJson);
        if ($value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return [];
        }

        $result = [];
        foreach ($decoded as $item) {
            $id = (int) $item;
            if ($id > 0 && !in_array($id, $result, true)) {
                $result[] = $id;
            }
        }

        return $result;
    }

    private function getUsuariosMap(): array
    {
        try {
            $rows = Database::connection()->query('SELECT id, nome, usuario, email FROM usuarios ORDER BY nome ASC')?->fetchAll() ?: [];
        } catch (Throwable) {
            $rows = [];
        }

        $usuariosMap = [];
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

            $usuariosMap[$id] = $nome;
        }

        return $usuariosMap;
    }

    private function hydrateRelatedTurmas(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $turmaModel = new TurmaModel();
        $alunoModel = new AlunoModel();

        try {
            $turmas = $turmaModel->getSimpleOptions();
        } catch (Throwable) {
            $turmas = [];
        }

        $turmasMap = [];
        foreach ($turmas as $turma) {
            if (!is_array($turma)) {
                continue;
            }

            $id = (int) ($turma['id'] ?? 0);
            $nome = trim((string) ($turma['nome'] ?? ''));
            if ($id > 0 && $nome !== '') {
                $turmasMap[$id] = $nome;
            }
        }

        try {
            $alunos = $alunoModel->getSimpleOptions();
        } catch (Throwable) {
            $alunos = [];
        }

        $alunosMap = [];
        foreach ($alunos as $aluno) {
            if (!is_array($aluno)) {
                continue;
            }

            $id = (int) ($aluno['id'] ?? 0);
            $nome = trim((string) ($aluno['nome'] ?? ''));
            if ($id > 0 && $nome !== '') {
                $alunosMap[$id] = $nome;
            }
        }

        $usuariosMap = $this->getUsuariosMap();

        foreach ($rows as &$row) {
            if (!is_array($row)) {
                continue;
            }

            $ids = $this->decodeRelatedTurmas((string) ($row['turmas_relacionadas'] ?? ''));
            $names = [];
            $alunosIds = $this->decodeRelatedAlunos((string) ($row['alunos_relacionados'] ?? ''));
            $alunosNames = [];

            foreach ($ids as $id) {
                if (isset($turmasMap[$id])) {
                    $names[] = $turmasMap[$id];
                }
            }

            $legacyTurma = trim((string) ($row['turma'] ?? ''));
            if ($names === [] && $legacyTurma !== '') {
                $names[] = $legacyTurma;
            }

            foreach ($alunosIds as $alunoId) {
                if (isset($alunosMap[$alunoId])) {
                    $alunosNames[] = $alunosMap[$alunoId];
                }
            }

            $row['turmas_relacionadas_ids'] = $ids;
            $row['turmas_relacionadas_nomes'] = $names;
            $row['alunos_relacionados_ids'] = $alunosIds;
            $row['alunos_relacionados_nomes'] = $alunosNames;

            $aplicadoresIds = $this->decodeRelatedAplicadores((string) ($row['aplicadores_relacionados'] ?? ''));
            $legacyAplicadorId = (int) ($row['aplicador_id'] ?? 0);
            if ($aplicadoresIds === [] && $legacyAplicadorId > 0) {
                $aplicadoresIds = [$legacyAplicadorId];
            }

            $aplicadoresNames = [];
            foreach ($aplicadoresIds as $aplicadorId) {
                if (isset($usuariosMap[$aplicadorId])) {
                    $aplicadoresNames[] = $usuariosMap[$aplicadorId];
                }
            }

            $row['aplicadores_relacionados_ids'] = $aplicadoresIds;
            $row['aplicadores_relacionados_nomes'] = $aplicadoresNames;
            $row['aplicador_nome'] = $aplicadoresNames !== []
                ? implode(', ', $aplicadoresNames)
                : trim((string) ($row['aplicador_nome'] ?? ''));
        }
        unset($row);

        return $rows;
    }
}
