<?php
declare(strict_types=1);

class UsuarioProfessorModel
{
	public function getAllOrdered(): array
	{
		$pdo = Database::connection();
		$statement = $pdo->query(
			'SELECT u.id, u.nome, u.usuario, u.email, u.tipo, u.departamento, u.funcao, f.nome AS funcao_nome
			 FROM usuarios u
			 INNER JOIN funcoes f ON f.id = u.funcao
			 WHERE LOWER(TRIM(f.nome)) = "professor"
			 ORDER BY u.nome ASC, u.id ASC'
		);

		return $statement?->fetchAll() ?: [];
	}

	public function findById(int $id): ?array
	{
		if ($id <= 0) {
			return null;
		}

		$pdo = Database::connection();
		$statement = $pdo->prepare(
			'SELECT u.id, u.nome, u.usuario, u.email, u.tipo, u.departamento, u.funcao, f.nome AS funcao_nome
			 FROM usuarios u
			 INNER JOIN funcoes f ON f.id = u.funcao
			 WHERE u.id = :id AND LOWER(TRIM(f.nome)) = "professor"
			 LIMIT 1'
		);
		$statement->execute(['id' => $id]);
		$row = $statement->fetch();

		return is_array($row) ? $row : null;
	}
}