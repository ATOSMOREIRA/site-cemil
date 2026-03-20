<?php
declare(strict_types=1);

class InformacaoModel
{
    public function ensureTableStructure(): void
    {
        $pdo = Database::connection();

        $columns = $this->getTableColumns();

        if ($columns === []) {
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS informacoes (
                    id INT NOT NULL AUTO_INCREMENT,
                    titulo VARCHAR(255) NOT NULL,
                    conteudo_html MEDIUMTEXT NULL,
                    imagem_path VARCHAR(255) NULL,
                    video_path VARCHAR(255) NULL,
                    autor_id INT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
            );

            return;
        }

        $required = [
            'titulo' => 'ADD COLUMN titulo VARCHAR(255) NOT NULL DEFAULT ""',
            'conteudo_html' => 'ADD COLUMN conteudo_html MEDIUMTEXT NULL',
            'imagem_path' => 'ADD COLUMN imagem_path VARCHAR(255) NULL',
            'video_path' => 'ADD COLUMN video_path VARCHAR(255) NULL',
            'autor_id' => 'ADD COLUMN autor_id INT NULL',
            'created_at' => 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ];

        foreach ($required as $column => $sql) {
            if (!isset($columns[$column])) {
                $pdo->exec('ALTER TABLE informacoes ' . $sql);
            }
        }
    }

    public function getAllOrderedByInsertionDate(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query('SELECT id, titulo, conteudo_html, imagem_path, video_path, autor_id, created_at, updated_at FROM informacoes ORDER BY created_at DESC, id DESC');

        return $statement?->fetchAll() ?: [];
    }

    public function getPaginatedByPeriod(int $page, int $perPage, ?int $month = null, ?int $year = null): array
    {
        $this->ensureTableStructure();

        $safePage = max(1, $page);
        $safePerPage = max(1, $perPage);
        $offset = ($safePage - 1) * $safePerPage;

        $whereParts = [];
        $params = [];

        if ($month !== null && $month >= 1 && $month <= 12) {
            $whereParts[] = 'MONTH(created_at) = :month';
            $params['month'] = $month;
        }

        if ($year !== null && $year >= 2000 && $year <= 2100) {
            $whereParts[] = 'YEAR(created_at) = :year';
            $params['year'] = $year;
        }

        $whereSql = $whereParts === [] ? '' : (' WHERE ' . implode(' AND ', $whereParts));
        $sql = 'SELECT id, titulo, conteudo_html, imagem_path, video_path, autor_id, created_at, updated_at FROM informacoes' . $whereSql . ' ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset';

        $pdo = Database::connection();
        $statement = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $statement->bindValue(':' . $key, $value, PDO::PARAM_INT);
        }

        $statement->bindValue(':limit', $safePerPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll() ?: [];
    }

    public function countByPeriod(?int $month = null, ?int $year = null): int
    {
        $this->ensureTableStructure();

        $whereParts = [];
        $params = [];

        if ($month !== null && $month >= 1 && $month <= 12) {
            $whereParts[] = 'MONTH(created_at) = :month';
            $params['month'] = $month;
        }

        if ($year !== null && $year >= 2000 && $year <= 2100) {
            $whereParts[] = 'YEAR(created_at) = :year';
            $params['year'] = $year;
        }

        $whereSql = $whereParts === [] ? '' : (' WHERE ' . implode(' AND ', $whereParts));
        $sql = 'SELECT COUNT(*) FROM informacoes' . $whereSql;

        $pdo = Database::connection();
        $statement = $pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $statement->bindValue(':' . $key, $value, PDO::PARAM_INT);
        }

        $statement->execute();

        return (int) ($statement->fetchColumn() ?: 0);
    }

    public function getAvailableYears(): array
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->query('SELECT DISTINCT YEAR(created_at) AS ano FROM informacoes WHERE created_at IS NOT NULL ORDER BY ano DESC');
        $rows = $statement?->fetchAll() ?: [];

        $result = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $year = (int) ($row['ano'] ?? 0);
            if ($year > 0) {
                $result[] = $year;
            }
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
        $statement = $pdo->prepare('SELECT id, titulo, conteudo_html, imagem_path, video_path, autor_id, created_at, updated_at FROM informacoes WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function create(string $titulo, string $conteudoHtml, ?string $imagemPath, ?string $videoPath, ?int $autorId = null): int
    {
        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('INSERT INTO informacoes (titulo, conteudo_html, imagem_path, video_path, autor_id) VALUES (:titulo, :conteudo_html, :imagem_path, :video_path, :autor_id)');
        $statement->execute([
            'titulo' => $titulo,
            'conteudo_html' => $conteudoHtml,
            'imagem_path' => $imagemPath,
            'video_path' => $videoPath,
            'autor_id' => $autorId,
        ]);

        return (int) $pdo->lastInsertId();
    }

    public function update(int $id, string $titulo, string $conteudoHtml, ?string $imagemPath, ?string $videoPath): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para atualização.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE informacoes SET titulo = :titulo, conteudo_html = :conteudo_html, imagem_path = :imagem_path, video_path = :video_path WHERE id = :id');
        $statement->execute([
            'titulo' => $titulo,
            'conteudo_html' => $conteudoHtml,
            'imagem_path' => $imagemPath,
            'video_path' => $videoPath,
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
        $statement = $pdo->prepare('DELETE FROM informacoes WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
    }

    public function updateMediaPaths(int $id, ?string $imagemPath, ?string $videoPath): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('ID inválido para atualização de mídia.');
        }

        $this->ensureTableStructure();

        $pdo = Database::connection();
        $statement = $pdo->prepare('UPDATE informacoes SET imagem_path = :imagem_path, video_path = :video_path WHERE id = :id');
        $statement->execute([
            'imagem_path' => $imagemPath,
            'video_path' => $videoPath,
            'id' => $id,
        ]);
    }

    private function getTableColumns(): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
        $statement->execute(['table' => 'informacoes']);
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
}
