<?php
declare(strict_types=1);

class CardapioModel
{
    public function ensureTableStructure(): void
    {
        $this->ensureRefeicaoTypesStructure();

        $pdo = Database::connection();

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cardapio_itens (
                id INT NOT NULL AUTO_INCREMENT,
                nome VARCHAR(120) NOT NULL,
                descricao VARCHAR(255) NULL,
                imagem_path VARCHAR(255) NULL,
                ativo TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_cardapio_itens_nome (nome)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cardapio_item_tipos_refeicao (
                item_id INT NOT NULL,
                tipo_refeicao_id INT NOT NULL,
                PRIMARY KEY (item_id, tipo_refeicao_id),
                KEY idx_cardapio_item_tipos_refeicao_tipo (tipo_refeicao_id),
                CONSTRAINT fk_cardapio_item_tipos_item FOREIGN KEY (item_id) REFERENCES cardapio_itens(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_cardapio_item_tipos_tipo FOREIGN KEY (tipo_refeicao_id) REFERENCES refeitorio_tipos_refeicao(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cardapio_dias (
                id INT NOT NULL AUTO_INCREMENT,
                data_cardapio DATE NOT NULL,
                tipo_refeicao_id INT NOT NULL,
                observacao VARCHAR(500) NULL,
                created_by INT NULL,
                updated_by INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_cardapio_dias_data_tipo (data_cardapio, tipo_refeicao_id),
                KEY idx_cardapio_dias_data (data_cardapio),
                KEY idx_cardapio_dias_data_tipo (data_cardapio, tipo_refeicao_id),
                CONSTRAINT fk_cardapio_dias_tipo_refeicao FOREIGN KEY (tipo_refeicao_id) REFERENCES refeitorio_tipos_refeicao(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cardapio_dia_itens (
                cardapio_id INT NOT NULL,
                item_id INT NOT NULL,
                ordem INT NOT NULL DEFAULT 0,
                PRIMARY KEY (cardapio_id, item_id),
                KEY idx_cardapio_dia_itens_item (item_id),
                CONSTRAINT fk_cardapio_dia_itens_cardapio FOREIGN KEY (cardapio_id) REFERENCES cardapio_dias(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_cardapio_dia_itens_item FOREIGN KEY (item_id) REFERENCES cardapio_itens(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cardapio_reservas (
                id INT NOT NULL AUTO_INCREMENT,
                cardapio_id INT NOT NULL,
                tipo_refeicao_id INT NOT NULL,
                data_cardapio DATE NOT NULL,
                usuario_id INT NOT NULL,
                responsavel_nome VARCHAR(160) NOT NULL,
                observacao VARCHAR(500) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_cardapio_reservas_usuario_data_tipo (usuario_id, data_cardapio, tipo_refeicao_id),
                KEY idx_cardapio_reservas_data (data_cardapio),
                KEY idx_cardapio_reservas_cardapio (cardapio_id),
                KEY idx_cardapio_reservas_data_tipo (data_cardapio, tipo_refeicao_id),
                CONSTRAINT fk_cardapio_reservas_cardapio FOREIGN KEY (cardapio_id) REFERENCES cardapio_dias(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_cardapio_reservas_tipo_refeicao FOREIGN KEY (tipo_refeicao_id) REFERENCES refeitorio_tipos_refeicao(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $this->migrateLegacyStructure($pdo);
    }

    public function getItems(bool $includeInactive = true): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $sql = 'SELECT id, nome, descricao, imagem_path, ativo, created_at, updated_at FROM cardapio_itens';
        if (!$includeInactive) {
            $sql .= ' WHERE ativo = 1';
        }

        $sql .= ' ORDER BY ativo DESC, nome ASC, id ASC';

        $statement = $pdo->query($sql);
        $rows = $statement?->fetchAll() ?: [];

        return $this->attachAllowedMealTypes($rows);
    }

    public function findItemById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT id, nome, descricao, imagem_path, ativo FROM cardapio_itens WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        $rows = $this->attachAllowedMealTypes([$row]);
        return isset($rows[0]) && is_array($rows[0]) ? $rows[0] : null;
    }

    public function saveItem(int $id, string $nome, ?string $descricao, bool $ativo, array $tipoRefeicaoIds): int
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $tipoRefeicaoIds = $this->normalizeTipoRefeicaoIds($tipoRefeicaoIds);
        if ($tipoRefeicaoIds === []) {
            throw new InvalidArgumentException('Selecione ao menos uma refeição permitida para o item.');
        }

        $tiposPermitidos = $this->getValidTipoRefeicaoIds($pdo);
        foreach ($tipoRefeicaoIds as $tipoRefeicaoId) {
            if (!isset($tiposPermitidos[$tipoRefeicaoId])) {
                throw new InvalidArgumentException('Refeição inválida para o item.');
            }
        }

        try {
            $pdo->beginTransaction();

            if ($id > 0) {
                $statement = $pdo->prepare('UPDATE cardapio_itens SET nome = :nome, descricao = :descricao, ativo = :ativo WHERE id = :id');
                $statement->execute([
                    'nome' => $nome,
                    'descricao' => $descricao,
                    'ativo' => $ativo ? 1 : 0,
                    'id' => $id,
                ]);

                $itemId = $id;
            } else {
                $statement = $pdo->prepare('INSERT INTO cardapio_itens (nome, descricao, imagem_path, ativo) VALUES (:nome, :descricao, NULL, :ativo)');
                $statement->execute([
                    'nome' => $nome,
                    'descricao' => $descricao,
                    'ativo' => $ativo ? 1 : 0,
                ]);

                $itemId = (int) $pdo->lastInsertId();
            }

            $this->syncItemMealTypes($pdo, $itemId, $tipoRefeicaoIds);
            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $exception;
        }

        return $itemId;
    }

    public function updateItemImagePath(int $id, ?string $imagePath): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Item inválido para imagem.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE cardapio_itens SET imagem_path = :imagem_path WHERE id = :id');
        $statement->execute([
            'imagem_path' => $imagePath,
            'id' => $id,
        ]);
    }

    public function deleteItem(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Item inválido para exclusão.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $usageStatement = $pdo->prepare('SELECT COUNT(*) FROM cardapio_dia_itens WHERE item_id = :id');
        $usageStatement->execute(['id' => $id]);
        $usageCount = (int) ($usageStatement->fetchColumn() ?: 0);

        if ($usageCount > 0) {
            throw new RuntimeException('Não é possível excluir item já vinculado a um cardápio.');
        }

        $statement = $pdo->prepare('DELETE FROM cardapio_itens WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function getCardapiosByDate(string $date): array
    {
        $normalizedDate = $this->normalizeDate($date);
        if ($normalizedDate === null) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT d.id, d.data_cardapio, d.tipo_refeicao_id, d.observacao, d.created_by, d.updated_by, d.created_at, d.updated_at,
                    t.nome AS tipo_refeicao_nome, t.descricao AS tipo_refeicao_descricao, t.horario_ini AS tipo_refeicao_horario_ini,
                    t.horario_fim AS tipo_refeicao_horario_fim, t.cor AS tipo_refeicao_cor,
                    COUNT(DISTINCT r.id) AS total_reservas
             FROM cardapio_dias d
             INNER JOIN refeitorio_tipos_refeicao t ON t.id = d.tipo_refeicao_id
             LEFT JOIN cardapio_reservas r ON r.cardapio_id = d.id
             WHERE d.data_cardapio = :data_cardapio
             GROUP BY d.id, d.data_cardapio, d.tipo_refeicao_id, d.observacao, d.created_by, d.updated_by, d.created_at, d.updated_at,
                      t.nome, t.descricao, t.horario_ini, t.horario_fim, t.cor
               ORDER BY COALESCE(t.horario_ini, \'\'), t.nome ASC, d.id ASC'
        );
        $statement->execute(['data_cardapio' => $normalizedDate]);
        $rows = $statement->fetchAll() ?: [];

        foreach ($rows as &$row) {
            $row['itens'] = $this->getItemsByCardapioId((int) ($row['id'] ?? 0));
        }
        unset($row);

        return $rows;
    }

    public function getCardapioByDateAndTipo(string $date, int $tipoRefeicaoId): ?array
    {
        if ($tipoRefeicaoId <= 0) {
            return null;
        }

        $normalizedDate = $this->normalizeDate($date);
        if ($normalizedDate === null) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT d.id, d.data_cardapio, d.tipo_refeicao_id, d.observacao, d.created_by, d.updated_by, d.created_at, d.updated_at,
                    t.nome AS tipo_refeicao_nome, t.descricao AS tipo_refeicao_descricao, t.horario_ini AS tipo_refeicao_horario_ini,
                    t.horario_fim AS tipo_refeicao_horario_fim, t.cor AS tipo_refeicao_cor,
                    COUNT(DISTINCT r.id) AS total_reservas
             FROM cardapio_dias d
             INNER JOIN refeitorio_tipos_refeicao t ON t.id = d.tipo_refeicao_id
             LEFT JOIN cardapio_reservas r ON r.cardapio_id = d.id
             WHERE d.data_cardapio = :data_cardapio AND d.tipo_refeicao_id = :tipo_refeicao_id
             GROUP BY d.id, d.data_cardapio, d.tipo_refeicao_id, d.observacao, d.created_by, d.updated_by, d.created_at, d.updated_at,
                      t.nome, t.descricao, t.horario_ini, t.horario_fim, t.cor
             LIMIT 1'
        );
        $statement->execute([
            'data_cardapio' => $normalizedDate,
            'tipo_refeicao_id' => $tipoRefeicaoId,
        ]);
        $row = $statement->fetch();
        if (!is_array($row)) {
            return null;
        }

        $row['itens'] = $this->getItemsByCardapioId((int) ($row['id'] ?? 0));
        return $row;
    }

    public function saveCardapios(string $date, array $entries, ?int $usuarioId): array
    {
        $normalizedDate = $this->normalizeDate($date);
        if ($normalizedDate === null) {
            throw new InvalidArgumentException('Data do cardápio inválida.');
        }

        $this->ensureTableStructure();

        $normalizedEntries = [];
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $tipoRefeicaoId = (int) ($entry['tipo_refeicao_id'] ?? 0);
            if ($tipoRefeicaoId <= 0) {
                continue;
            }

            $uniqueItemIds = [];
            foreach ((array) ($entry['item_ids'] ?? []) as $itemId) {
                $normalizedItemId = (int) $itemId;
                if ($normalizedItemId > 0) {
                    $uniqueItemIds[$normalizedItemId] = $normalizedItemId;
                }
            }

            $normalizedEntries[$tipoRefeicaoId] = [
                'tipo_refeicao_id' => $tipoRefeicaoId,
                'observacao' => isset($entry['observacao']) ? trim((string) $entry['observacao']) : '',
                'item_ids' => array_values($uniqueItemIds),
            ];
        }

        $pdo = Database::connection();
        $savedIds = [];

        try {
            $pdo->beginTransaction();

            $deleteByDateStatement = $pdo->prepare('DELETE FROM cardapio_dias WHERE data_cardapio = :data_cardapio');
            $selectExistingStatement = $pdo->prepare(
                'SELECT id
                   FROM cardapio_dias
                  WHERE data_cardapio = :data_cardapio
                    AND tipo_refeicao_id = :tipo_refeicao_id
                  LIMIT 1'
            );
            $updateStatement = $pdo->prepare(
                'UPDATE cardapio_dias
                    SET observacao = :observacao,
                        updated_by = :updated_by
                  WHERE id = :id'
            );
            $insertStatement = $pdo->prepare(
                'INSERT INTO cardapio_dias (data_cardapio, tipo_refeicao_id, observacao, created_by, updated_by)
                 VALUES (:data_cardapio, :tipo_refeicao_id, :observacao, :created_by, :updated_by)'
            );
            $deleteItemsStatement = $pdo->prepare('DELETE FROM cardapio_dia_itens WHERE cardapio_id = :cardapio_id');
            $insertItemStatement = $pdo->prepare(
                'INSERT INTO cardapio_dia_itens (cardapio_id, item_id, ordem)
                 VALUES (:cardapio_id, :item_id, :ordem)'
            );
            $deleteCardapioStatement = $pdo->prepare('DELETE FROM cardapio_dias WHERE id = :id');

            if ($normalizedEntries === []) {
                $deleteByDateStatement->execute(['data_cardapio' => $normalizedDate]);
                $pdo->commit();

                return [];
            }

            foreach ($normalizedEntries as $entry) {
                $selectExistingStatement->execute([
                    'data_cardapio' => $normalizedDate,
                    'tipo_refeicao_id' => $entry['tipo_refeicao_id'],
                ]);
                $existingId = (int) ($selectExistingStatement->fetchColumn() ?: 0);

                $allowedItemIds = $this->getAllowedItemIdsForTipoRefeicao($pdo, $entry['tipo_refeicao_id']);
                foreach ($entry['item_ids'] as $itemId) {
                    if (!isset($allowedItemIds[$itemId])) {
                        throw new InvalidArgumentException('Um ou mais itens selecionados não podem ser servidos nesta refeição.');
                    }
                }

                if ($entry['item_ids'] === []) {
                    if ($existingId > 0) {
                        $deleteCardapioStatement->execute(['id' => $existingId]);
                    }

                    continue;
                }

                if ($existingId > 0) {
                    $cardapioId = $existingId;
                    $updateStatement->execute([
                        'observacao' => $entry['observacao'] !== '' ? $entry['observacao'] : null,
                        'updated_by' => $usuarioId,
                        'id' => $cardapioId,
                    ]);
                } else {
                    $insertStatement->execute([
                        'data_cardapio' => $normalizedDate,
                        'tipo_refeicao_id' => $entry['tipo_refeicao_id'],
                        'observacao' => $entry['observacao'] !== '' ? $entry['observacao'] : null,
                        'created_by' => $usuarioId,
                        'updated_by' => $usuarioId,
                    ]);
                    $cardapioId = (int) $pdo->lastInsertId();
                }

                $deleteItemsStatement->execute(['cardapio_id' => $cardapioId]);

                $ordem = 1;
                foreach ($entry['item_ids'] as $itemId) {
                    $insertItemStatement->execute([
                        'cardapio_id' => $cardapioId,
                        'item_id' => $itemId,
                        'ordem' => $ordem,
                    ]);
                    $ordem += 1;
                }

                $savedIds[$entry['tipo_refeicao_id']] = $cardapioId;
            }

            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $exception;
        }

        return $savedIds;
    }

    public function getMonthlySummary(string $startDate, string $endDate): array
    {
        $start = $this->normalizeDate($startDate);
        $end = $this->normalizeDate($endDate);
        if ($start === null || $end === null) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT d.data_cardapio AS dia,
                    COUNT(DISTINCT d.id) AS total_refeicoes,
                    COUNT(DISTINCT CONCAT(d.id, ":", di.item_id)) AS total_itens,
                    COUNT(DISTINCT r.id) AS total_reservas
             FROM cardapio_dias d
             LEFT JOIN cardapio_dia_itens di ON di.cardapio_id = d.id
             LEFT JOIN cardapio_reservas r ON r.cardapio_id = d.id
             WHERE d.data_cardapio BETWEEN :inicio AND :fim
             GROUP BY d.data_cardapio
             ORDER BY d.data_cardapio ASC'
        );
        $statement->execute([
            'inicio' => $start,
            'fim' => $end,
        ]);

        return $statement->fetchAll() ?: [];
    }

    public function getReservasByDate(string $date): array
    {
        $normalizedDate = $this->normalizeDate($date);
        if ($normalizedDate === null) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT r.id, r.cardapio_id, r.tipo_refeicao_id, r.data_cardapio, r.usuario_id, r.responsavel_nome, r.observacao,
                    r.created_at, r.updated_at, t.nome AS tipo_refeicao_nome, t.cor AS tipo_refeicao_cor,
                    COALESCE(d.observacao, "") AS cardapio_observacao
             FROM cardapio_reservas r
             INNER JOIN cardapio_dias d ON d.id = r.cardapio_id
             INNER JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id
             WHERE r.data_cardapio = :data_cardapio
             ORDER BY COALESCE(t.horario_ini, ""), t.nome ASC, r.created_at ASC, r.id ASC'
        );
        $statement->execute(['data_cardapio' => $normalizedDate]);

        return $statement->fetchAll() ?: [];
    }

    public function getReservasByPeriod(string $startDate, string $endDate): array
    {
        $start = $this->normalizeDate($startDate);
        $end = $this->normalizeDate($endDate);
        if ($start === null || $end === null) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT r.id, r.cardapio_id, r.tipo_refeicao_id, r.data_cardapio, r.usuario_id, r.responsavel_nome, r.observacao,
                    r.created_at, r.updated_at, COALESCE(d.observacao, "") AS cardapio_observacao,
                    t.nome AS tipo_refeicao_nome, t.cor AS tipo_refeicao_cor
             FROM cardapio_reservas r
             INNER JOIN cardapio_dias d ON d.id = r.cardapio_id
             INNER JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id
             WHERE r.data_cardapio BETWEEN :inicio AND :fim
             ORDER BY r.data_cardapio ASC, COALESCE(t.horario_ini, ""), t.nome ASC, r.created_at ASC, r.id ASC'
        );
        $statement->execute([
            'inicio' => $start,
            'fim' => $end,
        ]);

        return $statement->fetchAll() ?: [];
    }

    public function getReservasByUsuarioPeriod(int $usuarioId, string $startDate, string $endDate): array
    {
        if ($usuarioId <= 0) {
            return [];
        }

        $start = $this->normalizeDate($startDate);
        $end = $this->normalizeDate($endDate);
        if ($start === null || $end === null) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT r.id, r.cardapio_id, r.tipo_refeicao_id, r.data_cardapio, r.usuario_id, r.responsavel_nome, r.observacao,
                    r.created_at, r.updated_at, COALESCE(d.observacao, "") AS cardapio_observacao,
                    t.nome AS tipo_refeicao_nome, t.cor AS tipo_refeicao_cor
             FROM cardapio_reservas r
             INNER JOIN cardapio_dias d ON d.id = r.cardapio_id
             INNER JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id
             WHERE r.usuario_id = :usuario_id
               AND r.data_cardapio BETWEEN :inicio AND :fim
             ORDER BY r.data_cardapio ASC, COALESCE(t.horario_ini, ""), t.nome ASC, r.created_at ASC, r.id ASC'
        );
        $statement->execute([
            'usuario_id' => $usuarioId,
            'inicio' => $start,
            'fim' => $end,
        ]);

        return $statement->fetchAll() ?: [];
    }

    public function getReservasByUsuarioAndDate(int $usuarioId, string $date): array
    {
        if ($usuarioId <= 0) {
            return [];
        }

        $normalizedDate = $this->normalizeDate($date);
        if ($normalizedDate === null) {
            return [];
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT r.id, r.cardapio_id, r.tipo_refeicao_id, r.data_cardapio, r.usuario_id, r.responsavel_nome, r.observacao,
                    r.created_at, r.updated_at, COALESCE(d.observacao, "") AS cardapio_observacao,
                    t.nome AS tipo_refeicao_nome, t.cor AS tipo_refeicao_cor
             FROM cardapio_reservas r
             INNER JOIN cardapio_dias d ON d.id = r.cardapio_id
             INNER JOIN refeitorio_tipos_refeicao t ON t.id = r.tipo_refeicao_id
             WHERE r.usuario_id = :usuario_id
               AND r.data_cardapio = :data_cardapio
             ORDER BY COALESCE(t.horario_ini, ""), t.nome ASC, r.created_at ASC, r.id ASC'
        );
        $statement->execute([
            'usuario_id' => $usuarioId,
            'data_cardapio' => $normalizedDate,
        ]);

        return $statement->fetchAll() ?: [];
    }

    public function findReservaById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT id, cardapio_id, tipo_refeicao_id, data_cardapio, usuario_id, responsavel_nome, observacao, created_at, updated_at
             FROM cardapio_reservas
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function findReservaByUsuarioAndDate(int $usuarioId, string $date, int $tipoRefeicaoId): ?array
    {
        if ($usuarioId <= 0 || $tipoRefeicaoId <= 0) {
            return null;
        }

        $normalizedDate = $this->normalizeDate($date);
        if ($normalizedDate === null) {
            return null;
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT id, cardapio_id, tipo_refeicao_id, data_cardapio, usuario_id, responsavel_nome, observacao, created_at, updated_at
             FROM cardapio_reservas
             WHERE usuario_id = :usuario_id
               AND data_cardapio = :data_cardapio
               AND tipo_refeicao_id = :tipo_refeicao_id
             LIMIT 1'
        );
        $statement->execute([
            'usuario_id' => $usuarioId,
            'data_cardapio' => $normalizedDate,
            'tipo_refeicao_id' => $tipoRefeicaoId,
        ]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function saveReserva(int $cardapioId, string $date, int $tipoRefeicaoId, int $usuarioId, string $responsavelNome, ?string $observacao): int
    {
        if ($cardapioId <= 0) {
            throw new InvalidArgumentException('Cardápio inválido para reserva.');
        }
        if ($tipoRefeicaoId <= 0) {
            throw new InvalidArgumentException('Tipo de refeição inválido para reserva.');
        }
        if ($usuarioId <= 0) {
            throw new InvalidArgumentException('Usuário inválido para reserva.');
        }

        $normalizedDate = $this->normalizeDate($date);
        if ($normalizedDate === null) {
            throw new InvalidArgumentException('Data da reserva inválida.');
        }

        $this->ensureTableStructure();

        $existing = $this->findReservaByUsuarioAndDate($usuarioId, $normalizedDate, $tipoRefeicaoId);
        $pdo = Database::connection();

        if (is_array($existing)) {
            $reservationId = (int) ($existing['id'] ?? 0);
            $statement = $pdo->prepare(
                'UPDATE cardapio_reservas
                 SET cardapio_id = :cardapio_id,
                     responsavel_nome = :responsavel_nome,
                     observacao = :observacao
                 WHERE id = :id'
            );
            $statement->execute([
                'cardapio_id' => $cardapioId,
                'responsavel_nome' => $responsavelNome,
                'observacao' => $observacao,
                'id' => $reservationId,
            ]);

            return $reservationId;
        }

        $statement = $pdo->prepare(
            'INSERT INTO cardapio_reservas (cardapio_id, tipo_refeicao_id, data_cardapio, usuario_id, responsavel_nome, observacao)
             VALUES (:cardapio_id, :tipo_refeicao_id, :data_cardapio, :usuario_id, :responsavel_nome, :observacao)'
        );
        $statement->execute([
            'cardapio_id' => $cardapioId,
            'tipo_refeicao_id' => $tipoRefeicaoId,
            'data_cardapio' => $normalizedDate,
            'usuario_id' => $usuarioId,
            'responsavel_nome' => $responsavelNome,
            'observacao' => $observacao,
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
        $statement = $pdo->prepare('DELETE FROM cardapio_reservas WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    private function getItemsByCardapioId(int $cardapioId): array
    {
        if ($cardapioId <= 0) {
            return [];
        }

        $pdo = Database::connection();
        $statement = $pdo->prepare(
            'SELECT i.id, i.nome, i.descricao, i.imagem_path, i.ativo, di.ordem
             FROM cardapio_dia_itens di
             INNER JOIN cardapio_itens i ON i.id = di.item_id
             WHERE di.cardapio_id = :cardapio_id
             ORDER BY di.ordem ASC, i.nome ASC, i.id ASC'
        );
        $statement->execute(['cardapio_id' => $cardapioId]);

        return $statement->fetchAll() ?: [];
    }

    private function attachAllowedMealTypes(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $itemIds = [];
        foreach ($rows as $row) {
            $itemId = (int) ($row['id'] ?? 0);
            if ($itemId > 0) {
                $itemIds[$itemId] = $itemId;
            }
        }

        if ($itemIds === []) {
            return $rows;
        }

        $pdo = Database::connection();
        $placeholders = implode(',', array_fill(0, count($itemIds), '?'));
        $statement = $pdo->prepare(
            'SELECT rel.item_id, rel.tipo_refeicao_id, t.nome AS tipo_refeicao_nome
               FROM cardapio_item_tipos_refeicao rel
               INNER JOIN refeitorio_tipos_refeicao t ON t.id = rel.tipo_refeicao_id
              WHERE rel.item_id IN (' . $placeholders . ')
              ORDER BY COALESCE(t.horario_ini, ""), t.nome ASC, t.id ASC'
        );
        $statement->execute(array_values($itemIds));
        $tiposPorItem = [];
        foreach ($statement->fetchAll() ?: [] as $tipoRow) {
            $itemId = (int) ($tipoRow['item_id'] ?? 0);
            if ($itemId <= 0) {
                continue;
            }

            if (!isset($tiposPorItem[$itemId])) {
                $tiposPorItem[$itemId] = [
                    'ids' => [],
                    'nomes' => [],
                ];
            }

            $tipoId = (int) ($tipoRow['tipo_refeicao_id'] ?? 0);
            if ($tipoId > 0) {
                $tiposPorItem[$itemId]['ids'][] = $tipoId;
            }

            $tipoNome = trim((string) ($tipoRow['tipo_refeicao_nome'] ?? ''));
            if ($tipoNome !== '') {
                $tiposPorItem[$itemId]['nomes'][] = $tipoNome;
            }
        }

        foreach ($rows as &$row) {
            $itemId = (int) ($row['id'] ?? 0);
            $row['tipo_refeicao_ids'] = $tiposPorItem[$itemId]['ids'] ?? [];
            $row['tipo_refeicao_nomes'] = $tiposPorItem[$itemId]['nomes'] ?? [];
        }
        unset($row);

        return $rows;
    }

    private function syncItemMealTypes(PDO $pdo, int $itemId, array $tipoRefeicaoIds): void
    {
        $deleteStatement = $pdo->prepare('DELETE FROM cardapio_item_tipos_refeicao WHERE item_id = :item_id');
        $deleteStatement->execute(['item_id' => $itemId]);

        $insertStatement = $pdo->prepare(
            'INSERT INTO cardapio_item_tipos_refeicao (item_id, tipo_refeicao_id)
             VALUES (:item_id, :tipo_refeicao_id)'
        );

        foreach ($tipoRefeicaoIds as $tipoRefeicaoId) {
            $insertStatement->execute([
                'item_id' => $itemId,
                'tipo_refeicao_id' => $tipoRefeicaoId,
            ]);
        }
    }

    private function normalizeTipoRefeicaoIds(array $tipoRefeicaoIds): array
    {
        $normalized = [];
        foreach ($tipoRefeicaoIds as $tipoRefeicaoId) {
            $id = (int) $tipoRefeicaoId;
            if ($id > 0) {
                $normalized[$id] = $id;
            }
        }

        return array_values($normalized);
    }

    private function getValidTipoRefeicaoIds(PDO $pdo): array
    {
        $statement = $pdo->query('SELECT id FROM refeitorio_tipos_refeicao');
        $validIds = [];
        foreach ($statement?->fetchAll() ?: [] as $row) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $validIds[$id] = true;
            }
        }

        return $validIds;
    }

    private function getAllowedItemIdsForTipoRefeicao(PDO $pdo, int $tipoRefeicaoId): array
    {
        $statement = $pdo->prepare(
            'SELECT item_id
               FROM cardapio_item_tipos_refeicao
              WHERE tipo_refeicao_id = :tipo_refeicao_id'
        );
        $statement->execute(['tipo_refeicao_id' => $tipoRefeicaoId]);

        $allowed = [];
        foreach ($statement->fetchAll() ?: [] as $row) {
            $itemId = (int) ($row['item_id'] ?? 0);
            if ($itemId > 0) {
                $allowed[$itemId] = true;
            }
        }

        return $allowed;
    }

    private function ensureRefeicaoTypesStructure(): void
    {
        if (!class_exists('RefeitorioModel')) {
            return;
        }

        $refeitorioModel = new RefeitorioModel();
        $refeitorioModel->ensureTableStructure();
    }

    private function migrateLegacyStructure(PDO $pdo): void
    {
        $defaultTipoId = $this->getDefaultTipoRefeicaoId($pdo);

        if (!$this->columnExists($pdo, 'cardapio_dias', 'tipo_refeicao_id')) {
            $pdo->exec('ALTER TABLE cardapio_dias ADD COLUMN tipo_refeicao_id INT NULL AFTER data_cardapio');
        }

        if ($defaultTipoId > 0) {
            $statement = $pdo->prepare(
                'UPDATE cardapio_dias
                    SET tipo_refeicao_id = :tipo_refeicao_id
                  WHERE tipo_refeicao_id IS NULL OR tipo_refeicao_id = 0'
            );
            $statement->execute(['tipo_refeicao_id' => $defaultTipoId]);
        }

        if ($this->indexExists($pdo, 'cardapio_dias', 'uq_cardapio_dias_data')) {
            $pdo->exec('ALTER TABLE cardapio_dias DROP INDEX uq_cardapio_dias_data');
        }
        if (!$this->indexExists($pdo, 'cardapio_dias', 'uq_cardapio_dias_data_tipo')) {
            $pdo->exec('ALTER TABLE cardapio_dias ADD UNIQUE KEY uq_cardapio_dias_data_tipo (data_cardapio, tipo_refeicao_id)');
        }
        if (!$this->indexExists($pdo, 'cardapio_dias', 'idx_cardapio_dias_data_tipo')) {
            $pdo->exec('ALTER TABLE cardapio_dias ADD KEY idx_cardapio_dias_data_tipo (data_cardapio, tipo_refeicao_id)');
        }
        if ($defaultTipoId > 0 && !$this->constraintExists($pdo, 'cardapio_dias', 'fk_cardapio_dias_tipo_refeicao')) {
            $pdo->exec('ALTER TABLE cardapio_dias ADD CONSTRAINT fk_cardapio_dias_tipo_refeicao FOREIGN KEY (tipo_refeicao_id) REFERENCES refeitorio_tipos_refeicao(id) ON DELETE RESTRICT ON UPDATE CASCADE');
        }

        if (!$this->columnExists($pdo, 'cardapio_reservas', 'tipo_refeicao_id')) {
            $pdo->exec('ALTER TABLE cardapio_reservas ADD COLUMN tipo_refeicao_id INT NULL AFTER cardapio_id');
        }

        if ($defaultTipoId > 0) {
            $pdo->exec(
                'UPDATE cardapio_reservas r
                 INNER JOIN cardapio_dias d ON d.id = r.cardapio_id
                    SET r.tipo_refeicao_id = d.tipo_refeicao_id
                  WHERE r.tipo_refeicao_id IS NULL OR r.tipo_refeicao_id = 0'
            );

            $statement = $pdo->prepare(
                'UPDATE cardapio_reservas
                    SET tipo_refeicao_id = :tipo_refeicao_id
                  WHERE tipo_refeicao_id IS NULL OR tipo_refeicao_id = 0'
            );
            $statement->execute(['tipo_refeicao_id' => $defaultTipoId]);
        }

        if ($this->indexExists($pdo, 'cardapio_reservas', 'uq_cardapio_reservas_usuario_data')) {
            $pdo->exec('ALTER TABLE cardapio_reservas DROP INDEX uq_cardapio_reservas_usuario_data');
        }
        if (!$this->indexExists($pdo, 'cardapio_reservas', 'uq_cardapio_reservas_usuario_data_tipo')) {
            $pdo->exec('ALTER TABLE cardapio_reservas ADD UNIQUE KEY uq_cardapio_reservas_usuario_data_tipo (usuario_id, data_cardapio, tipo_refeicao_id)');
        }
        if (!$this->indexExists($pdo, 'cardapio_reservas', 'idx_cardapio_reservas_data_tipo')) {
            $pdo->exec('ALTER TABLE cardapio_reservas ADD KEY idx_cardapio_reservas_data_tipo (data_cardapio, tipo_refeicao_id)');
        }
        if ($defaultTipoId > 0 && !$this->constraintExists($pdo, 'cardapio_reservas', 'fk_cardapio_reservas_tipo_refeicao')) {
            $pdo->exec('ALTER TABLE cardapio_reservas ADD CONSTRAINT fk_cardapio_reservas_tipo_refeicao FOREIGN KEY (tipo_refeicao_id) REFERENCES refeitorio_tipos_refeicao(id) ON DELETE RESTRICT ON UPDATE CASCADE');
        }

        $tiposRefeicaoIds = $this->getAllTipoRefeicaoIds($pdo);
        if ($tiposRefeicaoIds !== []) {
            $statement = $pdo->query(
                'SELECT i.id
                   FROM cardapio_itens i
              LEFT JOIN cardapio_item_tipos_refeicao rel ON rel.item_id = i.id
                  WHERE rel.item_id IS NULL'
            );
            $insertStatement = $pdo->prepare(
                'INSERT IGNORE INTO cardapio_item_tipos_refeicao (item_id, tipo_refeicao_id)
                 VALUES (:item_id, :tipo_refeicao_id)'
            );

            foreach ($statement?->fetchAll() ?: [] as $row) {
                $itemId = (int) ($row['id'] ?? 0);
                if ($itemId <= 0) {
                    continue;
                }

                foreach ($tiposRefeicaoIds as $tipoRefeicaoId) {
                    $insertStatement->execute([
                        'item_id' => $itemId,
                        'tipo_refeicao_id' => $tipoRefeicaoId,
                    ]);
                }
            }
        }
    }

    private function getAllTipoRefeicaoIds(PDO $pdo): array
    {
        $statement = $pdo->query('SELECT id FROM refeitorio_tipos_refeicao');
        $ids = [];
        foreach ($statement?->fetchAll() ?: [] as $row) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    private function getDefaultTipoRefeicaoId(PDO $pdo): int
    {
        $statement = $pdo->query(
            'SELECT id
               FROM refeitorio_tipos_refeicao
              ORDER BY ativo DESC, COALESCE(horario_ini, ""), nome ASC, id ASC
              LIMIT 1'
        );

        return (int) ($statement?->fetchColumn() ?: 0);
    }

    private function columnExists(PDO $pdo, string $table, string $column): bool
    {
        $statement = $pdo->prepare(
            'SELECT COUNT(*)
               FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = :table_name
                AND COLUMN_NAME = :column_name'
        );
        $statement->execute([
            'table_name' => $table,
            'column_name' => $column,
        ]);

        return (int) ($statement->fetchColumn() ?: 0) > 0;
    }

    private function indexExists(PDO $pdo, string $table, string $index): bool
    {
        $statement = $pdo->prepare(
            'SELECT COUNT(*)
               FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = :table_name
                AND INDEX_NAME = :index_name'
        );
        $statement->execute([
            'table_name' => $table,
            'index_name' => $index,
        ]);

        return (int) ($statement->fetchColumn() ?: 0) > 0;
    }

    private function constraintExists(PDO $pdo, string $table, string $constraint): bool
    {
        $statement = $pdo->prepare(
            'SELECT COUNT(*)
               FROM information_schema.TABLE_CONSTRAINTS
              WHERE CONSTRAINT_SCHEMA = DATABASE()
                AND TABLE_NAME = :table_name
                AND CONSTRAINT_NAME = :constraint_name'
        );
        $statement->execute([
            'table_name' => $table,
            'constraint_name' => $constraint,
        ]);

        return (int) ($statement->fetchColumn() ?: 0) > 0;
    }

    private function normalizeDate(string $date): ?string
    {
        $value = trim($date);
        if ($value === '') {
            return null;
        }

        $dateObject = date_create($value);
        if ($dateObject === false) {
            return null;
        }

        return $dateObject->format('Y-m-d');
    }
}