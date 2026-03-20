<?php
declare(strict_types=1);

class UsuarioCargaHorariaModel
{
	public function getAllOrdered(): array
	{
		$pdo = Database::connection();
		$hasCargaHorariaColumn = $this->hasCargaHorariaColumn();
		$sql = $hasCargaHorariaColumn
			? 'SELECT u.id, u.nome, u.usuario, u.email, u.tipo, u.departamento, u.funcao, COALESCE(u.cargaHoraria, 40) AS carga_horaria, COALESCE(f.nome, "") AS funcao_nome FROM usuarios u LEFT JOIN funcoes f ON f.id = u.funcao ORDER BY u.nome ASC, u.id ASC'
			: 'SELECT u.id, u.nome, u.usuario, u.email, u.tipo, u.departamento, u.funcao, 40 AS carga_horaria, COALESCE(f.nome, "") AS funcao_nome FROM usuarios u LEFT JOIN funcoes f ON f.id = u.funcao ORDER BY u.nome ASC, u.id ASC';

		$statement = $pdo->query($sql);
		$rows = $statement?->fetchAll() ?: [];

		return array_values(array_filter(array_map(function ($row) {
			if (!is_array($row)) {
				return null;
			}

			$id = (int) ($row['id'] ?? 0);
			if ($id <= 0) {
				return null;
			}

			$cargaHoraria = max(0, (int) ($row['carga_horaria'] ?? 40));
			$beneficioMinutos = max(0, (int) round(($cargaHoraria / 5) * 60));
			return [
				'id' => $id,
				'nome' => (string) ($row['nome'] ?? ''),
				'usuario' => (string) ($row['usuario'] ?? ''),
				'email' => (string) ($row['email'] ?? ''),
				'tipo' => (string) ($row['tipo'] ?? ''),
				'departamento' => (int) ($row['departamento'] ?? 0),
				'funcao' => (int) ($row['funcao'] ?? 0),
				'funcao_nome' => (string) ($row['funcao_nome'] ?? ''),
				'cargaHoraria' => $cargaHoraria,
				'beneficio_minutos' => $beneficioMinutos,
			];
		}, $rows)));
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}

		$pdo = Database::connection();
		$hasCargaHorariaColumn = $this->hasCargaHorariaColumn();
		$sql = $hasCargaHorariaColumn
			? 'SELECT u.id, u.nome, u.usuario, u.email, u.tipo, u.departamento, u.funcao, COALESCE(u.cargaHoraria, 40) AS carga_horaria, COALESCE(f.nome, "") AS funcao_nome FROM usuarios u LEFT JOIN funcoes f ON f.id = u.funcao WHERE u.id = :id LIMIT 1'
			: 'SELECT u.id, u.nome, u.usuario, u.email, u.tipo, u.departamento, u.funcao, 40 AS carga_horaria, COALESCE(f.nome, "") AS funcao_nome FROM usuarios u LEFT JOIN funcoes f ON f.id = u.funcao WHERE u.id = :id LIMIT 1';

		$statement = $pdo->prepare($sql);
		$statement->execute(['id' => $id]);
		$row = $statement->fetch();

		if (!is_array($row)) {
			return null;
		}

		$cargaHoraria = max(0, (int) ($row['carga_horaria'] ?? 40));
		$beneficioMinutos = max(0, (int) round(($cargaHoraria / 5) * 60));
		return [
			'id' => (int) ($row['id'] ?? 0),
			'nome' => (string) ($row['nome'] ?? ''),
			'usuario' => (string) ($row['usuario'] ?? ''),
			'email' => (string) ($row['email'] ?? ''),
			'tipo' => (string) ($row['tipo'] ?? ''),
			'departamento' => (int) ($row['departamento'] ?? 0),
			'funcao' => (int) ($row['funcao'] ?? 0),
			'funcao_nome' => (string) ($row['funcao_nome'] ?? ''),
			'cargaHoraria' => $cargaHoraria,
			'beneficio_minutos' => $beneficioMinutos,
		];
	}

	private function hasCargaHorariaColumn(): bool
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