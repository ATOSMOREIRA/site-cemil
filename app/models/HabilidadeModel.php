<?php

declare(strict_types=1);

class HabilidadeModel
{
	public function getAllOrdered(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query('SELECT id, codigo, descricao, tipo, documento, disciplina_id, ano_escolar, etapa_ensino, unidade_tematica, objeto_conhecimento, habilidade_complementar, ativo, created_at, updated_at FROM habilidades ORDER BY documento ASC, codigo ASC, id ASC');

		return $statement?->fetchAll() ?: [];
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT id, codigo, descricao, tipo, documento, disciplina_id, ano_escolar, etapa_ensino, unidade_tematica, objeto_conhecimento, habilidade_complementar, ativo, created_at, updated_at FROM habilidades WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
		$row = $statement->fetch();

		return is_array($row) ? $row : null;
	}

	public function save(array $payload): int
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();

		$id = (int) ($payload['id'] ?? 0);
		$data = [
			'codigo' => (string) ($payload['codigo'] ?? ''),
			'descricao' => (string) ($payload['descricao'] ?? ''),
			'tipo' => (string) ($payload['tipo'] ?? 'Habilidade'),
			'documento' => (string) ($payload['documento'] ?? 'BNCC'),
			'disciplina_id' => $this->normalizeDisciplinaIds($payload['disciplina_ids'] ?? ($payload['disciplina_id'] ?? '')),
			'ano_escolar' => (string) ($payload['ano_escolar'] ?? ''),
			'etapa_ensino' => (string) ($payload['etapa_ensino'] ?? 'Ensino Fundamental'),
			'unidade_tematica' => $this->nullIfEmpty($payload['unidade_tematica'] ?? null),
			'objeto_conhecimento' => $this->nullIfEmpty($payload['objeto_conhecimento'] ?? null),
			'habilidade_complementar' => $this->nullIfEmpty($payload['habilidade_complementar'] ?? null),
			'ativo' => (int) (($payload['ativo'] ?? 1) ? 1 : 0),
		];

		if ($id > 0) {
			$statement = $pdo->prepare('UPDATE habilidades SET codigo = :codigo, descricao = :descricao, tipo = :tipo, documento = :documento, disciplina_id = :disciplina_id, ano_escolar = :ano_escolar, etapa_ensino = :etapa_ensino, unidade_tematica = :unidade_tematica, objeto_conhecimento = :objeto_conhecimento, habilidade_complementar = :habilidade_complementar, ativo = :ativo WHERE id = :id');
			$statement->execute($data + ['id' => $id]);

			return $id;
		}

		$statement = $pdo->prepare('INSERT INTO habilidades (codigo, descricao, tipo, documento, disciplina_id, ano_escolar, etapa_ensino, unidade_tematica, objeto_conhecimento, habilidade_complementar, ativo) VALUES (:codigo, :descricao, :tipo, :documento, :disciplina_id, :ano_escolar, :etapa_ensino, :unidade_tematica, :objeto_conhecimento, :habilidade_complementar, :ativo)');
		$statement->execute($data);

