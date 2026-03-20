DROP PROCEDURE IF EXISTS migrate_remove_professores_table;

DELIMITER $$

CREATE PROCEDURE migrate_remove_professores_table()
BEGIN
	DECLARE fk_points_to_professores INT DEFAULT 0;
	DECLARE fk_points_to_usuarios INT DEFAULT 0;
	DECLARE professores_table_exists INT DEFAULT 0;

	SELECT COUNT(*)
	INTO fk_points_to_professores
	FROM information_schema.KEY_COLUMN_USAGE
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'professor_modulacoes'
		AND CONSTRAINT_NAME = 'fk_professor_modulacoes_professor'
		AND REFERENCED_TABLE_NAME = 'professores';

	SELECT COUNT(*)
	INTO fk_points_to_usuarios
	FROM information_schema.KEY_COLUMN_USAGE
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'professor_modulacoes'
		AND CONSTRAINT_NAME = 'fk_professor_modulacoes_professor'
		AND REFERENCED_TABLE_NAME = 'usuarios';

	IF fk_points_to_professores > 0 THEN
		ALTER TABLE professor_modulacoes DROP FOREIGN KEY fk_professor_modulacoes_professor;
	END IF;

	IF fk_points_to_professores > 0 AND fk_points_to_usuarios = 0 THEN
		ALTER TABLE professor_modulacoes
			ADD CONSTRAINT fk_professor_modulacoes_professor
			FOREIGN KEY (professor_id) REFERENCES usuarios(id)
			ON DELETE RESTRICT
			ON UPDATE CASCADE;
	END IF;

	SELECT COUNT(*)
	INTO professores_table_exists
	FROM information_schema.TABLES
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'professores';

	IF professores_table_exists > 0 THEN
		DROP TABLE professores;
	END IF;
END $$

DELIMITER ;

CALL migrate_remove_professores_table();
DROP PROCEDURE IF EXISTS migrate_remove_professores_table;