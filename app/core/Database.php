<?php
declare(strict_types=1);

class Database
{
    private static ?PDO $connection = null;

    private static function mysqlSessionTimeZone(): string
    {
        return (new DateTimeImmutable('now'))->format('P');
    }

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);

        self::$connection = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        self::$connection->exec(
            'SET time_zone = ' . self::$connection->quote(self::mysqlSessionTimeZone())
        );

        return self::$connection;
    }
}
