<?php
declare(strict_types=1);

class AgendamentoModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS agendamento_itens (
                id INT NOT NULL AUTO_INCREMENT,
                nome VARCHAR(120) NOT NULL,
                descricao VARCHAR(255) NULL,
                imagem_path VARCHAR(255) NULL,
                ativo TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_agendamento_itens_nome (nome)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $columnCheck = $pdo->query("SHOW COLUMNS FROM agendamento_itens LIKE 'imagem_path'");
        $hasImagemPath = $columnCheck && $columnCheck->fetch() !== false;
        if (!$hasImagemPath) {
            $pdo->exec('ALTER TABLE agendamento_itens ADD COLUMN imagem_path VARCHAR(255) NULL AFTER descricao');
        }

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS agendamento_reservas (
                id INT NOT NULL AUTO_INCREMENT,
                item_id INT NOT NULL,
                responsavel_nome VARCHAR(160) NOT NULL,
                observacao VARCHAR(500) NULL,
                inicio DATETIME NOT NULL,
                fim DATETIME NOT NULL,
                usuario_id INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_agendamento_reservas_item_inicio (item_id, inicio),
                KEY idx_agendamento_reservas_inicio_fim (inicio, fim),
                CONSTRAINT fk_agendamento_reservas_item FOREIGN KEY (item_id) REFERENCES agendamento_itens(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        try {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS agendamento_reserva_locks (
                    id INT NOT NULL AUTO_INCREMENT,
                    item_id INT NOT NULL,
                    usuario_id INT NULL,
                    owner_token VARCHAR(96) NOT NULL,
                    responsavel_nome VARCHAR(160) NOT NULL,
                    inicio DATETIME NOT NULL,
                    fim DATETIME NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY uq_agendamento_reserva_lock_owner_slot (owner_token, item_id, inicio, fim),
                    KEY idx_agendamento_reserva_locks_item_period (item_id, inicio, fim, expires_at),
                    KEY idx_agendamento_reserva_locks_owner (owner_token),
                    KEY idx_agendamento_reserva_locks_expires (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );
        } catch (Throwable) {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS agendamento_reserva_locks (
                    id INT NOT NULL AUTO_INCREMENT,
                    item_id INT NOT NULL,
                    usuario_id INT NULL,
                    owner_token VARCHAR(96) NOT NULL,
                    responsavel_nome VARCHAR(160) NOT NULL,
                    inicio DATETIME NOT NULL,
                    fim DATETIME NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL,
                    PRIMARY KEY (id),
                    KEY idx_agendamento_reserva_locks_item_period (item_id, inicio, fim, expires_at),
                    KEY idx_agendamento_reserva_locks_owner (owner_token),
                    KEY idx_agendamento_reserva_locks_expires (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );
        }
    }

    public function clearExpiredReservaLocks(): void
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM agendamento_reserva_locks WHERE expires_at <= :current_time');
        $statement->execute([
            'current_time' => date('Y-m-d H:i:s'),
        ]);
    }

    public function seedDefaultItems(): void
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();

        $countStatement = $pdo->query('SELECT COUNT(*) FROM agendamento_itens');
        $existingCount = (int) ($countStatement?->fetchColumn() ?: 0);
        if ($existingCount > 0) {
            return;
        }

        $items = ['Televisão', 'Datashow', 'Caixa de Som'];
        $statement = $pdo->prepare('INSERT IGNORE INTO agendamento_itens (nome, ativo) VALUES (:nome, 1)');

        foreach ($items as $item) {
            $statement->execute(['nome' => $item]);
        }
    }

    public function getItems(bool $includeInactive = true): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $sql = 'SELECT id, nome, descricao, imagem_path, ativo, created_at, updated_at FROM agendamento_itens';
        if (!$includeInactive) {
            $sql .= ' WHERE ativo = 1';
        }

        $sql .= ' ORDER BY ativo DESC, nome ASC, id ASC';

        $statement = $pdo->query($sql);
        return $statement?->fetchAll() ?: [];
    }

    public function findItemById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, nome, descricao, imagem_path, ativo FROM agendamento_itens WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function saveItem(int $id, string $nome, ?string $descricao, bool $ativo): int
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();

        if ($id > 0) {
            $statement = $pdo->prepare('UPDATE agendamento_itens SET nome = :nome, descricao = :descricao, ativo = :ativo WHERE id = :id');
            $statement->execute([
                'nome' => $nome,
                'descricao' => $descricao,
                'ativo' => $ativo ? 1 : 0,
                'id' => $id,
            ]);

            return $id;
        }

        $statement = $pdo->prepare('INSERT INTO agendamento_itens (nome, descricao, imagem_path, ativo) VALUES (:nome, :descricao, NULL, :ativo)');
        $statement->execute([
            'nome' => $nome,
            'descricao' => $descricao,
            'ativo' => $ativo ? 1 : 0,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function deleteItem(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Item inválido para exclusão.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $inUseStatement = $pdo->prepare('SELECT COUNT(*) FROM agendamento_reservas WHERE item_id = :id');
        $inUseStatement->execute(['id' => $id]);
        $inUseCount = (int) ($inUseStatement->fetchColumn() ?: 0);

        if ($inUseCount > 0) {
            throw new RuntimeException('Não é possível excluir item com reservas vinculadas.');
        }

        $statement = $pdo->prepare('DELETE FROM agendamento_itens WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function updateItemImagePath(int $id, ?string $imagePath): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Item inválido para imagem.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE agendamento_itens SET imagem_path = :imagem_path WHERE id = :id');
        $statement->execute([
            'imagem_path' => $imagePath,
            'id' => $id,
        ]);
    }

    public function getReservasByPeriod(string $inicio, string $fim): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT r.id, r.item_id, i.nome AS item_nome, r.responsavel_nome, r.observacao, r.inicio, r.fim, r.usuario_id, r.created_at, r.updated_at
             FROM agendamento_reservas r
             INNER JOIN agendamento_itens i ON i.id = r.item_id
             WHERE r.inicio < :fim AND r.fim > :inicio
             ORDER BY r.inicio ASC, r.fim ASC, r.id ASC'
        );

        $statement->execute([
            'inicio' => $inicio,
            'fim' => $fim,
        ]);

        return $statement->fetchAll() ?: [];
    }

    public function getReservasResumoPorDia(string $inicio, string $fim): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT inicio, fim
             FROM agendamento_reservas
             WHERE inicio <= :fim AND fim >= :inicio
             ORDER BY inicio ASC'
        );

        $statement->execute([
            'inicio' => $inicio,
            'fim' => $fim,
        ]);

        $rows = $statement->fetchAll() ?: [];

        $periodStart = new DateTimeImmutable($inicio);
        $periodEnd = new DateTimeImmutable($fim);
        $summaryByDay = [];

        foreach ($rows as $row) {
            $reservaInicioRaw = trim((string) ($row['inicio'] ?? ''));
            $reservaFimRaw = trim((string) ($row['fim'] ?? ''));
            if ($reservaInicioRaw === '' || $reservaFimRaw === '') {
                continue;
            }

            $reservaInicio = new DateTimeImmutable($reservaInicioRaw);
            $reservaFim = new DateTimeImmutable($reservaFimRaw);

            if ($reservaFim < $periodStart || $reservaInicio > $periodEnd) {
                continue;
            }

            $effectiveStart = $reservaInicio > $periodStart ? $reservaInicio : $periodStart;
            $effectiveEnd = $reservaFim < $periodEnd ? $reservaFim : $periodEnd;

            $dayCursor = $effectiveStart->setTime(0, 0, 0);
            $lastDay = $effectiveEnd->setTime(0, 0, 0);

            while ($dayCursor <= $lastDay) {
                $key = $dayCursor->format('Y-m-d');
                $summaryByDay[$key] = (int) ($summaryByDay[$key] ?? 0) + 1;
                $dayCursor = $dayCursor->modify('+1 day');
            }
        }

        ksort($summaryByDay);

        $result = [];
        foreach ($summaryByDay as $day => $count) {
            $result[] = [
                'dia' => $day,
                'total' => $count,
            ];
        }

        return $result;
    }

    public function findReservaById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, item_id, responsavel_nome, observacao, inicio, fim, usuario_id FROM agendamento_reservas WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function hasConflict(int $itemId, string $inicio, string $fim, int $ignoreReservaId = 0): bool
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();

        $sql = 'SELECT COUNT(*)
                FROM agendamento_reservas
                WHERE item_id = :item_id
                  AND inicio < :fim
                  AND fim > :inicio';

        $params = [
            'item_id' => $itemId,
            'inicio' => $inicio,
            'fim' => $fim,
        ];

        if ($ignoreReservaId > 0) {
            $sql .= ' AND id <> :ignore_id';
            $params['ignore_id'] = $ignoreReservaId;
        }

        $statement = $pdo->prepare($sql);
        $statement->execute($params);

        return ((int) ($statement->fetchColumn() ?: 0)) > 0;
    }

    public function hasActiveLockConflict(int $itemId, string $inicio, string $fim, string $ignoreOwnerToken = ''): bool
    {
        $this->ensureTableStructure();
        $this->clearExpiredReservaLocks();

        $pdo = Database::connection();

        $sql = 'SELECT COUNT(*)
                FROM agendamento_reserva_locks
                WHERE item_id = :item_id
                  AND inicio < :fim
                  AND fim > :inicio
                  AND expires_at > NOW()';

        $params = [
            'item_id' => $itemId,
            'inicio' => $inicio,
            'fim' => $fim,
        ];

        if ($ignoreOwnerToken !== '') {
            $sql .= ' AND owner_token <> :ignore_owner_token';
            $params['ignore_owner_token'] = $ignoreOwnerToken;
        }

        $statement = $pdo->prepare($sql);
        $statement->execute($params);

        return ((int) ($statement->fetchColumn() ?: 0)) > 0;
    }

    public function saveReserva(int $id, int $itemId, string $responsavelNome, ?string $observacao, string $inicio, string $fim, ?int $usuarioId): int
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();

        if ($id > 0) {
            $statement = $pdo->prepare(
                'UPDATE agendamento_reservas
                 SET item_id = :item_id,
                     responsavel_nome = :responsavel_nome,
                     observacao = :observacao,
                     inicio = :inicio,
                     fim = :fim,
                     usuario_id = :usuario_id
                 WHERE id = :id'
            );

            $statement->execute([
                'item_id' => $itemId,
                'responsavel_nome' => $responsavelNome,
                'observacao' => $observacao,
                'inicio' => $inicio,
                'fim' => $fim,
                'usuario_id' => $usuarioId,
                'id' => $id,
            ]);

            return $id;
        }

        $statement = $pdo->prepare(
            'INSERT INTO agendamento_reservas (item_id, responsavel_nome, observacao, inicio, fim, usuario_id)
             VALUES (:item_id, :responsavel_nome, :observacao, :inicio, :fim, :usuario_id)'
        );

        $statement->execute([
            'item_id' => $itemId,
            'responsavel_nome' => $responsavelNome,
            'observacao' => $observacao,
            'inicio' => $inicio,
            'fim' => $fim,
            'usuario_id' => $usuarioId,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function deleteReserva(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Reserva inválida para exclusão.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM agendamento_reservas WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function getReservasByUsuarioPeriod(int $usuarioId, string $inicio, string $fim): array
    {
        if ($usuarioId <= 0) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT r.id, r.item_id, i.nome AS item_nome, i.imagem_path AS item_imagem_path,
                    r.responsavel_nome, r.observacao, r.inicio, r.fim, r.usuario_id, r.created_at, r.updated_at
             FROM agendamento_reservas r
             INNER JOIN agendamento_itens i ON i.id = r.item_id
             WHERE r.usuario_id = :usuario_id
               AND r.inicio < :fim
               AND r.fim > :inicio
             ORDER BY r.inicio ASC, r.fim ASC, r.id ASC'
        );

        $statement->execute([
            'usuario_id' => $usuarioId,
            'inicio' => $inicio,
            'fim' => $fim,
        ]);

        return $statement->fetchAll() ?: [];
    }

    public function getReservasByItemPeriod(int $itemId, string $inicio, string $fim, int $ignoreReservaId = 0): array
    {
        if ($itemId <= 0) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();

        $sql = 'SELECT r.id, r.item_id, i.nome AS item_nome,
                       r.responsavel_nome, r.observacao, r.inicio, r.fim, r.usuario_id, r.created_at, r.updated_at
                FROM agendamento_reservas r
                INNER JOIN agendamento_itens i ON i.id = r.item_id
                WHERE r.item_id = :item_id
                  AND r.inicio < :fim
                  AND r.fim > :inicio';

        $params = [
            'item_id' => $itemId,
            'inicio' => $inicio,
            'fim' => $fim,
        ];

        if ($ignoreReservaId > 0) {
            $sql .= ' AND r.id <> :ignore_id';
            $params['ignore_id'] = $ignoreReservaId;
        }

        $sql .= ' ORDER BY r.inicio ASC, r.fim ASC, r.id ASC';

        $statement = $pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll() ?: [];
    }

    public function getActiveLocksByItemPeriod(int $itemId, string $inicio, string $fim, string $ignoreOwnerToken = ''): array
    {
        if ($itemId <= 0) {
            return [];
        }

        $this->ensureTableStructure();
        $this->clearExpiredReservaLocks();

        $pdo = Database::connection();

        $sql = 'SELECT l.id, l.item_id, i.nome AS item_nome,
                       l.responsavel_nome, NULL AS observacao, l.inicio, l.fim, l.usuario_id,
                       l.created_at, l.updated_at, 1 AS is_temporary_lock
                FROM agendamento_reserva_locks l
                INNER JOIN agendamento_itens i ON i.id = l.item_id
                WHERE l.item_id = :item_id
                  AND l.inicio < :fim
                  AND l.fim > :inicio
                  AND l.expires_at > NOW()';

        $params = [
            'item_id' => $itemId,
            'inicio' => $inicio,
            'fim' => $fim,
        ];

        if ($ignoreOwnerToken !== '') {
            $sql .= ' AND l.owner_token <> :ignore_owner_token';
            $params['ignore_owner_token'] = $ignoreOwnerToken;
        }

        $sql .= ' ORDER BY l.inicio ASC, l.fim ASC, l.id ASC';

        $statement = $pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll() ?: [];
    }

    public function releaseTemporaryReservaLocksByOwner(string $ownerToken): void
    {
        $ownerToken = trim($ownerToken);
        if ($ownerToken === '') {
            return;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('DELETE FROM agendamento_reserva_locks WHERE owner_token = :owner_token');
        $statement->execute(['owner_token' => $ownerToken]);
    }

    public function syncTemporaryReservaLocks(int $itemId, array $slots, string $ownerToken, ?int $usuarioId, string $responsavelNome, int $ignoreReservaId = 0): array
    {
        $ownerToken = trim($ownerToken);
        if ($ownerToken === '') {
            throw new InvalidArgumentException('Token temporário inválido.');
        }

        $this->ensureTableStructure();
        $this->clearExpiredReservaLocks();

        $normalizedSlots = [];
        foreach ($slots as $slot) {
            if (!is_array($slot)) {
                continue;
            }

            $inicio = trim((string) ($slot['inicio'] ?? ''));
            $fim = trim((string) ($slot['fim'] ?? ''));
            if ($inicio === '' || $fim === '') {
                continue;
            }

            $key = $inicio . '|' . $fim;
            $normalizedSlots[$key] = [
                'inicio' => $inicio,
                'fim' => $fim,
            ];
        }

        $pdo = Database::connection();
        $deleteStatement = $pdo->prepare('DELETE FROM agendamento_reserva_locks WHERE owner_token = :owner_token');
                $conflictStatement = $pdo->prepare(
                        'SELECT COUNT(*)
                         FROM agendamento_reservas
                         WHERE item_id = :item_id
                             AND inicio < :fim
                             AND fim > :inicio'
                         . ($ignoreReservaId > 0 ? ' AND id <> :ignore_id' : '')
                );
                $lockConflictStatement = $pdo->prepare(
                        'SELECT COUNT(*)
                         FROM agendamento_reserva_locks
                         WHERE item_id = :item_id
                             AND inicio < :fim
                             AND fim > :inicio
                             AND expires_at > :current_time
                             AND owner_token <> :owner_token'
                );
        $insertStatement = $pdo->prepare(
            'INSERT INTO agendamento_reserva_locks (item_id, usuario_id, owner_token, responsavel_nome, inicio, fim, expires_at)
             VALUES (:item_id, :usuario_id, :owner_token, :responsavel_nome, :inicio, :fim, :expires_at)'
        );

        $acceptedSlots = [];
        $rejectedSlots = [];
                $currentTime = date('Y-m-d H:i:s');
        $expiresAt = (new DateTimeImmutable('now'))->modify('+20 seconds')->format('Y-m-d H:i:s');

        try {
            $pdo->beginTransaction();
            $deleteStatement->execute(['owner_token' => $ownerToken]);

            foreach (array_values($normalizedSlots) as $slot) {
                $inicio = $slot['inicio'];
                $fim = $slot['fim'];

                $conflictParams = [
                    'item_id' => $itemId,
                    'inicio' => $inicio,
                    'fim' => $fim,
                ];
                if ($ignoreReservaId > 0) {
                    $conflictParams['ignore_id'] = $ignoreReservaId;
                }

                $conflictStatement->execute($conflictParams);
                if (((int) ($conflictStatement->fetchColumn() ?: 0)) > 0) {
                    $rejectedSlots[] = [
                        'inicio' => $inicio,
                        'fim' => $fim,
                        'reason' => 'reserved',
                    ];
                    continue;
                }

                $lockConflictStatement->execute([
                    'item_id' => $itemId,
                    'inicio' => $inicio,
                    'fim' => $fim,
                    'current_time' => $currentTime,
                    'owner_token' => $ownerToken,
                ]);
                if (((int) ($lockConflictStatement->fetchColumn() ?: 0)) > 0) {
                    $rejectedSlots[] = [
                        'inicio' => $inicio,
                        'fim' => $fim,
                        'reason' => 'locked',
                    ];
                    continue;
                }

                $insertStatement->execute([
                    'item_id' => $itemId,
                    'usuario_id' => $usuarioId,
                    'owner_token' => $ownerToken,
                    'responsavel_nome' => $responsavelNome,
                    'inicio' => $inicio,
                    'fim' => $fim,
                    'expires_at' => $expiresAt,
                ]);

                $acceptedSlots[] = [
                    'inicio' => $inicio,
                    'fim' => $fim,
                ];
            }

            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $exception;
        }

        return [
            'accepted_slots' => $acceptedSlots,
            'rejected_slots' => $rejectedSlots,
            'expires_at' => $expiresAt,
        ];
    }
}
