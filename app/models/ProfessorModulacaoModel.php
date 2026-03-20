<?php
declare(strict_types=1);

class ProfessorModulacaoModel
{
	public function ensureTableStructure(): void
	{
		$pdo = Database::connection();
		$columns = $this->getTableColumns();

		if ($columns === []) {
			$pdo->exec(
				'CREATE TABLE IF NOT EXISTS professor_modulacoes (
					id INT NOT NULL AUTO_INCREMENT,
					professor_id INT NOT NULL,
					turma_id INT NULL,
					disciplina_id INT NOT NULL,
					created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (id),
					UNIQUE KEY uq_professor_modulacao (professor_id, turma_id, disciplina_id),
					KEY idx_professor_modulacoes_professor (professor_id),
					KEY idx_professor_modulacoes_turma (turma_id),
					KEY idx_professor_modulacoes_disciplina (disciplina_id)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
			);

			$this->ensureForeignKeys();
			return;
		}

		$required = [
			'professor_id' => 'ADD COLUMN professor_id INT NOT NULL DEFAULT 0',
			'turma_id' => 'ADD COLUMN turma_id INT NULL DEFAULT NULL',
			'disciplina_id' => 'ADD COLUMN disciplina_id INT NOT NULL DEFAULT 0',
			'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
			'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		];

		foreach ($required as $column => $sql) {
			if (!isset($columns[$column])) {
				$pdo->exec('ALTER TABLE professor_modulacoes ' . $sql);
			}
		}

		if (isset($columns['turma_id']) && !$this->isTurmaColumnNullable() && !$pdo->inTransaction()) {
			try {
				$pdo->exec('ALTER TABLE professor_modulacoes MODIFY COLUMN turma_id INT NULL DEFAULT NULL');
			} catch (Throwable) {
			}
		}

		$indexes = $this->getTableIndexes();
		if (!isset($indexes['uq_professor_modulacao'])) {
			try {
				$pdo->exec('ALTER TABLE professor_modulacoes ADD UNIQUE KEY uq_professor_modulacao (professor_id, turma_id, disciplina_id)');
			} catch (Throwable) {
			}
		}

		$this->ensureForeignKeys();
	}

	public function getAllOrdered(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query(
			'SELECT pm.id, pm.professor_id, pm.turma_id, pm.disciplina_id, pm.created_at, pm.updated_at,
					u.nome AS professor_nome,
					t.nome AS turma_nome,
					d.nome AS disciplina_nome
				 FROM professor_modulacoes pm
				 INNER JOIN usuarios u ON u.id = pm.professor_id
				 INNER JOIN funcoes f ON f.id = u.funcao AND LOWER(TRIM(f.nome)) = "professor"
				 LEFT JOIN turmas t ON t.id = pm.turma_id
				 INNER JOIN disciplinas d ON d.id = pm.disciplina_id
				 ORDER BY d.nome ASC, u.nome ASC, pm.id DESC'
		);

		return $statement?->fetchAll() ?: [];
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT id, professor_id, turma_id, disciplina_id, created_at, updated_at FROM professor_modulacoes WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
		$row = $statement->fetch();
		return is_array($row) ? $row : null;
	}

	public function existsDuplicate(int $professorId, int $turmaId, int $disciplinaId, int $excludedId = 0): bool
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		if ($excludedId > 0) {
			$statement = $pdo->prepare('SELECT id FROM professor_modulacoes WHERE professor_id = :professor_id AND turma_id = :turma_id AND disciplina_id = :disciplina_id AND id <> :id LIMIT 1');
			$statement->execute([
				'professor_id' => $professorId,
				'turma_id' => $turmaId,
				'disciplina_id' => $disciplinaId,
				'id' => $excludedId,
			]);
		} else {
			$statement = $pdo->prepare('SELECT id FROM professor_modulacoes WHERE professor_id = :professor_id AND turma_id = :turma_id AND disciplina_id = :disciplina_id LIMIT 1');
			$statement->execute([
				'professor_id' => $professorId,
				'turma_id' => $turmaId,
				'disciplina_id' => $disciplinaId,
			]);
		}
		return (int) ($statement->fetchColumn() ?: 0) > 0;
	}

