<?php
declare(strict_types=1);

trait InstitutionalAccessTrait
{
    protected function canAccessInstitutionalArea(): bool
    {
        if (!isset($_SESSION['auth']) || !is_array($_SESSION['auth'])) {
            return false;
        }

        $authType = (string) ($_SESSION['auth']['tipo'] ?? '');
        $rawServices = (string) ($_SESSION['auth']['servicos'] ?? '');

        return $this->canAccessInstitutionalAreaByRules($authType, $rawServices);
    }

    protected function canAccessSubservice(string $subservice): bool
    {
        if (!isset($_SESSION['auth']) || !is_array($_SESSION['auth'])) {
            return false;
        }

        $authType = (string) ($_SESSION['auth']['tipo'] ?? '');
        $rawServices = (string) ($_SESSION['auth']['servicos'] ?? '');

        return $this->canAccessSubserviceByRules($authType, $rawServices, $subservice);
    }

    private function canAccessInstitutionalAreaByRules(string $authType, string $rawServices): bool
    {
        $authType = $this->normalizePermissionToken($authType);

        if ($authType === 'tester') {
            return true;
        }

        if (in_array($authType, ['admin', 'servidor'], true)) {
            return true;
        }

        $knownSubservices = $this->getAllKnownSubserviceKeys();

        foreach ($knownSubservices as $subservice) {
            if ($this->canAccessSubserviceByRules($authType, $rawServices, $subservice)) {
                return true;
            }
        }

        return false;
    }

    protected function getInstitutionalServicesForUser(): array
    {
        if (!isset($_SESSION['auth']) || !is_array($_SESSION['auth'])) {
            return [];
        }

        $authType = (string) ($_SESSION['auth']['tipo'] ?? '');
        $rawServices = (string) ($_SESSION['auth']['servicos'] ?? '');
        $catalog = $this->buildInstitutionalCatalog();

        $authType = $this->normalizePermissionToken($authType);

        if ($authType === 'admin') {
            return $catalog;
        }

        if ($authType === 'tester') {
            return $catalog !== [] ? $catalog : $this->buildTesterInstitutionalCatalog();
        }

        $filtered = [];

        foreach ($catalog as $service) {
            $serviceItem = $service;
            $serviceItem['subservices'] = [];

            foreach ($service['subservices'] as $subservice) {
                if ($this->canAccessSubserviceByRules($authType, $rawServices, (string) $subservice['key'])) {
                    $serviceItem['subservices'][] = $subservice;
                }
            }

            if ($serviceItem['subservices'] !== []) {
                $filtered[] = $serviceItem;
            }
        }

        return $filtered;
    }

    private function getAllKnownSubserviceKeys(): array
    {
        $catalog = $this->buildInstitutionalCatalog();
        $keys = [];

        foreach ($catalog as $service) {
            foreach ($service['subservices'] as $subservice) {
                $keys[] = (string) ($subservice['key'] ?? '');
            }
        }

        return array_values(array_unique(array_filter($keys, static fn(string $value): bool => $value !== '')));
    }

