<?php
declare(strict_types=1);

class InstagramLinkModel
{
    public function getLinks(int $limit = 3): array
    {
        $pdo = Database::connection();
        $statement = $pdo->prepare('SELECT url FROM instagram_links WHERE active = 1 ORDER BY position ASC LIMIT :limit');
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        $rows = $statement->fetchAll();
        $links = [];

        foreach ($rows as $row) {
            if (!empty($row['url'])) {
                $links[] = (string) $row['url'];
            }
        }

        return $links;
    }

    public function saveLinks(array $links): void
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $deactivateStatement = $pdo->prepare('UPDATE instagram_links SET active = 0, updated_at = NOW() WHERE position IN (1, 2, 3)');
            $deactivateStatement->execute();

            $statement = $pdo->prepare(
                'INSERT INTO instagram_links (position, url, active, updated_at)
                 VALUES (:position, :url, 1, NOW())
                 ON DUPLICATE KEY UPDATE url = VALUES(url), active = 1, updated_at = NOW()'
            );

            foreach ($links as $index => $url) {
                $normalizedUrl = trim((string) $url);

                if ($normalizedUrl === '') {
                    continue;
                }

                $statement->execute([
                    'position' => $index + 1,
                    'url' => $normalizedUrl,
                ]);
            }

            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $exception;
        }
    }
}
