<?php
declare(strict_types=1);

class ModulacaoAulaConfigModel
{
	private const TABLE_NAME = 'modulacao_aulas_configuracoes';

	private const DEFAULTS = [
		'hora_inicio' => '07:30',
		'hora_fim' => '17:00',
		'inicio_almoco' => '12:00',
		'fim_almoco' => '13:20',
		'duracao_aula_minutos' => 50,
		'quantidade_aulas_dia' => 9,
	];

	private const DEFAULT_SLOT_START_TIMES = [
		'07:30',
		'08:20',
		'09:30',
		'10:20',
		'11:10',
		'13:20',
		'14:10',
		'15:20',
		'16:10',
	];

	private const DAY_KEYS = [
		'segunda',
		'terca',
		'quarta',
		'quinta',
		'sexta',
		'sabado',
	];

	public function ensureTableStructure(): void
	{
		$pdo = Database::connection();
		$columns = $this->getTableColumns();

		if ($columns === []) {
			$pdo->exec(
				'CREATE TABLE IF NOT EXISTS ' . self::TABLE_NAME . ' (
					id INT NOT NULL AUTO_INCREMENT,
					hora_inicio TIME NOT NULL DEFAULT "07:30:00",
					hora_fim TIME NOT NULL DEFAULT "17:00:00",
					inicio_almoco TIME NOT NULL DEFAULT "12:00:00",
					fim_almoco TIME NOT NULL DEFAULT "13:20:00",
					duracao_aula_minutos SMALLINT NOT NULL DEFAULT 50,
					quantidade_aulas_dia SMALLINT NOT NULL DEFAULT 9,
					grade_json LONGTEXT NULL,
					created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					PRIMARY KEY (id)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
			);

			return;
		}

		$required = [
			'hora_inicio' => 'ADD COLUMN hora_inicio TIME NOT NULL DEFAULT "07:30:00"',
			'hora_fim' => 'ADD COLUMN hora_fim TIME NOT NULL DEFAULT "17:00:00"',
			'inicio_almoco' => 'ADD COLUMN inicio_almoco TIME NOT NULL DEFAULT "12:00:00"',
			'fim_almoco' => 'ADD COLUMN fim_almoco TIME NOT NULL DEFAULT "13:20:00"',
			'duracao_aula_minutos' => 'ADD COLUMN duracao_aula_minutos SMALLINT NOT NULL DEFAULT 50',
			'quantidade_aulas_dia' => 'ADD COLUMN quantidade_aulas_dia SMALLINT NOT NULL DEFAULT 9',
			'grade_json' => 'ADD COLUMN grade_json LONGTEXT NULL',
			'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
			'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
		];

		foreach ($required as $column => $sql) {
			if (!isset($columns[$column])) {
				$pdo->exec('ALTER TABLE ' . self::TABLE_NAME . ' ' . $sql);
			}
		}
	}

	public function getCurrent(): array
	{
		$this->ensureTableStructure();
		$pdo = Database::connection();
		$statement = $pdo->query('SELECT id, hora_inicio, hora_fim, inicio_almoco, fim_almoco, duracao_aula_minutos, quantidade_aulas_dia, grade_json FROM ' . self::TABLE_NAME . ' ORDER BY id ASC LIMIT 1');
		$row = $statement ? $statement->fetch(PDO::FETCH_ASSOC) : false;

		if (!is_array($row)) {
			$this->createDefaultRow();
			return $this->getCurrent();
		}

		$config = [
			'id' => (int) ($row['id'] ?? 0),
			'hora_inicio' => $this->normalizeStoredTime((string) ($row['hora_inicio'] ?? self::DEFAULTS['hora_inicio'])),
			'hora_fim' => $this->normalizeStoredTime((string) ($row['hora_fim'] ?? self::DEFAULTS['hora_fim'])),
			'inicio_almoco' => $this->normalizeStoredTime((string) ($row['inicio_almoco'] ?? self::DEFAULTS['inicio_almoco'])),
			'fim_almoco' => $this->normalizeStoredTime((string) ($row['fim_almoco'] ?? self::DEFAULTS['fim_almoco'])),
			'duracao_aula_minutos' => $this->normalizeDurationMinutes((int) ($row['duracao_aula_minutos'] ?? self::DEFAULTS['duracao_aula_minutos'])),
			'quantidade_aulas_dia' => $this->normalizeDailyClassCount((int) ($row['quantidade_aulas_dia'] ?? self::DEFAULTS['quantidade_aulas_dia'])),
		];

		$defaultSlots = $this->buildSlots($config['hora_inicio'], $config['hora_fim'], $config['inicio_almoco'], $config['fim_almoco'], $config['duracao_aula_minutos'], $config['quantidade_aulas_dia']);
		$decoded = json_decode((string) ($row['grade_json'] ?? ''), true);
		$config['slots'] = $this->normalizeSlots($decoded, $defaultSlots);

		return $config;
	}

