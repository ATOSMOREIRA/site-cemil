<?php
declare(strict_types=1);

class DisciplinaModel
{
	public function ensureTableStructure(): void
	{
		$pdo = Database::connection();
		$columns = $this->getTableColumns();

		if ($columns === []) {
			$pdo->exec(
				'CREATE TABLE IF NOT EXISTS disciplinas (
					id INT NOT NULL AUTO_INCREMENT,
					area_id INT NULL DEFAULT NULL,
					nome VARCHAR(120) NOT NULL,
					status ENUM("ativa", "inativa") NOT NULL DEFAULT "ativa",
					created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (id),
					UNIQUE KEY uq_disciplinas_nome (nome),
					KEY idx_disciplinas_area (area_id),
					KEY idx_disciplinas_status (status)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
			);

			$this->ensureForeignKeys();

			return;
		}

		$required = [
			'area_id' => 'ADD COLUMN area_id INT NULL DEFAULT NULL',
			'nome' => 'ADD COLUMN nome VARCHAR(120) NOT NULL DEFAULT ""',
			'status' => 'ADD COLUMN status ENUM("ativa", "inativa") NOT NULL DEFAULT "ativa"',
			'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
			'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		];

		foreach ($required as $column => $sql) {
			if (!isset($columns[$column])) {
				$pdo->exec('ALTER TABLE disciplinas ' . $sql);
			}
		}

		$indexes = $this->getTableIndexes();
		if (!isset($indexes['uq_disciplinas_nome'])) {
			try {
				$pdo->exec('ALTER TABLE disciplinas ADD UNIQUE KEY uq_disciplinas_nome (nome)');
			} catch (Throwable) {
			}
		}

		if (!isset($indexes['idx_disciplinas_area'])) {
			try {
				$pdo->exec('ALTER TABLE disciplinas ADD KEY idx_disciplinas_area (area_id)');
			} catch (Throwable) {
			}
		}

		$this->ensureForeignKeys();
	}

	public function getAllOrdered(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query('SELECT d.id, d.area_id, d.nome, d.status, d.created_at, d.updated_at, COALESCE(a.nome, "") AS area_nome FROM disciplinas d LEFT JOIN areas a ON a.id = d.area_id ORDER BY d.status ASC, d.nome ASC, d.id DESC');

		return $statement?->fetchAll() ?: [];
	}

	public function getSimpleOptions(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query('SELECT d.id, d.area_id, d.nome, d.status, COALESCE(a.nome, "") AS area_nome FROM disciplinas d LEFT JOIN areas a ON a.id = d.area_id ORDER BY d.nome ASC, d.id ASC');

		return $statement?->fetchAll() ?: [];
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT d.id, d.area_id, d.nome, d.status, d.created_at, d.updated_at, COALESCE(a.nome, "") AS area_nome FROM disciplinas d LEFT JOIN areas a ON a.id = d.area_id WHERE d.id = :id LIMIT 1');
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
			$statement = $pdo->prepare('SELECT id FROM disciplinas WHERE nome = :nome AND id <> :id LIMIT 1');
			$statement->execute(['nome' => $normalized, 'id' => $excludedId]);
		} else {
			$statement = $pdo->prepare('SELECT id FROM disciplinas WHERE nome = :nome LIMIT 1');
			$statement->execute(['nome' => $normalized]);
		}
		return (int) ($statement->fetchColumn() ?: 0) > 0;
	}

	public function existsCodigoForAnotherRecord(string $codigo, int $excludedId = 0): bool
	{
		$this->ensureTableStructure();
		$normalized = trim($codigo);
		if ($normalized === '') {
			return false;
		}
		$pdo = Database::connection();
		if ($excludedId > 0) {
			$statement = $pdo->prepare('SELECT id FROM disciplinas WHERE codigo = :codigo AND id <> :id LIMIT 1');
			$statement->execute(['codigo' => $normalized, 'id' => $excludedId]);
		} else {
			$statement = $pdo->prepare('SELECT id FROM disciplinas WHERE codigo = :codigo LIMIT 1');
			$statement->execute(['codigo' => $normalized]);
		}
		return (int) ($statement->fetchColumn() ?: 0) > 0;
	}

	public function create(string $nome, string $status, int $areaId): int
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('INSERT INTO disciplinas (area_id, nome, status) VALUES (:area_id, :nome, :status)');
		$statement->execute([
			'area_id' => $areaId > 0 ? $areaId : null,
			'nome' => $nome,
			'status' => $status,
		]);

		return (int) $pdo->lastInsertId();
	}

	public function update(int $id, string $nome, string $status, int $areaId): void
	{
		if ($id <= 0) {
			throw new InvalidArgumentException('ID inválido para atualização.');
		}
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('UPDATE disciplinas SET area_id = :area_id, nome = :nome, status = :status WHERE id = :id');
		$statement->execute([
			'area_id' => $areaId > 0 ? $areaId : null,
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
		$statement = $pdo->prepare('DELETE FROM disciplinas WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
	}

	private function ensureForeignKeys(): void
	{
		$pdo = Database::connection();
		$foreignKeys = $this->getForeignKeys();

		if (!isset($foreignKeys['fk_disciplinas_area'])) {
			try {
				$pdo->exec('ALTER TABLE disciplinas ADD CONSTRAINT fk_disciplinas_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE RESTRICT ON UPDATE CASCADE');
			} catch (Throwable) {
			}
		}
	}

	private function getTableColumns(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
		$statement->execute(['table' => 'disciplinas']);
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
		$statement = $pdo->prepare('SHOW INDEX FROM disciplinas');
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

	private function getForeignKeys(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT tc.CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = :table AND tc.CONSTRAINT_TYPE = "FOREIGN KEY"');
		$statement->execute(['table' => 'disciplinas']);
		$rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
		$result = [];
		foreach ($rows as $row) {
			$name = strtolower(trim((string) ($row['CONSTRAINT_NAME'] ?? '')));
			if ($name !== '') {
				$result[$name] = true;
			}
		}

		return $result;
	}
}