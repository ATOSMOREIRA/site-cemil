<?php
declare(strict_types=1);

class ModulacaoBeneficioModel
{
	private const ALLOWED_TYPES = ['livre_docencia', 'planejamento'];
	private const ALLOWED_DAYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

	public function ensureTableStructure(): void
	{
		$pdo = Database::connection();
		$columns = $this->getTableColumns();

		if ($columns === []) {
			$pdo->exec(
				'CREATE TABLE IF NOT EXISTS modulacao_beneficios (
					id INT NOT NULL AUTO_INCREMENT,
					usuario_id INT NOT NULL,
					tipo VARCHAR(40) NOT NULL,
					dia_semana VARCHAR(20) NOT NULL,
					slots_json LONGTEXT NOT NULL,
					created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (id),
					KEY idx_modulacao_beneficios_usuario_tipo (usuario_id, tipo),
					KEY idx_modulacao_beneficios_tipo (tipo),
					KEY idx_modulacao_beneficios_dia (dia_semana),
					KEY idx_modulacao_beneficios_usuario (usuario_id)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
			);

			$this->ensureForeignKeys();
			return;
		}

		$required = [
			'usuario_id' => 'ADD COLUMN usuario_id INT NOT NULL DEFAULT 0',
			'tipo' => 'ADD COLUMN tipo VARCHAR(40) NOT NULL DEFAULT "planejamento"',
			'dia_semana' => 'ADD COLUMN dia_semana VARCHAR(20) NOT NULL DEFAULT "segunda"',
			'slots_json' => 'ADD COLUMN slots_json LONGTEXT NOT NULL',
			'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
			'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		];

		foreach ($required as $column => $sql) {
			if (!isset($columns[$column])) {
				$pdo->exec('ALTER TABLE modulacao_beneficios ' . $sql);
			}
		}

		$indexes = $this->getTableIndexes();
		if (isset($indexes['uq_modulacao_beneficios_usuario_tipo'])) {
			try {
				$pdo->exec('ALTER TABLE modulacao_beneficios DROP INDEX uq_modulacao_beneficios_usuario_tipo');
			} catch (Throwable) {
			}
		}

		if (!isset($indexes['idx_modulacao_beneficios_usuario_tipo'])) {
			try {
				$pdo->exec('ALTER TABLE modulacao_beneficios ADD KEY idx_modulacao_beneficios_usuario_tipo (usuario_id, tipo)');
			} catch (Throwable) {
			}
		}

		$this->ensureForeignKeys();
	}

	public function getAllByType(string $tipo): array
	{
		$normalizedType = $this->normalizeType($tipo);
		if ($normalizedType === '') {
			return [];
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$hasCargaHorariaColumn = $this->hasUsuariosCargaHorariaColumn();
		$sql = $hasCargaHorariaColumn
			? 'SELECT mb.id, mb.usuario_id, mb.tipo, mb.dia_semana, mb.slots_json, mb.created_at, mb.updated_at, u.nome AS usuario_nome, u.usuario, u.email, COALESCE(u.cargaHoraria, 40) AS carga_horaria, COALESCE(f.nome, "") AS funcao_nome FROM modulacao_beneficios mb INNER JOIN usuarios u ON u.id = mb.usuario_id LEFT JOIN funcoes f ON f.id = u.funcao WHERE mb.tipo = :tipo ORDER BY u.nome ASC, mb.id DESC'
			: 'SELECT mb.id, mb.usuario_id, mb.tipo, mb.dia_semana, mb.slots_json, mb.created_at, mb.updated_at, u.nome AS usuario_nome, u.usuario, u.email, 40 AS carga_horaria, COALESCE(f.nome, "") AS funcao_nome FROM modulacao_beneficios mb INNER JOIN usuarios u ON u.id = mb.usuario_id LEFT JOIN funcoes f ON f.id = u.funcao WHERE mb.tipo = :tipo ORDER BY u.nome ASC, mb.id DESC';

		$statement = $pdo->prepare($sql);
		$statement->execute(['tipo' => $normalizedType]);
		$rows = $statement->fetchAll() ?: [];

		$result = [];
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$cargaHoraria = max(0, (int) ($row['carga_horaria'] ?? 40));
			$slots = $this->decodeSlots($row['slots_json'] ?? '[]');
			$beneficioMinutos = max(0, (int) round(($cargaHoraria / 5) * 60));
			$result[] = [
				'id' => (int) ($row['id'] ?? 0),
				'usuario_id' => (int) ($row['usuario_id'] ?? 0),
				'tipo' => $normalizedType,
				'dia_semana' => $this->normalizeDay((string) ($row['dia_semana'] ?? 'segunda')),
				'slots' => $slots,
				'usuario_nome' => (string) ($row['usuario_nome'] ?? ''),
				'usuario' => (string) ($row['usuario'] ?? ''),
				'email' => (string) ($row['email'] ?? ''),
				'funcao_nome' => (string) ($row['funcao_nome'] ?? ''),
				'cargaHoraria' => $cargaHoraria,
				'beneficio_minutos' => $beneficioMinutos,
				'selecionado_minutos' => $this->sumSlotMinutes($slots),
				'horarios_texto' => $this->formatSlots($slots),
			];
		}

		return $result;
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT id, usuario_id, tipo, dia_semana, slots_json, created_at, updated_at FROM modulacao_beneficios WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
		$row = $statement->fetch();

		if (!is_array($row)) {
			return null;
		}

		return [
			'id' => (int) ($row['id'] ?? 0),
			'usuario_id' => (int) ($row['usuario_id'] ?? 0),
			'tipo' => $this->normalizeType((string) ($row['tipo'] ?? '')),
			'dia_semana' => $this->normalizeDay((string) ($row['dia_semana'] ?? 'segunda')),
			'slots' => $this->decodeSlots($row['slots_json'] ?? '[]'),
		];
	}

	public function existsDuplicateUserType(int $usuarioId, string $tipo, int $excludedId = 0): bool
	{
		$this->ensureTableStructure();
		$normalizedType = $this->normalizeType($tipo);
		if ($usuarioId <= 0 || $normalizedType === '') {
			return false;
		}

		$pdo = Database::connection();
		if ($excludedId > 0) {
			$statement = $pdo->prepare('SELECT id FROM modulacao_beneficios WHERE usuario_id = :usuario_id AND tipo = :tipo AND id <> :id LIMIT 1');
			$statement->execute([
				'usuario_id' => $usuarioId,
				'tipo' => $normalizedType,
				'id' => $excludedId,
			]);
		} else {
			$statement = $pdo->prepare('SELECT id FROM modulacao_beneficios WHERE usuario_id = :usuario_id AND tipo = :tipo LIMIT 1');
			$statement->execute([
				'usuario_id' => $usuarioId,
				'tipo' => $normalizedType,
			]);
		}

		return (int) ($statement->fetchColumn() ?: 0) > 0;
	}

	public function findAnyOverlapForUser(int $usuarioId, string $tipo, string $diaSemana, array $slots, int $excludedId = 0): ?array
	{
		$this->ensureTableStructure();
		$normalizedDay = $this->normalizeDay($diaSemana);
		if ($usuarioId <= 0 || $normalizedDay === '' || $slots === []) {
			return null;
		}

		$pdo = Database::connection();
		$sql = 'SELECT id, usuario_id, tipo, dia_semana, slots_json FROM modulacao_beneficios WHERE usuario_id = :usuario_id AND dia_semana = :dia_semana';
		$params = [
			'usuario_id' => $usuarioId,
			'dia_semana' => $normalizedDay,
		];

		if ($excludedId > 0) {
			$sql .= ' AND id <> :id';
			$params['id'] = $excludedId;
		}

		$sql .= ' ORDER BY id ASC';
		$statement = $pdo->prepare($sql);
		$statement->execute($params);
		$rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
		if ($rows === []) {
			return null;
		}

		$requestedKeys = [];
		foreach ($this->decodeSlots(json_encode(array_values($slots), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) as $slot) {
			$requestedKeys[(string) ($slot['inicio'] ?? '') . '|' . (string) ($slot['fim'] ?? '')] = $slot;
		}

		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$existingSlots = $this->decodeSlots($row['slots_json'] ?? '[]');
			$conflictingSlots = [];
			foreach ($existingSlots as $slot) {
				$key = (string) ($slot['inicio'] ?? '') . '|' . (string) ($slot['fim'] ?? '');
				if ($key !== '|' && isset($requestedKeys[$key])) {
					$conflictingSlots[] = $slot;
				}
			}

			if ($conflictingSlots === []) {
				continue;
			}

			return [
				'id' => (int) ($row['id'] ?? 0),
				'usuario_id' => (int) ($row['usuario_id'] ?? 0),
				'tipo' => $this->normalizeType((string) ($row['tipo'] ?? '')),
				'dia_semana' => $normalizedDay,
				'slots' => $existingSlots,
				'conflitos' => $conflictingSlots,
			];
		}

		return null;
	}

	public function countMinutesForUserType(int $usuarioId, string $tipo, int $excludedId = 0): int
	{
		$this->ensureTableStructure();
		$normalizedType = $this->normalizeType($tipo);
		if ($usuarioId <= 0 || $normalizedType === '') {
			return 0;
		}

		$pdo = Database::connection();
		$sql = 'SELECT slots_json FROM modulacao_beneficios WHERE usuario_id = :usuario_id AND tipo = :tipo';
		$params = [
			'usuario_id' => $usuarioId,
			'tipo' => $normalizedType,
		];

		if ($excludedId > 0) {
			$sql .= ' AND id <> :id';
			$params['id'] = $excludedId;
		}

		$statement = $pdo->prepare($sql);
		$statement->execute($params);
		$rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];

		$total = 0;
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$total += $this->sumSlotMinutes($this->decodeSlots($row['slots_json'] ?? '[]'));
		}

