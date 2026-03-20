<?php
declare(strict_types=1);

class AreaModel
{
	public function ensureTableStructure(): void
	{
		$pdo = Database::connection();
		$columns = $this->getTableColumns();

		if ($columns === []) {
			$pdo->exec(
				'CREATE TABLE IF NOT EXISTS areas (
					id INT NOT NULL AUTO_INCREMENT,
					nome VARCHAR(120) NOT NULL,
					status ENUM("ativa", "inativa") NOT NULL DEFAULT "ativa",
					created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (id),
					UNIQUE KEY uq_areas_nome (nome),
					KEY idx_areas_status (status)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
			);

			return;
		}

		$required = [
			'nome' => 'ADD COLUMN nome VARCHAR(120) NOT NULL DEFAULT ""',
			'status' => 'ADD COLUMN status ENUM("ativa", "inativa") NOT NULL DEFAULT "ativa"',
			'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
			'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		];

		foreach ($required as $column => $sql) {
			if (!isset($columns[$column])) {
				$pdo->exec('ALTER TABLE areas ' . $sql);
			}
		}

		$indexes = $this->getTableIndexes();
		if (!isset($indexes['uq_areas_nome'])) {
			try {
				$pdo->exec('ALTER TABLE areas ADD UNIQUE KEY uq_areas_nome (nome)');
			} catch (Throwable) {
			}
		}
	}

	public function getAllOrdered(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query('SELECT id, nome, status, created_at, updated_at FROM areas ORDER BY status ASC, nome ASC, id DESC');

		return $statement?->fetchAll() ?: [];
	}

	public function getSimpleOptions(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query('SELECT id, nome, status FROM areas ORDER BY nome ASC, id ASC');

		return $statement?->fetchAll() ?: [];
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT id, nome, status, created_at, updated_at FROM areas WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
		$row = $statement->fetch();

		return is_array($row) ? $row : null;
	}

	public function existsNomeForAnotherRecord(string $nome, int $excludedId = 0): bool
	{
		$this->ensureTableStructure();
		$normalized = trim($nome);
		if ($normalized === '') {
			return false;
		}

		$pdo = Database::connection();
		if ($excludedId > 0) {
			$statement = $pdo->prepare('SELECT id FROM areas WHERE nome = :nome AND id <> :id LIMIT 1');
			$statement->execute(['nome' => $normalized, 'id' => $excludedId]);
		} else {
			$statement = $pdo->prepare('SELECT id FROM areas WHERE nome = :nome LIMIT 1');
			$statement->execute(['nome' => $normalized]);
		}

		return (int) ($statement->fetchColumn() ?: 0) > 0;
	}

	public function hasDisciplinasLinked(int $areaId): bool
	{
		if ($areaId <= 0) {
			return false;
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT id FROM disciplinas WHERE area_id = :area_id LIMIT 1');
		$statement->execute(['area_id' => $areaId]);

		return (int) ($statement->fetchColumn() ?: 0) > 0;
	}

	public function create(string $nome, string $status): int
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('INSERT INTO areas (nome, status) VALUES (:nome, :status)');
		$statement->execute([
			'nome' => $nome,
			'status' => $status,
		]);

		return (int) $pdo->lastInsertId();
	}

	public function update(int $id, string $nome, string $status): void
	{
		if ($id <= 0) {
			throw new InvalidArgumentException('ID inválido para atualização.');
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('UPDATE areas SET nome = :nome, status = :status WHERE id = :id');
		$statement->execute([
			'nome' => $nome,
			'status' => $status,
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
		$statement = $pdo->prepare('DELETE FROM areas WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
	}

	private function getTableColumns(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
		$statement->execute(['table' => 'areas']);
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
		$statement = $pdo->prepare('SHOW INDEX FROM areas');
		$statement->execute();
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