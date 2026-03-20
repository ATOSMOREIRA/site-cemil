<?php
declare(strict_types=1);

class TurmaModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $columns = $this->getTableColumns();

        if ($columns === []) {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS turmas (
                    id INT NOT NULL AUTO_INCREMENT,
                    nome VARCHAR(120) NOT NULL,
                    ano_letivo INT NOT NULL,
                    turno VARCHAR(40) NOT NULL,
                    capacidade INT NOT NULL,
                    descricao TEXT NULL,
                    ano_escolar VARCHAR(40) NULL DEFAULT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );

            return;
        }

        $required = [
            'nome' => 'ADD COLUMN nome VARCHAR(120) NOT NULL DEFAULT ""',
            'ano_letivo' => 'ADD COLUMN ano_letivo INT NOT NULL DEFAULT 2000',
            'turno' => 'ADD COLUMN turno VARCHAR(40) NOT NULL DEFAULT "Manhã"',
            'capacidade' => 'ADD COLUMN capacidade INT NOT NULL DEFAULT 1',
            'descricao' => 'ADD COLUMN descricao TEXT NULL',
            'ano_escolar' => 'ADD COLUMN ano_escolar VARCHAR(40) NULL DEFAULT NULL',
            'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];

        foreach ($required as $column => $sql) {
            if (!isset($columns[$column])) {
                $pdo->exec('ALTER TABLE turmas ' . $sql);
            }
        }
    }

    public function getAllOrdered(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query('SELECT id, nome, ano_letivo, turno, capacidade, descricao, ano_escolar, created_at, updated_at FROM turmas ORDER BY ano_letivo DESC, nome ASC, id DESC');

        return $statement?->fetchAll() ?: [];
    }

    public function getSimpleOptions(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query('SELECT id, nome, ano_escolar FROM turmas ORDER BY nome ASC, id ASC');

        return $statement?->fetchAll() ?: [];
    }

    public function findById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, nome, ano_letivo, turno, capacidade, descricao, ano_escolar, created_at, updated_at FROM turmas WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function create(string $nome, int $anoLetivo, string $turno, int $capacidade, ?string $descricao, string $anoEscolar = ''): int
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('INSERT INTO turmas (nome, ano_letivo, turno, capacidade, descricao, ano_escolar) VALUES (:nome, :ano_letivo, :turno, :capacidade, :descricao, :ano_escolar)');
        $statement->execute([
            'nome' => $nome,
            'ano_letivo' => $anoLetivo,
            'turno' => $turno,
            'capacidade' => $capacidade,
            'descricao' => $descricao,
            'ano_escolar' => $anoEscolar !== '' ? $anoEscolar : null,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function update(int $id, string $nome, int $anoLetivo, string $turno, int $capacidade, ?string $descricao, string $anoEscolar = ''): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para atualização.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE turmas SET nome = :nome, ano_letivo = :ano_letivo, turno = :turno, capacidade = :capacidade, descricao = :descricao, ano_escolar = :ano_escolar WHERE id = :id');
        $statement->execute([
            'nome' => $nome,
            'ano_letivo' => $anoLetivo,
            'turno' => $turno,
            'capacidade' => $capacidade,
            'descricao' => $descricao,
            'ano_escolar' => $anoEscolar !== '' ? $anoEscolar : null,
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
        $statement = $pdo->prepare('DELETE FROM turmas WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    private function getTableColumns(): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
        $statement->execute(['table' => 'turmas']);
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
