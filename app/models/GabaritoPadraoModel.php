<?php
declare(strict_types=1);

class GabaritoPadraoModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $columns = $this->getTableColumns();

        if ($columns === []) {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS gabarito_padrao_config (
                    id TINYINT NOT NULL,
                    config LONGTEXT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );

            return;
        }

        $required = [
            'config' => 'ADD COLUMN config LONGTEXT NULL',
            'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];

        foreach ($required as $column => $sql) {
            if (!isset($columns[strtolower($column)])) {
                $pdo->exec('ALTER TABLE gabarito_padrao_config ' . $sql);
            }
        }
    }

    public function getConfig(): ?array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT config FROM gabarito_padrao_config WHERE id = 1 LIMIT 1');
        $statement->execute();
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row)) {
            return null;
        }

        $rawConfig = trim((string) ($row['config'] ?? ''));
        if ($rawConfig === '') {
            return null;
        }

        $decoded = json_decode($rawConfig, true);

        return is_array($decoded) ? $decoded : null;
    }

    public function saveConfig(array $config): void
    {
        $this->ensureTableStructure();

        $payload = json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($payload) || $payload === '') {
            throw new RuntimeException('Não foi possível serializar a configuração padrão do gabarito.');
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'INSERT INTO gabarito_padrao_config (id, config, updated_at)
             VALUES (1, :config, NOW())
             ON DUPLICATE KEY UPDATE config = VALUES(config), updated_at = NOW()'
        );
        $statement->execute([
            'config' => $payload,
        ]);
    }

    public function clearConfig(): void
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM gabarito_padrao_config WHERE id = 1');
        $statement->execute();
    }

    private function getTableColumns(): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
        $statement->execute(['table' => 'gabarito_padrao_config']);
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