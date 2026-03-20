<?php
declare(strict_types=1);

class ModulacaoHorarioModel
{
	private const TABLE_NAME = 'modulacao_horarios';
	private const ALLOWED_DAYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

	public function ensureTableStructure(): void
	{
		$pdo = Database::connection();
		$columns = $this->getTableColumns();

		if ($columns === []) {
			$pdo->exec(
				'CREATE TABLE IF NOT EXISTS ' . self::TABLE_NAME . ' (
					id INT NOT NULL AUTO_INCREMENT,
					professor_id INT NOT NULL,
					turma_id INT NOT NULL,
					disciplina_id INT NOT NULL,
					dia_semana VARCHAR(20) NOT NULL,
					inicio TIME NOT NULL,
					fim TIME NOT NULL,
					origem VARCHAR(40) NOT NULL DEFAULT "manual",
					observacoes TEXT NULL,
					created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (id),
					KEY idx_modulacao_horarios_professor (professor_id),
					KEY idx_modulacao_horarios_turma (turma_id),
					KEY idx_modulacao_horarios_disciplina (disciplina_id),
					KEY idx_modulacao_horarios_dia_inicio (dia_semana, inicio),
					KEY idx_modulacao_horarios_professor_dia (professor_id, dia_semana, inicio),
					KEY idx_modulacao_horarios_turma_dia (turma_id, dia_semana, inicio)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
			);

			$this->ensureForeignKeys();
			return;
		}

		$required = [
			'professor_id' => 'ADD COLUMN professor_id INT NOT NULL DEFAULT 0',
			'turma_id' => 'ADD COLUMN turma_id INT NOT NULL DEFAULT 0',
			'disciplina_id' => 'ADD COLUMN disciplina_id INT NOT NULL DEFAULT 0',
			'dia_semana' => 'ADD COLUMN dia_semana VARCHAR(20) NOT NULL DEFAULT "segunda"',
			'inicio' => 'ADD COLUMN inicio TIME NOT NULL DEFAULT "07:30:00"',
			'fim' => 'ADD COLUMN fim TIME NOT NULL DEFAULT "08:20:00"',
			'origem' => 'ADD COLUMN origem VARCHAR(40) NOT NULL DEFAULT "manual"',
			'observacoes' => 'ADD COLUMN observacoes TEXT NULL',
			'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
			'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		];

		foreach ($required as $column => $sql) {
			if (!isset($columns[$column])) {
				$pdo->exec('ALTER TABLE ' . self::TABLE_NAME . ' ' . $sql);
			}
		}

		$indexes = $this->getTableIndexes();
		$requiredIndexes = [
			'idx_modulacao_horarios_professor' => 'ALTER TABLE ' . self::TABLE_NAME . ' ADD KEY idx_modulacao_horarios_professor (professor_id)',
			'idx_modulacao_horarios_turma' => 'ALTER TABLE ' . self::TABLE_NAME . ' ADD KEY idx_modulacao_horarios_turma (turma_id)',
			'idx_modulacao_horarios_disciplina' => 'ALTER TABLE ' . self::TABLE_NAME . ' ADD KEY idx_modulacao_horarios_disciplina (disciplina_id)',
			'idx_modulacao_horarios_dia_inicio' => 'ALTER TABLE ' . self::TABLE_NAME . ' ADD KEY idx_modulacao_horarios_dia_inicio (dia_semana, inicio)',
			'idx_modulacao_horarios_professor_dia' => 'ALTER TABLE ' . self::TABLE_NAME . ' ADD KEY idx_modulacao_horarios_professor_dia (professor_id, dia_semana, inicio)',
			'idx_modulacao_horarios_turma_dia' => 'ALTER TABLE ' . self::TABLE_NAME . ' ADD KEY idx_modulacao_horarios_turma_dia (turma_id, dia_semana, inicio)',
		];

		foreach ($requiredIndexes as $indexName => $sql) {
			if (!isset($indexes[$indexName])) {
				try {
					$pdo->exec($sql);
				} catch (Throwable) {
				}
			}
		}

		$this->ensureForeignKeys();
	}

	public function getAllOrdered(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query(
			'SELECT mh.id, mh.professor_id, mh.turma_id, mh.disciplina_id, mh.dia_semana,
					DATE_FORMAT(mh.inicio, "%H:%i") AS inicio,
					DATE_FORMAT(mh.fim, "%H:%i") AS fim,
					mh.origem, mh.observacoes, mh.created_at, mh.updated_at,
					u.nome AS professor_nome,
					t.nome AS turma_nome,
					d.nome AS disciplina_nome
				 FROM ' . self::TABLE_NAME . ' mh
				 INNER JOIN usuarios u ON u.id = mh.professor_id
				 INNER JOIN turmas t ON t.id = mh.turma_id
				 INNER JOIN disciplinas d ON d.id = mh.disciplina_id
				 ORDER BY FIELD(mh.dia_semana, "segunda", "terca", "quarta", "quinta", "sexta", "sabado"), mh.inicio ASC, t.nome ASC, u.nome ASC, mh.id ASC'
		);

		return $statement?->fetchAll() ?: [];
	}

	public function replaceForProfessores(array $professorIds, array $entries, string $origem = 'ia_groq'): void
	{
		$this->ensureTableStructure();
		$professorIds = array_values(array_unique(array_map('intval', $professorIds)));
		$professorIds = array_values(array_filter($professorIds, static function (int $value): bool {
			return $value > 0;
		}));

		if ($professorIds === []) {
			throw new InvalidArgumentException('Selecione ao menos um professor para aplicar a grade.');
		}

		$pdo = Database::connection();
		$startedTransaction = !$pdo->inTransaction();

		try {
			if ($startedTransaction) {
				$pdo->beginTransaction();
			}

			$placeholders = implode(', ', array_fill(0, count($professorIds), '?'));
			$deleteStatement = $pdo->prepare('DELETE FROM ' . self::TABLE_NAME . ' WHERE professor_id IN (' . $placeholders . ')');
			$deleteStatement->execute($professorIds);

			if ($entries !== []) {
				$insertStatement = $pdo->prepare(
					'INSERT INTO ' . self::TABLE_NAME . ' (professor_id, turma_id, disciplina_id, dia_semana, inicio, fim, origem, observacoes)
					 VALUES (:professor_id, :turma_id, :disciplina_id, :dia_semana, :inicio, :fim, :origem, :observacoes)'
				);

				foreach ($entries as $entry) {
					if (!is_array($entry)) {
						continue;
					}

					$diaSemana = $this->normalizeDay((string) ($entry['dia_semana'] ?? ''));
					if ($diaSemana === '') {
						continue;
					}

					$insertStatement->execute([
						'professor_id' => (int) ($entry['professor_id'] ?? 0),
						'turma_id' => (int) ($entry['turma_id'] ?? 0),
						'disciplina_id' => (int) ($entry['disciplina_id'] ?? 0),
						'dia_semana' => $diaSemana,
						'inicio' => (string) ($entry['inicio'] ?? '') . ':00',
						'fim' => (string) ($entry['fim'] ?? '') . ':00',
						'origem' => trim((string) ($entry['origem'] ?? $origem)) !== '' ? trim((string) ($entry['origem'] ?? $origem)) : $origem,
						'observacoes' => $entry['observacoes'] ?? null,
					]);
				}
			}

			if ($startedTransaction) {
				$pdo->commit();
			}
		} catch (Throwable $exception) {
			if ($startedTransaction && $pdo->inTransaction()) {
				$pdo->rollBack();
			}

			throw $exception;
		}
	}

	private function normalizeDay(string $value): string
	{
		$value = strtolower(trim($value));
		return in_array($value, self::ALLOWED_DAYS, true) ? $value : '';
	}

	private function ensureForeignKeys(): void
	{
		$pdo = Database::connection();
		$foreignKeys = $this->getForeignKeys();

		$required = [
			'fk_modulacao_horarios_professor' => ['column' => 'professor_id', 'table' => 'usuarios', 'delete' => 'CASCADE'],
			'fk_modulacao_horarios_turma' => ['column' => 'turma_id', 'table' => 'turmas', 'delete' => 'CASCADE'],
			'fk_modulacao_horarios_disciplina' => ['column' => 'disciplina_id', 'table' => 'disciplinas', 'delete' => 'RESTRICT'],
		];

		foreach ($required as $name => $config) {
			if (isset($foreignKeys[$name])) {
				continue;
			}

			try {
				$pdo->exec(
					'ALTER TABLE ' . self::TABLE_NAME
					. ' ADD CONSTRAINT ' . $name
					. ' FOREIGN KEY (' . $config['column'] . ') REFERENCES ' . $config['table'] . '(id)'
					. ' ON DELETE ' . $config['delete'] . ' ON UPDATE CASCADE'
				);
			} catch (Throwable) {
			}
		}
	}

	private function getTableColumns(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
		$statement->execute(['table' => self::TABLE_NAME]);
		$rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
		$result = [];

		foreach ($rows as $row) {
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
		$statement = $pdo->prepare('SHOW INDEX FROM ' . self::TABLE_NAME);
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
		$statement->execute(['table' => self::TABLE_NAME]);
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