<?php
declare(strict_types=1);

class AvaliacaoCorrecaoModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();
        $columns = $this->getTableColumns();

        if ($columns === []) {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS avaliacao_correcoes (
                    id INT NOT NULL AUTO_INCREMENT,
                    avaliacao_id INT NOT NULL,
                    aluno_id INT NOT NULL,
                    turma_id INT NOT NULL,
                    avaliacao_nome VARCHAR(255) NOT NULL DEFAULT "",
                    aluno_nome VARCHAR(255) NOT NULL DEFAULT "",
                    turma_nome VARCHAR(255) NOT NULL DEFAULT "",
                    numeracao VARCHAR(40) NOT NULL DEFAULT "",
                    qr_payload TEXT NULL,
                    respostas_json LONGTEXT NULL,
                    correcoes_json LONGTEXT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT "corrigida",
                    acertos INT NOT NULL DEFAULT 0,
                    total_questoes INT NOT NULL DEFAULT 0,
                    pontuacao DECIMAL(8,2) NOT NULL DEFAULT 0,
                    pontuacao_total DECIMAL(8,2) NOT NULL DEFAULT 0,
                    percentual DECIMAL(6,2) NOT NULL DEFAULT 0,
                    corrigido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY uniq_avaliacao_aluno_turma (avaliacao_id, aluno_id, turma_id),
                    KEY idx_avaliacao (avaliacao_id),
                    KEY idx_aluno (aluno_id),
                    KEY idx_turma (turma_id),
                    KEY idx_corrigido_em (corrigido_em)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );

            return;
        }

        $required = [
            'avaliacao_id' => 'ADD COLUMN avaliacao_id INT NOT NULL DEFAULT 0',
            'aluno_id' => 'ADD COLUMN aluno_id INT NOT NULL DEFAULT 0',
            'turma_id' => 'ADD COLUMN turma_id INT NOT NULL DEFAULT 0',
            'avaliacao_nome' => 'ADD COLUMN avaliacao_nome VARCHAR(255) NOT NULL DEFAULT ""',
            'aluno_nome' => 'ADD COLUMN aluno_nome VARCHAR(255) NOT NULL DEFAULT ""',
            'turma_nome' => 'ADD COLUMN turma_nome VARCHAR(255) NOT NULL DEFAULT ""',
            'numeracao' => 'ADD COLUMN numeracao VARCHAR(40) NOT NULL DEFAULT ""',
            'qr_payload' => 'ADD COLUMN qr_payload TEXT NULL',
            'respostas_json' => 'ADD COLUMN respostas_json LONGTEXT NULL',
            'correcoes_json' => 'ADD COLUMN correcoes_json LONGTEXT NULL',
            'status' => 'ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT "corrigida"',
            'acertos' => 'ADD COLUMN acertos INT NOT NULL DEFAULT 0',
            'total_questoes' => 'ADD COLUMN total_questoes INT NOT NULL DEFAULT 0',
            'pontuacao' => 'ADD COLUMN pontuacao DECIMAL(8,2) NOT NULL DEFAULT 0',
            'pontuacao_total' => 'ADD COLUMN pontuacao_total DECIMAL(8,2) NOT NULL DEFAULT 0',
            'percentual' => 'ADD COLUMN percentual DECIMAL(6,2) NOT NULL DEFAULT 0',
            'corrigido_em' => 'ADD COLUMN corrigido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];

        foreach ($required as $column => $sql) {
            if (!isset($columns[strtolower($column)])) {
                $pdo->exec('ALTER TABLE avaliacao_correcoes ' . $sql);
            }
        }

        $indexes = $this->getTableIndexes();
        if (!isset($indexes['uniq_avaliacao_aluno_turma'])) {
            $pdo->exec('ALTER TABLE avaliacao_correcoes ADD UNIQUE KEY uniq_avaliacao_aluno_turma (avaliacao_id, aluno_id, turma_id)');
        }
        if (!isset($indexes['idx_avaliacao'])) {
            $pdo->exec('ALTER TABLE avaliacao_correcoes ADD KEY idx_avaliacao (avaliacao_id)');
        }
        if (!isset($indexes['idx_aluno'])) {
            $pdo->exec('ALTER TABLE avaliacao_correcoes ADD KEY idx_aluno (aluno_id)');
        }
        if (!isset($indexes['idx_turma'])) {
            $pdo->exec('ALTER TABLE avaliacao_correcoes ADD KEY idx_turma (turma_id)');
        }
        if (!isset($indexes['idx_corrigido_em'])) {
            $pdo->exec('ALTER TABLE avaliacao_correcoes ADD KEY idx_corrigido_em (corrigido_em)');
        }
    }

    public function listByAvaliacaoId(int $avaliacaoId): array
    {
        $this->ensureTableStructure();
        if ($avaliacaoId <= 0) {
            return [];
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT id, avaliacao_id, aluno_id, turma_id, avaliacao_nome, aluno_nome, turma_nome, numeracao, qr_payload, respostas_json, correcoes_json, status, acertos, total_questoes, pontuacao, pontuacao_total, percentual, corrigido_em, created_at, updated_at
             FROM avaliacao_correcoes
             WHERE avaliacao_id = :avaliacao_id
             ORDER BY turma_nome ASC, aluno_nome ASC, id ASC'
        );
        $statement->execute(['avaliacao_id' => $avaliacaoId]);

        return array_map([$this, 'hydrateRow'], $statement->fetchAll(PDO::FETCH_ASSOC) ?: []);
    }

    public function countByAvaliacaoIds(array $avaliacaoIds): array
    {
        $this->ensureTableStructure();

        $ids = array_values(array_unique(array_filter(array_map(static function ($value): int {
            return (int) $value;
        }, $avaliacaoIds), static function (int $value): bool {
            return $value > 0;
        })));

        if ($ids === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT avaliacao_id, COUNT(*) AS total_corrigidos
             FROM avaliacao_correcoes
             WHERE avaliacao_id IN (' . $placeholders . ')
             GROUP BY avaliacao_id'
        );
        $statement->execute($ids);

        $result = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            if (!is_array($row)) {
                continue;
            }

            $result[(int) ($row['avaliacao_id'] ?? 0)] = (int) ($row['total_corrigidos'] ?? 0);
        }

        return $result;
    }

    public function findByComposite(int $avaliacaoId, int $alunoId, int $turmaId): ?array
    {
        $this->ensureTableStructure();
        if ($avaliacaoId <= 0 || $alunoId <= 0 || $turmaId <= 0) {
            return null;
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT id, avaliacao_id, aluno_id, turma_id, avaliacao_nome, aluno_nome, turma_nome, numeracao, qr_payload, respostas_json, correcoes_json, status, acertos, total_questoes, pontuacao, pontuacao_total, percentual, corrigido_em, created_at, updated_at
             FROM avaliacao_correcoes
             WHERE avaliacao_id = :avaliacao_id AND aluno_id = :aluno_id AND turma_id = :turma_id
             LIMIT 1'
        );
        $statement->execute([
            'avaliacao_id' => $avaliacaoId,
            'aluno_id' => $alunoId,
            'turma_id' => $turmaId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $this->hydrateRow($row) : null;
    }

    public function findById(int $id): ?array
    {
        $this->ensureTableStructure();
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT id, avaliacao_id, aluno_id, turma_id, avaliacao_nome, aluno_nome, turma_nome, numeracao, qr_payload, respostas_json, correcoes_json, status, acertos, total_questoes, pontuacao, pontuacao_total, percentual, corrigido_em, created_at, updated_at
             FROM avaliacao_correcoes
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);

        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $this->hydrateRow($row) : null;
    }

    public function create(array $payload): int
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'INSERT INTO avaliacao_correcoes (avaliacao_id, aluno_id, turma_id, avaliacao_nome, aluno_nome, turma_nome, numeracao, qr_payload, respostas_json, correcoes_json, status, acertos, total_questoes, pontuacao, pontuacao_total, percentual, corrigido_em)
             VALUES (:avaliacao_id, :aluno_id, :turma_id, :avaliacao_nome, :aluno_nome, :turma_nome, :numeracao, :qr_payload, :respostas_json, :correcoes_json, :status, :acertos, :total_questoes, :pontuacao, :pontuacao_total, :percentual, :corrigido_em)'
        );
        $statement->execute([
            'avaliacao_id' => (int) ($payload['avaliacao_id'] ?? 0),
            'aluno_id' => (int) ($payload['aluno_id'] ?? 0),
            'turma_id' => (int) ($payload['turma_id'] ?? 0),
            'avaliacao_nome' => trim((string) ($payload['avaliacao_nome'] ?? '')),
            'aluno_nome' => trim((string) ($payload['aluno_nome'] ?? '')),
            'turma_nome' => trim((string) ($payload['turma_nome'] ?? '')),
            'numeracao' => trim((string) ($payload['numeracao'] ?? '')),
            'qr_payload' => $payload['qr_payload'] ?? null,
            'respostas_json' => $payload['respostas_json'] ?? null,
            'correcoes_json' => $payload['correcoes_json'] ?? null,
            'status' => trim((string) ($payload['status'] ?? 'corrigida')),
            'acertos' => (int) ($payload['acertos'] ?? 0),
            'total_questoes' => (int) ($payload['total_questoes'] ?? 0),
            'pontuacao' => (float) ($payload['pontuacao'] ?? 0),
            'pontuacao_total' => (float) ($payload['pontuacao_total'] ?? 0),
            'percentual' => (float) ($payload['percentual'] ?? 0),
            'corrigido_em' => trim((string) ($payload['corrigido_em'] ?? '')) !== ''
                ? trim((string) ($payload['corrigido_em'] ?? ''))
                : date('Y-m-d H:i:s'),
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function updateById(int $id, array $payload): bool
    {
        $this->ensureTableStructure();
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'UPDATE avaliacao_correcoes
             SET numeracao = :numeracao,
                 qr_payload = :qr_payload,
                 respostas_json = :respostas_json,
                 correcoes_json = :correcoes_json,
                 status = :status,
                 acertos = :acertos,
                 total_questoes = :total_questoes,
                 pontuacao = :pontuacao,
                 pontuacao_total = :pontuacao_total,
                 percentual = :percentual,
                 corrigido_em = :corrigido_em
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute([
            'id' => $id,
            'numeracao' => trim((string) ($payload['numeracao'] ?? '')),
            'qr_payload' => $payload['qr_payload'] ?? null,
            'respostas_json' => $payload['respostas_json'] ?? null,
            'correcoes_json' => $payload['correcoes_json'] ?? null,
            'status' => trim((string) ($payload['status'] ?? 'corrigida')),
            'acertos' => (int) ($payload['acertos'] ?? 0),
            'total_questoes' => (int) ($payload['total_questoes'] ?? 0),
            'pontuacao' => (float) ($payload['pontuacao'] ?? 0),
            'pontuacao_total' => (float) ($payload['pontuacao_total'] ?? 0),
            'percentual' => (float) ($payload['percentual'] ?? 0),
            'corrigido_em' => trim((string) ($payload['corrigido_em'] ?? '')) !== ''
                ? trim((string) ($payload['corrigido_em'] ?? ''))
                : date('Y-m-d H:i:s'),
        ]);

        return true;
    }

    public function deleteById(int $id): bool
    {
        $this->ensureTableStructure();
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM avaliacao_correcoes WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);

        return $statement->rowCount() > 0;
    }

    private function hydrateRow(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'avaliacao_id' => (int) ($row['avaliacao_id'] ?? 0),
            'aluno_id' => (int) ($row['aluno_id'] ?? 0),
            'turma_id' => (int) ($row['turma_id'] ?? 0),
            'avaliacao_nome' => trim((string) ($row['avaliacao_nome'] ?? '')),
            'aluno_nome' => trim((string) ($row['aluno_nome'] ?? '')),
            'turma_nome' => trim((string) ($row['turma_nome'] ?? '')),
            'numeracao' => trim((string) ($row['numeracao'] ?? '')),
            'qr_payload' => trim((string) ($row['qr_payload'] ?? '')),
            'respostas' => $this->decodeJsonArray($row['respostas_json'] ?? null),
            'correcoes' => $this->decodeJsonArray($row['correcoes_json'] ?? null),
            'status' => trim((string) ($row['status'] ?? 'corrigida')),
            'acertos' => (int) ($row['acertos'] ?? 0),
            'total_questoes' => (int) ($row['total_questoes'] ?? 0),
            'pontuacao' => round((float) ($row['pontuacao'] ?? 0), 2),
            'pontuacao_total' => round((float) ($row['pontuacao_total'] ?? 0), 2),
            'percentual' => round((float) ($row['percentual'] ?? 0), 2),
            'corrigido_em' => trim((string) ($row['corrigido_em'] ?? '')),
            'created_at' => trim((string) ($row['created_at'] ?? '')),
            'updated_at' => trim((string) ($row['updated_at'] ?? '')),
        ];
    }

    private function decodeJsonArray($rawValue): array
    {
        if (!is_string($rawValue) || trim($rawValue) === '') {
            return [];
        }

        $decoded = json_decode($rawValue, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function getTableColumns(): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
        $statement->execute(['table' => 'avaliacao_correcoes']);
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

    private function getTableIndexes(): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SHOW INDEX FROM avaliacao_correcoes');

        try {
            $statement->execute();
        } catch (Throwable) {
            return [];
        }

        $rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $result = [];
        foreach ($rows as $row) {
            $keyName = strtolower(trim((string) ($row['Key_name'] ?? '')));
            if ($keyName !== '') {
                $result[$keyName] = true;
            }
        }

        return $result;
    }
}