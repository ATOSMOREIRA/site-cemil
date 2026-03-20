SET @has_usuarios_column = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'cargaHoraria'
);

SET @add_usuarios_column_sql = IF(
    @has_usuarios_column = 0,
    'ALTER TABLE usuarios ADD COLUMN cargaHoraria INT NOT NULL DEFAULT 40 AFTER funcao',
    'SELECT 1'
);

PREPARE add_usuarios_column_stmt FROM @add_usuarios_column_sql;
EXECUTE add_usuarios_column_stmt;
DEALLOCATE PREPARE add_usuarios_column_stmt;

SET @has_funcoes_column = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'funcoes'
      AND COLUMN_NAME = 'cargaHoraria'
);

SET @copy_funcoes_to_usuarios_sql = IF(
    @has_funcoes_column > 0,
    'UPDATE usuarios u INNER JOIN funcoes f ON f.id = u.funcao SET u.cargaHoraria = COALESCE(NULLIF(f.cargaHoraria, 0), u.cargaHoraria)',
    'SELECT 1'
);

PREPARE copy_funcoes_to_usuarios_stmt FROM @copy_funcoes_to_usuarios_sql;
EXECUTE copy_funcoes_to_usuarios_stmt;
DEALLOCATE PREPARE copy_funcoes_to_usuarios_stmt;