<?php
declare(strict_types=1);

class AlunoModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $columns = $this->getTableColumns();

        if ($columns === []) {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS alunos (
                    id INT NOT NULL AUTO_INCREMENT,
                    nome VARCHAR(150) NOT NULL,
                    matricula VARCHAR(30) NOT NULL,
                    desempenho LONGTEXT NULL,
                    ativo TINYINT(1) NOT NULL DEFAULT 1,
                    situacao VARCHAR(40) NOT NULL DEFAULT "Cursando",
                    historico LONGTEXT NULL,
                    turma_id INT NULL,
                    turma VARCHAR(120) NOT NULL,
                    data_nascimento DATE NULL,
                    data_entrada DATE NULL,
                    data_saida DATE NULL,
                    rg VARCHAR(20) NULL,
                    cpf VARCHAR(14) NULL,
                    necessidade_deficiencia VARCHAR(255) NULL,
                    responsavel VARCHAR(150) NULL,
                    telefone VARCHAR(25) NULL,
                    email VARCHAR(180) NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_alunos_matricula (matricula)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );

            return;
        }

        $required = [
            'nome' => 'ADD COLUMN nome VARCHAR(150) NOT NULL DEFAULT ""',
            'matricula' => 'ADD COLUMN matricula VARCHAR(30) NOT NULL DEFAULT ""',
            'desempenho' => 'ADD COLUMN desempenho LONGTEXT NULL AFTER matricula',
            'ativo' => 'ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER desempenho',
            'situacao' => 'ADD COLUMN situacao VARCHAR(40) NOT NULL DEFAULT "Cursando" AFTER ativo',
            'historico' => 'ADD COLUMN historico LONGTEXT NULL AFTER situacao',
            'turma_id' => 'ADD COLUMN turma_id INT NULL',
            'turma' => 'ADD COLUMN turma VARCHAR(120) NOT NULL DEFAULT ""',
            'data_nascimento' => 'ADD COLUMN data_nascimento DATE NULL',
            'data_entrada' => 'ADD COLUMN data_entrada DATE NULL',
            'data_saida' => 'ADD COLUMN data_saida DATE NULL',
            'rg' => 'ADD COLUMN rg VARCHAR(20) NULL',
            'cpf' => 'ADD COLUMN cpf VARCHAR(14) NULL',
            'necessidade_deficiencia' => 'ADD COLUMN necessidade_deficiencia VARCHAR(255) NULL',
            'responsavel' => 'ADD COLUMN responsavel VARCHAR(150) NULL',
            'telefone' => 'ADD COLUMN telefone VARCHAR(25) NULL',
            'email' => 'ADD COLUMN email VARCHAR(180) NULL',
            'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];

        foreach ($required as $column => $sql) {
            if (!isset($columns[$column])) {
                $pdo->exec('ALTER TABLE alunos ' . $sql);
            }
        }

        if (isset($columns['data_nascimento'])) {
            try {
                $pdo->exec('ALTER TABLE alunos MODIFY data_nascimento DATE NULL');
            } catch (Throwable) {
            }
        }

        if (isset($columns['data_entrada'])) {
            try {
                $pdo->exec('ALTER TABLE alunos MODIFY data_entrada DATE NULL');
            } catch (Throwable) {
            }
        }

        if (isset($columns['data_saida'])) {
            try {
                $pdo->exec('ALTER TABLE alunos MODIFY data_saida DATE NULL');
            } catch (Throwable) {
            }
        }

        if (!$this->hasUniqueMatriculaIndex()) {
            try {
                $pdo->exec('ALTER TABLE alunos ADD UNIQUE KEY uk_alunos_matricula (matricula)');
            } catch (Throwable) {
            }
        }
    }

    public function getAllOrdered(bool $onlyActive = false): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $sql = 'SELECT id, nome, matricula, desempenho, ativo, situacao, historico, turma_id, turma, data_nascimento, data_entrada, data_saida, rg, cpf, necessidade_deficiencia, responsavel, telefone, email, created_at, updated_at FROM alunos';
        if ($onlyActive) {
            $sql .= ' WHERE ativo = 1';
        }
        $sql .= ' ORDER BY nome ASC, id DESC';
        $statement = $pdo->query($sql);

        return $statement?->fetchAll() ?: [];
    }

    public function getSimpleOptions(bool $onlyActive = true): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $sql = 'SELECT id, nome, matricula, ativo, situacao, turma_id, turma FROM alunos';
        if ($onlyActive) {
            $sql .= ' WHERE ativo = 1';
        }
        $sql .= ' ORDER BY nome ASC, id ASC';
        $statement = $pdo->query($sql);

        return $statement?->fetchAll() ?: [];
    }

    public function getByTurmaId(int $turmaId, bool $onlyActive = true): array
    {
        $this->ensureTableStructure();

        if ($turmaId <= 0) {
            return [];
        }

        $pdo = Database::connection();
        $sql = 'SELECT id, nome, matricula, ativo, situacao, turma_id, turma FROM alunos WHERE turma_id = :turma_id';
        if ($onlyActive) {
            $sql .= ' AND ativo = 1';
        }
        $sql .= ' ORDER BY nome ASC, id ASC';
        $statement = $pdo->prepare($sql);
        $statement->execute(['turma_id' => $turmaId]);

        return $statement->fetchAll() ?: [];
    }

    public function findById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, nome, matricula, desempenho, ativo, situacao, historico, turma_id, turma, data_nascimento, data_entrada, data_saida, rg, cpf, necessidade_deficiencia, responsavel, telefone, email, created_at, updated_at FROM alunos WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function findByMatricula(string $matricula, ?bool $onlyActive = null): ?array
    {
        $matricula = trim($matricula);
        if ($matricula === '') {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $sql = 'SELECT id, nome, matricula, desempenho, ativo, situacao, historico, turma_id, turma, data_nascimento, data_entrada, data_saida, rg, cpf, necessidade_deficiencia, responsavel, telefone, email, created_at, updated_at FROM alunos WHERE matricula = :matricula';
        if ($onlyActive === true) {
            $sql .= ' AND ativo = 1';
        } elseif ($onlyActive === false) {
            $sql .= ' AND ativo = 0';
        }
        $sql .= $onlyActive === null
            ? ' ORDER BY ativo DESC, id DESC LIMIT 1'
            : ' ORDER BY id DESC LIMIT 1';
        $statement = $pdo->prepare($sql);
        $statement->execute(['matricula' => $matricula]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function existsMatriculaForAnotherRecord(string $matricula, int $excludedId = 0): bool
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();

        if ($excludedId > 0) {
            $statement = $pdo->prepare('SELECT id FROM alunos WHERE matricula = :matricula AND id <> :id LIMIT 1');
            $statement->execute([
                'matricula' => $matricula,
                'id' => $excludedId,
            ]);
        } else {
            $statement = $pdo->prepare('SELECT id FROM alunos WHERE matricula = :matricula LIMIT 1');
            $statement->execute([
                'matricula' => $matricula,
            ]);
        }

        return (int) ($statement->fetchColumn() ?: 0) > 0;
    }

    public function create(string $nome, string $matricula, ?int $turmaId, string $turma, ?string $dataNascimento, ?string $dataEntrada, ?string $dataSaida, ?string $rg, ?string $cpf, ?string $necessidadeDeficiencia, ?string $responsavel, ?string $telefone, ?string $email, bool $ativo = true, ?string $situacao = 'Cursando', ?string $historico = null): int
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('INSERT INTO alunos (nome, matricula, turma_id, turma, data_nascimento, data_entrada, data_saida, rg, cpf, necessidade_deficiencia, responsavel, telefone, email, ativo, situacao, historico) VALUES (:nome, :matricula, :turma_id, :turma, :data_nascimento, :data_entrada, :data_saida, :rg, :cpf, :necessidade_deficiencia, :responsavel, :telefone, :email, :ativo, :situacao, :historico)');
        $statement->execute([
            'nome' => $nome,
            'matricula' => $matricula,
            'turma_id' => $turmaId,
            'turma' => $turma,
            'data_nascimento' => $dataNascimento,
            'data_entrada' => $dataEntrada,
            'data_saida' => $dataSaida,
            'rg' => $rg,
            'cpf' => $cpf,
            'necessidade_deficiencia' => $necessidadeDeficiencia,
            'responsavel' => $responsavel,
            'telefone' => $telefone,
            'email' => $email,
            'ativo' => $ativo ? 1 : 0,
            'situacao' => $situacao !== null && trim($situacao) !== '' ? trim($situacao) : 'Cursando',
            'historico' => $historico,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function update(int $id, string $nome, string $matricula, ?int $turmaId, string $turma, ?string $dataNascimento, ?string $dataEntrada, ?string $dataSaida, ?string $rg, ?string $cpf, ?string $necessidadeDeficiencia, ?string $responsavel, ?string $telefone, ?string $email, ?bool $ativo = null, ?string $situacao = null, ?string $historico = null): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para atualização.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE alunos SET nome = :nome, matricula = :matricula, turma_id = :turma_id, turma = :turma, data_nascimento = :data_nascimento, data_entrada = :data_entrada, data_saida = :data_saida, rg = :rg, cpf = :cpf, necessidade_deficiencia = :necessidade_deficiencia, responsavel = :responsavel, telefone = :telefone, email = :email, ativo = COALESCE(:ativo, ativo), situacao = COALESCE(:situacao, situacao), historico = COALESCE(:historico, historico) WHERE id = :id');
        $statement->execute([
            'nome' => $nome,
            'matricula' => $matricula,
            'turma_id' => $turmaId,
            'turma' => $turma,
            'data_nascimento' => $dataNascimento,
            'data_entrada' => $dataEntrada,
            'data_saida' => $dataSaida,
            'rg' => $rg,
            'cpf' => $cpf,
            'necessidade_deficiencia' => $necessidadeDeficiencia,
            'responsavel' => $responsavel,
            'telefone' => $telefone,
            'email' => $email,
            'ativo' => $ativo === null ? null : ($ativo ? 1 : 0),
            'situacao' => $situacao,
            'historico' => $historico,
            'id' => $id,
        ]);
    }

    public function updateDesempenho(int $id, ?string $desempenhoJson): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para atualizar desempenho.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE alunos SET desempenho = :desempenho WHERE id = :id');
        $statement->execute([
            'desempenho' => $desempenhoJson,
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
        $statement = $pdo->prepare('DELETE FROM alunos WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function reassignTurmaStudents(int $turmaId, string $turmaNome, array $selectedAlunoIds): void
    {
        if ($turmaId <= 0) {
            throw new InvalidArgumentException('Turma inválida para relacionamento.');
        }

        $this->ensureTableStructure();

        $normalizedIds = [];
        foreach ($selectedAlunoIds as $alunoId) {
            $id = (int) $alunoId;
            if ($id > 0 && !in_array($id, $normalizedIds, true)) {
                $normalizedIds[] = $id;
            }
        }

        $pdo = Database::connection();

        if ($normalizedIds === []) {
            $clearStatement = $pdo->prepare('UPDATE alunos SET turma_id = NULL, turma = "" WHERE turma_id = :turma_id');
            $clearStatement->execute(['turma_id' => $turmaId]);
            return;
        }

        $placeholders = implode(',', array_fill(0, count($normalizedIds), '?'));

        $clearSql = 'UPDATE alunos SET turma_id = NULL, turma = "" WHERE turma_id = ? AND id NOT IN (' . $placeholders . ')';
        $clearStatement = $pdo->prepare($clearSql);
        $clearStatement->execute(array_merge([$turmaId], $normalizedIds));

        $assignSql = 'UPDATE alunos SET turma_id = ?, turma = ? WHERE id IN (' . $placeholders . ')';
        $assignStatement = $pdo->prepare($assignSql);
        $assignStatement->execute(array_merge([$turmaId, $turmaNome], $normalizedIds));
    }

    public function clearTurmaRelation(int $turmaId): void
    {
        if ($turmaId <= 0) {
            return;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE alunos SET turma_id = NULL, turma = "" WHERE turma_id = :turma_id');
        $statement->execute(['turma_id' => $turmaId]);
    }

    private function hasUniqueMatriculaIndex(): bool
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
        $statement->execute(['table' => 'alunos']);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $columnName = strtolower(trim((string) ($row['COLUMN_NAME'] ?? '')));
            $nonUnique = (int) ($row['NON_UNIQUE'] ?? 1);

            if ($columnName === 'matricula' && $nonUnique === 0) {
                return true;
            }
        }

        return false;
    }

    private function getTableColumns(): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
        $statement->execute(['table' => 'alunos']);
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
}