	public function create(int $professorId, int $turmaId, int $disciplinaId): int
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('INSERT INTO professor_modulacoes (professor_id, turma_id, disciplina_id) VALUES (:professor_id, :turma_id, :disciplina_id)');
		$statement->execute([
			'professor_id' => $professorId,
			'turma_id' => $turmaId,
			'disciplina_id' => $disciplinaId,
		]);
		return (int) $pdo->lastInsertId();
	}

	public function update(int $id, int $professorId, int $turmaId, int $disciplinaId): void
	{
		if ($id <= 0) {
			throw new InvalidArgumentException('ID inválido para atualização.');
		}
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('UPDATE professor_modulacoes SET professor_id = :professor_id, turma_id = :turma_id, disciplina_id = :disciplina_id WHERE id = :id');
		$statement->execute([
			'professor_id' => $professorId,
			'turma_id' => $turmaId,
			'disciplina_id' => $disciplinaId,
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
		$statement = $pdo->prepare('DELETE FROM professor_modulacoes WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
	}

	private function ensureForeignKeys(): void
	{
		$pdo = Database::connection();
		$foreignKeys = $this->getForeignKeys();
		$professorReference = $foreignKeys['fk_professor_modulacoes_professor'] ?? '';
		if ($professorReference !== '' && $professorReference !== 'usuarios') {
			try {
				$pdo->exec('ALTER TABLE professor_modulacoes DROP FOREIGN KEY fk_professor_modulacoes_professor');
			} catch (Throwable) {
			}
			$foreignKeys = $this->getForeignKeys();
		}

		if (!isset($foreignKeys['fk_professor_modulacoes_professor'])) {
			try {
				$pdo->exec('ALTER TABLE professor_modulacoes ADD CONSTRAINT fk_professor_modulacoes_professor FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE');
			} catch (Throwable) {
			}
		}
		if (!isset($foreignKeys['fk_professor_modulacoes_turma'])) {
			try {
				$pdo->exec('ALTER TABLE professor_modulacoes ADD CONSTRAINT fk_professor_modulacoes_turma FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE ON UPDATE CASCADE');
			} catch (Throwable) {
			}
		}
		if (!isset($foreignKeys['fk_professor_modulacoes_disciplina'])) {
			try {
				$pdo->exec('ALTER TABLE professor_modulacoes ADD CONSTRAINT fk_professor_modulacoes_disciplina FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE RESTRICT ON UPDATE CASCADE');
			} catch (Throwable) {
			}
		}
	}

	private function getTableColumns(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
		$statement->execute(['table' => 'professor_modulacoes']);
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
		$statement = $pdo->prepare('SHOW INDEX FROM professor_modulacoes');
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

	private function isTurmaColumnNullable(): bool
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column LIMIT 1');
		$statement->execute([
			'table' => 'professor_modulacoes',
			'column' => 'turma_id',
		]);
		$value = $statement->fetchColumn();

		return strtoupper(trim((string) $value)) === 'YES';
	}

	private function getForeignKeys(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT tc.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND kcu.TABLE_NAME = tc.TABLE_NAME AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = :table AND tc.CONSTRAINT_TYPE = "FOREIGN KEY"');
		$statement->execute(['table' => 'professor_modulacoes']);
		$rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
		$result = [];
		foreach ($rows as $row) {
			$name = strtolower(trim((string) ($row['CONSTRAINT_NAME'] ?? '')));
			$referencedTable = strtolower(trim((string) ($row['REFERENCED_TABLE_NAME'] ?? '')));
			if ($name !== '') {
				$result[$name] = $referencedTable;
			}
		}
		return $result;
	}
}