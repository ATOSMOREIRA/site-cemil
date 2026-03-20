<?php

declare(strict_types=1);

class HabilidadeModel
{
	public function getAllOrdered(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->query('SELECT id, codigo, descricao, tipo, documento, disciplina_id, ano_escolar, etapa_ensino, unidade_tematica, objeto_conhecimento, habilidade_complementar, ativo, created_at, updated_at FROM habilidades ORDER BY documento ASC, codigo ASC, id ASC');

		return $statement?->fetchAll() ?: [];
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}

		$pdo = Database::connection();
		$statement = $pdo->prepare('SELECT id, codigo, descricao, tipo, documento, disciplina_id, ano_escolar, etapa_ensino, unidade_tematica, objeto_conhecimento, habilidade_complementar, ativo, created_at, updated_at FROM habilidades WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
		$row = $statement->fetch();

		return is_array($row) ? $row : null;
	}

	public function save(array $payload): int
	{
		$pdo = Database::connection();

		$id = (int) ($payload['id'] ?? 0);
		$data = [
			'codigo' => (string) ($payload['codigo'] ?? ''),
			'descricao' => (string) ($payload['descricao'] ?? ''),
			'tipo' => (string) ($payload['tipo'] ?? 'Habilidade'),
			'documento' => (string) ($payload['documento'] ?? 'BNCC'),
			'disciplina_id' => (int) ($payload['disciplina_id'] ?? 0),
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

		$pdo = Database::connection();
		$statement = $pdo->prepare('DELETE FROM habilidades WHERE id = :id LIMIT 1');
		$statement->execute(['id' => $id]);
	}

	public function upsertMany(array $rows): int
	{
		if ($rows === []) {
			return 0;
		}

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
					'disciplina_id' => (int) ($payload['disciplina_id'] ?? 0),
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

	private function nullIfEmpty($value): ?string
	{
		$text = trim((string) ($value ?? ''));
		return $text === '' ? null : $text;
	}
}