	public function save(string $horaInicio, string $horaFim, string $inicioAlmoco, string $fimAlmoco, int $duracaoAulaMinutos, int $quantidadeAulasDia, array $slots): array
	{
		$this->ensureTableStructure();
		$current = $this->getCurrent();
		$duracaoAulaMinutos = $this->normalizeDurationMinutes($duracaoAulaMinutos);
		$quantidadeAulasDia = $this->normalizeDailyClassCount($quantidadeAulasDia);
		$pdo = Database::connection();
		$statement = $pdo->prepare(
			'UPDATE ' . self::TABLE_NAME . ' SET hora_inicio = :hora_inicio, hora_fim = :hora_fim, inicio_almoco = :inicio_almoco, fim_almoco = :fim_almoco, duracao_aula_minutos = :duracao_aula_minutos, quantidade_aulas_dia = :quantidade_aulas_dia, grade_json = :grade_json WHERE id = :id'
		);
		$statement->execute([
			'hora_inicio' => $horaInicio . ':00',
			'hora_fim' => $horaFim . ':00',
			'inicio_almoco' => $inicioAlmoco . ':00',
			'fim_almoco' => $fimAlmoco . ':00',
			'duracao_aula_minutos' => $duracaoAulaMinutos,
			'quantidade_aulas_dia' => $quantidadeAulasDia,
			'grade_json' => json_encode(array_values($slots), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
			'id' => (int) ($current['id'] ?? 0),
		]);

		return $this->getCurrent();
	}

	public function buildSlots(string $horaInicio, string $horaFim, string $inicioAlmoco, string $fimAlmoco, ?int $duracaoAulaMinutos = null, ?int $quantidadeAulasDia = null): array
	{
		$inicio = $this->timeToMinutes($horaInicio);
		$fim = $this->timeToMinutes($horaFim);
		$almocoInicio = $this->timeToMinutes($inicioAlmoco);
		$almocoFim = $this->timeToMinutes($fimAlmoco);
		$duracaoAulaMinutos = $this->normalizeDurationMinutes($duracaoAulaMinutos ?? self::DEFAULTS['duracao_aula_minutos']);
		$quantidadeAulasDia = $this->normalizeDailyClassCount($quantidadeAulasDia ?? self::DEFAULTS['quantidade_aulas_dia']);

		if ($inicio === null || $fim === null || $almocoInicio === null || $almocoFim === null) {
			return [];
		}

		if ($this->shouldUseDefaultSchoolTemplate($horaInicio, $horaFim, $inicioAlmoco, $fimAlmoco, $duracaoAulaMinutos)) {
			return $this->buildDefaultSchoolTemplate($duracaoAulaMinutos, $fim, $quantidadeAulasDia);
		}

		$slots = [];
		$current = $inicio;
		while ($current < $fim) {
			if (count($slots) >= $quantidadeAulasDia) {
				break;
			}

			$slotFim = $current + $duracaoAulaMinutos;

			if ($current < $almocoFim && $slotFim > $almocoInicio) {
				$current = $almocoFim;
				continue;
			}

			if ($slotFim > $fim) {
				break;
			}

			$dias = [];
			foreach (self::DAY_KEYS as $dayKey) {
				$dias[$dayKey] = true;
			}

			$slots[] = [
				'inicio' => $this->minutesToTime($current),
				'fim' => $this->minutesToTime($slotFim),
				'dias' => $dias,
			];

			$current = $slotFim;
		}

		return $slots;
	}

	public function normalizeSlots($rawSlots, array $defaultSlots): array
	{
		if (!is_array($rawSlots)) {
			return $defaultSlots;
		}

		$rawByKey = [];
		foreach ($rawSlots as $slot) {
			if (!is_array($slot)) {
				continue;
			}
			$inicio = $this->normalizeStoredTime((string) ($slot['inicio'] ?? ''));
			$fim = $this->normalizeStoredTime((string) ($slot['fim'] ?? ''));
			if ($inicio === '' || $fim === '') {
				continue;
			}
			$rawByKey[$inicio . '|' . $fim] = $slot;
		}

		$normalized = [];
		foreach ($defaultSlots as $slot) {
			$inicio = (string) ($slot['inicio'] ?? '');
			$fim = (string) ($slot['fim'] ?? '');
			$key = $inicio . '|' . $fim;
			$source = $rawByKey[$key] ?? [];
			$dias = [];
			foreach (self::DAY_KEYS as $dayKey) {
				$rawValue = is_array($source) && isset($source['dias']) && is_array($source['dias']) ? ($source['dias'][$dayKey] ?? true) : true;
				$dias[$dayKey] = filter_var($rawValue, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
				if ($dias[$dayKey] === null) {
					$dias[$dayKey] = true;
				}
			}

			$normalized[] = [
				'inicio' => $inicio,
				'fim' => $fim,
				'dias' => $dias,
			];
		}

		return $normalized;
	}

	private function createDefaultRow(): void
	{
		$slots = $this->buildSlots(self::DEFAULTS['hora_inicio'], self::DEFAULTS['hora_fim'], self::DEFAULTS['inicio_almoco'], self::DEFAULTS['fim_almoco'], self::DEFAULTS['duracao_aula_minutos'], self::DEFAULTS['quantidade_aulas_dia']);
		$pdo = Database::connection();
		$statement = $pdo->prepare(
			'INSERT INTO ' . self::TABLE_NAME . ' (hora_inicio, hora_fim, inicio_almoco, fim_almoco, duracao_aula_minutos, quantidade_aulas_dia, grade_json) VALUES (:hora_inicio, :hora_fim, :inicio_almoco, :fim_almoco, :duracao_aula_minutos, :quantidade_aulas_dia, :grade_json)'
		);
		$statement->execute([
			'hora_inicio' => self::DEFAULTS['hora_inicio'] . ':00',
			'hora_fim' => self::DEFAULTS['hora_fim'] . ':00',
			'inicio_almoco' => self::DEFAULTS['inicio_almoco'] . ':00',
			'fim_almoco' => self::DEFAULTS['fim_almoco'] . ':00',
			'duracao_aula_minutos' => self::DEFAULTS['duracao_aula_minutos'],
			'quantidade_aulas_dia' => self::DEFAULTS['quantidade_aulas_dia'],
			'grade_json' => json_encode($slots, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
		]);
	}

	private function normalizeDurationMinutes(int $value): int
	{
		if ($value < 10) {
			return self::DEFAULTS['duracao_aula_minutos'];
		}

		if ($value > 180) {
			return 180;
		}

		return $value;
	}

	private function normalizeDailyClassCount(int $value): int
	{
		if ($value < 1) {
			return self::DEFAULTS['quantidade_aulas_dia'];
		}

		if ($value > 20) {
			return 20;
		}

		return $value;
	}

	private function shouldUseDefaultSchoolTemplate(string $horaInicio, string $horaFim, string $inicioAlmoco, string $fimAlmoco, int $duracaoAulaMinutos): bool
	{
		return $horaInicio === self::DEFAULTS['hora_inicio']
			&& $horaFim === self::DEFAULTS['hora_fim']
			&& $inicioAlmoco === self::DEFAULTS['inicio_almoco']
			&& $fimAlmoco === self::DEFAULTS['fim_almoco']
			&& $duracaoAulaMinutos === self::DEFAULTS['duracao_aula_minutos'];
	}

	private function buildDefaultSchoolTemplate(int $duracaoAulaMinutos, int $fimExpediente, int $quantidadeAulasDia): array
	{
		$slots = [];
		foreach (self::DEFAULT_SLOT_START_TIMES as $startTime) {
			if (count($slots) >= $quantidadeAulasDia) {
				break;
			}

			$inicio = $this->timeToMinutes($startTime);
			if ($inicio === null) {
				continue;
			}

			$fim = $inicio + $duracaoAulaMinutos;
			if ($fim > $fimExpediente) {
				continue;
			}

			$dias = [];
			foreach (self::DAY_KEYS as $dayKey) {
				$dias[$dayKey] = true;
			}

			$slots[] = [
				'inicio' => $startTime,
				'fim' => $this->minutesToTime($fim),
				'dias' => $dias,
			];
		}

		return $slots;
	}

	private function getTableColumns(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
		$statement->execute(['table' => self::TABLE_NAME]);
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

	private function normalizeStoredTime(string $value): string
	{
		$value = trim($value);
		if ($value === '') {
			return '';
		}

		if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $value) === 1) {
			return substr($value, 0, 5);
		}

		if (preg_match('/^\d{2}:\d{2}$/', $value) === 1) {
			return $value;
		}

		return '';
	}

	private function timeToMinutes(string $value): ?int
	{
		$normalized = $this->normalizeStoredTime($value);
		if ($normalized === '') {
			return null;
		}

		[$hours, $minutes] = array_map('intval', explode(':', $normalized));
		return ($hours * 60) + $minutes;
	}

	private function minutesToTime(int $minutes): string
	{
		$hours = (int) floor($minutes / 60);
		$mins = $minutes % 60;
		return str_pad((string) $hours, 2, '0', STR_PAD_LEFT) . ':' . str_pad((string) $mins, 2, '0', STR_PAD_LEFT);
	}
}