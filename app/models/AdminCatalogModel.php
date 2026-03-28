<?php
declare(strict_types=1);

class AdminCatalogModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::connection();
        $this->ensureTables();
        $this->seedDefaultUserTypes();
    }

    public function listUserTypes(): array
    {
        $statement = $this->pdo->query('SELECT id, chave, nome FROM tipos_usuarios ORDER BY nome ASC, id ASC');
        $rows = $statement ? $statement->fetchAll() : [];
        $result = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            $chave = trim((string) ($row['chave'] ?? ''));
            $nome = trim((string) ($row['nome'] ?? ''));

            if ($id <= 0 || $chave === '' || $nome === '') {
                continue;
            }

            $result[] = [
                'id' => $id,
                'chave' => $chave,
                'nome' => $nome,
                'protegido' => in_array($chave, ['admin', 'servidor', 'aluno', 'tester'], true),
            ];
        }

        return $result;
    }

    public function listDepartments(): array
    {
        $statement = $this->pdo->query('SELECT id, nome FROM departamentos ORDER BY nome ASC, id ASC');
        $rows = $statement ? $statement->fetchAll() : [];
        $result = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            $nome = trim((string) ($row['nome'] ?? ''));
            if ($id <= 0 || $nome === '') {
                continue;
            }

            $result[] = ['id' => $id, 'nome' => $nome];
        }

        return $result;
    }

    public function listFunctions(): array
    {
        $statement = $this->pdo->query('SELECT id, nome FROM funcoes ORDER BY nome ASC, id ASC');
        $rows = $statement ? $statement->fetchAll() : [];
        $result = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            $nome = trim((string) ($row['nome'] ?? ''));
            if ($id <= 0 || $nome === '') {
                continue;
            }

            $result[] = ['id' => $id, 'nome' => $nome];
        }

        return $result;
    }

    public function saveUserType(int $id, string $chave, string $nome): int
    {
        $normalizedKey = $this->normalizeKey($chave);
        $normalizedName = trim($nome);

        if ($normalizedKey === '' || $normalizedName === '') {
            throw new InvalidArgumentException('Informe a chave e o nome do tipo de usuário.');
        }

        $existing = $this->findUserTypeById($id);
        if ($existing !== null && !empty($existing['protegido']) && $normalizedKey !== (string) $existing['chave']) {
            throw new RuntimeException('A chave de tipos protegidos não pode ser alterada.');
        }

        if ($this->existsDuplicatedRecord('tipos_usuarios', 'chave', $normalizedKey, $id)) {
            throw new RuntimeException('Já existe um tipo de usuário com esta chave.');
        }

        if ($this->existsDuplicatedRecord('tipos_usuarios', 'nome', $normalizedName, $id)) {
            throw new RuntimeException('Já existe um tipo de usuário com este nome.');
        }

        $this->pdo->beginTransaction();

        try {
            if ($existing !== null) {
                $oldKey = (string) ($existing['chave'] ?? '');
                $statement = $this->pdo->prepare('UPDATE tipos_usuarios SET chave = :chave, nome = :nome WHERE id = :id');
                $statement->execute([
                    'id' => $id,
                    'chave' => $normalizedKey,
                    'nome' => $normalizedName,
                ]);

                if ($oldKey !== '' && $oldKey !== $normalizedKey) {
                    $updateUsers = $this->pdo->prepare('UPDATE usuarios SET tipo = :novo WHERE tipo = :antigo');
                    $updateUsers->execute([
                        'novo' => $normalizedKey,
                        'antigo' => $oldKey,
                    ]);
                }
            } else {
                $statement = $this->pdo->prepare('INSERT INTO tipos_usuarios (chave, nome) VALUES (:chave, :nome)');
                $statement->execute([
                    'chave' => $normalizedKey,
                    'nome' => $normalizedName,
                ]);
                $id = (int) $this->pdo->lastInsertId();
            }

            $this->pdo->commit();
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }

        return $id;
    }

    public function saveDepartment(int $id, string $nome): int
    {
        $normalizedName = trim($nome);
        if ($normalizedName === '') {
            throw new InvalidArgumentException('Informe o nome do departamento.');
        }

        if ($this->existsDuplicatedRecord('departamentos', 'nome', $normalizedName, $id)) {
            throw new RuntimeException('Já existe um departamento com este nome.');
        }

        if ($id > 0) {
            $statement = $this->pdo->prepare('UPDATE departamentos SET nome = :nome WHERE id = :id');
            $statement->execute(['id' => $id, 'nome' => $normalizedName]);
            return $id;
        }

        $statement = $this->pdo->prepare('INSERT INTO departamentos (nome) VALUES (:nome)');
        $statement->execute(['nome' => $normalizedName]);
        return (int) $this->pdo->lastInsertId();
    }

    public function saveFunction(int $id, string $nome): int
    {
        $normalizedName = trim($nome);
        if ($normalizedName === '') {
            throw new InvalidArgumentException('Informe o nome da função.');
        }

        if ($this->existsDuplicatedRecord('funcoes', 'nome', $normalizedName, $id)) {
            throw new RuntimeException('Já existe uma função com este nome.');
        }

        if ($id > 0) {
            $statement = $this->pdo->prepare('UPDATE funcoes SET nome = :nome WHERE id = :id');
            $statement->execute(['id' => $id, 'nome' => $normalizedName]);
            return $id;
        }

        $statement = $this->pdo->prepare('INSERT INTO funcoes (nome) VALUES (:nome)');
        $statement->execute(['nome' => $normalizedName]);
        return (int) $this->pdo->lastInsertId();
    }

    public function deleteUserType(int $id): void
    {
        $existing = $this->findUserTypeById($id);
        if ($existing === null) {
            throw new RuntimeException('Tipo de usuário não encontrado.');
        }

        $key = (string) ($existing['chave'] ?? '');
        if (in_array($key, ['admin', 'servidor', 'aluno', 'tester'], true)) {
            throw new RuntimeException('Tipos padrão do sistema não podem ser excluídos.');
        }

        $statement = $this->pdo->prepare('SELECT COUNT(*) FROM usuarios WHERE tipo = :tipo');
        $statement->execute(['tipo' => $key]);
        $usageCount = (int) $statement->fetchColumn();
        if ($usageCount > 0) {
            throw new RuntimeException('Este tipo de usuário está vinculado a usuários cadastrados.');
        }

        $delete = $this->pdo->prepare('DELETE FROM tipos_usuarios WHERE id = :id');
        $delete->execute(['id' => $id]);
    }

    public function deleteDepartment(int $id): void
    {
        if ($id <= 0) {
            throw new RuntimeException('Departamento inválido.');
        }

        $statement = $this->pdo->prepare('SELECT COUNT(*) FROM usuarios WHERE departamento = :id');
        $statement->execute(['id' => $id]);
        $usageCount = (int) $statement->fetchColumn();
        if ($usageCount > 0) {
            throw new RuntimeException('Este departamento está vinculado a usuários cadastrados.');
        }

        $delete = $this->pdo->prepare('DELETE FROM departamentos WHERE id = :id');
        $delete->execute(['id' => $id]);
    }

    public function deleteFunction(int $id): void
    {
        if ($id <= 0) {
            throw new RuntimeException('Função inválida.');
        }

        $statement = $this->pdo->prepare('SELECT COUNT(*) FROM usuarios WHERE funcao = :id');
        $statement->execute(['id' => $id]);
        $usageCount = (int) $statement->fetchColumn();
        if ($usageCount > 0) {
            throw new RuntimeException('Esta função está vinculada a usuários cadastrados.');
        }

        $delete = $this->pdo->prepare('DELETE FROM funcoes WHERE id = :id');
        $delete->execute(['id' => $id]);
    }

    private function findUserTypeById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $statement = $this->pdo->prepare('SELECT id, chave, nome FROM tipos_usuarios WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();
        if (!is_array($row)) {
            return null;
        }

        $row['protegido'] = in_array((string) ($row['chave'] ?? ''), ['admin', 'servidor', 'aluno', 'tester'], true);
        return $row;
    }

    private function existsDuplicatedRecord(string $table, string $column, string $value, int $excludedId = 0): bool
    {
        $sql = 'SELECT id FROM ' . $table . ' WHERE LOWER(TRIM(' . $column . ')) = LOWER(TRIM(:value))';
        if ($excludedId > 0) {
            $sql .= ' AND id <> :id';
        }
        $sql .= ' LIMIT 1';

        $statement = $this->pdo->prepare($sql);
        $params = ['value' => $value];
        if ($excludedId > 0) {
            $params['id'] = $excludedId;
        }
        $statement->execute($params);
        return (bool) $statement->fetchColumn();
    }

    private function normalizeKey(string $value): string
    {
        $normalized = trim(mb_strtolower($value, 'UTF-8'));
        $normalized = preg_replace('/[^a-z0-9_]+/u', '_', $normalized) ?? '';
        $normalized = trim($normalized, '_');
        return $normalized;
    }

    private function ensureTables(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS departamentos (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(120) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS funcoes (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(120) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS tipos_usuarios (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                chave VARCHAR(60) NOT NULL,
                nome VARCHAR(120) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_tipos_usuarios_chave (chave)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    private function seedDefaultUserTypes(): void
    {
        $defaults = [
            'admin' => 'Administrador',
            'servidor' => 'Servidor',
            'aluno' => 'Aluno',
            'tester' => 'Tester',
        ];

        $statement = $this->pdo->prepare(
            'INSERT INTO tipos_usuarios (chave, nome) VALUES (:chave, :nome)
             ON DUPLICATE KEY UPDATE nome = VALUES(nome)'
        );

        foreach ($defaults as $key => $name) {
            $statement->execute([
                'chave' => $key,
                'nome' => $name,
            ]);
        }
    }
}