    private function buildInstitutionalCatalog(): array
    {
        $services = [];
        $parentColumn = $this->getServicosParentColumn();
        $hasTipoColumn = $this->hasServicosColumn('tipo');

        try {
            $pdo = Database::connection();
            $statement = $pdo->query('SELECT * FROM servicos');
            $rows = $statement !== false ? $statement->fetchAll() : [];
        } catch (Throwable) {
            $rows = [];
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (int) ($row['id'] ?? 0);
            if ($id <= 0) {
                continue;
            }

            $tipo = $this->normalizePermissionToken((string) ($row['tipo'] ?? 'servico'));
            $nome = trim((string) ($row['nome'] ?? $row['name'] ?? $row['titulo'] ?? ('Serviço ' . $id)));
            $serviceKey = $this->normalizePermissionToken((string) ($row['slug'] ?? $row['codigo'] ?? $row['nome'] ?? $id));
            $parentId = $this->getParentServiceIdFromServicosRow($row, $parentColumn);
            $isSubservice = str_starts_with($tipo, 'subserv') || $parentId > 0;

            if ($isSubservice) {
                if ($parentId <= 0) {
                    continue;
                }

                if (!isset($services[$parentId])) {
                    $services[$parentId] = [
                        'id' => $parentId,
                        'name' => 'Serviço ' . $parentId,
                        'key' => (string) $parentId,
                        'subservices' => [],
                    ];
                }

                $subKey = $this->normalizePermissionToken((string) ($row['tabela'] ?? $row['slug'] ?? $row['codigo'] ?? $row['nome'] ?? ''));
                if ($subKey === '') {
                    continue;
                }

                $subRoute = $this->resolveSubserviceRouteFromRow($row);
                if ($subRoute === null) {
                    $subRoute = $this->buildGenericSubserviceRoute($subKey);
                }

                $services[$parentId]['subservices'][] = [
                    'id' => $id,
                    'name' => $nome,
                    'key' => $subKey,
                    'route' => $subRoute,
                ];

                continue;
            }

            if (!isset($services[$id])) {
                $services[$id] = [
                    'id' => $id,
                    'name' => $nome,
                    'key' => $serviceKey !== '' ? $serviceKey : (string) $id,
                    'subservices' => [],
                ];
            } else {
                $services[$id]['name'] = $nome;
                $services[$id]['key'] = $serviceKey !== '' ? $serviceKey : (string) $id;
            }
        }

        $hasMappedSubservices = false;
        foreach ($services as $service) {
            if (($service['subservices'] ?? []) !== []) {
                $hasMappedSubservices = true;
                break;
            }
        }

        if (!$hasMappedSubservices) {
            $this->appendFallbackSubservicesFromDatabaseTables($services);
        }

        if ($services === []) {
            return [];
        }

        foreach ($services as &$service) {
            $unique = [];
            foreach ($service['subservices'] as $subservice) {
                $subKey = (string) ($subservice['key'] ?? '');
                if ($subKey === '' || isset($unique[$subKey])) {
                    continue;
                }
                $unique[$subKey] = $subservice;
            }
            $service['subservices'] = array_values($unique);
        }
        unset($service);

        uasort($services, static fn(array $left, array $right): int => strcmp((string) $left['name'], (string) $right['name']));

        $result = array_values($services);

        if ($result !== []) {
            return $result;
        }

        return [];
    }

