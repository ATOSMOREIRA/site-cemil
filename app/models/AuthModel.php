<?php
declare(strict_types=1);

class AuthModel
{
    private static bool $passwordRecoveryColumnsEnsured = false;

    public function findByCredential(string $credential): ?array
    {
        $this->ensurePasswordRecoveryColumns();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT * FROM usuarios WHERE email = :credential OR usuario = :credential LIMIT 1');
        $statement->execute(['credential' => $credential]);
        $user = $statement->fetch();

        return $user !== false ? $user : null;
    }

    public function findById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensurePasswordRecoveryColumns();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, tipo, departamento, funcao, nome, usuario, email, senha, servicos, cpf_encrypted, senha_temporaria_ate, exige_troca_senha FROM usuarios WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $user = $statement->fetch();

        return $user !== false ? $user : null;
    }

    public function findByEmail(string $email): ?array
    {
        $email = trim($email);
        if ($email === '') {
            return null;
        }

        $this->ensurePasswordRecoveryColumns();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT * FROM usuarios WHERE email = :email LIMIT 1');
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();

        return $user !== false ? $user : null;
    }

    public function existsEmailForAnotherUser(string $email, int $excludedUserId): bool
    {
        $this->ensurePasswordRecoveryColumns();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id FROM usuarios WHERE email = :email AND id <> :excluded_user_id LIMIT 1');
        $statement->execute([
            'email' => $email,
            'excluded_user_id' => $excludedUserId,
        ]);

        return (int) ($statement->fetchColumn() ?: 0) > 0;
    }

    public function updateProfile(int $id, string $nome, string $email, ?string $newPassword = null): void
    {
        $this->ensurePasswordRecoveryColumns();

        $pdo = Database::connection();

        if ($newPassword !== null && $newPassword !== '') {
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $statement = $pdo->prepare('UPDATE usuarios SET nome = :nome, email = :email, senha = :senha, senha_temporaria_ate = NULL, exige_troca_senha = 0 WHERE id = :id');
            $statement->execute([
                'nome' => $nome,
                'email' => $email,
                'senha' => $hashedPassword,
                'id' => $id,
            ]);

            return;
        }

        $statement = $pdo->prepare('UPDATE usuarios SET nome = :nome, email = :email WHERE id = :id');
        $statement->execute([
            'nome' => $nome,
            'email' => $email,
            'id' => $id,
        ]);
    }

    public function storeTemporaryPassword(int $id, string $temporaryPassword, DateTimeInterface $expiresAt): void
    {
        $this->ensurePasswordRecoveryColumns();

        $hashedPassword = password_hash($temporaryPassword, PASSWORD_DEFAULT);
        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE usuarios SET senha = :senha, senha_temporaria_ate = :senha_temporaria_ate, exige_troca_senha = 1 WHERE id = :id');
        $statement->execute([
            'senha' => $hashedPassword,
            'senha_temporaria_ate' => $expiresAt->format('Y-m-d H:i:s'),
            'id' => $id,
        ]);
    }

    public function updatePasswordAfterTemporaryReset(int $id, string $newPassword): void
    {
        $this->ensurePasswordRecoveryColumns();

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE usuarios SET senha = :senha, senha_temporaria_ate = NULL, exige_troca_senha = 0 WHERE id = :id');
        $statement->execute([
            'senha' => $hashedPassword,
            'id' => $id,
        ]);
    }

    private function ensurePasswordRecoveryColumns(): void
    {
        if (self::$passwordRecoveryColumnsEnsured) {
            return;
        }

        $pdo = Database::connection();
        $existingColumns = [];
        $statement = $pdo->query("SHOW COLUMNS FROM usuarios");
        $rows = $statement !== false ? $statement->fetchAll() : [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $columnName = trim((string) ($row['Field'] ?? ''));
            if ($columnName !== '') {
                $existingColumns[$columnName] = true;
            }
        }

        if (!isset($existingColumns['senha_temporaria_ate'])) {
            $pdo->exec('ALTER TABLE usuarios ADD COLUMN senha_temporaria_ate DATETIME NULL AFTER senha');
        }

        if (!isset($existingColumns['exige_troca_senha'])) {
            $pdo->exec('ALTER TABLE usuarios ADD COLUMN exige_troca_senha TINYINT(1) NOT NULL DEFAULT 0 AFTER senha_temporaria_ate');
        }

        self::$passwordRecoveryColumnsEnsured = true;
    }
}