		return (int) $pdo->lastInsertId();
	}

	public function delete(int $id): void
	{
		if ($id <= 0) {
			throw new InvalidArgumentException('ID inválido para exclusão.');
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('DELETE FROM habilidades WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
	}

	public function upsertMany(array $rows): int
	{
		if ($rows === []) {
			return 0;
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$pdo->beginTransaction();

		try {
			$statement = $pdo->prepare('INSERT INTO habilidades (codigo, descricao, tipo, documento, disciplina_id, ano_escolar, etapa_ensino, unidade_tematica, objeto_conhecimento, habilidade_complementar, ativo) VALUES (:codigo, :descricao, :tipo, :documento, :disciplina_id, :ano_escolar, :etapa_ensino, :unidade_tematica, :objeto_conhecimento, :habilidade_complementar, :ativo) ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), tipo = VALUES(tipo), etapa_ensino = VALUES(etapa_ensino), unidade_tematica = VALUES(unidade_tematica), objeto_conhecimento = VALUES(objeto_conhecimento), habilidade_complementar = VALUES(habilidade_complementar), ativo = VALUES(ativo), updated_at = CURRENT_TIMESTAMP');

			$total = 0;
			foreach ($rows as $payload) {
				$data = [
					'codigo' => (string) ($payload['codigo'] ?? ''),
					'descricao' => (string) ($payload['descricao'] ?? ''),
					'tipo' => (string) ($payload['tipo'] ?? 'Habilidade'),
					'documento' => (string) ($payload['documento'] ?? 'BNCC'),
					'disciplina_id' => $this->normalizeDisciplinaIds($payload['disciplina_ids'] ?? ($payload['disciplina_id'] ?? '')),
					'ano_escolar' => (string) ($payload['ano_escolar'] ?? ''),
					'etapa_ensino' => (string) ($payload['etapa_ensino'] ?? 'Ensino Fundamental'),
					'unidade_tematica' => $this->nullIfEmpty($payload['unidade_tematica'] ?? null),
					'objeto_conhecimento' => $this->nullIfEmpty($payload['objeto_conhecimento'] ?? null),
					'habilidade_complementar' => $this->nullIfEmpty($payload['habilidade_complementar'] ?? null),
					'ativo' => (int) (($payload['ativo'] ?? 1) ? 1 : 0),
				];

				$statement->execute($data);
				$total += 1;
			}

			$pdo->commit();
			return $total;
		} catch (Throwable $exception) {
			$pdo->rollBack();
			throw $exception;
		}
	}

	public function ensureTableStructure(): void
	{
		$pdo = Database::connection();
		$columns = $this->getTableColumns();

		if ($columns === []) {
			$pdo->exec(
				'CREATE TABLE IF NOT EXISTS habilidades (
					id INT NOT NULL AUTO_INCREMENT,
					codigo VARCHAR(40) NOT NULL,
					descricao LONGTEXT NOT NULL,
					tipo VARCHAR(40) NOT NULL DEFAULT "habilidade",
					documento VARCHAR(20) NOT NULL DEFAULT "BNCC",
					disciplina_id VARCHAR(255) NOT NULL,
					ano_escolar VARCHAR(40) NOT NULL,
					etapa_ensino VARCHAR(80) NOT NULL DEFAULT "Ensino Fundamental",
					unidade_tematica VARCHAR(200) DEFAULT NULL,
					objeto_conhecimento VARCHAR(255) DEFAULT NULL,
					habilidade_complementar VARCHAR(255) DEFAULT NULL,
					fonte_arquivo VARCHAR(255) DEFAULT NULL,
					ativo TINYINT(1) NOT NULL DEFAULT 1,
					created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (id),
					UNIQUE KEY uq_habilidades_codigo_disciplina_ano_documento (codigo, disciplina_id, ano_escolar, documento),
					KEY idx_habilidades_disciplina_id (disciplina_id),
					KEY idx_habilidades_documento (documento),
					KEY idx_habilidades_ano_escolar (ano_escolar)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci'
			);

			return;
		}

		$required = [
			'codigo' => 'ADD COLUMN codigo VARCHAR(40) NOT NULL DEFAULT ""',
			'descricao' => 'ADD COLUMN descricao LONGTEXT NOT NULL',
			'tipo' => 'ADD COLUMN tipo VARCHAR(40) NOT NULL DEFAULT "habilidade"',
			'documento' => 'ADD COLUMN documento VARCHAR(20) NOT NULL DEFAULT "BNCC"',
			'disciplina_id' => 'ADD COLUMN disciplina_id VARCHAR(255) NOT NULL DEFAULT ""',
			'ano_escolar' => 'ADD COLUMN ano_escolar VARCHAR(40) NOT NULL DEFAULT ""',
			'etapa_ensino' => 'ADD COLUMN etapa_ensino VARCHAR(80) NOT NULL DEFAULT "Ensino Fundamental"',
			'unidade_tematica' => 'ADD COLUMN unidade_tematica VARCHAR(200) NULL',
			'objeto_conhecimento' => 'ADD COLUMN objeto_conhecimento VARCHAR(255) NULL',
			'habilidade_complementar' => 'ADD COLUMN habilidade_complementar VARCHAR(255) NULL',
			'fonte_arquivo' => 'ADD COLUMN fonte_arquivo VARCHAR(255) NULL',
			'ativo' => 'ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1',
			'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
			'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		];

		foreach ($required as $column => $sql) {
			if (!isset($columns[$column])) {
				$pdo->exec('ALTER TABLE habilidades ' . $sql);
			}
		}

		$this->dropForeignKeyIfExists($pdo, 'fk_habilidades_disciplina');
		$columns = $this->getTableColumns();
		$disciplinaColumn = $columns['disciplina_id'] ?? null;
		$disciplinaType = strtolower((string) ($disciplinaColumn['DATA_TYPE'] ?? ''));
		$disciplinaLength = (int) ($disciplinaColumn['CHARACTER_MAXIMUM_LENGTH'] ?? 0);
		if ($disciplinaType !== 'varchar' || $disciplinaLength < 255) {
			$pdo->exec('ALTER TABLE habilidades MODIFY COLUMN disciplina_id VARCHAR(255) NOT NULL');
		}

		$pdo->exec('ALTER TABLE habilidades MODIFY COLUMN codigo VARCHAR(40) NOT NULL');
		$pdo->exec('ALTER TABLE habilidades MODIFY COLUMN descricao LONGTEXT NOT NULL');
		$pdo->exec('ALTER TABLE habilidades MODIFY COLUMN tipo VARCHAR(40) NOT NULL');
		$pdo->exec('ALTER TABLE habilidades MODIFY COLUMN documento VARCHAR(20) NOT NULL');
		$pdo->exec('ALTER TABLE habilidades MODIFY COLUMN ano_escolar VARCHAR(40) NOT NULL');
		$pdo->exec('ALTER TABLE habilidades MODIFY COLUMN etapa_ensino VARCHAR(80) NOT NULL');

		$indexes = $this->getTableIndexes();
		if (!isset($indexes['uq_habilidades_codigo_disciplina_ano_documento'])) {
			try {
				$pdo->exec('ALTER TABLE habilidades ADD UNIQUE KEY uq_habilidades_codigo_disciplina_ano_documento (codigo, disciplina_id, ano_escolar, documento)');
			} catch (Throwable) {
			}
		}

		if (!isset($indexes['idx_habilidades_disciplina_id'])) {
			try {
				$pdo->exec('ALTER TABLE habilidades ADD KEY idx_habilidades_disciplina_id (disciplina_id)');
			} catch (Throwable) {
			}
		}

		if (!isset($indexes['idx_habilidades_documento'])) {
			try {
				$pdo->exec('ALTER TABLE habilidades ADD KEY idx_habilidades_documento (documento)');
			} catch (Throwable) {
			}
		}

		if (!isset($indexes['idx_habilidades_ano_escolar'])) {
			try {
				$pdo->exec('ALTER TABLE habilidades ADD KEY idx_habilidades_ano_escolar (ano_escolar)');
			} catch (Throwable) {
			}
		}
	}

	private function nullIfEmpty($value): ?string
	{
		$text = trim((string) ($value ?? ''));
		return $text === '' ? null : $text;
	}

	private function normalizeDisciplinaIds($value): string
	{
		$items = is_array($value)
			? $value
			: (preg_split('/\s*,\s*/', (string) $value) ?: []);
		$ids = [];
		foreach ($items as $item) {
			$id = (int) $item;
			if ($id > 0) {
				$ids[$id] = $id;
			}
		}

		ksort($ids, SORT_NUMERIC);
		return implode(',', $ids);
	}

	private function getTableColumns(): array
	{
		$pdo = Database::connection();
		try {
			$statement = $pdo->query('SHOW FULL COLUMNS FROM habilidades');
			$rows = $statement?->fetchAll() ?: [];
		} catch (Throwable) {
			return [];
		}
		$result = [];
		foreach ($rows as $row) {
			if (!is_array($row) || !isset($row['Field'])) {
				continue;
			}

			$result[(string) $row['Field']] = [
				'DATA_TYPE' => strtolower((string) preg_replace('/\(.*/', '', (string) ($row['Type'] ?? ''))),
				'CHARACTER_MAXIMUM_LENGTH' => (int) (preg_match('/\((\d+)\)/', (string) ($row['Type'] ?? ''), $matches) === 1 ? ($matches[1] ?? 0) : 0),
			];
		}

		return $result;
	}

	private function getTableIndexes(): array
	{
		$pdo = Database::connection();
		try {
			$statement = $pdo->query('SHOW INDEX FROM habilidades');
			$rows = $statement?->fetchAll() ?: [];
		} catch (Throwable) {
			return [];
		}
		$result = [];
		foreach ($rows as $row) {
			if (!is_array($row) || !isset($row['Key_name'])) {
				continue;
			}

			$result[(string) $row['Key_name']] = true;
		}

		return $result;
	}

	private function dropForeignKeyIfExists(PDO $pdo, string $constraintName): void
	{
		$statement = $pdo->prepare('SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND CONSTRAINT_NAME = :constraint_name AND CONSTRAINT_TYPE = "FOREIGN KEY"');
		$statement->execute([
			'table_name' => 'habilidades',
			'constraint_name' => $constraintName,
		]);

		if ((int) ($statement->fetchColumn() ?: 0) > 0) {
			$pdo->exec('ALTER TABLE habilidades DROP FOREIGN KEY ' . $constraintName);
		}
	}
}