    private function appendFallbackSubservicesFromDatabaseTables(array &$services): void
    {
        try {
            $pdo = Database::connection();
            $statement = $pdo->query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'servico'");
            $tables = $statement !== false ? $statement->fetchAll(PDO::FETCH_COLUMN) : [];
        } catch (Throwable) {
            $tables = [];
        }

        if (!is_array($tables) || $tables === []) {
            $tables = $this->discoverServiceTablesWithShowCommands();
        }

        if (!is_array($tables) || $tables === []) {
            return;
        }

        foreach ($tables as $rawTableName) {
            $tableName = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $rawTableName) ?: '';
            if ($tableName === '' || in_array($tableName, ['servicos', 'usuarios'], true)) {
                continue;
            }

            $parentId = $this->resolveParentServiceIdFromTable($tableName);
            if ($parentId <= 0) {
                continue;
            }

            if (!isset($services[$parentId])) {
                $services[$parentId] = [
                    'id' => $parentId,
                    'name' => 'Serviço ' . $parentId,
                    'key' => (string) $parentId,
                    'subservices' => [],
                ];
            }

            $subKey = $this->normalizePermissionToken($tableName);
            $displayName = $this->resolveSubserviceNameFromTable($tableName);

            $services[$parentId]['subservices'][] = [
                'id' => 0,
                'name' => $displayName,
                'key' => $subKey,
                'route' => $this->buildGenericSubserviceRoute($subKey),
            ];
        }
    }

    private function buildGenericSubserviceRoute(string $subserviceKey): string
    {
        $normalizedKey = $this->normalizePermissionToken($subserviceKey);

        $knownRoute = match ($normalizedKey) {
            'avaliacoes', 'cadastro_de_avaliacoes', 'gerenciar_avaliacoes' => '/institucional/avaliacoes',
            'notas_e_desempenho', 'notas_desempenho' => '/institucional/notas-desempenho',
            'ranking_pedagogico' => '/institucional/ranking-pedagogico',
            'cadastro_de_turmas' => '/institucional/turmas',
            'cadastro_de_estudantes' => '/institucional/estudantes',
            'modulacao' => '/institucional/modulacao',
            'modulacao_e_horarios' => '/institucional/modulacao',
            'agendamento' => '/institucional/agendamento',
            'meus_agendamentos' => '/institucional/meus-agendamentos',
            'corretor_de_gabaritos' => '/institucional/corretor-gabaritos',
            'controle_refeitorio', 'refeitorio' => '/institucional/refeitorio',
            'entrada_saida', 'controle_entrada_e_saida', 'controle_de_entrada_e_saida', 'controle_entrada_saida'
                => '/institucional/subservico?key=' . urlencode($normalizedKey),
            default => null,
        };

        if ($knownRoute !== null) {
            return $knownRoute;
        }

        return '/institucional/subservico?key=' . urlencode($normalizedKey !== '' ? $normalizedKey : $subserviceKey);
    }

    protected function resolveParentServiceIdFromTable(string $tableName): int
    {
        try {
            $pdo = Database::connection();
            $query = sprintf('SELECT servico FROM %s WHERE servico IS NOT NULL LIMIT 1', $tableName);
            $serviceId = $pdo->query($query)?->fetchColumn();
        } catch (Throwable) {
            $serviceId = false;
        }

        $parentId = (int) $serviceId;
        if ($parentId > 0) {
            return $parentId;
        }

        try {
            $pdo = Database::connection();
            $query = sprintf("SHOW COLUMNS FROM %s LIKE 'servico'", $tableName);
            $column = $pdo->query($query)?->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable) {
            $column = false;
        }

        if (!is_array($column)) {
            return 0;
        }

        $default = trim((string) ($column['Default'] ?? ''));
        if ($default === '') {
            return 0;
        }

        return (int) trim($default, "'\"");
    }

    protected function resolveSubserviceNameFromTable(string $tableName): string
    {
        $fallbackName = $this->humanizeSubserviceName($tableName);

        try {
            $pdo = Database::connection();
            $columnQuery = sprintf("SHOW COLUMNS FROM %s LIKE 'nome'", $tableName);
            $hasNomeColumn = $pdo->query($columnQuery)?->fetchColumn();
        } catch (Throwable) {
            $hasNomeColumn = false;
        }

        if ($hasNomeColumn === false) {
            return $fallbackName;
        }

        try {
            $pdo = Database::connection();
            $nameQuery = sprintf("SELECT nome FROM %s WHERE nome IS NOT NULL AND TRIM(nome) <> '' LIMIT 1", $tableName);
            $nameValue = $pdo->query($nameQuery)?->fetchColumn();
        } catch (Throwable) {
            $nameValue = false;
        }

        $name = trim((string) $nameValue);
        if ($name !== '') {
            return $name;
        }

        try {
            $pdo = Database::connection();
            $query = sprintf("SHOW COLUMNS FROM %s LIKE 'nome'", $tableName);
            $column = $pdo->query($query)?->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable) {
            $column = false;
        }

        if (is_array($column)) {
            $default = trim((string) ($column['Default'] ?? ''));
            $default = trim($default, "'\"");
            if ($default !== '') {
                return $default;
            }
        }

        return $fallbackName;
    }

    protected function discoverServiceTablesWithShowCommands(): array
    {
        try {
            $pdo = Database::connection();
            $allTables = $pdo->query('SHOW TABLES')?->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable) {
            $allTables = [];
        }

        if (!is_array($allTables) || $allTables === []) {
            return [];
        }

        $tablesWithServico = [];

        foreach ($allTables as $rawTableName) {
            $tableName = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $rawTableName) ?: '';
            if ($tableName === '' || in_array($tableName, ['servicos', 'usuarios'], true)) {
                continue;
            }

            try {
                $pdo = Database::connection();
                $query = sprintf("SHOW COLUMNS FROM %s LIKE 'servico'", $tableName);
                $hasColumn = $pdo->query($query)?->fetchColumn();
            } catch (Throwable) {
                $hasColumn = false;
            }

            if ($hasColumn !== false) {
                $tablesWithServico[] = $tableName;
            }
        }

        return $tablesWithServico;
    }

    protected function humanizeSubserviceName(string $tableName): string
    {
        $label = str_replace('_', ' ', $tableName);
        $label = trim($label);

        return mb_convert_case($label, MB_CASE_TITLE, 'UTF-8');
    }

    private function resolveSubserviceRouteFromRow(array $row): ?string
    {
        $route = trim((string) ($row['rota'] ?? $row['route'] ?? $row['url'] ?? $row['link'] ?? ''));
        if ($route === '') {
            return null;
        }

        if (!str_starts_with($route, '/')) {
            $route = '/' . ltrim($route, '/');
        }

        return $route;
    }

    protected function findSubserviceNameByKey(string $subserviceKey): ?string
    {
        $targets = $this->getEquivalentSubserviceKeys($subserviceKey);
        if ($targets === []) {
            return null;
        }

        try {
            $pdo = Database::connection();
            $statement = $pdo->query('SELECT * FROM servicos');
            $rows = $statement !== false ? $statement->fetchAll() : [];
        } catch (Throwable) {
            $rows = [];
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $tipo = $this->normalizePermissionToken((string) ($row['tipo'] ?? ''));
            if (!str_starts_with($tipo, 'subserv')) {
                continue;
            }

            $candidates = [
                $this->normalizePermissionToken((string) ($row['tabela'] ?? '')),
                $this->normalizePermissionToken((string) ($row['slug'] ?? '')),
                $this->normalizePermissionToken((string) ($row['codigo'] ?? '')),
                $this->normalizePermissionToken((string) ($row['nome'] ?? '')),
            ];

            if (array_intersect($targets, $candidates) !== []) {
                $name = trim((string) ($row['nome'] ?? ''));
                if ($name !== '') {
                    return $name;
                }
            }
        }

        foreach ($targets as $target) {
            $tableName = preg_replace('/[^a-zA-Z0-9_]/', '', $target) ?: '';
            if ($tableName === '') {
                continue;
            }

            $resolvedName = $this->resolveSubserviceNameFromTable($tableName);
            if ($resolvedName !== '') {
                return $resolvedName;
            }
        }

        return null;
    }

    protected function resolveSubserviceHtmlPath(string $subserviceKey, string $subserviceName): ?string
    {
        $baseDir = __DIR__ . '/../views/home/Institucional';
        if (!is_dir($baseDir)) {
            return null;
        }

        $candidates = [];
        $name = trim($subserviceName);

        if ($name !== '') {
            $candidates[] = $name . '.html';
        }

        $humanizedKey = $this->humanizeSubserviceName($subserviceKey);
        if ($humanizedKey !== '') {
            $candidates[] = $humanizedKey . '.html';
        }

        $rawKeyLabel = trim(str_replace('_', ' ', $subserviceKey));
        if ($rawKeyLabel !== '') {
            $candidates[] = $rawKeyLabel . '.html';
        }

        foreach (array_values(array_unique($candidates)) as $candidateFile) {
            $candidatePath = $baseDir . '/' . $candidateFile;
            if (is_file($candidatePath)) {
                return $candidatePath;
            }
        }

        $normalizedTargets = $this->getEquivalentSubserviceKeys($subserviceKey);

        foreach ([$subserviceName, $humanizedKey] as $targetLabel) {
            $normalizedTarget = $this->normalizePermissionToken((string) $targetLabel);
            if ($normalizedTarget !== '' && !in_array($normalizedTarget, $normalizedTargets, true)) {
                $normalizedTargets[] = $normalizedTarget;
            }
        }

        if ($normalizedTargets === []) {
            return null;
        }

        $files = glob($baseDir . '/*.html') ?: [];

        foreach ($files as $filePath) {
            if (!is_file($filePath)) {
                continue;
            }

            $fileName = pathinfo($filePath, PATHINFO_FILENAME);
            $normalizedFileName = $this->normalizePermissionToken((string) $fileName);

            if (in_array($normalizedFileName, $normalizedTargets, true)) {
                return $filePath;
            }
        }

        return null;
    }

    private function canAccessSubserviceByRules(string $authType, string $rawServices, string $subservice): bool
    {
        $authType = $this->normalizePermissionToken($authType);

        if ($authType === 'tester') {
            return true;
        }

        if ($authType === 'admin') {
            return true;
        }

        $parsedServices = $this->parseUserServices($rawServices);
        if ($parsedServices === []) {
            return false;
        }

        $normalizedSubservices = $this->getEquivalentSubserviceKeys($subservice);
        if ($normalizedSubservices === []) {
            return false;
        }

        foreach ($parsedServices as $subservices) {
            if ($subservices !== [] && array_intersect($normalizedSubservices, $subservices) !== []) {
                return true;
            }
        }

        $serviceId = $this->getServiceIdBySubserviceTable($subservice);
        if ($serviceId === null) {
            return false;
        }

        $serviceAliases = $this->getServiceAliases($serviceId);

        foreach ($parsedServices as $serviceKey => $subservices) {
            if ($subservices !== []) {
                continue;
            }

            if (in_array($serviceKey, $serviceAliases, true)) {
                return true;
            }
        }

        return false;
    }

    private function parseUserServices(string $rawServices): array
    {
        $raw = trim($rawServices);
        if ($raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $this->parseUserServicesFromArray($decoded);
        }

        $services = [];
        if (preg_match_all('/([^;\[\]]+)\[([^\]]*)\]/u', $raw, $matches, PREG_SET_ORDER) !== false) {
            foreach ($matches as $match) {
                $serviceKey = $this->normalizePermissionToken((string) ($match[1] ?? ''));
                if ($serviceKey === '') {
                    continue;
                }

                $subservicesRaw = trim((string) ($match[2] ?? ''));
                $subservices = [];

                if ($subservicesRaw !== '') {
                    $parts = preg_split('/\s*,\s*/', $subservicesRaw) ?: [];
                    foreach ($parts as $part) {
                        $token = $this->normalizePermissionToken((string) $part);
                        if ($token !== '') {
                            $subservices[] = $token;
                        }
                    }
                }

                $services[$serviceKey] = array_values(array_unique($subservices));
            }
        }

        return $services;
    }

    private function buildTesterInstitutionalCatalog(): array
    {
        return [
            [
                'id' => 1,
                'name' => 'Gestão Acadêmica',
                'key' => 'gestao_academica',
                'subservices' => [
                    $this->buildTesterCatalogSubservice('cadastro_de_estudantes', 'Cadastro de Estudantes'),
                    $this->buildTesterCatalogSubservice('cadastro_de_turmas', 'Cadastro de Turmas'),
                    $this->buildTesterCatalogSubservice('cadastro_de_habilidades', 'Cadastro de Habilidades'),
                    $this->buildTesterCatalogSubservice('avaliacoes', 'Avaliações'),
                    $this->buildTesterCatalogSubservice('notas_desempenho', 'Notas e Desempenho'),
                ],
            ],
            [
                'id' => 2,
                'name' => 'Operações',
                'key' => 'operacoes',
                'subservices' => [
                    $this->buildTesterCatalogSubservice('agendamento', 'Agendamento'),
                    $this->buildTesterCatalogSubservice('meus_agendamentos', 'Meus Agendamentos'),
                    $this->buildTesterCatalogSubservice('controle_refeitorio', 'Controle de Refeitório'),
                    $this->buildTesterCatalogSubservice('entrada_saida', 'Controle de Entrada e Saída'),
                ],
            ],
            [
                'id' => 3,
                'name' => 'Ferramentas',
                'key' => 'ferramentas',
                'subservices' => [
                    $this->buildTesterCatalogSubservice('modulacao', 'Modulação e Horários'),
                    $this->buildTesterCatalogSubservice('corretor_de_gabaritos', 'Corretor de Gabaritos'),
                ],
            ],
        ];
    }

    private function buildTesterCatalogSubservice(string $key, string $name): array
    {
        return [
            'id' => 0,
            'name' => $name,
            'key' => $this->normalizePermissionToken($key),
            'route' => $this->buildGenericSubserviceRoute($key),
        ];
    }

    private function parseUserServicesFromArray(array $decoded): array
    {
        $services = [];

        foreach ($decoded as $serviceKey => $subservices) {
            $normalizedService = $this->normalizePermissionToken((string) $serviceKey);
            if ($normalizedService === '') {
                continue;
            }

            if (!is_array($subservices) || $subservices === []) {
                $services[$normalizedService] = [];
                continue;
            }

            $normalizedSubservices = [];
            foreach ($subservices as $subservice) {
                $token = $this->normalizePermissionToken((string) $subservice);
                if ($token !== '') {
                    $normalizedSubservices[] = $token;
                }
            }

            $services[$normalizedService] = array_values(array_unique($normalizedSubservices));
        }

        return $services;
    }

    private function getServiceIdBySubserviceTable(string $subserviceTable): ?int
    {
        $subserviceKeys = $this->getEquivalentSubserviceKeys($subserviceTable);
        $subserviceKey = $subserviceKeys[0] ?? '';

        if ($subserviceKey !== '') {
            try {
                $pdo = Database::connection();
                $statement = $pdo->query('SELECT * FROM servicos');
                $rows = $statement !== false ? $statement->fetchAll() : [];
            } catch (Throwable) {
                $rows = [];
            }

            $parentColumn = $this->getServicosParentColumn();
            $hasTipoColumn = $this->hasServicosColumn('tipo');

            foreach ($rows as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $tipo = $this->normalizePermissionToken((string) ($row['tipo'] ?? ''));
                $parentId = $this->getParentServiceIdFromServicosRow($row, $parentColumn);
                $isSubservice = str_starts_with($tipo, 'subserv') || (!$hasTipoColumn && $parentId > 0);

                if (!$isSubservice) {
                    continue;
                }

                $candidates = [
                    $this->normalizePermissionToken((string) ($row['tabela'] ?? '')),
                    $this->normalizePermissionToken((string) ($row['slug'] ?? '')),
                    $this->normalizePermissionToken((string) ($row['codigo'] ?? '')),
                    $this->normalizePermissionToken((string) ($row['nome'] ?? '')),
                ];

                if (array_intersect($subserviceKeys, $candidates) !== []) {
                    if ($parentId > 0) {
                        return $parentId;
                    }
                }
            }
        }

        $table = preg_replace('/[^a-zA-Z0-9_]/', '', $subserviceTable) ?: '';
        if ($table === '') {
            return null;
        }

        try {
            $pdo = Database::connection();
            $query = sprintf('SELECT servico FROM %s WHERE servico IS NOT NULL LIMIT 1', $table);
            $statement = $pdo->query($query);
            $serviceId = $statement !== false ? $statement->fetchColumn() : false;
        } catch (Throwable) {
            $serviceId = false;
        }

        if ($serviceId === false || $serviceId === null || $serviceId === '') {
            return null;
        }

        return (int) $serviceId;
    }

    protected function getParentServiceIdFromServicosRow(array $row, ?string $parentColumn): int
    {
        if ($parentColumn !== null && array_key_exists($parentColumn, $row)) {
            $value = (int) ($row[$parentColumn] ?? 0);
            if ($value > 0) {
                return $value;
            }
        }

        foreach (['servico', 'servico_id', 'id_servico', 'idservico', 'servicos', 'servicos_id', 'id_servicos', 'idservicos'] as $candidate) {
            if (array_key_exists($candidate, $row)) {
                $value = (int) ($row[$candidate] ?? 0);
                if ($value > 0) {
                    return $value;
                }
            }
        }

        return 0;
    }

    private function getServiceAliases(int $serviceId): array
    {
        $aliases = [(string) $serviceId];

        try {
            $pdo = Database::connection();
            $statement = $pdo->prepare('SELECT * FROM servicos WHERE id = :id LIMIT 1');
            $statement->execute(['id' => $serviceId]);
            $service = $statement->fetch();
        } catch (Throwable) {
            $service = false;
        }

        if (is_array($service)) {
            foreach (['nome', 'name', 'slug', 'codigo', 'servico'] as $field) {
                if (!empty($service[$field])) {
                    $aliases[] = $this->normalizePermissionToken((string) $service[$field]);
                }
            }
        }

        return array_values(array_unique(array_filter($aliases, static fn(string $value): bool => $value !== '')));
    }

    private function getEquivalentSubserviceKeys(string $subservice): array
    {
        $normalized = $this->normalizePermissionToken($subservice);
        if ($normalized === '') {
            return [];
        }

        $groups = [
            ['notas_desempenho', 'notas_e_desempenho'],
            ['controle_refeitorio', 'controle_de_refeitorio', 'refeitorio'],
            ['entrada_saida', 'entrada_e_saida', 'controle_entrada_e_saida', 'controle_de_entrada_e_saida', 'controle_entrada_saida'],
            ['acompanhamento_disciplinar', 'disciplinar'],
            ['modulacao', 'modulacao_e_horarios'],
        ];

        foreach ($groups as $group) {
            $normalizedGroup = [];

            foreach ($group as $alias) {
                $token = $this->normalizePermissionToken((string) $alias);
                if ($token !== '' && !in_array($token, $normalizedGroup, true)) {
                    $normalizedGroup[] = $token;
                }
            }

            if (in_array($normalized, $normalizedGroup, true)) {
                return $normalizedGroup;
            }
        }

        return [$normalized];
    }
}