		return $total;
	}

	public function findOtherTypeOverlapForUser(int $usuarioId, string $tipo, string $diaSemana, array $slots, int $excludedId = 0): ?array
	{
		$this->ensureTableStructure();
		$normalizedType = $this->normalizeType($tipo);
		$normalizedDay = $this->normalizeDay($diaSemana);
		if ($usuarioId <= 0 || $normalizedType === '' || $normalizedDay === '' || $slots === []) {
			return null;
		}

		$otherType = $normalizedType === 'planejamento' ? 'livre_docencia' : 'planejamento';
		$pdo = Database::connection();
		$sql = 'SELECT id, usuario_id, tipo, dia_semana, slots_json FROM modulacao_beneficios WHERE usuario_id = :usuario_id AND tipo = :tipo AND dia_semana = :dia_semana';
		$params = [
			'usuario_id' => $usuarioId,
			'tipo' => $otherType,
			'dia_semana' => $normalizedDay,
		];

		if ($excludedId > 0) {
			$sql .= ' AND id <> :id';
			$params['id'] = $excludedId;
		}

		$sql .= ' LIMIT 1';
		$statement = $pdo->prepare($sql);
		$statement->execute($params);
		$row = $statement->fetch(PDO::FETCH_ASSOC);
		if (!is_array($row)) {
			return null;
		}

		$existingSlots = $this->decodeSlots($row['slots_json'] ?? '[]');
		$requestedKeys = [];
		foreach ($this->decodeSlots(json_encode(array_values($slots), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) as $slot) {
			$requestedKeys[(string) ($slot['inicio'] ?? '') . '|' . (string) ($slot['fim'] ?? '')] = $slot;
		}

		$conflictingSlots = [];
		foreach ($existingSlots as $slot) {
			$key = (string) ($slot['inicio'] ?? '') . '|' . (string) ($slot['fim'] ?? '');
			if ($key !== '|' && isset($requestedKeys[$key])) {
				$conflictingSlots[] = $slot;
			}
		}

		if ($conflictingSlots === []) {
			return null;
		}

		return [
			'id' => (int) ($row['id'] ?? 0),
			'usuario_id' => (int) ($row['usuario_id'] ?? 0),
			'tipo' => $this->normalizeType((string) ($row['tipo'] ?? '')),
			'dia_semana' => $normalizedDay,
			'slots' => $existingSlots,
			'conflitos' => $conflictingSlots,
		];
	}

	public function create(int $usuarioId, string $tipo, string $diaSemana, array $slots): int
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('INSERT INTO modulacao_beneficios (usuario_id, tipo, dia_semana, slots_json) VALUES (:usuario_id, :tipo, :dia_semana, :slots_json)');
		$statement->execute([
			'usuario_id' => $usuarioId,
			'tipo' => $this->normalizeType($tipo),
			'dia_semana' => $this->normalizeDay($diaSemana),
			'slots_json' => json_encode(array_values($slots), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
		]);

		return (int) $pdo->lastInsertId();
	}

	public function update(int $id, int $usuarioId, string $tipo, string $diaSemana, array $slots): void
	{
		if ($id <= 0) {
			throw new InvalidArgumentException('ID inválido para atualização.');
		}

		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->prepare('UPDATE modulacao_beneficios SET usuario_id = :usuario_id, tipo = :tipo, dia_semana = :dia_semana, slots_json = :slots_json WHERE id = :id');
		$statement->execute([
			'usuario_id' => $usuarioId,
			'tipo' => $this->normalizeType($tipo),
			'dia_semana' => $this->normalizeDay($diaSemana),
			'slots_json' => json_encode(array_values($slots), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
		$statement = $pdo->prepare('DELETE FROM modulacao_beneficios WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
	}

	private function normalizeType(string $tipo): string
	{
		$normalized = trim(strtolower($tipo));
		return in_array($normalized, self::ALLOWED_TYPES, true) ? $normalized : '';
	}

	private function normalizeDay(string $day): string
	{
		$normalized = trim(strtolower($day));
		return in_array($normalized, self::ALLOWED_DAYS, true) ? $normalized : 'segunda';
	}

	private function decodeSlots($raw): array
	{
		$decoded = json_decode((string) $raw, true);
		if (!is_array($decoded)) {
			return [];
		}

		$result = [];
		foreach ($decoded as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$inicio = trim((string) ($slot['inicio'] ?? ''));
			$fim = trim((string) ($slot['fim'] ?? ''));
			if ($inicio === '' || $fim === '') {
				continue;
			}

			$result[] = ['inicio' => $inicio, 'fim' => $fim];
		}

		return $result;
	}

	private function formatSlots(array $slots): string
	{
		$labels = [];
		foreach ($slots as $slot) {
			if (!is_array($slot)) {
				continue;
			}
			$inicio = trim((string) ($slot['inicio'] ?? ''));
			$fim = trim((string) ($slot['fim'] ?? ''));
			if ($inicio === '' || $fim === '') {
				continue;
			}
			$labels[] = $inicio . ' - ' . $fim;
		}

		return implode(', ', $labels);
	}

	private function sumSlotMinutes(array $slots): int
	{
		$total = 0;
		foreach ($slots as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$total += $this->calculateSlotMinutes(
				(string) ($slot['inicio'] ?? ''),
				(string) ($slot['fim'] ?? '')
			);
		}

		return $total;
	}

	private function calculateSlotMinutes(string $inicio, string $fim): int
	{
		$inicio = trim($inicio);
		$fim = trim($fim);
		if (!preg_match('/^\d{2}:\d{2}$/', $inicio) || !preg_match('/^\d{2}:\d{2}$/', $fim)) {
			return 0;
		}

		[$inicioHora, $inicioMinuto] = array_map('intval', explode(':', $inicio));
		[$fimHora, $fimMinuto] = array_map('intval', explode(':', $fim));
		$inicioTotal = ($inicioHora * 60) + $inicioMinuto;
		$fimTotal = ($fimHora * 60) + $fimMinuto;

		return max(0, $fimTotal - $inicioTotal);
	}

	private function ensureForeignKeys(): void
	{
		$pdo = Database::connection();
		$foreignKeys = $this->getForeignKeys();

		if (!isset($foreignKeys['fk_modulacao_beneficios_usuario'])) {
			try {
				$pdo->exec('ALTER TABLE modulacao_beneficios ADD CONSTRAINT fk_modulacao_beneficios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE');
			} catch (Throwable) {
			}
		}
	}

	private function getTableColumns(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
		$statement->execute(['table' => 'modulacao_beneficios']);
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
		$statement = $pdo->prepare('SHOW INDEX FROM modulacao_beneficios');
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
		$statement->execute(['table' => 'modulacao_beneficios']);
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

	private function hasUsuariosCargaHorariaColumn(): bool
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column');
		$statement->execute([
			'table' => 'usuarios',
			'column' => 'cargaHoraria',
		]);

		return ((int) ($statement->fetchColumn() ?: 0)) > 0;
	}
}