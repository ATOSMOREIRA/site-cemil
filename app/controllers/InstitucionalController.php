<?php
declare(strict_types=1);

class InstitucionalController extends HomeController
{
	public function institucional(): void
	{
		if (!$this->canAccessInstitutionalArea()) {
			$this->redirect('/404');
		}

		$this->render('home/institucional', [
			'schoolName' => SCHOOL_NAME,
			'institutionalServices' => $this->getInstitutionalServicesForUser(),
		]);
	}

	public function institucionalEstudantes(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_estudantes')) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Cadastro de Estudantes', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function institucionalTurmas(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_turmas')) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Cadastro de Turmas', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function institucionalModulacao(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Modulação e Horários', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function institucionalHabilidades(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_habilidades')) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Cadastro de Habilidades', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function institucionalEstudantesListar(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_estudantes')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$alunoModel = new AlunoModel();

		try {
			$alunos = $alunoModel->getAllOrdered();
		} catch (Throwable) {
			$alunos = [];
		}

		$this->respondJson([
			'ok' => true,
			'data' => $alunos,
		]);
	}

	public function institucionalEstudantesSalvar(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_estudantes')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$nome = trim((string) ($_POST['nome'] ?? ''));
		$matricula = trim((string) ($_POST['matricula'] ?? ''));
		$turmaId = (int) ($_POST['turma_id'] ?? 0);
		$dataNascimento = trim((string) ($_POST['nascimento'] ?? ''));
		$dataEntrada = trim((string) ($_POST['entrada'] ?? ''));
		$dataSaida = trim((string) ($_POST['data_saida'] ?? ''));
		$rg = trim((string) ($_POST['rg'] ?? ''));
		$cpf = trim((string) ($_POST['cpf'] ?? ''));
		$necessidadeDeficiencia = trim((string) ($_POST['necessidade_deficiencia'] ?? ''));
		$responsavel = trim((string) ($_POST['responsavel'] ?? ''));
		$telefone = trim((string) ($_POST['telefone'] ?? ''));
		$email = trim((string) ($_POST['email'] ?? ''));

		if ($nome === '' || $matricula === '' || $turmaId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Preencha os campos obrigatórios e selecione uma turma.'], 422);
		}

		$normalizedDate = null;
		if ($dataNascimento !== '') {
			$dateObject = date_create($dataNascimento);
			if ($dateObject === false) {
				$this->respondJson(['ok' => false, 'message' => 'Data de nascimento inválida.'], 422);
			}

			$normalizedDate = $dateObject->format('Y-m-d');
		}

		$normalizedEntryDate = null;
		if ($dataEntrada !== '') {
			$dateObject = date_create($dataEntrada);
			if ($dateObject === false) {
				$this->respondJson(['ok' => false, 'message' => 'Data de entrada inválida.'], 422);
			}

			$normalizedEntryDate = $dateObject->format('Y-m-d');
		}

		$normalizedExitDate = null;
		if ($dataSaida !== '') {
			$dateObject = date_create($dataSaida);
			if ($dateObject === false) {
				$this->respondJson(['ok' => false, 'message' => 'Data de saída inválida.'], 422);
			}

			$normalizedExitDate = $dateObject->format('Y-m-d');
		}

		if ($normalizedEntryDate !== null && $normalizedExitDate !== null && $normalizedExitDate < $normalizedEntryDate) {
			$this->respondJson(['ok' => false, 'message' => 'A data de saída não pode ser anterior à data de entrada.'], 422);
		}

		$normalizedCpf = '';
		if ($cpf !== '') {
			$normalizedCpf = $this->normalizeCpf($cpf);
			if (strlen($normalizedCpf) !== 11) {
				$this->respondJson(['ok' => false, 'message' => 'Informe um CPF válido com 11 dígitos.'], 422);
			}

			$cpf = substr($normalizedCpf, 0, 3) . '.' . substr($normalizedCpf, 3, 3) . '.' . substr($normalizedCpf, 6, 3) . '-' . substr($normalizedCpf, 9, 2);
		}

		if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
			$this->respondJson(['ok' => false, 'message' => 'Informe um e-mail válido.'], 422);
		}

		$alunoModel = new AlunoModel();
		$turmaModel = new TurmaModel();

		if ($alunoModel->existsMatriculaForAnotherRecord($matricula, $id > 0 ? $id : 0)) {
			$this->respondJson(['ok' => false, 'message' => 'Já existe aluno com esta matrícula.'], 409);
		}

		try {
			$turmaData = $turmaModel->findById($turmaId);
		} catch (Throwable) {
			$turmaData = null;
		}

		if (!is_array($turmaData)) {
			$this->respondJson(['ok' => false, 'message' => 'Turma selecionada não encontrada.'], 422);
		}

		$turmaNome = trim((string) ($turmaData['nome'] ?? ''));
		$isNew = $id <= 0;

		try {
			if ($isNew) {
				$alunoModel->create(
					$nome,
					$matricula,
					$turmaId,
					$turmaNome,
					$normalizedDate,
					$normalizedEntryDate,
					$normalizedExitDate,
					$rg !== '' ? $rg : null,
					$cpf !== '' ? $cpf : null,
					$necessidadeDeficiencia !== '' ? $necessidadeDeficiencia : null,
					$responsavel !== '' ? $responsavel : null,
					$telefone !== '' ? $telefone : null,
					$email !== '' ? $email : null
				);
			} else {
				$existing = $alunoModel->findById($id);
				if ($existing === null) {
					$this->respondJson(['ok' => false, 'message' => 'Aluno não encontrado.'], 404);
				}

				$alunoModel->update(
					$id,
					$nome,
					$matricula,
					$turmaId,
					$turmaNome,
					$normalizedDate,
					$normalizedEntryDate,
					$normalizedExitDate,
					$rg !== '' ? $rg : null,
					$cpf !== '' ? $cpf : null,
					$necessidadeDeficiencia !== '' ? $necessidadeDeficiencia : null,
					$responsavel !== '' ? $responsavel : null,
					$telefone !== '' ? $telefone : null,
					$email !== '' ? $email : null
				);
			}
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar o aluno agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => $isNew ? 'Aluno cadastrado com sucesso.' : 'Aluno atualizado com sucesso.',
		]);
	}

	public function institucionalEstudantesExcluir(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_estudantes')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Aluno inválido para exclusão.'], 422);
		}

		$alunoModel = new AlunoModel();

		try {
			$existing = $alunoModel->findById($id);
		} catch (Throwable) {
			$existing = null;
		}

		if ($existing === null) {
			$this->respondJson(['ok' => false, 'message' => 'Aluno não encontrado.'], 404);
		}

		try {
			$alunoModel->delete($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir o aluno agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Aluno excluído com sucesso.']);
	}

	public function institucionalEstudantesImportarPreview(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_estudantes')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$file = $_FILES['planilha'] ?? null;
		if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione uma planilha XLSX válida para importar.'], 422);
		}

		$tmpPath = (string) ($file['tmp_name'] ?? '');
		$originalName = trim((string) ($file['name'] ?? ''));
		$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
		$fileSize = (int) ($file['size'] ?? 0);

		if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
			$this->respondJson(['ok' => false, 'message' => 'Arquivo de planilha inválido.'], 422);
		}

		if ($extension !== 'xlsx') {
			$this->respondJson(['ok' => false, 'message' => 'Formato inválido. Envie um arquivo .xlsx.'], 422);
		}

		if ($fileSize <= 0 || $fileSize > 10 * 1024 * 1024) {
			$this->respondJson(['ok' => false, 'message' => 'A planilha deve ter até 10MB.'], 422);
		}

		try {
			$spreadsheetData = $this->parseAlunoImportSpreadsheetMatrix($tmpPath);
		} catch (Throwable $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Não foi possível ler a planilha enviada.'], 422);
		}

		$headers = isset($spreadsheetData['headers']) && is_array($spreadsheetData['headers']) ? $spreadsheetData['headers'] : [];
		$rawRows = isset($spreadsheetData['rows']) && is_array($spreadsheetData['rows']) ? $spreadsheetData['rows'] : [];

		if ($rawRows === []) {
			$this->respondJson(['ok' => false, 'message' => 'A planilha não possui linhas de alunos para importar.'], 422);
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Pré-visualização carregada com sucesso.',
			'headers' => array_values($headers),
			'raw_rows' => array_values($rawRows),
			'auto_mapping' => $this->inferAlunoImportColumnMapping($headers),
		]);
	}

	public function institucionalEstudantesImportar(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_estudantes')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$rowsJson = trim((string) ($_POST['rows_json'] ?? ''));
		$rows = [];
		if ($rowsJson !== '') {
			$decoded = json_decode($rowsJson, true);
			if (!is_array($decoded)) {
				$this->respondJson(['ok' => false, 'message' => 'Os dados selecionados para importação são inválidos.'], 422);
			}

			$rows = $decoded;
		} else {
			$file = $_FILES['planilha'] ?? null;
			if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
				$this->respondJson(['ok' => false, 'message' => 'Selecione uma planilha XLSX válida para importar.'], 422);
			}

			$tmpPath = (string) ($file['tmp_name'] ?? '');
			$originalName = trim((string) ($file['name'] ?? ''));
			$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
			$fileSize = (int) ($file['size'] ?? 0);

			if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
				$this->respondJson(['ok' => false, 'message' => 'Arquivo de planilha inválido.'], 422);
			}

			if ($extension !== 'xlsx') {
				$this->respondJson(['ok' => false, 'message' => 'Formato inválido. Envie um arquivo .xlsx.'], 422);
			}

			if ($fileSize <= 0 || $fileSize > 10 * 1024 * 1024) {
				$this->respondJson(['ok' => false, 'message' => 'A planilha deve ter até 10MB.'], 422);
			}

			try {
				$spreadsheetData = $this->parseAlunoImportSpreadsheetMatrix($tmpPath);
				$rows = $this->buildAlunoImportRowsFromSpreadsheetMatrix(
					$spreadsheetData,
					$this->inferAlunoImportColumnMapping(isset($spreadsheetData['headers']) && is_array($spreadsheetData['headers']) ? $spreadsheetData['headers'] : [])
				);
			} catch (Throwable $exception) {
				$this->respondJson(['ok' => false, 'message' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Não foi possível ler a planilha enviada.'], 422);
			}
		}

		if ($rows === []) {
			$this->respondJson(['ok' => false, 'message' => 'A planilha não possui linhas de alunos para importar.'], 422);
		}

		$alunoModel = new AlunoModel();
		$turmaModel = new TurmaModel();
		$turmasByKey = $this->buildTurmasByImportKey($turmaModel);
		$analyzedRows = $this->analyzeAlunoImportRows($rows, $turmasByKey, $alunoModel);

		$createdCount = 0;
		$updatedCount = 0;
		$skippedCount = 0;
		$warnings = [];

		foreach ($analyzedRows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$lineNumber = (int) ($row['line'] ?? 0);
			$messages = isset($row['messages']) && is_array($row['messages']) ? $row['messages'] : [];
			$shouldImport = !empty($row['selected']);

			if (!$shouldImport) {
				$skippedCount += 1;
				$warnings[] = 'Linha ' . $lineNumber . ': item não selecionado para importação.';
				continue;
			}

			if (empty($row['can_import']) || !empty($messages)) {
				$skippedCount += 1;
				$warnings[] = 'Linha ' . $lineNumber . ': ' . ($messages !== [] ? implode(' ', $messages) : 'dados inválidos para importação.');
				continue;
			}

			try {
				if ((string) ($row['action'] ?? '') === 'update' && (int) ($row['existing_id'] ?? 0) > 0) {
					$alunoModel->update(
						(int) ($row['existing_id'] ?? 0),
						(string) ($row['nome'] ?? ''),
						(string) ($row['matricula'] ?? ''),
						(int) ($row['turma_id'] ?? 0),
						(string) ($row['turma'] ?? ''),
						$this->normalizeNullableText($row['data_nascimento'] ?? null, 20),
						$this->normalizeNullableText($row['data_entrada'] ?? null, 20),
						$this->normalizeNullableText($row['data_saida'] ?? null, 20),
						$this->normalizeNullableText($row['rg'] ?? null, 20),
						$this->normalizeNullableText($row['cpf'] ?? null, 14),
						$this->normalizeNullableText($row['necessidade_deficiencia'] ?? null, 255),
						$this->normalizeNullableText($row['responsavel'] ?? null, 150),
						$this->normalizeNullableText($row['telefone'] ?? null, 25),
						$this->normalizeNullableText($row['email'] ?? null, 180)
					);
					$updatedCount += 1;
				} else {
					$alunoModel->create(
						(string) ($row['nome'] ?? ''),
						(string) ($row['matricula'] ?? ''),
						(int) ($row['turma_id'] ?? 0),
						(string) ($row['turma'] ?? ''),
						$this->normalizeNullableText($row['data_nascimento'] ?? null, 20),
						$this->normalizeNullableText($row['data_entrada'] ?? null, 20),
						$this->normalizeNullableText($row['data_saida'] ?? null, 20),
						$this->normalizeNullableText($row['rg'] ?? null, 20),
						$this->normalizeNullableText($row['cpf'] ?? null, 14),
						$this->normalizeNullableText($row['necessidade_deficiencia'] ?? null, 255),
						$this->normalizeNullableText($row['responsavel'] ?? null, 150),
						$this->normalizeNullableText($row['telefone'] ?? null, 25),
						$this->normalizeNullableText($row['email'] ?? null, 180)
					);
					$createdCount += 1;
				}
			} catch (Throwable) {
				$skippedCount += 1;
				$warnings[] = 'Linha ' . $lineNumber . ': não foi possível salvar o aluno.';
			}
		}

		$messageParts = [];
		if ($createdCount > 0) {
			$messageParts[] = $createdCount . ' criado(s)';
		}
		if ($updatedCount > 0) {
			$messageParts[] = $updatedCount . ' atualizado(s)';
		}
		if ($skippedCount > 0) {
			$messageParts[] = $skippedCount . ' ignorado(s)';
		}

		if ($messageParts === []) {
			$messageParts[] = 'Nenhuma linha foi importada';
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Importação concluída: ' . implode(', ', $messageParts) . '.',
			'summary' => [
				'created' => $createdCount,
				'updated' => $updatedCount,
				'skipped' => $skippedCount,
				'warnings' => array_slice($warnings, 0, 20),
			],
		]);
	}

	private function buildTurmasByImportKey(TurmaModel $turmaModel): array
	{
		try {
			$turmas = $turmaModel->getSimpleOptions();
		} catch (Throwable) {
			$turmas = [];
		}

		$turmasByKey = [];
		foreach ($turmas as $turma) {
			if (!is_array($turma)) {
				continue;
			}

			$turmaId = (int) ($turma['id'] ?? 0);
			$turmaNome = trim((string) ($turma['nome'] ?? ''));
			$key = $this->normalizeImportKey($turmaNome);
			if ($turmaId > 0 && $key !== '') {
				$turmasByKey[$key] = [
					'id' => $turmaId,
					'nome' => $turmaNome,
				];
			}
		}

		return $turmasByKey;
	}

	private function analyzeAlunoImportRows(array $rows, array $turmasByKey, AlunoModel $alunoModel): array
	{
		$result = [];
		foreach ($rows as $index => $row) {
			if (!is_array($row)) {
				continue;
			}

			$result[] = $this->analyzeAlunoImportRow($row, $index + 2, $turmasByKey, $alunoModel);
		}

		return $result;
	}

	private function analyzeAlunoImportRow(array $row, int $lineNumber, array $turmasByKey, AlunoModel $alunoModel): array
	{
		$nome = trim((string) ($row['nome'] ?? ''));
		$matricula = trim((string) ($row['matricula'] ?? ''));
		$turmaNomeRaw = trim((string) ($row['turma'] ?? ''));
		$turmaKey = $this->normalizeImportKey($turmaNomeRaw);
		$messages = [];
		$turmaId = 0;
		$turmaNome = $turmaNomeRaw;

		if ($nome === '') {
			$messages[] = 'Informe o nome.';
		}

		if ($matricula === '') {
			$messages[] = 'Informe a matrícula.';
		}

		if ($turmaKey === '') {
			$messages[] = 'Informe a turma.';
		} elseif (!isset($turmasByKey[$turmaKey])) {
			$messages[] = 'Turma não encontrada no cadastro.';
		} else {
			$turmaId = (int) ($turmasByKey[$turmaKey]['id'] ?? 0);
			$turmaNome = (string) ($turmasByKey[$turmaKey]['nome'] ?? $turmaNomeRaw);
		}

		$dataNascimento = $this->normalizeImportedDateValue($row['data_nascimento'] ?? null);
		$dataEntrada = $this->normalizeImportedDateValue($row['data_entrada'] ?? null);
		$dataSaida = $this->normalizeImportedDateValue($row['data_saida'] ?? null);

		$rawNascimento = trim((string) ($row['data_nascimento'] ?? ''));
		$rawEntrada = trim((string) ($row['data_entrada'] ?? ''));
		$rawSaida = trim((string) ($row['data_saida'] ?? ''));

		if ($rawNascimento !== '' && $dataNascimento === null) {
			$messages[] = 'Data de nascimento inválida.';
		}

		if ($rawEntrada !== '' && $dataEntrada === null) {
			$messages[] = 'Data de entrada inválida.';
		}

		if ($rawSaida !== '' && $dataSaida === null) {
			$messages[] = 'Data de saída inválida.';
		}

		if ($dataEntrada !== null && $dataSaida !== null && $dataSaida < $dataEntrada) {
			$messages[] = 'A data de saída não pode ser anterior à data de entrada.';
		}

		$rg = $this->normalizeNullableText($row['rg'] ?? null, 20);
		$cpf = $this->normalizeNullableText($row['cpf'] ?? null, 20);
		if ($cpf !== null) {
			$cpfDigits = $this->normalizeCpf($cpf);
			if ($cpfDigits === '') {
				$messages[] = 'CPF inválido.';
			} else {
				$cpf = substr($cpfDigits, 0, 3) . '.' . substr($cpfDigits, 3, 3) . '.' . substr($cpfDigits, 6, 3) . '-' . substr($cpfDigits, 9, 2);
			}
		}

		$email = $this->normalizeNullableText($row['email'] ?? null, 180);
		if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
			$messages[] = 'E-mail inválido.';
		}

		$existing = $matricula !== '' ? $alunoModel->findByMatricula($matricula) : null;
		$action = is_array($existing) ? 'update' : 'create';
		$canImport = $messages === [];

		return [
			'line' => $lineNumber,
			'selected' => $canImport,
			'can_import' => $canImport,
			'action' => $canImport ? $action : 'review',
			'existing_id' => is_array($existing) ? (int) ($existing['id'] ?? 0) : 0,
			'existing_nome' => is_array($existing) ? trim((string) ($existing['nome'] ?? '')) : '',
			'nome' => $nome,
			'matricula' => $matricula,
			'turma' => $turmaNome,
			'turma_id' => $turmaId,
			'data_nascimento' => $dataNascimento,
			'data_entrada' => $dataEntrada,
			'data_saida' => $dataSaida,
			'rg' => $rg,
			'cpf' => $cpf,
			'necessidade_deficiencia' => $this->normalizeNullableText($row['necessidade_deficiencia'] ?? null, 255),
			'responsavel' => $this->normalizeNullableText($row['responsavel'] ?? null, 150),
			'telefone' => $this->normalizeNullableText($row['telefone'] ?? null, 25),
			'email' => $email,
			'messages' => $messages,
		];
	}

	private function summarizeAlunoImportPreview(array $rows): array
	{
		$summary = [
			'total' => 0,
			'create' => 0,
			'update' => 0,
			'review' => 0,
			'selected' => 0,
		];

		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$summary['total'] += 1;
			$action = (string) ($row['action'] ?? 'review');
			if (isset($summary[$action])) {
				$summary[$action] += 1;
			} else {
				$summary['review'] += 1;
			}

			if (!empty($row['selected'])) {
				$summary['selected'] += 1;
			}
		}

		return $summary;
	}

	public function institucionalTurmasListar(): void
	{
		if (!$this->canAccessTurmasCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$turmaModel = new TurmaModel();
		$alunoModel = new AlunoModel();

		try {
			$turmas = $turmaModel->getAllOrdered();
		} catch (Throwable) {
			$turmas = [];
		}

		try {
			$alunos = $alunoModel->getSimpleOptions();
		} catch (Throwable) {
			$alunos = [];
		}

		$alunosByTurma = [];
		foreach ($alunos as $aluno) {
			if (!is_array($aluno)) {
				continue;
			}

			$turmaId = (int) ($aluno['turma_id'] ?? 0);
			if ($turmaId <= 0) {
				continue;
			}

			if (!isset($alunosByTurma[$turmaId])) {
				$alunosByTurma[$turmaId] = [];
			}

			$alunosByTurma[$turmaId][] = [
				'id' => (int) ($aluno['id'] ?? 0),
				'nome' => trim((string) ($aluno['nome'] ?? '')),
				'matricula' => trim((string) ($aluno['matricula'] ?? '')),
			];
		}

		foreach ($turmas as &$turma) {
			if (!is_array($turma)) {
				continue;
			}

			$turmaId = (int) ($turma['id'] ?? 0);
			$related = $turmaId > 0 && isset($alunosByTurma[$turmaId]) ? $alunosByTurma[$turmaId] : [];

			$turma['alunos_relacionados'] = $related;
			$turma['alunos_relacionados_ids'] = array_values(array_map(static fn(array $item): int => (int) ($item['id'] ?? 0), $related));
		}
		unset($turma);

		$this->respondJson([
			'ok' => true,
			'data' => $turmas,
		]);
	}

	public function institucionalTurmasSalvar(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_turmas')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$nome = trim((string) ($_POST['nome'] ?? ''));
		$anoLetivo = (int) ($_POST['ano_letivo'] ?? 0);
		$turno = trim((string) ($_POST['turno'] ?? ''));
		$capacidade = (int) ($_POST['capacidade'] ?? 0);
		$descricao = trim((string) ($_POST['descricao'] ?? ''));
		$anoEscolarRaw = $_POST['ano_escolar'] ?? [];
		if (!is_array($anoEscolarRaw)) {
			$anoEscolarRaw = [];
		}
		$anoEscolarValues = [];
		foreach ($anoEscolarRaw as $v) {
			$v = (int) $v;
			if ($v >= 1 && $v <= 9 && !in_array($v, $anoEscolarValues, true)) {
				$anoEscolarValues[] = $v;
			}
		}
		sort($anoEscolarValues);
		$anoEscolar = implode(',', $anoEscolarValues);
		$alunosRelacionadosRaw = $_POST['alunos_relacionados'] ?? [];

		if (!is_array($alunosRelacionadosRaw)) {
			$alunosRelacionadosRaw = [];
		}

		$alunosRelacionadosIds = [];
		foreach ($alunosRelacionadosRaw as $alunoIdRaw) {
			$alunoId = (int) $alunoIdRaw;
			if ($alunoId > 0 && !in_array($alunoId, $alunosRelacionadosIds, true)) {
				$alunosRelacionadosIds[] = $alunoId;
			}
		}

		if ($nome === '' || $anoLetivo < 2000 || $anoLetivo > 2100 || $turno === '' || $capacidade <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Preencha os campos obrigatórios da turma.'], 422);
		}

		$turmaModel = new TurmaModel();
		$alunoModel = new AlunoModel();
		$isNew = $id <= 0;

		try {
			if ($isNew) {
				$turmaId = $turmaModel->create(
					$nome,
					$anoLetivo,
					$turno,
					$capacidade,
					$descricao !== '' ? $descricao : null,
					$anoEscolar
				);
			} else {
				$existing = $turmaModel->findById($id);
				if ($existing === null) {
					$this->respondJson(['ok' => false, 'message' => 'Turma não encontrada.'], 404);
				}

				$turmaModel->update(
					$id,
					$nome,
					$anoLetivo,
					$turno,
					$capacidade,
					$descricao !== '' ? $descricao : null,
					$anoEscolar
				);

				$turmaId = $id;
			}

			if ($turmaId > 0) {
				$alunoModel->reassignTurmaStudents($turmaId, $nome, $alunosRelacionadosIds);
			}
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a turma agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => $isNew ? 'Turma cadastrada com sucesso.' : 'Turma atualizada com sucesso.',
		]);
	}

	public function institucionalTurmasExcluir(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_turmas')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Turma inválida para exclusão.'], 422);
		}

		$turmaModel = new TurmaModel();
		$alunoModel = new AlunoModel();

		try {
			$existing = $turmaModel->findById($id);
		} catch (Throwable) {
			$existing = null;
		}

		if ($existing === null) {
			$this->respondJson(['ok' => false, 'message' => 'Turma não encontrada.'], 404);
		}

		try {
			$alunoModel->clearTurmaRelation($id);
			$turmaModel->delete($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a turma agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Turma excluída com sucesso.']);
	}

	public function institucionalModulacaoDados(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$professorModel = new UsuarioProfessorModel();
		$usuarioCargaHorariaModel = new UsuarioCargaHorariaModel();
		$areaModel = new AreaModel();
		$disciplinaModel = new DisciplinaModel();
		$modulacaoModel = new ProfessorModulacaoModel();
		$aulasConfigModel = new ModulacaoAulaConfigModel();
		$beneficioModel = new ModulacaoBeneficioModel();
		$horarioModel = new ModulacaoHorarioModel();
		$turmaModel = new TurmaModel();

		try {
			$professores = $professorModel->getAllOrdered();
		} catch (Throwable) {
			$professores = [];
		}

		try {
			$usuariosBeneficios = $usuarioCargaHorariaModel->getAllOrdered();
		} catch (Throwable) {
			$usuariosBeneficios = [];
		}

		try {
			$areas = $areaModel->getAllOrdered();
		} catch (Throwable) {
			$areas = [];
		}

		try {
			$disciplinas = $disciplinaModel->getAllOrdered();
		} catch (Throwable) {
			$disciplinas = [];
		}

		try {
			$turmas = $turmaModel->getSimpleOptions();
		} catch (Throwable) {
			$turmas = [];
		}

		try {
			$modulacoes = $modulacaoModel->getAllOrdered();
		} catch (Throwable) {
			$modulacoes = [];
		}

		try {
			$configuracaoAulas = $aulasConfigModel->getCurrent();
		} catch (Throwable) {
			$configuracaoAulas = [];
		}

		try {
			$livreDocencias = $beneficioModel->getAllByType('livre_docencia');
		} catch (Throwable) {
			$livreDocencias = [];
		}

		try {
			$planejamentos = $beneficioModel->getAllByType('planejamento');
		} catch (Throwable) {
			$planejamentos = [];
		}

		try {
			$horariosSemanais = $horarioModel->getAllOrdered();
		} catch (Throwable) {
			$horariosSemanais = [];
		}

		$this->respondJson([
			'ok' => true,
			'data' => [
				'professores' => $professores,
				'usuarios_beneficios' => $usuariosBeneficios,
				'areas' => $areas,
				'disciplinas' => $disciplinas,
				'turmas' => $turmas,
				'modulacoes' => $modulacoes,
				'configuracao_aulas' => $configuracaoAulas,
				'horarios_semanais' => $horariosSemanais,
				'livre_docencias' => $livreDocencias,
				'planejamentos' => $planejamentos,
			],
		]);
	}

	public function institucionalModulacaoHorariosGerar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$selectedProfessorIds = $this->extractIntegerIds($_POST['professor_ids'] ?? []);
		$selectedTurmaIds = $this->extractIntegerIds($_POST['turma_ids'] ?? []);
		$userPrompt = trim((string) ($_POST['prompt'] ?? ''));

		if ($selectedProfessorIds === []) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione ao menos um professor para gerar a grade.'], 422);
		}

		if ($selectedTurmaIds === []) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione ao menos uma turma para gerar a grade.'], 422);
		}

		try {
			$context = $this->buildModulacaoHorarioGenerationContext($selectedProfessorIds, $selectedTurmaIds);
			$service = new ModulacaoHorarioAiService();
			$generated = $service->generate($context['prompt_context'], $userPrompt);
			$validationNotes = [];
			$entries = $this->validateGeneratedHorarioEntries(
				is_array($generated['entries'] ?? null) ? $generated['entries'] : [],
				$selectedProfessorIds,
				$selectedTurmaIds,
				$context,
				false,
				true,
				$validationNotes,
				false
			);
			$coverageNotes = [];
			$entries = $this->ensureMinimumHorarioCoverage($entries, $selectedProfessorIds, $selectedTurmaIds, $context, $coverageNotes);
			$entries = $this->validateGeneratedHorarioEntries(
				$entries,
				$selectedProfessorIds,
				$selectedTurmaIds,
				$context,
				false,
				true,
				$validationNotes,
				true
			);
		} catch (InvalidArgumentException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		} catch (RuntimeException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível gerar a grade automática agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => $entries === []
				? 'A IA não encontrou alocações válidas com as restrições atuais.'
				: 'Grade automática gerada com sucesso.',
			'data' => [
				'entries' => $entries,
				'notes' => array_values(array_merge(
					is_array($generated['notes'] ?? null) ? $generated['notes'] : [],
					$coverageNotes,
					$validationNotes
				)),
				'selected_professor_ids' => $selectedProfessorIds,
				'selected_turma_ids' => $selectedTurmaIds,
			],
		]);
	}

	public function institucionalModulacaoHorariosAplicar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$selectedProfessorIds = $this->extractIntegerIds($_POST['professor_ids'] ?? []);
		$entriesJson = trim((string) ($_POST['entries_json'] ?? ''));
		$decodedEntries = json_decode($entriesJson, true);

		if ($selectedProfessorIds === []) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione ao menos um professor para aplicar a grade.'], 422);
		}

		if (!is_array($decodedEntries)) {
			$this->respondJson(['ok' => false, 'message' => 'A grade gerada é inválida para aplicação.'], 422);
		}

		$selectedTurmaIds = [];
		foreach ($decodedEntries as $entry) {
			if (!is_array($entry)) {
				continue;
			}

			$turmaId = (int) ($entry['turma_id'] ?? 0);
			if ($turmaId > 0) {
				$selectedTurmaIds[$turmaId] = $turmaId;
			}
		}

		try {
			$context = $this->buildModulacaoHorarioGenerationContext($selectedProfessorIds, array_values($selectedTurmaIds));
			$entries = $this->validateGeneratedHorarioEntries($decodedEntries, $selectedProfessorIds, array_values($selectedTurmaIds), $context, true, false);
			$coverageNotes = [];
			$entries = $this->ensureMinimumHorarioCoverage($entries, $selectedProfessorIds, array_values($selectedTurmaIds), $context, $coverageNotes);
			$entries = $this->validateGeneratedHorarioEntries($entries, $selectedProfessorIds, array_values($selectedTurmaIds), $context, true, false);
			$horarioModel = new ModulacaoHorarioModel();
			$entriesToPersist = array_map(static function (array $entry): array {
				$entry['origem'] = 'ia_groq';
				return $entry;
			}, $entries);
			$horarioModel->replaceForProfessores($selectedProfessorIds, $entriesToPersist, 'ia_groq');
		} catch (InvalidArgumentException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		} catch (RuntimeException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível aplicar a grade gerada agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => count($entries) . ' aula(s) foram aplicadas na grade semanal dos professores selecionados.',
		]);
	}

	public function institucionalModulacaoAulasSalvar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$horaInicio = trim((string) ($_POST['hora_inicio'] ?? '07:30'));
		$horaFim = trim((string) ($_POST['hora_fim'] ?? '17:00'));
		$inicioAlmoco = trim((string) ($_POST['inicio_almoco'] ?? '12:00'));
		$fimAlmoco = trim((string) ($_POST['fim_almoco'] ?? '13:20'));
		$duracaoAulaMinutos = (int) ($_POST['duracao_aula_minutos'] ?? 50);
		$quantidadeAulasDia = (int) ($_POST['quantidade_aulas_dia'] ?? 9);
		$slotsJson = trim((string) ($_POST['slots_json'] ?? ''));

		if (!$this->isValidSimpleTime($horaInicio) || !$this->isValidSimpleTime($horaFim) || !$this->isValidSimpleTime($inicioAlmoco) || !$this->isValidSimpleTime($fimAlmoco)) {
			$this->respondJson(['ok' => false, 'message' => 'Informe horários válidos no formato HH:MM.'], 422);
		}

		$inicioMin = $this->simpleTimeToMinutes($horaInicio);
		$fimMin = $this->simpleTimeToMinutes($horaFim);
		$inicioAlmocoMin = $this->simpleTimeToMinutes($inicioAlmoco);
		$fimAlmocoMin = $this->simpleTimeToMinutes($fimAlmoco);

		if ($inicioMin === null || $fimMin === null || $inicioAlmocoMin === null || $fimAlmocoMin === null) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível interpretar os horários informados.'], 422);
		}

		if ($inicioMin >= $fimMin) {
			$this->respondJson(['ok' => false, 'message' => 'O horário final deve ser maior que o horário inicial.'], 422);
		}

		if ($inicioAlmocoMin <= $inicioMin || $fimAlmocoMin >= $fimMin || $inicioAlmocoMin >= $fimAlmocoMin) {
			$this->respondJson(['ok' => false, 'message' => 'Defina um intervalo de almoço válido dentro da jornada de aulas.'], 422);
		}

		if ($duracaoAulaMinutos < 10 || $duracaoAulaMinutos > 180) {
			$this->respondJson(['ok' => false, 'message' => 'Defina uma duração de aula entre 10 e 180 minutos.'], 422);
		}

		if ($quantidadeAulasDia < 1 || $quantidadeAulasDia > 20) {
			$this->respondJson(['ok' => false, 'message' => 'Defina uma quantidade de aulas por dia entre 1 e 20.'], 422);
		}

		$aulasConfigModel = new ModulacaoAulaConfigModel();
		$defaultSlots = $aulasConfigModel->buildSlots($horaInicio, $horaFim, $inicioAlmoco, $fimAlmoco, $duracaoAulaMinutos, $quantidadeAulasDia);
		if ($defaultSlots === []) {
			$this->respondJson(['ok' => false, 'message' => 'A configuração informada não gera aulas válidas com a duração escolhida.'], 422);
		}

		$decodedSlots = json_decode($slotsJson, true);
		$normalizedSlots = $aulasConfigModel->normalizeSlots($decodedSlots, $defaultSlots);

		try {
			$aulasConfigModel->save($horaInicio, $horaFim, $inicioAlmoco, $fimAlmoco, $duracaoAulaMinutos, $quantidadeAulasDia, $normalizedSlots);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a configuração de aulas agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Configuração de aulas salva com sucesso.']);
	}

	public function institucionalModulacaoProfessoresSalvar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$this->respondJson(['ok' => false, 'message' => 'Professores devem ser gerenciados no cadastro de usuarios com a funcao Professor.'], 409);
	}

	public function institucionalModulacaoProfessoresExcluir(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$this->respondJson(['ok' => false, 'message' => 'Professores devem ser gerenciados no cadastro de usuarios com a funcao Professor.'], 409);
	}

	public function institucionalModulacaoDisciplinasSalvar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$areaId = (int) ($_POST['area_id'] ?? 0);
		$nome = trim((string) ($_POST['nome'] ?? ''));
		$status = trim((string) ($_POST['status'] ?? 'ativa'));

		if ($nome === '' || $areaId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Informe o nome da disciplina e selecione uma área.'], 422);
		}

		$status = $status === 'inativa' ? 'inativa' : 'ativa';
		$areaModel = new AreaModel();
		$disciplinaModel = new DisciplinaModel();
		if ($areaModel->findById($areaId) === null) {
			$this->respondJson(['ok' => false, 'message' => 'Área selecionada não encontrada.'], 422);
		}

		if ($disciplinaModel->existsNomeForAnotherRecord($nome, $id > 0 ? $id : 0)) {
			$this->respondJson(['ok' => false, 'message' => 'Já existe disciplina com este nome.'], 409);
		}

		$isNew = $id <= 0;
		try {
			if ($isNew) {
				$disciplinaModel->create($nome, $status, $areaId);
			} else {
				$existing = $disciplinaModel->findById($id);
				if ($existing === null) {
					$this->respondJson(['ok' => false, 'message' => 'Disciplina não encontrada.'], 404);
				}
				$disciplinaModel->update($id, $nome, $status, $areaId);
			}
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a disciplina agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => $isNew ? 'Disciplina cadastrada com sucesso.' : 'Disciplina atualizada com sucesso.']);
	}

	public function institucionalModulacaoAreasSalvar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$nome = trim((string) ($_POST['nome'] ?? ''));
		$status = trim((string) ($_POST['status'] ?? 'ativa'));

		if ($nome === '') {
			$this->respondJson(['ok' => false, 'message' => 'Informe o nome da área.'], 422);
		}

		$status = $status === 'inativa' ? 'inativa' : 'ativa';
		$areaModel = new AreaModel();
		if ($areaModel->existsNomeForAnotherRecord($nome, $id > 0 ? $id : 0)) {
			$this->respondJson(['ok' => false, 'message' => 'Já existe área com este nome.'], 409);
		}

		$isNew = $id <= 0;
		try {
			if ($isNew) {
				$areaModel->create($nome, $status);
			} else {
				$existing = $areaModel->findById($id);
				if ($existing === null) {
					$this->respondJson(['ok' => false, 'message' => 'Área não encontrada.'], 404);
				}

				$areaModel->update($id, $nome, $status);
			}
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a área agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => $isNew ? 'Área cadastrada com sucesso.' : 'Área atualizada com sucesso.']);
	}

	public function institucionalModulacaoAreasExcluir(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Área inválida para exclusão.'], 422);
		}

		$areaModel = new AreaModel();
		try {
			$existing = $areaModel->findById($id);
		} catch (Throwable) {
			$existing = null;
		}

		if ($existing === null) {
			$this->respondJson(['ok' => false, 'message' => 'Área não encontrada.'], 404);
		}

		if ($areaModel->hasDisciplinasLinked($id)) {
			$this->respondJson(['ok' => false, 'message' => 'Esta área está vinculada a disciplinas e não pode ser excluída.'], 409);
		}

		try {
			$areaModel->delete($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a área agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Área excluída com sucesso.']);
	}

	public function institucionalModulacaoDisciplinasExcluir(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Disciplina inválida para exclusão.'], 422);
		}

		$disciplinaModel = new DisciplinaModel();
		try {
			$existing = $disciplinaModel->findById($id);
		} catch (Throwable) {
			$existing = null;
		}

		if ($existing === null) {
			$this->respondJson(['ok' => false, 'message' => 'Disciplina não encontrada.'], 404);
		}

		try {
			$disciplinaModel->delete($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a disciplina agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Disciplina excluída com sucesso.']);
	}

	public function institucionalModulacaoDisciplinasExcluirLote(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$rawIds = $_POST['ids'] ?? [];
		if (!is_array($rawIds)) {
			$rawIds = [$rawIds];
		}

		$ids = [];
		foreach ($rawIds as $rawId) {
			$id = (int) $rawId;
			if ($id > 0) {
				$ids[$id] = $id;
			}
		}
		$ids = array_values($ids);

		if ($ids === []) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione ao menos uma disciplina para excluir.'], 422);
		}

		$disciplinaModel = new DisciplinaModel();
		foreach ($ids as $id) {
			try {
				$existing = $disciplinaModel->findById($id);
			} catch (Throwable) {
				$existing = null;
			}

			if ($existing === null) {
				$this->respondJson(['ok' => false, 'message' => 'Uma das disciplinas selecionadas não foi encontrada.'], 404);
			}
		}

		$pdo = Database::connection();
		try {
			$pdo->beginTransaction();
			foreach ($ids as $id) {
				$disciplinaModel->delete($id);
			}
			$pdo->commit();
		} catch (Throwable) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir as disciplinas selecionadas agora.'], 500);
		}

		$quantidade = count($ids);
		$this->respondJson([
			'ok' => true,
			'message' => $quantidade === 1
				? '1 disciplina excluída com sucesso.'
				: $quantidade . ' disciplinas excluídas com sucesso.'
		]);
	}

	public function institucionalModulacaoVinculosSalvar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$professorId = (int) ($_POST['professor_id'] ?? 0);
		$rawTurmaIds = $_POST['turma_ids'] ?? ($_POST['turma_id'] ?? []);
		$rawDisciplinaIds = $_POST['disciplina_ids'] ?? ($_POST['disciplina_id'] ?? []);

		if (!is_array($rawTurmaIds)) {
			$rawTurmaIds = [$rawTurmaIds];
		}

		if (!is_array($rawDisciplinaIds)) {
			$rawDisciplinaIds = [$rawDisciplinaIds];
		}

		$turmaIds = [];
		foreach ($rawTurmaIds as $rawTurmaId) {
			$turmaId = (int) $rawTurmaId;
			if ($turmaId > 0) {
				$turmaIds[$turmaId] = $turmaId;
			}
		}
		$turmaIds = array_values($turmaIds);

		$disciplinaIds = [];
		foreach ($rawDisciplinaIds as $rawDisciplinaId) {
			$disciplinaId = (int) $rawDisciplinaId;
			if ($disciplinaId > 0) {
				$disciplinaIds[$disciplinaId] = $disciplinaId;
			}
		}
		$disciplinaIds = array_values($disciplinaIds);

		if ($professorId <= 0 || $turmaIds === [] || $disciplinaIds === []) {
			$this->respondJson(['ok' => false, 'message' => 'Preencha professor e selecione ao menos uma turma e uma disciplina.'], 422);
		}

		if ($id > 0 && (count($turmaIds) !== 1 || count($disciplinaIds) !== 1)) {
			$this->respondJson(['ok' => false, 'message' => 'Na edição, selecione apenas uma turma e uma disciplina.'], 422);
		}

		$professorModel = new UsuarioProfessorModel();
		$turmaModel = new TurmaModel();
		$disciplinaModel = new DisciplinaModel();
		$modulacaoModel = new ProfessorModulacaoModel();

		if ($professorModel->findById($professorId) === null) {
			$this->respondJson(['ok' => false, 'message' => 'Professor não encontrado.'], 422);
		}
		foreach ($turmaIds as $turmaId) {
			if ($turmaModel->findById($turmaId) === null) {
				$this->respondJson(['ok' => false, 'message' => 'Turma não encontrada.'], 422);
			}
		}
		foreach ($disciplinaIds as $disciplinaId) {
			if ($disciplinaModel->findById($disciplinaId) === null) {
				$this->respondJson(['ok' => false, 'message' => 'Disciplina não encontrada.'], 422);
			}
		}

		$isNew = $id <= 0;
		try {
			if ($isNew) {
				$createdCount = 0;
				$duplicateCount = 0;

				foreach ($turmaIds as $turmaId) {
					foreach ($disciplinaIds as $disciplinaId) {
						if ($modulacaoModel->existsDuplicate($professorId, $turmaId, $disciplinaId)) {
							$duplicateCount++;
							continue;
						}

						$modulacaoModel->create($professorId, $turmaId, $disciplinaId);
						$createdCount++;
					}
				}

				if ($createdCount <= 0) {
					$this->respondJson(['ok' => false, 'message' => 'Todas as combinações de turma e disciplina selecionadas já estão vinculadas a este professor.'], 409);
				}

				$message = $createdCount === 1
					? 'Vínculo cadastrado com sucesso.'
					: $createdCount . ' vínculos cadastrados com sucesso.';

				if ($duplicateCount > 0) {
					$message .= ' ' . $duplicateCount . ' disciplina(s) já estavam vinculadas e foram ignoradas.';
				}

				$this->respondJson(['ok' => true, 'message' => $message]);
			} else {
				$existing = $modulacaoModel->findById($id);
				if ($existing === null) {
					$this->respondJson(['ok' => false, 'message' => 'Vínculo de modulação não encontrado.'], 404);
				}

				$turmaId = (int) $turmaIds[0];
				$disciplinaId = (int) $disciplinaIds[0];

				if ($modulacaoModel->existsDuplicate($professorId, $turmaId, $disciplinaId, $id)) {
					$this->respondJson(['ok' => false, 'message' => 'Este vínculo entre professor, turma e disciplina já existe.'], 409);
				}

				$modulacaoModel->update($id, $professorId, $turmaId, $disciplinaId);
			}
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar o vínculo de modulação agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Vínculo de modulação atualizado com sucesso.']);
	}

	public function institucionalModulacaoVinculosExcluir(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Vínculo inválido para exclusão.'], 422);
		}

		$modulacaoModel = new ProfessorModulacaoModel();
		try {
			$existing = $modulacaoModel->findById($id);
		} catch (Throwable) {
			$existing = null;
		}

		if ($existing === null) {
			$this->respondJson(['ok' => false, 'message' => 'Vínculo de modulação não encontrado.'], 404);
		}

		try {
			$modulacaoModel->delete($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir o vínculo de modulação agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Vínculo de modulação excluído com sucesso.']);
	}

	public function institucionalModulacaoVinculosExcluirLote(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$rawIds = $_POST['ids'] ?? [];
		if (!is_array($rawIds)) {
			$rawIds = [$rawIds];
		}

		$ids = [];
		foreach ($rawIds as $rawId) {
			$id = (int) $rawId;
			if ($id > 0) {
				$ids[$id] = $id;
			}
		}
		$ids = array_values($ids);

		if ($ids === []) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione ao menos um vínculo para excluir.'], 422);
		}

		$modulacaoModel = new ProfessorModulacaoModel();
		foreach ($ids as $id) {
			try {
				$existing = $modulacaoModel->findById($id);
			} catch (Throwable) {
				$existing = null;
			}

			if ($existing === null) {
				$this->respondJson(['ok' => false, 'message' => 'Um dos vínculos selecionados não foi encontrado.'], 404);
			}
		}

		$pdo = Database::connection();
		try {
			$pdo->beginTransaction();
			foreach ($ids as $id) {
				$modulacaoModel->delete($id);
			}
			$pdo->commit();
		} catch (Throwable) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir os vínculos selecionados agora.'], 500);
		}

		$quantidade = count($ids);
		$this->respondJson([
			'ok' => true,
			'message' => $quantidade === 1
				? '1 vínculo excluído com sucesso.'
				: $quantidade . ' vínculos excluídos com sucesso.'
		]);
	}

	private function isValidSimpleTime(string $value): bool
	{
		return preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', trim($value)) === 1;
	}

	private function simpleTimeToMinutes(string $value): ?int
	{
		if (!$this->isValidSimpleTime($value)) {
			return null;
		}

		[$hours, $minutes] = array_map('intval', explode(':', trim($value)));
		return ($hours * 60) + $minutes;
	}

	private function formatBeneficioSlotsForMessage(array $slots): string
	{
		$labels = [];
		foreach ($slots as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$inicio = trim((string) ($slot['inicio'] ?? ''));
			$fim = trim((string) ($slot['fim'] ?? ''));
			if ($inicio === '' || $fim === '') {
				continue;
			}

			$labels[] = $inicio . ' - ' . $fim;
		}

		return implode(', ', $labels);
	}

	private function calculateBeneficioSlotMinutes(string $inicio, string $fim): int
	{
		$inicioMinutes = $this->simpleTimeToMinutes($inicio);
		$fimMinutes = $this->simpleTimeToMinutes($fim);
		if ($inicioMinutes === null || $fimMinutes === null) {
			return 0;
		}

		return max(0, $fimMinutes - $inicioMinutes);
	}

	private function sumBeneficioSlotMinutes(array $slots): int
	{
		$total = 0;
		foreach ($slots as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$total += $this->calculateBeneficioSlotMinutes(
				(string) ($slot['inicio'] ?? ''),
				(string) ($slot['fim'] ?? '')
			);
		}

		return $total;
	}

	private function formatBeneficioMinutes(int $minutes): string
	{
		$minutes = max(0, $minutes);
		$hours = intdiv($minutes, 60);
		$remainingMinutes = $minutes % 60;

		if ($hours > 0 && $remainingMinutes > 0) {
			return $hours . 'h' . str_pad((string) $remainingMinutes, 2, '0', STR_PAD_LEFT) . 'min';
		}

		if ($hours > 0) {
			return $hours . 'h';
		}

		return $remainingMinutes . 'min';
	}

	public function institucionalModulacaoBeneficiosSalvar(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$usuarioId = (int) ($_POST['usuario_id'] ?? 0);
		$tipo = trim(strtolower((string) ($_POST['tipo'] ?? '')));
		$diaSemana = trim(strtolower((string) ($_POST['dia_semana'] ?? '')));
		$slotsJson = trim((string) ($_POST['slots_json'] ?? '[]'));

		$allowedTypes = ['livre_docencia', 'planejamento'];
		$allowedDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
		if ($usuarioId <= 0 || !in_array($tipo, $allowedTypes, true) || !in_array($diaSemana, $allowedDays, true)) {
			$this->respondJson(['ok' => false, 'message' => 'Preencha usuário, tipo e dia da semana corretamente.'], 422);
		}

		$decodedSlots = json_decode($slotsJson, true);
		if (!is_array($decodedSlots)) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione horários válidos para o benefício.'], 422);
		}

		$usuarioModel = new UsuarioCargaHorariaModel();
		$beneficioModel = new ModulacaoBeneficioModel();
		$aulasConfigModel = new ModulacaoAulaConfigModel();

		$usuario = $usuarioModel->findById($usuarioId);
		if ($usuario === null) {
			$this->respondJson(['ok' => false, 'message' => 'Usuário não encontrado.'], 404);
		}

		$cargaHoraria = max(0, (int) ($usuario['cargaHoraria'] ?? 40));
		$beneficioMinutos = max(0, (int) round(($cargaHoraria / 5) * 60));

		try {
			$configuracaoAulas = $aulasConfigModel->getCurrent();
		} catch (Throwable) {
			$configuracaoAulas = [];
		}

		$availableSlots = [];
		foreach ((array) ($configuracaoAulas['slots'] ?? []) as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$inicio = trim((string) ($slot['inicio'] ?? ''));
			$fim = trim((string) ($slot['fim'] ?? ''));
			$dayEnabled = !empty($slot['dias'][$diaSemana]);
			if ($inicio === '' || $fim === '' || !$dayEnabled) {
				continue;
			}

			$availableSlots[$inicio . '|' . $fim] = [
				'inicio' => $inicio,
				'fim' => $fim,
				'duracao_minutos' => $this->calculateBeneficioSlotMinutes($inicio, $fim),
			];
		}

		if ($availableSlots === []) {
			$this->respondJson(['ok' => false, 'message' => 'Não há horários de aula disponíveis para o dia selecionado.'], 422);
		}

		$normalizedSlots = [];
		foreach ($decodedSlots as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$inicio = trim((string) ($slot['inicio'] ?? ''));
			$fim = trim((string) ($slot['fim'] ?? ''));
			$key = $inicio . '|' . $fim;
			if ($inicio === '' || $fim === '' || !isset($availableSlots[$key])) {
				$this->respondJson(['ok' => false, 'message' => 'Um dos horários selecionados não é válido para o dia informado.'], 422);
			}

			$normalizedSlots[$key] = $availableSlots[$key];
		}

		$normalizedSlots = array_values($normalizedSlots);

		$currentRecordMinutes = 0;
		if ($id > 0) {
			$existingForLimit = $beneficioModel->findById($id);
			if ($existingForLimit !== null) {
				$currentRecordMinutes = $this->sumBeneficioSlotMinutes((array) ($existingForLimit['slots'] ?? []));
			}
		}

		$usedMinutesInOtherRecords = $beneficioModel->countMinutesForUserType($usuarioId, $tipo, $id);
		$remainingMinutes = max(0, $beneficioMinutos - $usedMinutesInOtherRecords);
		$allowedMinutesForCurrentRecord = max($currentRecordMinutes, $remainingMinutes);
		$selectedMinutes = $this->sumBeneficioSlotMinutes($normalizedSlots);

		if ($allowedMinutesForCurrentRecord <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'A carga horária total de ' . $this->formatBeneficioMinutes($beneficioMinutos) . ' deste benefício já foi atingida em outros cadastros deste usuário.'], 422);
		}

		if ($selectedMinutes < 1 || $selectedMinutes > $allowedMinutesForCurrentRecord) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione aulas somando de 1 minuto até ' . $this->formatBeneficioMinutes($allowedMinutesForCurrentRecord) . ' para este cadastro, considerando o que já foi usado em outros registros.'], 422);
		}

		$overlap = $beneficioModel->findAnyOverlapForUser($usuarioId, $tipo, $diaSemana, $normalizedSlots, $id);
		if (is_array($overlap)) {
			$tipoConflitante = (string) ($overlap['tipo'] ?? '') === 'planejamento' ? 'Planejamento' : 'Livre Docência';
			$horariosConflitantes = $this->formatBeneficioSlotsForMessage((array) ($overlap['conflitos'] ?? []));
			$mensagem = 'Os horários selecionados já estão em uso em outro cadastro de ' . $tipoConflitante . ' deste usuário em ' . ucfirst($diaSemana) . '.';
			if ($horariosConflitantes !== '') {
				$mensagem .= ' Horários em conflito: ' . $horariosConflitantes . '.';
			}
			$this->respondJson(['ok' => false, 'message' => $mensagem], 409);
		}

		$isNew = $id <= 0;
		try {
			if ($isNew) {
				$beneficioModel->create($usuarioId, $tipo, $diaSemana, $normalizedSlots);
			} else {
				$existing = $beneficioModel->findById($id);
				if ($existing === null) {
					$this->respondJson(['ok' => false, 'message' => 'Cadastro de benefício não encontrado.'], 404);
				}

				$beneficioModel->update($id, $usuarioId, $tipo, $diaSemana, $normalizedSlots);
			}
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar este benefício agora.'], 500);
		}

		$nomeTipo = $tipo === 'livre_docencia' ? 'Livre Docência' : 'Planejamento';
		$this->respondJson(['ok' => true, 'message' => $nomeTipo . ' salvo com sucesso.']);
	}

	public function institucionalModulacaoBeneficiosExcluir(): void
	{
		if (!$this->canAccessModulacaoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Cadastro inválido para exclusão.'], 422);
		}

		$beneficioModel = new ModulacaoBeneficioModel();
		try {
			$existing = $beneficioModel->findById($id);
		} catch (Throwable) {
			$existing = null;
		}

		if ($existing === null) {
			$this->respondJson(['ok' => false, 'message' => 'Cadastro de benefício não encontrado.'], 404);
		}

		try {
			$beneficioModel->delete($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir este benefício agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Cadastro de benefício excluído com sucesso.']);
	}

	private function buildModulacaoHorarioGenerationContext(array $selectedProfessorIds, array $selectedTurmaIds): array
	{
		$professorModel = new UsuarioProfessorModel();
		$usuarioCargaHorariaModel = new UsuarioCargaHorariaModel();
		$disciplinaModel = new DisciplinaModel();
		$turmaModel = new TurmaModel();
		$modulacaoModel = new ProfessorModulacaoModel();
		$aulasConfigModel = new ModulacaoAulaConfigModel();
		$beneficioModel = new ModulacaoBeneficioModel();
		$horarioModel = new ModulacaoHorarioModel();

		$professores = $this->indexRowsById($professorModel->getAllOrdered());
		$usuariosBeneficios = $this->indexRowsById($usuarioCargaHorariaModel->getAllOrdered());
		$disciplinas = $this->indexRowsById($disciplinaModel->getSimpleOptions());
		$turmas = $this->indexRowsById($turmaModel->getAllOrdered());
		$modulacoes = $modulacaoModel->getAllOrdered();
		$configuracaoAulas = $aulasConfigModel->getCurrent();
		$livreDocencias = $beneficioModel->getAllByType('livre_docencia');
		$planejamentos = $beneficioModel->getAllByType('planejamento');
		$horariosAtuais = $horarioModel->getAllOrdered();

		$selectedProfessorIds = array_values(array_unique(array_filter(array_map('intval', $selectedProfessorIds), static function (int $id): bool {
			return $id > 0;
		})));
		$selectedTurmaIds = array_values(array_unique(array_filter(array_map('intval', $selectedTurmaIds), static function (int $id): bool {
			return $id > 0;
		})));

		foreach ($selectedProfessorIds as $professorId) {
			if (!isset($professores[$professorId])) {
				throw new InvalidArgumentException('Um dos professores selecionados não foi encontrado.');
			}
		}

		foreach ($selectedTurmaIds as $turmaId) {
			if (!isset($turmas[$turmaId])) {
				throw new InvalidArgumentException('Uma das turmas selecionadas não foi encontrada.');
			}
		}

		$linkedDisciplinasByProfessor = [];
		$linkedDisciplinasByProfessorTurma = [];
		foreach ($modulacoes as $modulacao) {
			if (!is_array($modulacao)) {
				continue;
			}

			$professorId = (int) ($modulacao['professor_id'] ?? 0);
			$turmaId = (int) ($modulacao['turma_id'] ?? 0);
			$disciplinaId = (int) ($modulacao['disciplina_id'] ?? 0);
			if ($professorId <= 0 || $disciplinaId <= 0 || !in_array($professorId, $selectedProfessorIds, true) || !isset($disciplinas[$disciplinaId])) {
				continue;
			}
			if ($turmaId > 0 && !in_array($turmaId, $selectedTurmaIds, true)) {
				continue;
			}

			$linkedDisciplinasByProfessor[$professorId][$disciplinaId] = [
				'id' => $disciplinaId,
				'nome' => (string) ($disciplinas[$disciplinaId]['nome'] ?? ''),
				'area_nome' => (string) ($disciplinas[$disciplinaId]['area_nome'] ?? ''),
			];

			if ($turmaId > 0) {
				$linkedDisciplinasByProfessorTurma[$professorId][$turmaId][$disciplinaId] = [
					'id' => $disciplinaId,
					'nome' => (string) ($disciplinas[$disciplinaId]['nome'] ?? ''),
					'area_nome' => (string) ($disciplinas[$disciplinaId]['area_nome'] ?? ''),
					'turma_id' => $turmaId,
					'turma_nome' => (string) (($turmas[$turmaId]['nome'] ?? '') ?: ''),
				];
				continue;
			}

			foreach ($selectedTurmaIds as $selectedTurmaId) {
				$linkedDisciplinasByProfessorTurma[$professorId][$selectedTurmaId][$disciplinaId] = [
					'id' => $disciplinaId,
					'nome' => (string) ($disciplinas[$disciplinaId]['nome'] ?? ''),
					'area_nome' => (string) ($disciplinas[$disciplinaId]['area_nome'] ?? ''),
					'turma_id' => $selectedTurmaId,
					'turma_nome' => (string) (($turmas[$selectedTurmaId]['nome'] ?? '') ?: ''),
				];
			}
		}

		$professoresPayload = [];
		foreach ($selectedProfessorIds as $professorId) {
			$professor = $professores[$professorId] ?? null;
			$usuarioBeneficio = $usuariosBeneficios[$professorId] ?? [];
			$disciplinasVinculadas = array_values($linkedDisciplinasByProfessor[$professorId] ?? []);

			if ($disciplinasVinculadas === []) {
				throw new InvalidArgumentException('O professor ' . (string) ($professor['nome'] ?? ('#' . $professorId)) . ' não possui disciplinas vinculadas para gerar o horário.');
			}

			$professoresPayload[] = [
				'id' => $professorId,
				'nome' => (string) ($professor['nome'] ?? ''),
				'funcao_nome' => (string) ($professor['funcao_nome'] ?? 'Professor'),
				'cargaHoraria' => (int) ($usuarioBeneficio['cargaHoraria'] ?? 40),
				'beneficio_minutos' => (int) ($usuarioBeneficio['beneficio_minutos'] ?? max(0, (int) round((((int) ($usuarioBeneficio['cargaHoraria'] ?? 40)) / 5) * 60))),
				'disciplinas_vinculadas' => $disciplinasVinculadas,
			];
		}

		$turmasPayload = array_values(array_map(static function (int $turmaId) use ($turmas): array {
			$turma = $turmas[$turmaId] ?? [];
			return [
				'id' => $turmaId,
				'nome' => (string) ($turma['nome'] ?? ''),
				'ano_letivo' => (int) ($turma['ano_letivo'] ?? 0),
				'turno' => (string) ($turma['turno'] ?? ''),
			];
		}, $selectedTurmaIds));

		$requiredWeeklyCoverage = [];
		foreach ($selectedProfessorIds as $professorId) {
			foreach ($selectedTurmaIds as $turmaId) {
				$disciplinasVinculadasTurma = array_values($linkedDisciplinasByProfessorTurma[$professorId][$turmaId] ?? []);
				if ($disciplinasVinculadasTurma === []) {
					continue;
				}

				usort($disciplinasVinculadasTurma, static function (array $left, array $right): int {
					$leftNome = trim((string) ($left['nome'] ?? ''));
					$rightNome = trim((string) ($right['nome'] ?? ''));
					if ($leftNome !== $rightNome) {
						return strcasecmp($leftNome, $rightNome);
					}

					return ((int) ($left['id'] ?? 0)) <=> ((int) ($right['id'] ?? 0));
				});

				$requiredWeeklyCoverage[] = [
					'professor_id' => $professorId,
					'professor_nome' => (string) (($professores[$professorId]['nome'] ?? '') ?: ('#' . $professorId)),
					'turma_id' => $turmaId,
					'turma_nome' => (string) (($turmas[$turmaId]['nome'] ?? '') ?: ('#' . $turmaId)),
					'aulas_minimas_semanais' => 1,
					'disciplinas_vinculadas' => array_values(array_map(static function (array $disciplina): array {
						return [
							'id' => (int) ($disciplina['id'] ?? 0),
							'nome' => (string) ($disciplina['nome'] ?? ''),
							'area_nome' => (string) ($disciplina['area_nome'] ?? ''),
						];
					}, $disciplinasVinculadasTurma)),
				];
			}
		}

		$availableSlotsByDay = [];
		$slotsLookupByDay = [];
		foreach ((array) ($configuracaoAulas['slots'] ?? []) as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$inicio = trim((string) ($slot['inicio'] ?? ''));
			$fim = trim((string) ($slot['fim'] ?? ''));
			if ($inicio === '' || $fim === '') {
				continue;
			}

			$key = $inicio . '|' . $fim;
			foreach (['segunda', 'terca', 'quarta', 'quinta', 'sexta'] as $dayKey) {
				if (empty($slot['dias'][$dayKey])) {
					continue;
				}

				$availableSlotsByDay[$dayKey][] = [
					'inicio' => $inicio,
					'fim' => $fim,
					'duracao_minutos' => max(0, ($this->simpleTimeToMinutes($fim) ?? 0) - ($this->simpleTimeToMinutes($inicio) ?? 0)),
				];
				$slotsLookupByDay[$dayKey][$key] = true;
			}
		}

		$beneficiosBloqueadosLookup = [];
		$beneficiosBloqueadosPrompt = [];
		foreach (array_merge($livreDocencias, $planejamentos) as $beneficio) {
			if (!is_array($beneficio)) {
				continue;
			}

			$professorId = (int) ($beneficio['usuario_id'] ?? 0);
			$diaSemana = trim((string) ($beneficio['dia_semana'] ?? ''));
			$tipo = (string) ($beneficio['tipo'] ?? '');
			if ($professorId <= 0 || $diaSemana === '') {
				continue;
			}

			foreach ((array) ($beneficio['slots'] ?? []) as $slot) {
				if (!is_array($slot)) {
					continue;
				}

				$inicio = trim((string) ($slot['inicio'] ?? ''));
				$fim = trim((string) ($slot['fim'] ?? ''));
				$key = $inicio . '|' . $fim;
				if ($inicio === '' || $fim === '') {
					continue;
				}

				$label = $tipo === 'planejamento' ? 'Planejamento' : 'Livre Docência';
				$beneficiosBloqueadosLookup[$professorId][$diaSemana][$key] = $label;
				$beneficiosBloqueadosPrompt[$professorId][] = [
					'dia_semana' => $diaSemana,
					'inicio' => $inicio,
					'fim' => $fim,
					'tipo' => $label,
				];
			}
		}

		$horariosFixos = [];
		$horariosFixosPrompt = [];
		foreach ($horariosAtuais as $horario) {
			if (!is_array($horario)) {
				continue;
			}

			$professorId = (int) ($horario['professor_id'] ?? 0);
			if (in_array($professorId, $selectedProfessorIds, true)) {
				continue;
			}

			$diaSemana = trim((string) ($horario['dia_semana'] ?? ''));
			$inicio = trim((string) ($horario['inicio'] ?? ''));
			$fim = trim((string) ($horario['fim'] ?? ''));
			$key = $inicio . '|' . $fim;
			if ($diaSemana === '' || $inicio === '' || $fim === '') {
				continue;
			}

			$horariosFixos[] = [
				'professor_id' => $professorId,
				'turma_id' => (int) ($horario['turma_id'] ?? 0),
				'disciplina_id' => (int) ($horario['disciplina_id'] ?? 0),
				'dia_semana' => $diaSemana,
				'inicio' => $inicio,
				'fim' => $fim,
			];
			$horariosFixosPrompt[] = [
				'professor_id' => $professorId,
				'professor_nome' => (string) ($horario['professor_nome'] ?? ''),
				'turma_id' => (int) ($horario['turma_id'] ?? 0),
				'turma_nome' => (string) ($horario['turma_nome'] ?? ''),
				'disciplina_id' => (int) ($horario['disciplina_id'] ?? 0),
				'disciplina_nome' => (string) ($horario['disciplina_nome'] ?? ''),
				'dia_semana' => $diaSemana,
				'inicio' => $inicio,
				'fim' => $fim,
			];
		}

		return [
			'prompt_context' => [
				'professores_selecionados' => $professoresPayload,
				'turmas_selecionadas' => $turmasPayload,
				'cobertura_minima_semanal' => $requiredWeeklyCoverage,
				'slots_disponiveis_por_dia' => $availableSlotsByDay,
				'beneficios_bloqueados' => $beneficiosBloqueadosPrompt,
				'horarios_fixos_outros_professores' => $horariosFixosPrompt,
			],
			'disciplinas_lookup' => $disciplinas,
			'turmas_lookup' => $turmas,
			'professores_lookup' => $professores,
			'linked_disciplinas_por_professor' => $linkedDisciplinasByProfessor,
			'linked_disciplinas_por_professor_turma' => $linkedDisciplinasByProfessorTurma,
			'cobertura_minima_semanal' => $requiredWeeklyCoverage,
			'slots_disponiveis_por_dia' => $availableSlotsByDay,
			'slots_lookup_por_dia' => $slotsLookupByDay,
			'beneficios_bloqueados_lookup' => $beneficiosBloqueadosLookup,
			'horarios_fixos' => $horariosFixos,
		];
	}

	private function buildRequiredHorarioCoverage(array $selectedProfessorIds, array $selectedTurmaIds, array $context): array
	{
		$linkedDisciplinasByProfessorTurma = (array) ($context['linked_disciplinas_por_professor_turma'] ?? []);
		$professoresLookup = (array) ($context['professores_lookup'] ?? []);
		$turmasLookup = (array) ($context['turmas_lookup'] ?? []);
		$requiredCoverage = [];

		foreach ($selectedProfessorIds as $professorId) {
			foreach ($selectedTurmaIds as $turmaId) {
				$disciplinas = array_values($linkedDisciplinasByProfessorTurma[$professorId][$turmaId] ?? []);
				if ($disciplinas === []) {
					continue;
				}

				usort($disciplinas, static function (array $left, array $right): int {
					$leftNome = trim((string) ($left['nome'] ?? ''));
					$rightNome = trim((string) ($right['nome'] ?? ''));
					if ($leftNome !== $rightNome) {
						return strcasecmp($leftNome, $rightNome);
					}

					return ((int) ($left['id'] ?? 0)) <=> ((int) ($right['id'] ?? 0));
				});

				$requiredCoverage[] = [
					'professor_id' => $professorId,
					'professor_nome' => (string) (($professoresLookup[$professorId]['nome'] ?? '') ?: ('#' . $professorId)),
					'turma_id' => $turmaId,
					'turma_nome' => (string) (($turmasLookup[$turmaId]['nome'] ?? '') ?: ('#' . $turmaId)),
					'disciplinas' => $disciplinas,
				];
			}
		}

		return $requiredCoverage;
	}

	private function findMissingHorarioCoverage(array $entries, array $selectedProfessorIds, array $selectedTurmaIds, array $context): array
	{
		$requiredCoverage = $this->buildRequiredHorarioCoverage($selectedProfessorIds, $selectedTurmaIds, $context);
		if ($requiredCoverage === []) {
			return [];
		}

		$coveredPairs = [];
		foreach ($entries as $entry) {
			if (!is_array($entry)) {
				continue;
			}

			$professorId = (int) ($entry['professor_id'] ?? 0);
			$turmaId = (int) ($entry['turma_id'] ?? 0);
			if ($professorId > 0 && $turmaId > 0) {
				$coveredPairs[$professorId][$turmaId] = true;
			}
		}

		$missingCoverage = [];
		foreach ($requiredCoverage as $coverage) {
			$professorId = (int) ($coverage['professor_id'] ?? 0);
			$turmaId = (int) ($coverage['turma_id'] ?? 0);
			if ($professorId <= 0 || $turmaId <= 0 || isset($coveredPairs[$professorId][$turmaId])) {
				continue;
			}

			$missingCoverage[] = $coverage;
		}

		return $missingCoverage;
	}

	private function ensureMinimumHorarioCoverage(array $entries, array $selectedProfessorIds, array $selectedTurmaIds, array $context, array &$notes = []): array
	{
		$missingCoverage = $this->findMissingHorarioCoverage($entries, $selectedProfessorIds, $selectedTurmaIds, $context);
		if ($missingCoverage === []) {
			return $entries;
		}

		$availableSlotsByDay = (array) ($context['slots_disponiveis_por_dia'] ?? []);
		$beneficiosBloqueadosLookup = (array) ($context['beneficios_bloqueados_lookup'] ?? []);
		$horariosFixos = (array) ($context['horarios_fixos'] ?? []);
		$dayOrder = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

		$fixedProfessorSlots = [];
		$fixedTurmaSlots = [];
		foreach ($horariosFixos as $entry) {
			if (!is_array($entry)) {
				continue;
			}

			$professorId = (int) ($entry['professor_id'] ?? 0);
			$turmaId = (int) ($entry['turma_id'] ?? 0);
			$diaSemana = trim((string) ($entry['dia_semana'] ?? ''));
			$slotKey = trim((string) ($entry['inicio'] ?? '')) . '|' . trim((string) ($entry['fim'] ?? ''));
			if ($professorId > 0 && $diaSemana !== '' && $slotKey !== '|') {
				$fixedProfessorSlots[$professorId][$diaSemana][$slotKey] = true;
			}
			if ($turmaId > 0 && $diaSemana !== '' && $slotKey !== '|') {
				$fixedTurmaSlots[$turmaId][$diaSemana][$slotKey] = true;
			}
		}

		$generatedProfessorSlots = [];
		$generatedTurmaSlots = [];
		$coveredPairs = [];
		foreach ($entries as $entry) {
			if (!is_array($entry)) {
				continue;
			}

			$professorId = (int) ($entry['professor_id'] ?? 0);
			$turmaId = (int) ($entry['turma_id'] ?? 0);
			$diaSemana = trim((string) ($entry['dia_semana'] ?? ''));
			$slotKey = trim((string) ($entry['inicio'] ?? '')) . '|' . trim((string) ($entry['fim'] ?? ''));
			if ($professorId > 0 && $turmaId > 0) {
				$coveredPairs[$professorId][$turmaId] = true;
			}
			if ($professorId > 0 && $diaSemana !== '' && $slotKey !== '|') {
				$generatedProfessorSlots[$professorId][$diaSemana][$slotKey] = true;
			}
			if ($turmaId > 0 && $diaSemana !== '' && $slotKey !== '|') {
				$generatedTurmaSlots[$turmaId][$diaSemana][$slotKey] = true;
			}
		}

		foreach ($missingCoverage as $coverage) {
			$professorId = (int) ($coverage['professor_id'] ?? 0);
			$turmaId = (int) ($coverage['turma_id'] ?? 0);
			$professorNome = (string) ($coverage['professor_nome'] ?? ('#' . $professorId));
			$turmaNome = (string) ($coverage['turma_nome'] ?? ('#' . $turmaId));
			$disciplinas = array_values(array_filter((array) ($coverage['disciplinas'] ?? []), static function ($item): bool {
				return is_array($item) && (int) ($item['id'] ?? 0) > 0;
			}));
			if ($professorId <= 0 || $turmaId <= 0 || $disciplinas === [] || isset($coveredPairs[$professorId][$turmaId])) {
				continue;
			}

			$disciplina = $disciplinas[0];
			$disciplinaId = (int) ($disciplina['id'] ?? 0);
			$alocado = false;

			foreach ($dayOrder as $diaSemana) {
				foreach ((array) ($availableSlotsByDay[$diaSemana] ?? []) as $slot) {
					if (!is_array($slot)) {
						continue;
					}

					$inicio = trim((string) ($slot['inicio'] ?? ''));
					$fim = trim((string) ($slot['fim'] ?? ''));
					$slotKey = $inicio . '|' . $fim;
					if ($inicio === '' || $fim === '' || $slotKey === '|') {
						continue;
					}

					if (isset($beneficiosBloqueadosLookup[$professorId][$diaSemana][$slotKey])) {
						continue;
					}
					if (isset($fixedProfessorSlots[$professorId][$diaSemana][$slotKey]) || isset($generatedProfessorSlots[$professorId][$diaSemana][$slotKey])) {
						continue;
					}
					if (isset($fixedTurmaSlots[$turmaId][$diaSemana][$slotKey]) || isset($generatedTurmaSlots[$turmaId][$diaSemana][$slotKey])) {
						continue;
					}

					$entries[] = [
						'professor_id' => $professorId,
						'turma_id' => $turmaId,
						'disciplina_id' => $disciplinaId,
						'dia_semana' => $diaSemana,
						'inicio' => $inicio,
						'fim' => $fim,
						'observacoes' => 'Cobertura mínima semanal automática',
					];
					$generatedProfessorSlots[$professorId][$diaSemana][$slotKey] = true;
					$generatedTurmaSlots[$turmaId][$diaSemana][$slotKey] = true;
					$coveredPairs[$professorId][$turmaId] = true;
					$notes[] = 'Cobertura mínima semanal adicionada automaticamente para ' . $professorNome . ' na turma ' . $turmaNome . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').';
					$alocado = true;
					break 2;
				}
			}

			if (!$alocado) {
				$notes[] = 'Não foi possível encaixar cobertura mínima semanal para ' . $professorNome . ' na turma ' . $turmaNome . ' com os slots e bloqueios atuais.';
			}
		}

		return $entries;
	}

	private function validateGeneratedHorarioEntries(array $entries, array $selectedProfessorIds, array $selectedTurmaIds, array $context, bool $requireEntries = true, bool $allowPartial = false, array &$notes = [], bool $enforceCoverage = true): array
	{
		$selectedProfessorLookup = array_fill_keys($selectedProfessorIds, true);
		$selectedTurmaLookup = array_fill_keys($selectedTurmaIds, true);
		$linkedDisciplinasByProfessorTurma = (array) ($context['linked_disciplinas_por_professor_turma'] ?? []);
		$slotsLookupByDay = (array) ($context['slots_lookup_por_dia'] ?? []);
		$beneficiosBloqueadosLookup = (array) ($context['beneficios_bloqueados_lookup'] ?? []);
		$horariosFixos = (array) ($context['horarios_fixos'] ?? []);

		$fixedProfessorSlots = [];
		$fixedTurmaSlots = [];
		foreach ($horariosFixos as $entry) {
			if (!is_array($entry)) {
				continue;
			}

			$professorId = (int) ($entry['professor_id'] ?? 0);
			$turmaId = (int) ($entry['turma_id'] ?? 0);
			$diaSemana = trim((string) ($entry['dia_semana'] ?? ''));
			$key = trim((string) ($entry['inicio'] ?? '')) . '|' . trim((string) ($entry['fim'] ?? ''));
			if ($professorId > 0 && $diaSemana !== '' && $key !== '|') {
				$fixedProfessorSlots[$professorId][$diaSemana][$key] = true;
			}
			if ($turmaId > 0 && $diaSemana !== '' && $key !== '|') {
				$fixedTurmaSlots[$turmaId][$diaSemana][$key] = true;
			}
		}

		$generatedProfessorSlots = [];
		$generatedTurmaSlots = [];
		$normalizedEntries = [];

		foreach ($entries as $index => $entry) {
			$entryLabel = 'Entrada #' . ($index + 1);
			if (!is_array($entry)) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque veio em formato inválido.';
					continue;
				}

				throw new RuntimeException('A entrada #' . ($index + 1) . ' da grade gerada é inválida.');
			}

			$professorId = (int) ($entry['professor_id'] ?? 0);
			$turmaId = (int) ($entry['turma_id'] ?? 0);
			$disciplinaId = (int) ($entry['disciplina_id'] ?? 0);
			$diaSemana = strtolower(trim((string) ($entry['dia_semana'] ?? '')));
			$inicio = trim((string) ($entry['inicio'] ?? ''));
			$fim = trim((string) ($entry['fim'] ?? ''));
			$slotKey = $inicio . '|' . $fim;

			if (!isset($selectedProfessorLookup[$professorId])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque usa um professor fora da seleção.';
					continue;
				}

				throw new RuntimeException('A IA retornou um professor fora da seleção atual.');
			}

			if (!isset($selectedTurmaLookup[$turmaId])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque usa uma turma fora da seleção.';
					continue;
				}

				throw new RuntimeException('A IA retornou uma turma fora da seleção atual.');
			}

			if (!isset($linkedDisciplinasByProfessorTurma[$professorId][$turmaId][$disciplinaId])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque a disciplina #' . $disciplinaId . ' não está vinculada ao professor selecionado para essa turma.';
					continue;
				}

				throw new RuntimeException('A disciplina #' . $disciplinaId . ' não está vinculada ao professor #' . $professorId . ' para a turma #' . $turmaId . '.');
			}

			if (!in_array($diaSemana, ['segunda', 'terca', 'quarta', 'quinta', 'sexta'], true)) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque usa sábado ou domingo.';
					continue;
				}

				throw new RuntimeException('A geração automática de horários considera apenas segunda a sexta. Remova sábado/domingo do resultado e tente novamente.');
			}

			if (!isset($slotsLookupByDay[$diaSemana][$slotKey])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque usa um horário inativo ou inexistente em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').';
					continue;
				}

				throw new RuntimeException('A IA usou um horário inválido ou inativo em ' . $diaSemana . ': ' . $inicio . ' - ' . $fim . '.');
			}

			if (isset($beneficiosBloqueadosLookup[$professorId][$diaSemana][$slotKey])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque conflita com ' . $beneficiosBloqueadosLookup[$professorId][$diaSemana][$slotKey] . ' do professor #' . $professorId . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').';
					continue;
				}

				throw new RuntimeException('A IA usou um horário bloqueado por benefício para o professor #' . $professorId . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').');
			}

			if (isset($fixedProfessorSlots[$professorId][$diaSemana][$slotKey])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque conflita com outro horário já ocupado do professor #' . $professorId . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').';
					continue;
				}

				throw new RuntimeException('A IA gerou conflito com outro horário já fixado para o professor #' . $professorId . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').');
			}

			if (isset($fixedTurmaSlots[$turmaId][$diaSemana][$slotKey])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque a turma #' . $turmaId . ' já está ocupada em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').';
					continue;
				}

				throw new RuntimeException('A IA gerou conflito com outra aula já fixada para a turma #' . $turmaId . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').');
			}

			if (isset($generatedProfessorSlots[$professorId][$diaSemana][$slotKey])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque duplicou horário do professor #' . $professorId . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').';
					continue;
				}

				throw new RuntimeException('A IA gerou duas aulas para o mesmo professor no mesmo horário: professor #' . $professorId . ', ' . $diaSemana . ' ' . $inicio . ' - ' . $fim . '.');
			}

			if (isset($generatedTurmaSlots[$turmaId][$diaSemana][$slotKey])) {
				if ($allowPartial) {
					$notes[] = $entryLabel . ' foi ignorada porque duplicou horário da turma #' . $turmaId . ' em ' . $diaSemana . ' (' . $inicio . ' - ' . $fim . ').';
					continue;
				}

				throw new RuntimeException('A IA gerou duas aulas para a mesma turma no mesmo horário: turma #' . $turmaId . ', ' . $diaSemana . ' ' . $inicio . ' - ' . $fim . '.');
			}

			$generatedProfessorSlots[$professorId][$diaSemana][$slotKey] = true;
			$generatedTurmaSlots[$turmaId][$diaSemana][$slotKey] = true;
			$normalizedEntries[] = [
				'professor_id' => $professorId,
				'turma_id' => $turmaId,
				'disciplina_id' => $disciplinaId,
				'dia_semana' => $diaSemana,
				'inicio' => $inicio,
				'fim' => $fim,
				'observacoes' => trim((string) ($entry['observacoes'] ?? '')) !== '' ? trim((string) ($entry['observacoes'] ?? '')) : null,
			];
		}

		if ($requireEntries && $normalizedEntries === []) {
			throw new RuntimeException('A grade gerada não possui nenhuma aula válida para aplicar.');
		}

		if ($enforceCoverage) {
			$missingCoverage = $this->findMissingHorarioCoverage($normalizedEntries, $selectedProfessorIds, $selectedTurmaIds, $context);
			if ($missingCoverage !== []) {
				$labels = array_map(static function (array $coverage): string {
					$professorNome = trim((string) ($coverage['professor_nome'] ?? ''));
					$turmaNome = trim((string) ($coverage['turma_nome'] ?? ''));
					$professorId = (int) ($coverage['professor_id'] ?? 0);
					$turmaId = (int) ($coverage['turma_id'] ?? 0);
					return ($professorNome !== '' ? $professorNome : ('Professor #' . $professorId)) . ' / ' . ($turmaNome !== '' ? $turmaNome : ('Turma #' . $turmaId));
				}, $missingCoverage);
				$message = 'A grade não garantiu ao menos 1 aula semanal para os vínculos selecionados em: ' . implode('; ', $labels) . '.';

				if ($allowPartial) {
					$notes[] = $message;
				} else {
					throw new RuntimeException($message);
				}
			}
		}

		$dayOrder = ['segunda' => 1, 'terca' => 2, 'quarta' => 3, 'quinta' => 4, 'sexta' => 5];
		usort($normalizedEntries, static function (array $left, array $right) use ($dayOrder): int {
			$leftDay = $dayOrder[$left['dia_semana']] ?? 99;
			$rightDay = $dayOrder[$right['dia_semana']] ?? 99;
			if ($leftDay !== $rightDay) {
				return $leftDay <=> $rightDay;
			}

			if ($left['inicio'] !== $right['inicio']) {
				return strcmp($left['inicio'], $right['inicio']);
			}

			if ($left['turma_id'] !== $right['turma_id']) {
				return $left['turma_id'] <=> $right['turma_id'];
			}

			return $left['professor_id'] <=> $right['professor_id'];
		});

		return $normalizedEntries;
	}

	private function extractIntegerIds($rawIds): array
	{
		if (!is_array($rawIds)) {
			$rawIds = [$rawIds];
		}

		$result = [];
		foreach ($rawIds as $rawId) {
			$id = (int) $rawId;
			if ($id > 0) {
				$result[$id] = $id;
			}
		}

		return array_values($result);
	}

	private function indexRowsById(array $rows): array
	{
		$result = [];
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$id = (int) ($row['id'] ?? 0);
			if ($id > 0) {
				$result[$id] = $row;
			}
		}

		return $result;
	}

	public function corretorGabaritos(): void
	{
		if (!$this->canAccessSubservice('corretor_de_gabaritos')) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/institucional-corretor', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function corretorGabaritosConteudo(): void
	{
		if (!$this->canAccessSubservice('corretor_de_gabaritos')) {
			$this->redirect('/404');
		}

		$filePath = __DIR__ . '/../views/home/Institucional/Corretor de Gabaritos.html';

		if (!is_file($filePath)) {
			$this->redirect('/404');
		}

		if (!headers_sent()) {
			header('Content-Type: text/html; charset=UTF-8');
		}

		readfile($filePath);
		exit;
	}

	public function avaliacoes(): void
	{
		if (!$this->canAccessAvaliacoesCatalog()) {
			$this->redirect('/404');
		}

		$avaliacaoModel = new AvaliacaoModel();
		$turmaModel = new TurmaModel();
		$usuarioId = (int) ($_SESSION['auth']['id'] ?? 0);
		$isAdmin = (bool) (($_SESSION['auth']['tipo'] ?? '') === 'admin');

		try {
			$avaliacoes = $isAdmin
				? $avaliacaoModel->getAllOrdered()
				: $avaliacaoModel->getAllOrderedByAutorOrAplicadorId($usuarioId);
		} catch (Throwable) {
			$avaliacoes = [];
		}

		try {
			$turmas = $turmaModel->getSimpleOptions();
		} catch (Throwable) {
			$turmas = [];
		}
		$alunoModel = new AlunoModel();
		try {
			$alunos = $alunoModel->getSimpleOptions();
		} catch (Throwable) {
			$alunos = [];
		}

		$disciplinaModel = new DisciplinaModel();
		try {
			$disciplinas = $disciplinaModel->getSimpleOptions();
		} catch (Throwable) {
			$disciplinas = [];
		}

		$gabaritoPadraoModel = new GabaritoPadraoModel();
		try {
			$defaultGabaritoPreset = $gabaritoPadraoModel->getConfig();
		} catch (Throwable) {
			$defaultGabaritoPreset = null;
		}

		$viewName = $isAdmin
			? 'home/Institucional/Cadastro de Avaliações'
			: 'home/Institucional/Gerenciar Avaliações';

		$canEditAvaliacoes = $isAdmin
			|| $this->canAccessSubservice('avaliacoes')
			|| $this->canAccessSubservice('cadastro_de_avaliacoes')
			|| $this->canAccessSubservice('gerenciar_avaliacoes');

		$this->render($viewName, [
			'schoolName' => SCHOOL_NAME,
			'avaliacoes' => $avaliacoes,
			'turmas' => $turmas,
			'alunos' => $alunos,
			'disciplinas' => $disciplinas,
			'usuariosAplicadores' => $this->getAvaliacaoAplicadoresOptions(),
			'usuariosAutores' => $this->getAvaliacaoAplicadoresOptions(),
			'defaultGabaritoPreset' => is_array($defaultGabaritoPreset) ? $defaultGabaritoPreset : [],
			'canManageAvaliacoes' => true,
			'canEditAvaliacoes' => $canEditAvaliacoes,
			'currentUserId' => $usuarioId,
			'isAdmin' => $isAdmin,
		]);
	}

	public function institucionalNotasDesempenho(): void
	{
		if (!$this->canAccessNotasDesempenhoCatalog()) {
			$this->redirect('/404');
		}

		$turmaModel = new TurmaModel();
		$alunoModel = new AlunoModel();
		$disciplinaModel = new DisciplinaModel();
		$desempenhoService = new AlunoDesempenhoService();

		try {
			$turmas = $turmaModel->getAllOrdered();
		} catch (Throwable) {
			$turmas = [];
		}

		try {
			$alunos = $alunoModel->getAllOrdered();
		} catch (Throwable) {
			$alunos = [];
		}

		try {
			$disciplinas = $disciplinaModel->getSimpleOptions();
		} catch (Throwable) {
			$disciplinas = [];
		}

		if (!$this->isNotasDesempenhoScopeExemptUser()) {
			$scope = $this->getNotasDesempenhoUserScope();
			$allowedTurmaIds = array_flip($scope['turma_ids']);
			$allowedDisciplinaIds = array_flip($scope['disciplina_ids']);

			$turmas = array_values(array_filter($turmas, static function ($item) use ($allowedTurmaIds): bool {
				if (!is_array($item)) {
					return false;
				}
				$id = (int) ($item['id'] ?? 0);
				return $id > 0 && isset($allowedTurmaIds[$id]);
			}));

			$alunos = array_values(array_filter($alunos, static function ($item) use ($allowedTurmaIds): bool {
				if (!is_array($item)) {
					return false;
				}
				$turmaId = (int) ($item['turma_id'] ?? 0);
				return $turmaId > 0 && isset($allowedTurmaIds[$turmaId]);
			}));

			$disciplinas = array_values(array_filter($disciplinas, static function ($item) use ($allowedDisciplinaIds): bool {
				if (!is_array($item)) {
					return false;
				}
				$id = (int) ($item['id'] ?? 0);
				return $id > 0 && isset($allowedDisciplinaIds[$id]);
			}));
		}

		$this->render('home/Institucional/Notas e Desempenho', [
			'schoolName' => SCHOOL_NAME,
			'turmas' => $turmas,
			'alunos' => $alunos,
			'disciplinas' => $disciplinas,
			'notasDesempenhoCategorias' => $desempenhoService->getManualCategoryOptions(),
			'currentYear' => (int) date('Y'),
		]);
	}

	public function institucionalNotasDesempenhoDados(): void
	{
		if (!$this->canAccessNotasDesempenhoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$service = new AlunoDesempenhoService();

		try {
			$turmaIds = $this->normalizeIntListParam($_GET['turma_ids'] ?? ($_GET['turma_id'] ?? []), 1, 999999);
			$bimestres = $this->normalizeIntListParam($_GET['bimestres'] ?? ($_GET['bimestre'] ?? []), 1, 4);
			$anosLetivos = $this->normalizeIntListParam($_GET['anos_letivos'] ?? ($_GET['ano_letivo'] ?? []), 2000, 2100);

			$scope = null;
			if (!$this->isNotasDesempenhoScopeExemptUser()) {
				$scope = $this->getNotasDesempenhoUserScope();
				if ($scope['turma_ids'] === [] || $scope['disciplina_ids'] === []) {
					$this->respondJson([
						'ok' => true,
						'data' => $this->buildEmptyNotasDesempenhoData(),
					]);
				}

				$allowedTurmaMap = array_flip($scope['turma_ids']);
				if ($turmaIds === []) {
					$turmaIds = $scope['turma_ids'];
				} else {
					$turmaIds = array_values(array_filter($turmaIds, static function (int $id) use ($allowedTurmaMap): bool {
						return isset($allowedTurmaMap[$id]);
					}));
					if ($turmaIds === []) {
						$turmaIds = $scope['turma_ids'];
					}
				}
			}

			$data = $service->buildDashboardData([
				'anos_letivos' => $anosLetivos,
				'bimestres' => $bimestres,
				'turma_ids' => $turmaIds,
				'ano_letivo' => (int) ($anosLetivos[0] ?? 0),
				'bimestre' => (int) ($bimestres[0] ?? 0),
				'turma_id' => (int) ($turmaIds[0] ?? 0),
				'aluno_id' => (int) ($_GET['aluno_id'] ?? 0),
				'categoria' => trim((string) ($_GET['categoria'] ?? '')),
				'busca' => trim((string) ($_GET['busca'] ?? '')),
			]);

			if (is_array($scope)) {
				$data = $this->applyNotasDesempenhoDataScope($data, $scope, $turmaIds);
			}
		} catch (Throwable $exception) {
			$this->respondJson([
				'ok' => false,
				'message' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Não foi possível carregar o desempenho agora.',
			], 500);
		}

		$this->respondJson([
			'ok' => true,
			'data' => $data,
		]);
	}

	public function institucionalNotasDesempenhoSalvar(): void
	{
		if (!$this->canAccessNotasDesempenhoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$csrfToken = (string) ($_POST['csrf_token'] ?? '');
		$sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
		if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
			$this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
		}

		$service = new AlunoDesempenhoService();
		$recordId = trim((string) ($_POST['id'] ?? ''));
		$alunoIdsRaw = trim((string) ($_POST['aluno_ids_json'] ?? ''));
		$notasPorAlunoRaw = trim((string) ($_POST['notas_por_aluno_json'] ?? ''));
		$turmaIdRequest = (int) ($_POST['turma_id'] ?? 0);
		$disciplinaRequest = trim((string) ($_POST['disciplina'] ?? ''));
		$alunoModel = new AlunoModel();

		if ($turmaIdRequest <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione a turma do lançamento.'], 422);
		}

		if ($disciplinaRequest === '') {
			$this->respondJson(['ok' => false, 'message' => 'Selecione a disciplina do lançamento.'], 422);
		}

		try {
			$this->assertNotasDesempenhoScopeAllows($turmaIdRequest, $disciplinaRequest);
		} catch (InvalidArgumentException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		}

		if ($recordId === '' && $alunoIdsRaw !== '' && $notasPorAlunoRaw !== '') {
			$alunoIdsParsed = json_decode($alunoIdsRaw, true);
			$notasPorAlunoParsed = json_decode($notasPorAlunoRaw, true);

			if (!is_array($alunoIdsParsed) || !is_array($notasPorAlunoParsed)) {
				$this->respondJson(['ok' => false, 'message' => 'Formato inválido dos alunos/notas em lote.'], 422);
			}

			$alunoIds = [];
			foreach ($alunoIdsParsed as $rawAlunoId) {
				$alunoId = (int) $rawAlunoId;
				if ($alunoId > 0) {
					$alunoIds[] = $alunoId;
				}
			}
			$alunoIds = array_values(array_unique($alunoIds));

			if ($alunoIds === []) {
				$this->respondJson(['ok' => false, 'message' => 'Selecione ao menos um aluno para o lançamento em lote.'], 422);
			}

			foreach ($alunoIds as $alunoId) {
				$aluno = $alunoModel->findById($alunoId);
				if (!is_array($aluno)) {
					$this->respondJson(['ok' => false, 'message' => 'Aluno inválido para lançamento em lote.'], 422);
				}

				$alunoTurmaId = (int) ($aluno['turma_id'] ?? 0);
				if ($alunoTurmaId <= 0 || $alunoTurmaId !== $turmaIdRequest) {
					$this->respondJson([
						'ok' => false,
						'message' => 'Há aluno(s) selecionado(s) fora da turma informada para este lançamento.',
					], 422);
				}
			}

			$turmaId = (int) ($_POST['turma_id'] ?? 0);
			$anoLetivo = (int) ($_POST['ano_letivo'] ?? 0);
			$bimestre = (int) ($_POST['bimestre'] ?? 0);
			$categoria = trim((string) ($_POST['categoria'] ?? ''));
			$ciclo = (int) ($_POST['ciclo'] ?? 0);
			$titulo = trim((string) ($_POST['titulo'] ?? ''));
			$descricao = trim((string) ($_POST['descricao'] ?? ''));
			$disciplina = trim((string) ($_POST['disciplina'] ?? ''));
			$notaMaximaRaw = trim((string) ($_POST['nota_maxima'] ?? ''));
			$dataReferencia = trim((string) ($_POST['data_referencia'] ?? ''));
			$habilidadesAlcancadas = trim((string) ($_POST['habilidades_alcancadas'] ?? ''));
			$habilidadesAvaliadas = trim((string) ($_POST['habilidades_avaliadas'] ?? ''));
			$observacoes = trim((string) ($_POST['observacoes'] ?? ''));

			$savedRecords = [];
			try {
				foreach ($alunoIds as $alunoId) {
					$rawNotaAluno = $notasPorAlunoParsed[(string) $alunoId] ?? $notasPorAlunoParsed[$alunoId] ?? null;
					$notaNormalizada = null;
					if ($rawNotaAluno !== null && trim((string) $rawNotaAluno) !== '') {
						$rawNotaTexto = str_replace(',', '.', trim((string) $rawNotaAluno));
						if (!preg_match('/^\d+(\.\d)?$/', $rawNotaTexto)) {
							throw new InvalidArgumentException('Informe a nota com 1 casa decimal para todos os alunos selecionados.');
						}
						$notaNumero = (float) $rawNotaTexto;
						$notaNormalizada = number_format(round($notaNumero, 1), 1, '.', '');
					}

					if ($notaNormalizada === null || $notaNormalizada === '') {
						throw new InvalidArgumentException('Informe a nota com 1 casa decimal para todos os alunos selecionados.');
					}

					$savedRecords[] = $service->saveManualRecord([
						'id' => '',
						'aluno_id' => $alunoId,
						'turma_id' => $turmaId,
						'ano_letivo' => $anoLetivo,
						'bimestre' => $bimestre,
						'categoria' => $categoria,
						'ciclo' => $ciclo,
						'titulo' => $titulo,
						'descricao' => $descricao,
						'disciplina' => $disciplina,
						'nota' => $notaNormalizada,
						'nota_maxima' => $notaMaximaRaw,
						'data_referencia' => $dataReferencia,
						'habilidades_alcancadas' => $habilidadesAlcancadas,
						'habilidades_avaliadas' => $habilidadesAvaliadas,
						'observacoes' => $observacoes,
					]);
				}
			} catch (InvalidArgumentException $exception) {
				$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
			} catch (RuntimeException $exception) {
				$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 404);
			} catch (Throwable) {
				$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar os lançamentos em lote agora.'], 500);
			}

			$this->respondJson([
				'ok' => true,
				'message' => count($savedRecords) . ' lançamentos salvos com sucesso.',
				'data' => [
					'records' => $savedRecords,
				],
			]);
		}

		try {
			$alunoId = (int) ($_POST['aluno_id'] ?? 0);
			$aluno = $alunoModel->findById($alunoId);
			if (!is_array($aluno)) {
				throw new InvalidArgumentException('Aluno inválido para este lançamento.');
			}
			$alunoTurmaId = (int) ($aluno['turma_id'] ?? 0);
			if ($alunoTurmaId <= 0 || $alunoTurmaId !== $turmaIdRequest) {
				throw new InvalidArgumentException('O aluno selecionado não pertence à turma informada.');
			}

			$notaRaw = trim((string) ($_POST['nota'] ?? ''));
			$notaNormalizada = $notaRaw;
			if ($notaRaw !== '') {
				$notaRawNormalized = str_replace(',', '.', $notaRaw);
				if (!preg_match('/^\d+(\.\d)?$/', $notaRawNormalized)) {
					throw new InvalidArgumentException('Informe uma nota válida com 1 casa decimal.');
				}
				$notaNumero = (float) $notaRawNormalized;
				$notaNormalizada = number_format(round($notaNumero, 1), 1, '.', '');
			}

			$record = $service->saveManualRecord([
				'id' => $recordId,
				'aluno_id' => $alunoId,
				'turma_id' => (int) ($_POST['turma_id'] ?? 0),
				'ano_letivo' => (int) ($_POST['ano_letivo'] ?? 0),
				'bimestre' => (int) ($_POST['bimestre'] ?? 0),
				'categoria' => trim((string) ($_POST['categoria'] ?? '')),
				'ciclo' => (int) ($_POST['ciclo'] ?? 0),
				'titulo' => trim((string) ($_POST['titulo'] ?? '')),
				'descricao' => trim((string) ($_POST['descricao'] ?? '')),
				'disciplina' => trim((string) ($_POST['disciplina'] ?? '')),
				'nota' => $notaNormalizada,
				'nota_maxima' => trim((string) ($_POST['nota_maxima'] ?? '')),
				'data_referencia' => trim((string) ($_POST['data_referencia'] ?? '')),
				'habilidades_alcancadas' => trim((string) ($_POST['habilidades_alcancadas'] ?? '')),
				'habilidades_avaliadas' => trim((string) ($_POST['habilidades_avaliadas'] ?? '')),
				'observacoes' => trim((string) ($_POST['observacoes'] ?? '')),
			]);
		} catch (InvalidArgumentException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		} catch (RuntimeException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 404);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar o lançamento agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Lançamento salvo com sucesso.',
			'data' => $record,
		]);
	}

	public function institucionalNotasDesempenhoExcluir(): void
	{
		if (!$this->canAccessNotasDesempenhoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$csrfToken = (string) ($_POST['csrf_token'] ?? '');
		$sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
		if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
			$this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
		}

		$recordId = trim((string) ($_POST['id'] ?? ''));
		$alunoId = (int) ($_POST['aluno_id'] ?? 0);

		if ($recordId === '' || $alunoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Lançamento inválido para exclusão.'], 422);
		}

		$service = new AlunoDesempenhoService();
		try {
			$this->assertNotasDesempenhoScopeAllows(
				(int) ($_POST['turma_id'] ?? 0),
				trim((string) ($_POST['disciplina'] ?? ''))
			);
		} catch (InvalidArgumentException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		}
		if (!$service->deleteManualRecord($alunoId, $recordId)) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir o lançamento informado.'], 404);
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Lançamento excluído com sucesso.',
		]);
	}

	public function institucionalNotasDesempenhoNotaManual(): void
	{
		if (!$this->canAccessNotasDesempenhoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$csrfToken = (string) ($_POST['csrf_token'] ?? '');
		$sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
		if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
			$this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
		}

		$service = new AlunoDesempenhoService();

		try {
			$alunoId = (int) ($_POST['aluno_id'] ?? 0);
			$disciplina = trim((string) ($_POST['disciplina'] ?? ''));
			$alunoModel = new AlunoModel();
			$aluno = $alunoModel->findById($alunoId);
			if (!is_array($aluno)) {
				throw new InvalidArgumentException('Aluno inválido para salvar nota manual.');
			}

			$alunoTurmaId = (int) ($aluno['turma_id'] ?? 0);
			$this->assertNotasDesempenhoScopeAllows($alunoTurmaId > 0 ? $alunoTurmaId : null, $disciplina);

			$rawValor = trim((string) ($_POST['valor'] ?? ''));
			$valor = $rawValor === '' ? null : (float) str_replace(',', '.', $rawValor);

			$resultado = $service->saveNotaManual(
				$alunoId,
				$disciplina,
				(int) ($_POST['bimestre'] ?? 0),
				(int) ($_POST['ano_letivo'] ?? 0),
				trim((string) ($_POST['componente'] ?? '')),
				$valor
			);
		} catch (InvalidArgumentException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 422);
		} catch (RuntimeException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 404);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a nota.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Nota salva com sucesso.',
			'data' => $resultado,
		]);
	}

	public function institucionalNotasDesempenhoCorrecaoDisciplinaDados(): void
	{
		if (!$this->canAccessNotasDesempenhoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$avaliacaoId = (int) ($_GET['avaliacao_id'] ?? 0);
		$alunoId = (int) ($_GET['aluno_id'] ?? 0);
		$turmaId = (int) ($_GET['turma_id'] ?? 0);
		$disciplina = trim((string) ($_GET['disciplina'] ?? ''));

		if ($avaliacaoId <= 0 || $alunoId <= 0 || $turmaId <= 0 || $disciplina === '') {
			$this->respondJson(['ok' => false, 'message' => 'Parâmetros inválidos.'], 422);
		}

		$avaliacaoModel = new AvaliacaoModel();
		$avaliacao = $avaliacaoModel->findById($avaliacaoId);
		if (!is_array($avaliacao)) {
			$this->respondJson(['ok' => false, 'message' => 'Avaliação não encontrada.'], 404);
		}

		$canAccessCorrecao = $this->canAccessInstitucionalAvaliacaoCorrecao($avaliacao);
		if (!$canAccessCorrecao) {
			try {
				$this->assertNotasDesempenhoScopeAllows($turmaId, $disciplina);
				$canAccessCorrecao = true;
			} catch (Throwable) {
				$canAccessCorrecao = false;
			}
		}

		if (!$canAccessCorrecao) {
			$this->respondJson(['ok' => false, 'message' => 'Você não tem acesso à correção desta avaliação.'], 403);
		}

		$correcaoModel = new AvaliacaoCorrecaoModel();
		$correcao = $correcaoModel->findByComposite($avaliacaoId, $alunoId, $turmaId);
		if (!is_array($correcao)) {
			$this->respondJson(['ok' => false, 'message' => 'Correção não encontrada para este aluno/turma.'], 404);
		}

		$itens = $this->extractAvaliacaoQuestionItems($avaliacao);
		$respostas = is_array($correcao['respostas'] ?? null) ? $correcao['respostas'] : [];
		$correcoes = is_array($correcao['correcoes'] ?? null) ? $correcao['correcoes'] : [];
		$correcoesByQuestion = [];
		foreach ($correcoes as $item) {
			if (!is_array($item)) {
				continue;
			}
			$questionNumber = (int) ($item['questionNumber'] ?? 0);
			if ($questionNumber > 0) {
				$correcoesByQuestion[$questionNumber] = $item;
			}
		}

		$disciplina = $this->resolveInstitutionalDisciplinaLabel($disciplina);
		$disciplinaNorm = $this->normalizeInstitutionalSearch($disciplina);
		$questoesDisciplina = [];
		foreach ($itens as $index => $item) {
			if (!is_array($item)) {
				continue;
			}

			$questionNumber = $index + 1;
			$itemDisciplina = $this->resolveInstitutionalDisciplinaLabel((string) ($item['disciplina'] ?? ''));
			if ($this->normalizeInstitutionalSearch($itemDisciplina) !== $disciplinaNorm) {
				continue;
			}

			$tipo = $this->normalizeInstitutionalQuestionType((string) ($item['tipo'] ?? ''));
			$peso = round((float) ($item['peso'] ?? 1), 2);
			if ($peso <= 0) {
				$peso = 1.0;
			}

			$respostaAtualRaw = $respostas[(string) $questionNumber] ?? null;
			$respostaAtual = $tipo === 'discursiva'
				? ($respostaAtualRaw !== null && $respostaAtualRaw !== '' ? round((float) $respostaAtualRaw, 2) : null)
				: strtoupper(trim((string) ($respostaAtualRaw ?? '')));

			$correcaoItem = $correcoesByQuestion[$questionNumber] ?? null;
			$respostaCorreta = strtoupper(trim((string) ($item['correta'] ?? $item['resposta'] ?? '')));
			$questoesDisciplina[] = [
				'question_number' => $questionNumber,
				'tipo' => $tipo,
				'peso' => $peso,
				'habilidade' => trim((string) ($item['habilidade'] ?? '')),
				'enunciado' => trim((string) ($item['enunciado'] ?? '')),
				'resposta_correta' => $respostaCorreta,
				'resposta_atual' => $respostaAtual,
				'is_correct_atual' => is_array($correcaoItem) ? (($correcaoItem['isCorrect'] ?? false) === true) : null,
				'pontuacao_atual' => is_array($correcaoItem) ? round((float) ($correcaoItem['pontuacao'] ?? 0), 2) : null,
				'alternativas' => is_array($item['alternativas'] ?? null) ? $item['alternativas'] : [],
			];
		}

		if ($questoesDisciplina === []) {
			$this->respondJson(['ok' => false, 'message' => 'Não há questões desta disciplina nesta avaliação.'], 404);
		}

		$this->respondJson([
			'ok' => true,
			'data' => [
				'correcao_id' => (int) ($correcao['id'] ?? 0),
				'avaliacao_id' => $avaliacaoId,
				'aluno_id' => $alunoId,
				'turma_id' => $turmaId,
				'avaliacao_nome' => trim((string) ($avaliacao['nome'] ?? 'Avaliação')),
				'aluno_nome' => trim((string) ($correcao['aluno_nome'] ?? '')),
				'turma_nome' => trim((string) ($correcao['turma_nome'] ?? '')),
				'disciplina' => $disciplina,
				'questoes' => $questoesDisciplina,
			],
		]);
	}

	public function institucionalNotasDesempenhoCorrecaoDisciplinaSalvar(): void
	{
		if (!$this->canAccessNotasDesempenhoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$csrfToken = (string) ($_POST['csrf_token'] ?? '');
		$sessionToken = (string) ($_SESSION['csrf_token'] ?? '');
		if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
			$this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Atualize a página e tente novamente.'], 419);
		}

		$correcaoId = (int) ($_POST['correcao_id'] ?? 0);
		$disciplina = trim((string) ($_POST['disciplina'] ?? ''));
		$respostasRaw = trim((string) ($_POST['respostas_disciplina_json'] ?? ''));
		if ($correcaoId <= 0 || $disciplina === '' || $respostasRaw === '') {
			$this->respondJson(['ok' => false, 'message' => 'Dados inválidos para salvar a correção.'], 422);
		}

		$respostasAtualizadas = json_decode($respostasRaw, true);
		if (!is_array($respostasAtualizadas)) {
			$this->respondJson(['ok' => false, 'message' => 'Formato inválido de respostas.'], 422);
		}

		$correcaoModel = new AvaliacaoCorrecaoModel();
		$correcao = $correcaoModel->findById($correcaoId);
		if (!is_array($correcao)) {
			$this->respondJson(['ok' => false, 'message' => 'Correção não encontrada.'], 404);
		}

		$avaliacaoId = (int) ($correcao['avaliacao_id'] ?? 0);
		$avaliacaoModel = new AvaliacaoModel();
		$avaliacao = $avaliacaoModel->findById($avaliacaoId);
		if (!is_array($avaliacao)) {
			$this->respondJson(['ok' => false, 'message' => 'Avaliação vinculada não encontrada.'], 404);
		}

		$turmaIdCorrecao = (int) ($correcao['turma_id'] ?? 0);
		$canAccessCorrecao = $this->canAccessInstitucionalAvaliacaoCorrecao($avaliacao);
		if (!$canAccessCorrecao) {
			try {
				$this->assertNotasDesempenhoScopeAllows($turmaIdCorrecao > 0 ? $turmaIdCorrecao : null, $disciplina);
				$canAccessCorrecao = true;
			} catch (Throwable) {
				$canAccessCorrecao = false;
			}
		}

		if (!$canAccessCorrecao) {
			$this->respondJson(['ok' => false, 'message' => 'Você não pode editar esta correção.'], 403);
		}

		$itens = $this->extractAvaliacaoQuestionItems($avaliacao);
		$disciplina = $this->resolveInstitutionalDisciplinaLabel($disciplina);
		$disciplinaNorm = $this->normalizeInstitutionalSearch($disciplina);
		$respostasCompletas = is_array($correcao['respostas'] ?? null) ? $correcao['respostas'] : [];

		foreach ($itens as $index => $item) {
			if (!is_array($item)) {
				continue;
			}

			$itemDisciplina = $this->resolveInstitutionalDisciplinaLabel((string) ($item['disciplina'] ?? ''));
			if ($this->normalizeInstitutionalSearch($itemDisciplina) !== $disciplinaNorm) {
				continue;
			}

			$questionNumber = $index + 1;
			$key = (string) $questionNumber;
			if (!array_key_exists($key, $respostasAtualizadas)) {
				continue;
			}

			$tipo = $this->normalizeInstitutionalQuestionType((string) ($item['tipo'] ?? ''));
			$rawResposta = $respostasAtualizadas[$key];

			if ($tipo === 'discursiva') {
				if ($rawResposta === null || $rawResposta === '') {
					$respostasCompletas[$key] = null;
				} else {
					$respostasCompletas[$key] = round((float) $rawResposta, 2);
				}
			} else {
				$answer = strtoupper(trim((string) ($rawResposta ?? '')));
				$respostasCompletas[$key] = $answer !== '' ? $answer : null;
			}
		}

		$computed = $this->buildInstitutionalCorrecoesSnapshot($itens, $respostasCompletas);

		$ok = $correcaoModel->updateById($correcaoId, [
			'numeracao' => trim((string) ($correcao['numeracao'] ?? '')),
			'qr_payload' => trim((string) ($correcao['qr_payload'] ?? '')),
			'respostas_json' => json_encode($computed['respostas'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
			'correcoes_json' => json_encode($computed['correcoes'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
			'acertos' => $computed['acertos'],
			'total_questoes' => $computed['total_questoes'],
			'pontuacao' => $computed['pontuacao'],
			'pontuacao_total' => $computed['pontuacao_total'],
			'percentual' => $computed['percentual'],
			'corrigido_em' => date('Y-m-d H:i:s'),
		]);

		if (!$ok) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a correção agora.'], 500);
		}

		try {
			$updated = $correcaoModel->findById($correcaoId);
			if (is_array($updated)) {
				$service = new AlunoDesempenhoService();
				$service->syncAutomaticRecord($avaliacao, $updated);
			}
		} catch (Throwable) {
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Correção atualizada com sucesso.',
		]);
	}

	public function agendamento(): void
	{
		if (!$this->canAccessAgendamentoSubservice()) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Agendamento', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function meusAgendamentos(): void
	{
		if (!$this->canAccessMeusAgendamentos()) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Meus Agendamentos', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function agendamentoListar(): void
	{
		if (!$this->canAccessAgendamentoSubservice()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$model = new AgendamentoModel();

		try {
			$model->ensureTableStructure();
			$model->seedDefaultItems();
			$items = $model->getItems(true);

			$escopo = trim((string) ($_GET['escopo'] ?? ''));

			$day = trim((string) ($_GET['data'] ?? ''));
			if ($escopo === 'todos') {
				$start = '1970-01-01 00:00:00';
				$end = '9999-12-31 23:59:59';
			} elseif ($day !== '') {
				$date = date_create($day);
				if ($date === false) {
					$this->respondJson(['ok' => false, 'message' => 'Data inválida.'], 422);
				}

				$start = $date->format('Y-m-d 00:00:00');
				$end = $date->format('Y-m-d 23:59:59');
			} else {
				$today = new DateTimeImmutable('today');
				$start = $today->format('Y-m-d 00:00:00');
				$end = $today->modify('+30 days')->format('Y-m-d 23:59:59');
			}

			$reservas = $model->getReservasByPeriod($start, $end);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível carregar os dados de agendamento.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'data' => [
				'itens' => $items,
				'reservas' => $reservas,
			],
		]);
	}

	public function agendamentoResponsaveisListar(): void
	{
		if (!$this->canAccessAgendamentoSubservice()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		try {
			$pdo = Database::connection();
			$rows = $pdo->query('SELECT id, nome, usuario, email FROM usuarios ORDER BY nome ASC')?->fetchAll() ?: [];
		} catch (Throwable) {
			$rows = [];
		}

		$responsaveis = [];
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$id = (int) ($row['id'] ?? 0);
			if ($id <= 0) {
				continue;
			}

			$nome = trim((string) ($row['nome'] ?? ''));
			if ($nome === '') {
				$nome = trim((string) ($row['usuario'] ?? ''));
			}
			if ($nome === '') {
				$nome = trim((string) ($row['email'] ?? ''));
			}

			if ($nome === '') {
				continue;
			}

			$responsaveis[] = [
				'id' => $id,
				'nome' => $nome,
			];
		}

		$this->respondJson([
			'ok' => true,
			'data' => [
				'responsaveis' => $responsaveis,
			],
		]);
	}

	public function meusAgendamentosListar(): void
	{
		if (!$this->canAccessMeusAgendamentos()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$usuarioId = (int) ($_SESSION['auth']['id'] ?? 0);
		if ($usuarioId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Usuário não autenticado.'], 401);
		}

		$model = new AgendamentoModel();

		try {
			$model->ensureTableStructure();
			$model->seedDefaultItems();
			$items = $model->getItems(false);

			$escopo = trim((string) ($_GET['escopo'] ?? ''));
			$isHistorico = $escopo === 'historico';

			$day = trim((string) ($_GET['data'] ?? ''));
			if ($day !== '') {
				$date = date_create($day);
				if ($date === false) {
					$this->respondJson(['ok' => false, 'message' => 'Data inválida.'], 422);
				}

				$start = $date->format('Y-m-d 00:00:00');
				$end = '9999-12-31 23:59:59';
				if ($isHistorico) {
					$start = '1970-01-01 00:00:00';
				}
			} else {
				if ($isHistorico) {
					$start = '1970-01-01 00:00:00';
				} else {
					$now = new DateTimeImmutable('now');
					$start = $now->format('Y-m-d H:i:00');
				}
				$end = '9999-12-31 23:59:59';
			}

			$reservas = $model->getReservasByUsuarioPeriod($usuarioId, $start, $end);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível carregar seus agendamentos.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'data' => [
				'itens' => $items,
				'reservas' => $reservas,
			],
		]);
	}

	public function meusAgendamentosDisponibilidade(): void
	{
		if (!$this->canAccessMeusAgendamentos()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$itemId = (int) ($_GET['item_id'] ?? 0);
		$data = trim((string) ($_GET['data'] ?? ''));
		$dataFim = trim((string) ($_GET['data_fim'] ?? ''));
		$ignoreId = (int) ($_GET['ignore_id'] ?? 0);
		$ownerToken = $this->sanitizeAgendamentoTempOwnerToken((string) ($_GET['owner_token'] ?? ''));

		if ($itemId <= 0 || $data === '') {
			$this->respondJson(['ok' => false, 'message' => 'Informe item e data para consultar disponibilidade.'], 422);
		}

		$startDate = date_create($data);
		if ($startDate === false) {
			$this->respondJson(['ok' => false, 'message' => 'Data inicial inválida.'], 422);
		}

		if ($dataFim === '') {
			$dataFim = $data;
		}

		$endDate = date_create($dataFim);
		if ($endDate === false) {
			$this->respondJson(['ok' => false, 'message' => 'Data final inválida.'], 422);
		}

		if ($dataFim < $data) {
			$this->respondJson(['ok' => false, 'message' => 'A data final não pode ser menor que a data inicial.'], 422);
		}

		$inicio = $startDate->format('Y-m-d 00:00:00');
		$fim = $endDate->format('Y-m-d 23:59:59');

		$model = new AgendamentoModel();

		try {
			$model->clearExpiredReservaLocks();
			$reservas = $model->getReservasByItemPeriod($itemId, $inicio, $fim, $ignoreId > 0 ? $ignoreId : 0);
			$locks = $model->getActiveLocksByItemPeriod($itemId, $inicio, $fim, $ownerToken);
			$reservas = array_merge($reservas, $locks);
			usort($reservas, static function (array $left, array $right): int {
				return strcmp((string) ($left['inicio'] ?? ''), (string) ($right['inicio'] ?? ''));
			});
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível carregar a disponibilidade do item.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'data' => [
				'reservas' => $reservas,
			],
		]);
	}

	public function meusAgendamentosLocksSync(): void
	{
		if (!$this->canAccessMeusAgendamentos()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$ownerToken = $this->sanitizeAgendamentoTempOwnerToken((string) ($_POST['owner_token'] ?? ''));
		$itemId = (int) ($_POST['item_id'] ?? 0);
		$ignoreId = (int) ($_POST['ignore_id'] ?? 0);
		$slotsJson = (string) ($_POST['slots_json'] ?? '[]');
		$usuarioId = (int) ($_SESSION['auth']['id'] ?? 0);

		if ($usuarioId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Usuário não autenticado.'], 401);
		}

		if ($ownerToken === '') {
			$this->respondJson(['ok' => false, 'message' => 'Token temporário inválido.'], 422);
		}

		$slots = json_decode($slotsJson, true);
		if (!is_array($slots)) {
			$slots = [];
		}

		$normalizedSlots = [];
		foreach ($slots as $slot) {
			if (!is_array($slot)) {
				continue;
			}

			$inicio = trim((string) ($slot['inicio'] ?? ''));
			$fim = trim((string) ($slot['fim'] ?? ''));
			if ($inicio === '' || $fim === '') {
				continue;
			}

			$inicioDate = date_create($inicio);
			$fimDate = date_create($fim);
			if ($inicioDate === false || $fimDate === false) {
				continue;
			}

			$inicioFormatado = $inicioDate->format('Y-m-d H:i:00');
			$fimFormatado = $fimDate->format('Y-m-d H:i:00');
			if ($inicioFormatado >= $fimFormatado) {
				continue;
			}

			$normalizedSlots[] = [
				'inicio' => $inicioFormatado,
				'fim' => $fimFormatado,
			];
		}

		$model = new AgendamentoModel();
		$responsavel = $this->resolveAgendamentoResponsavelNome($usuarioId);
		if ($responsavel === '') {
			$responsavel = 'Usuário em seleção';
		}

		try {
			if ($itemId <= 0 || $normalizedSlots === []) {
				$model->releaseTemporaryReservaLocksByOwner($ownerToken);
				$result = [
					'accepted_slots' => [],
					'rejected_slots' => [],
					'expires_at' => null,
				];
			} else {
				$item = $model->findItemById($itemId);
				if (!is_array($item) || (int) ($item['ativo'] ?? 0) !== 1) {
					$this->respondJson(['ok' => false, 'message' => 'Item indisponível para seleção temporária.'], 422);
				}

				$result = $model->syncTemporaryReservaLocks($itemId, $normalizedSlots, $ownerToken, $usuarioId, $responsavel, $ignoreId > 0 ? $ignoreId : 0);
			}
		} catch (Throwable $exception) {
			error_log('[meusAgendamentosLocksSync] ' . $exception->getMessage());
			$this->respondJson([
				'ok' => false,
				'message' => 'Não foi possível sincronizar a seleção temporária.',
				'debug' => [
					'error' => $exception->getMessage(),
				],
			], 500);
		}

		$this->respondJson([
			'ok' => true,
			'data' => $result,
		]);
	}

	public function meusAgendamentosLocksRelease(): void
	{
		if (!$this->canAccessMeusAgendamentos()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$ownerToken = $this->sanitizeAgendamentoTempOwnerToken((string) ($_POST['owner_token'] ?? ''));
		if ($ownerToken === '') {
			$this->respondJson(['ok' => true, 'data' => ['released' => false]]);
		}

		$model = new AgendamentoModel();
		try {
			$model->releaseTemporaryReservaLocksByOwner($ownerToken);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível liberar a seleção temporária.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'data' => ['released' => true],
		]);
	}

	public function agendamentoResumoMensal(): void
	{
		if (!$this->canAccessAgendamentoSubservice()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$model = new AgendamentoModel();
		$mes = trim((string) ($_GET['mes'] ?? ''));

		if ($mes !== '' && !preg_match('/^\d{4}-\d{2}$/', $mes)) {
			$this->respondJson(['ok' => false, 'message' => 'Mês inválido.'], 422);
		}

		try {
			$referencia = $mes !== ''
				? DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $mes . '-01 00:00:00')
				: new DateTimeImmutable('first day of this month 00:00:00');

			if (!$referencia instanceof DateTimeImmutable) {
				$this->respondJson(['ok' => false, 'message' => 'Mês inválido.'], 422);
			}

			$inicioMes = $referencia->format('Y-m-01 00:00:00');
			$fimMes = $referencia->modify('last day of this month')->format('Y-m-d 23:59:59');

			$rows = $model->getReservasResumoPorDia($inicioMes, $fimMes);
			$resumo = [];

			foreach ($rows as $row) {
				$dia = trim((string) ($row['dia'] ?? ''));
				if ($dia === '') {
					continue;
				}

				$resumo[$dia] = (int) ($row['total'] ?? 0);
			}
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível carregar o resumo mensal.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'data' => [
				'mes' => $referencia->format('Y-m'),
				'resumo' => $resumo,
			],
		]);
	}

	public function agendamentoItensSalvar(): void
	{
		if (!$this->canAccessAgendamentoSubservice()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$nome = trim((string) ($_POST['nome'] ?? ''));
		$descricao = trim((string) ($_POST['descricao'] ?? ''));
		$ativo = (string) ($_POST['ativo'] ?? '1') !== '0';

		if ($nome === '') {
			$this->respondJson(['ok' => false, 'message' => 'Informe o nome do item.'], 422);
		}

		$model = new AgendamentoModel();
		$removeImagem = (string) ($_POST['remover_imagem'] ?? '0') === '1';
		$currentImagePath = null;
		$newUploadedImagePath = null;

		try {
			if ($id > 0) {
				$existing = $model->findItemById($id);
				$currentImagePath = is_array($existing) ? trim((string) ($existing['imagem_path'] ?? '')) : null;
				if ($currentImagePath === '') {
					$currentImagePath = null;
				}
			}

			$itemId = $model->saveItem($id, $nome, $descricao !== '' ? $descricao : null, $ativo);
			$newUploadedImagePath = $this->handleAgendamentoItemImageUpload($_FILES['imagem'] ?? null, $itemId);

			$nextImagePath = $currentImagePath;
			if ($newUploadedImagePath !== null) {
				$nextImagePath = $newUploadedImagePath;
			} elseif ($removeImagem) {
				$nextImagePath = null;
			}

			if ($nextImagePath !== $currentImagePath) {
				$model->updateItemImagePath($itemId, $nextImagePath);

				if ($currentImagePath !== null && trim($currentImagePath) !== '') {
					$this->deleteAgendamentoItemImageByPath($currentImagePath);
				}
			}
		} catch (Throwable $exception) {
			if ($newUploadedImagePath !== null) {
				$this->deleteAgendamentoItemImageByPath($newUploadedImagePath);
			}

			$message = $exception->getMessage();
			if (stripos($message, 'duplicate') !== false) {
				$this->respondJson(['ok' => false, 'message' => 'Já existe item com este nome.'], 409);
			}

			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar o item agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => $id > 0 ? 'Item atualizado com sucesso.' : 'Item criado com sucesso.',
			'data' => ['id' => $itemId],
		]);
	}

	public function agendamentoItensExcluir(): void
	{
		if (!$this->canAccessAgendamentoSubservice()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Item inválido para exclusão.'], 422);
		}

		$model = new AgendamentoModel();
		$imagePath = null;

		try {
			$existing = $model->findItemById($id);
			$imagePath = is_array($existing) ? trim((string) ($existing['imagem_path'] ?? '')) : null;
			if ($imagePath === '') {
				$imagePath = null;
			}
			$model->deleteItem($id);

			if ($imagePath !== null && $imagePath !== '') {
				$this->deleteAgendamentoItemImageByPath($imagePath);
			}
		} catch (RuntimeException $exception) {
			$this->respondJson(['ok' => false, 'message' => $exception->getMessage()], 409);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir o item agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Item excluído com sucesso.']);
	}

	public function agendamentoReservasSalvar(): void
	{
		if (!$this->canAccessMeusAgendamentos()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$itemId = (int) ($_POST['item_id'] ?? 0);
		$responsavelInformado = trim((string) ($_POST['responsavel_nome'] ?? ''));
		$observacao = trim((string) ($_POST['observacao'] ?? ''));
		$data = trim((string) ($_POST['data'] ?? ''));
		$dataFim = trim((string) ($_POST['data_fim'] ?? ''));
		$horaInicio = trim((string) ($_POST['hora_inicio'] ?? ''));
		$horaFim = trim((string) ($_POST['hora_fim'] ?? ''));
		$ownerToken = $this->sanitizeAgendamentoTempOwnerToken((string) ($_POST['owner_token'] ?? ''));

		$usuarioId = (int) ($_SESSION['auth']['id'] ?? 0);
		if ($usuarioId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Faça login novamente.'], 401);
		}

		$isAgendamentoManager = $this->canAccessAgendamentoSubservice();
		$model = new AgendamentoModel();
		$existingReserva = null;

		if ($id > 0) {
			try {
				$existingReserva = $model->findReservaById($id);
			} catch (Throwable) {
				$existingReserva = null;
			}

			if (!is_array($existingReserva)) {
				$this->respondJson(['ok' => false, 'message' => 'Reserva não encontrada.'], 404);
			}

			if (!$isAgendamentoManager) {
				$ownerId = (int) ($existingReserva['usuario_id'] ?? 0);
				if ($ownerId <= 0 || $ownerId !== $usuarioId) {
					$this->respondJson(['ok' => false, 'message' => 'Você só pode editar suas próprias reservas.'], 403);
				}
			}
		}

		$inicio = '';
		$fim = '';

		if ($id > 0 && !$isAgendamentoManager) {
			$itemId = (int) ($existingReserva['item_id'] ?? 0);
			$inicio = trim((string) ($existingReserva['inicio'] ?? ''));
			$fim = trim((string) ($existingReserva['fim'] ?? ''));
		} else {
			if ($itemId <= 0 || $data === '' || $horaInicio === '') {
				$this->respondJson(['ok' => false, 'message' => 'Preencha todos os campos obrigatórios da reserva.'], 422);
			}

			if ($dataFim === '') {
				$dataFim = $data;
			}

			if ($dataFim < $data) {
				$dataFim = $data;
			}

			if ($horaFim === '') {
				$horaFim = $dataFim > $data ? '23:59' : '';
			}

			if ($horaFim === '') {
				$this->respondJson(['ok' => false, 'message' => 'Informe o horário final da reserva.'], 422);
			}

			$inicioDate = date_create($data . ' ' . $horaInicio);
			$fimDate = date_create($dataFim . ' ' . $horaFim);

			if ($inicioDate === false || $fimDate === false) {
				$this->respondJson(['ok' => false, 'message' => 'Data ou horário inválido.'], 422);
			}

			$inicio = $inicioDate->format('Y-m-d H:i:00');
			$fim = $fimDate->format('Y-m-d H:i:00');

			if ($inicio >= $fim) {
				$this->respondJson(['ok' => false, 'message' => 'O horário final deve ser maior que o inicial.'], 422);
			}

			try {
				$item = $model->findItemById($itemId);
			} catch (Throwable) {
				$item = null;
			}

			if (!is_array($item) || (int) ($item['ativo'] ?? 0) !== 1) {
				$this->respondJson(['ok' => false, 'message' => 'Item indisponível para reserva.'], 422);
			}

			try {
				if ($model->hasConflict($itemId, $inicio, $fim, $id)) {
					$this->respondJson(['ok' => false, 'message' => 'Este horário já está reservado para o item selecionado.'], 409);
				}

				if ($model->hasActiveLockConflict($itemId, $inicio, $fim, $ownerToken)) {
					$this->respondJson(['ok' => false, 'message' => 'Este horário está temporariamente selecionado por outro usuário.'], 409);
				}
			} catch (Throwable) {
				$this->respondJson(['ok' => false, 'message' => 'Não foi possível validar conflito de horário.'], 500);
			}
		}

		$responsavel = $this->resolveAgendamentoResponsavelNome($usuarioId);
		if ($id > 0 && !$isAgendamentoManager && is_array($existingReserva)) {
			$responsavelExistente = trim((string) ($existingReserva['responsavel_nome'] ?? ''));
			if ($responsavelExistente !== '') {
				$responsavel = $responsavelExistente;
			}
		} elseif ($isAgendamentoManager && $responsavelInformado !== '') {
			$responsavel = $responsavelInformado;
		}
		if ($responsavel === '') {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível identificar o usuário responsável.'], 422);
		}

		try {
			$reservaId = $model->saveReserva(
				$id,
				$itemId,
				$responsavel,
				$observacao !== '' ? $observacao : null,
				$inicio,
				$fim,
				$usuarioId > 0 ? $usuarioId : null
			);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a reserva agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => $id > 0 ? 'Reserva atualizada com sucesso.' : 'Reserva criada com sucesso.',
			'data' => ['id' => $reservaId],
		]);
	}

	private function resolveAgendamentoResponsavelNome(int $usuarioId): string
	{
		if ($usuarioId <= 0) {
			return '';
		}

		try {
			$authModel = new AuthModel();
			$user = $authModel->findById($usuarioId);
			if (is_array($user)) {
				$nome = trim((string) ($user['nome'] ?? ''));
				if ($nome !== '') {
					return $nome;
				}
			}
		} catch (Throwable) {
		}

		$sessionNome = trim((string) ($_SESSION['auth']['nome'] ?? ''));
		if ($sessionNome !== '') {
			return $sessionNome;
		}

		$sessionUsuario = trim((string) ($_SESSION['auth']['usuario'] ?? ''));
		if ($sessionUsuario !== '') {
			return $sessionUsuario;
		}

		$sessionEmail = trim((string) ($_SESSION['auth']['email'] ?? ''));
		if ($sessionEmail !== '') {
			return $sessionEmail;
		}

		return '';
	}

	public function agendamentoReservasExcluir(): void
	{
		if (!$this->canAccessMeusAgendamentos()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Reserva inválida para exclusão.'], 422);
		}

		$model = new AgendamentoModel();
		$usuarioId = (int) ($_SESSION['auth']['id'] ?? 0);
		$isAgendamentoManager = $this->canAccessAgendamentoSubservice();

		if (!$isAgendamentoManager) {
			if ($usuarioId <= 0) {
				$this->respondJson(['ok' => false, 'message' => 'Sessão inválida. Faça login novamente.'], 401);
			}

			try {
				$existingReserva = $model->findReservaById($id);
			} catch (Throwable) {
				$existingReserva = null;
			}

			if (!is_array($existingReserva)) {
				$this->respondJson(['ok' => false, 'message' => 'Reserva não encontrada.'], 404);
			}

			$ownerId = (int) ($existingReserva['usuario_id'] ?? 0);
			if ($ownerId <= 0 || $ownerId !== $usuarioId) {
				$this->respondJson(['ok' => false, 'message' => 'Você só pode excluir suas próprias reservas.'], 403);
			}

			$inicioRaw = trim((string) ($existingReserva['inicio'] ?? ''));
			$inicioDate = $inicioRaw !== '' ? date_create($inicioRaw) : false;
			if ($inicioDate === false) {
				$this->respondJson(['ok' => false, 'message' => 'Não foi possível validar a data da reserva para exclusão.'], 422);
			}

			$reservaDia = $inicioDate->format('Y-m-d');
			$hoje = (new DateTimeImmutable('today'))->format('Y-m-d');
			if ($reservaDia <= $hoje) {
				$this->respondJson(['ok' => false, 'message' => 'Você só pode excluir agendamentos de data futura.'], 403);
			}
		}

		try {
			$model->deleteReserva($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a reserva agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Reserva excluída com sucesso.']);
	}

	public function institucionalSubservico(): void
	{
		$subserviceKey = $this->normalizePermissionToken((string) ($_GET['key'] ?? ''));

		if ($subserviceKey === '' || !$this->canAccessSubservice($subserviceKey)) {
			$this->redirect('/404');
		}

		$subserviceName = $this->findSubserviceNameByKey($subserviceKey) ?? $this->humanizeSubserviceName($subserviceKey);

		if ($this->isAvaliacoesSubserviceKey($subserviceKey)) {
			$this->avaliacoes();
			return;
		}

		if ($subserviceKey === 'cadastro_de_turmas') {
			$this->institucionalTurmas();
			return;
		}

		if ($subserviceKey === 'cadastro_de_estudantes') {
			$this->institucionalEstudantes();
			return;
		}

		if ($subserviceKey === 'modulacao' || $subserviceKey === 'modulacao_e_horarios') {
			$this->institucionalModulacao();
			return;
		}

		if ($subserviceKey === 'cadastro_de_habilidades') {
			$this->institucionalHabilidades();
			return;
		}

		if ($subserviceKey === 'agendamento') {
			$this->agendamento();
			return;
		}

		if ($subserviceKey === 'meus_agendamentos') {
			$this->meusAgendamentos();
			return;
		}

		if ($subserviceKey === 'corretor_de_gabaritos') {
			$this->corretorGabaritos();
			return;
		}

		$subserviceHtmlPath = $this->resolveSubserviceHtmlPath($subserviceKey, $subserviceName);
		if ($subserviceHtmlPath !== null) {
			$this->render('home/Institucional/institucional-subservico-frame', [
				'schoolName' => SCHOOL_NAME,
				'subserviceName' => $subserviceName,
				'subserviceKey' => $subserviceKey,
			]);
			return;
		}

		$this->render('home/Institucional/institucional-subservico', [
			'schoolName' => SCHOOL_NAME,
			'subserviceName' => $subserviceName,
		]);
	}

	private function parseAlunoImportSpreadsheetMatrix(string $filePath): array
	{
		$archiveEntries = $this->readXlsxArchiveEntries($filePath);
		$sharedStrings = $this->readXlsxSharedStrings($archiveEntries);
		$sheetPath = $this->resolveFirstWorksheetPath($archiveEntries);
		$sheetXml = $archiveEntries[$sheetPath] ?? null;
		if (!is_string($sheetXml) || trim($sheetXml) === '') {
			throw new RuntimeException('A primeira aba da planilha está vazia ou inválida.');
		}

		$sheet = @simplexml_load_string($sheetXml);
		if (!$sheet instanceof SimpleXMLElement) {
			throw new RuntimeException('Não foi possível interpretar os dados da planilha.');
		}

		$rowNodes = $sheet->xpath('//*[local-name()="sheetData"]/*[local-name()="row"]');
		if (!is_array($rowNodes) || $rowNodes === []) {
			return [
				'headers' => [],
				'rows' => [],
			];
		}

		$headers = [];
		$result = [];
		$headerRowProcessed = false;

		foreach ($rowNodes as $rowNode) {
			if (!$rowNode instanceof SimpleXMLElement) {
				continue;
			}

			$cells = [];
			$cellNodes = $rowNode->xpath('./*[local-name()="c"]');
			if (!is_array($cellNodes)) {
				$cellNodes = [];
			}

			foreach ($cellNodes as $cellNode) {
				if (!$cellNode instanceof SimpleXMLElement) {
					continue;
				}

				$reference = (string) ($cellNode['r'] ?? '');
				$columnIndex = $this->xlsxColumnReferenceToIndex($reference);
				$cells[$columnIndex] = $this->extractXlsxCellValue($cellNode, $sharedStrings);
			}

			if ($cells === []) {
				continue;
			}

			ksort($cells);
			if (!$headerRowProcessed) {
				$maxColumnIndex = max(array_keys($cells));
				for ($columnIndex = 0; $columnIndex <= $maxColumnIndex; $columnIndex += 1) {
					$headerText = trim((string) ($cells[$columnIndex] ?? ''));
					$headers[] = $headerText !== '' ? $headerText : ('Coluna ' . ($columnIndex + 1));
				}
				$headerRowProcessed = true;
				continue;
			}

			$lineNumber = (int) ($rowNode['r'] ?? 0);
			if ($lineNumber <= 0) {
				$lineNumber = count($result) + 2;
			}

			$rowValues = [];
			$maxColumnIndex = $headers !== [] ? (count($headers) - 1) : max(array_keys($cells));
			for ($columnIndex = 0; $columnIndex <= $maxColumnIndex; $columnIndex += 1) {
				$rowValues[] = isset($cells[$columnIndex]) ? (string) $cells[$columnIndex] : '';
			}

			$result[] = [
				'line' => $lineNumber,
				'values' => $rowValues,
			];
		}

		return [
			'headers' => $headers,
			'rows' => $result,
		];
	}

	private function readXlsxArchiveEntries(string $filePath): array
	{
		if (!is_file($filePath) || !is_readable($filePath)) {
			throw new RuntimeException('Não foi possível acessar a planilha XLSX enviada.');
		}

		if (class_exists('ZipArchive')) {
			$zip = new ZipArchive();
			if ($zip->open($filePath) === true) {
				try {
					$entries = [];
					$fileCount = (int) $zip->numFiles;
					for ($index = 0; $index < $fileCount; $index += 1) {
						$entryName = $zip->getNameIndex($index);
						if (!is_string($entryName) || $entryName === '' || str_ends_with($entryName, '/')) {
							continue;
						}

						$entryContent = $zip->getFromIndex($index);
						if (is_string($entryContent)) {
							$entries[str_replace('\\', '/', $entryName)] = $entryContent;
						}
					}

					if ($entries !== []) {
						return $entries;
					}
				} finally {
					$zip->close();
				}
			}
		}

		$binaryContent = @file_get_contents($filePath);
		if (!is_string($binaryContent) || $binaryContent === '') {
			throw new RuntimeException('Não foi possível abrir a planilha XLSX enviada.');
		}

		return $this->extractZipEntriesFromBinary($binaryContent);
	}

	private function extractZipEntriesFromBinary(string $binaryContent): array
	{
		$eocdOffset = strrpos($binaryContent, "\x50\x4b\x05\x06");
		if ($eocdOffset === false) {
			throw new RuntimeException('O arquivo enviado não é um XLSX ZIP válido.');
		}

		$eocd = unpack(
			'vdisk_number/vcentral_directory_disk/ventries_on_disk/ventries_total/Vcentral_directory_size/Vcentral_directory_offset/vcomment_length',
			substr($binaryContent, $eocdOffset + 4, 18)
		);
		if (!is_array($eocd)) {
			throw new RuntimeException('Não foi possível interpretar a estrutura ZIP da planilha.');
		}

		$offset = (int) ($eocd['central_directory_offset'] ?? 0);
		$entriesTotal = (int) ($eocd['entries_total'] ?? 0);
		$entries = [];

		for ($entryIndex = 0; $entryIndex < $entriesTotal; $entryIndex += 1) {
			$signature = substr($binaryContent, $offset, 4);
			if ($signature !== "\x50\x4b\x01\x02") {
				throw new RuntimeException('A planilha XLSX possui um diretório ZIP inválido.');
			}

			$centralHeader = unpack(
				'vversion_made_by/vversion_needed/vflags/vcompression_method/vmod_time/vmod_date/Vcrc32/Vcompressed_size/Vuncompressed_size/vfile_name_length/vextra_length/vcomment_length/vdisk_number_start/vinternal_attributes/Vexternal_attributes/Vlocal_header_offset',
				substr($binaryContent, $offset + 4, 42)
			);
			if (!is_array($centralHeader)) {
				throw new RuntimeException('Não foi possível interpretar os arquivos internos da planilha.');
			}

			$fileNameLength = (int) ($centralHeader['file_name_length'] ?? 0);
			$extraLength = (int) ($centralHeader['extra_length'] ?? 0);
			$commentLength = (int) ($centralHeader['comment_length'] ?? 0);
			$fileName = substr($binaryContent, $offset + 46, $fileNameLength);
			$fileName = str_replace('\\', '/', (string) $fileName);

			$offset += 46 + $fileNameLength + $extraLength + $commentLength;

			if ($fileName === '' || str_ends_with($fileName, '/')) {
				continue;
			}

			$entries[$fileName] = $this->extractZipEntryContentFromBinary($binaryContent, $centralHeader);
		}

		return $entries;
	}

	private function extractZipEntryContentFromBinary(string $binaryContent, array $centralHeader): string
	{
		$localHeaderOffset = (int) ($centralHeader['local_header_offset'] ?? 0);
		$localSignature = substr($binaryContent, $localHeaderOffset, 4);
		if ($localSignature !== "\x50\x4b\x03\x04") {
			throw new RuntimeException('A planilha XLSX possui um arquivo interno inválido.');
		}

		$localHeader = unpack(
			'vversion_needed/vflags/vcompression_method/vmod_time/vmod_date/Vcrc32/Vcompressed_size/Vuncompressed_size/vfile_name_length/vextra_length',
			substr($binaryContent, $localHeaderOffset + 4, 26)
		);
		if (!is_array($localHeader)) {
			throw new RuntimeException('Não foi possível interpretar um arquivo interno da planilha.');
		}

		$flags = (int) ($centralHeader['flags'] ?? $localHeader['flags'] ?? 0);
		if (($flags & 0x0001) !== 0) {
			throw new RuntimeException('A planilha XLSX está protegida ou criptografada e não pode ser importada.');
		}

		$compressionMethod = (int) ($centralHeader['compression_method'] ?? $localHeader['compression_method'] ?? 0);
		$compressedSize = (int) ($centralHeader['compressed_size'] ?? $localHeader['compressed_size'] ?? 0);
		$fileNameLength = (int) ($localHeader['file_name_length'] ?? 0);
		$extraLength = (int) ($localHeader['extra_length'] ?? 0);
		$dataOffset = $localHeaderOffset + 30 + $fileNameLength + $extraLength;
		$compressedData = substr($binaryContent, $dataOffset, $compressedSize);

		if ($compressionMethod === 0) {
			return $compressedData;
		}

		if ($compressionMethod === 8) {
			$inflated = @gzinflate($compressedData);
			if ($inflated === false && function_exists('zlib_decode')) {
				$inflated = @zlib_decode($compressedData);
			}
			if (!is_string($inflated)) {
				throw new RuntimeException('O servidor não conseguiu descompactar a planilha XLSX enviada.');
			}

			return $inflated;
		}

		throw new RuntimeException('A planilha XLSX usa um formato de compactação não suportado pelo servidor.');
	}

	private function readXlsxSharedStrings(array $archiveEntries): array
	{
		$xml = $archiveEntries['xl/sharedStrings.xml'] ?? null;
		if (!is_string($xml) || trim($xml) === '') {
			return [];
		}

		$document = @simplexml_load_string($xml);
		if (!$document instanceof SimpleXMLElement) {
			return [];
		}

		$result = [];
		foreach ($document->si as $item) {
			if (!$item instanceof SimpleXMLElement) {
				continue;
			}

			$text = '';
			if (isset($item->t)) {
				$text .= (string) $item->t;
			}

			if (isset($item->r)) {
				foreach ($item->r as $run) {
					$text .= (string) ($run->t ?? '');
				}
			}

			$result[] = trim($text);
		}

		return $result;
	}

	private function resolveFirstWorksheetPath(array $archiveEntries): string
	{
		$workbookRelsXml = $archiveEntries['xl/_rels/workbook.xml.rels'] ?? null;
		if (is_string($workbookRelsXml) && trim($workbookRelsXml) !== '') {
			$rels = @simplexml_load_string($workbookRelsXml);
			if ($rels instanceof SimpleXMLElement) {
				$relationshipNodes = $rels->xpath('//*[local-name()="Relationship"]');
				if (!is_array($relationshipNodes)) {
					$relationshipNodes = [];
				}

				foreach ($relationshipNodes as $relationship) {
					$type = (string) ($relationship['Type'] ?? '');
					$target = (string) ($relationship['Target'] ?? '');
					if (str_ends_with($type, '/worksheet') && $target !== '') {
						return str_starts_with($target, 'xl/') ? $target : 'xl/' . ltrim($target, '/');
					}
				}
			}
		}

		$defaultPath = 'xl/worksheets/sheet1.xml';
		if (isset($archiveEntries[$defaultPath])) {
			return $defaultPath;
		}

		throw new RuntimeException('Não foi possível localizar a primeira aba da planilha XLSX.');
	}

	private function extractXlsxCellValue(SimpleXMLElement $cellNode, array $sharedStrings)
	{
		$type = (string) ($cellNode['t'] ?? '');
		if ($type === 'inlineStr') {
			$text = '';
			if (isset($cellNode->is->t)) {
				$text .= (string) $cellNode->is->t;
			}
			if (isset($cellNode->is->r)) {
				foreach ($cellNode->is->r as $run) {
					$text .= (string) ($run->t ?? '');
				}
			}
			return trim($text);
		}

		$value = isset($cellNode->v) ? (string) $cellNode->v : '';
		if ($type === 's') {
			$sharedIndex = (int) $value;
			return $sharedStrings[$sharedIndex] ?? '';
		}

		if ($type === 'b') {
			return $value === '1' ? '1' : '0';
		}

		return trim($value);
	}

	private function xlsxColumnReferenceToIndex(string $reference): int
	{
		if ($reference === '') {
			return 0;
		}

		$letters = preg_replace('/[^A-Z]/i', '', strtoupper($reference));
		$letters = is_string($letters) ? $letters : '';
		if ($letters === '') {
			return 0;
		}

		$index = 0;
		$length = strlen($letters);
		for ($i = 0; $i < $length; $i++) {
			$index = ($index * 26) + (ord($letters[$i]) - 64);
		}

		return max(0, $index - 1);
	}

	private function inferAlunoImportColumnMapping(array $headers): array
	{
		$mapping = [
			'nome' => null,
			'matricula' => null,
			'turma' => null,
			'data_nascimento' => null,
			'data_entrada' => null,
			'data_saida' => null,
			'rg' => null,
			'cpf' => null,
			'necessidade_deficiencia' => null,
			'responsavel' => null,
			'telefone' => null,
			'email' => null,
		];

		foreach ($headers as $columnIndex => $value) {
			$headerKey = $this->normalizeImportKey((string) $value);
			$field = match ($headerKey) {
				'turma', 'serie', 'classe' => 'turma',
				'matricula', 'registro', 'ra' => 'matricula',
				'nome', 'nomecompleto', 'aluno', 'nomedoaluno' => 'nome',
				'datanascimento', 'nascimento', 'dtnascimento', 'datanasc' => 'data_nascimento',
				'entrada', 'dataentrada', 'dtentrada' => 'data_entrada',
				'datadesaida', 'datasaida', 'saida', 'dtsaida' => 'data_saida',
				'rg', 'identidade' => 'rg',
				'cpf' => 'cpf',
				'necessidadedeficiencia', 'necessidadedeficiencias', 'deficiencia', 'necessidade', 'necessidadeespecial', 'necessidadeespeciais' => 'necessidade_deficiencia',
				'responsavel', 'nomeresponsavel' => 'responsavel',
				'telefone', 'fone', 'celular', 'telefonecelular' => 'telefone',
				'email', 'correioeletronico' => 'email',
				default => null,
			};

			if ($field !== null && !array_key_exists($field, $mapping)) {
				continue;
			}

			if ($field !== null && $mapping[$field] === null) {
				$mapping[$field] = (int) $columnIndex;
			}
		}

		return $mapping;
	}

	private function buildAlunoImportRowsFromSpreadsheetMatrix(array $spreadsheetData, array $mapping): array
	{
		$rawRows = isset($spreadsheetData['rows']) && is_array($spreadsheetData['rows']) ? $spreadsheetData['rows'] : [];
		$result = [];

		foreach ($rawRows as $rawRow) {
			if (!is_array($rawRow)) {
				continue;
			}

			$values = isset($rawRow['values']) && is_array($rawRow['values']) ? $rawRow['values'] : [];
			$lineNumber = (int) ($rawRow['line'] ?? 0);

			$result[] = [
				'line' => $lineNumber,
				'selected' => true,
				'nome' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['nome'] ?? null), 150) ?? ''),
				'matricula' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['matricula'] ?? null), 30) ?? ''),
				'turma' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['turma'] ?? null), 150) ?? ''),
				'data_nascimento' => $this->normalizeImportedDateValue($this->extractAlunoImportMatrixValue($values, $mapping['data_nascimento'] ?? null)),
				'data_entrada' => $this->normalizeImportedDateValue($this->extractAlunoImportMatrixValue($values, $mapping['data_entrada'] ?? null)),
				'data_saida' => $this->normalizeImportedDateValue($this->extractAlunoImportMatrixValue($values, $mapping['data_saida'] ?? null)),
				'rg' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['rg'] ?? null), 20) ?? ''),
				'cpf' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['cpf'] ?? null), 20) ?? ''),
				'necessidade_deficiencia' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['necessidade_deficiencia'] ?? null), 255) ?? ''),
				'responsavel' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['responsavel'] ?? null), 150) ?? ''),
				'telefone' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['telefone'] ?? null), 25) ?? ''),
				'email' => (string) ($this->normalizeNullableText($this->extractAlunoImportMatrixValue($values, $mapping['email'] ?? null), 180) ?? ''),
			];
		}

		return $result;
	}

	private function extractAlunoImportMatrixValue(array $values, $columnIndex): ?string
	{
		if (!is_int($columnIndex) || $columnIndex < 0) {
			return null;
		}

		if (!array_key_exists($columnIndex, $values)) {
			return null;
		}

		return is_scalar($values[$columnIndex]) ? (string) $values[$columnIndex] : null;
	}

	public function institucionalHabilidadesListar(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_habilidades') && !$this->canAccessNotasDesempenhoCatalog()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$model = new HabilidadeModel();
		$disciplinaModel = new DisciplinaModel();

		try {
			$habilidades = $model->getAllOrdered();
		} catch (Throwable) {
			$habilidades = [];
		}

		try {
			$disciplinas = $disciplinaModel->getSimpleOptions();
		} catch (Throwable) {
			$disciplinas = [];
		}

		$this->respondJson([
			'ok' => true,
			'habilidades' => $habilidades,
			'disciplinas' => $disciplinas,
		]);
	}

	public function institucionalHabilidadesSalvar(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_habilidades')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$payload = $this->getJsonOrPostPayload();
		$disciplinasByName = $this->buildDisciplinasByNormalizedName();
		$normalized = $this->normalizeHabilidadePayload($payload, $disciplinasByName);

		if ($normalized['codigo'] === '' || $normalized['descricao'] === '' || $normalized['ano_escolar'] === '' || $normalized['disciplina_id'] <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Preencha código, descrição, disciplina e ano escolar.'], 422);
		}

		$model = new HabilidadeModel();

		try {
			$id = $model->save($normalized);
			$saved = $model->findById($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível salvar a habilidade agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Habilidade salva com sucesso.',
			'habilidade' => $saved,
		]);
	}

	public function institucionalHabilidadesExcluir(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_habilidades')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$payload = $this->getJsonOrPostPayload();
		$id = (int) ($payload['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Habilidade inválida para exclusão.'], 422);
		}

		$model = new HabilidadeModel();

		try {
			$existing = $model->findById($id);
		} catch (Throwable) {
			$existing = null;
		}

		if (!is_array($existing)) {
			$this->respondJson(['ok' => false, 'message' => 'Habilidade não encontrada.'], 404);
		}

		try {
			$model->delete($id);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível excluir a habilidade agora.'], 500);
		}

		$this->respondJson(['ok' => true, 'message' => 'Habilidade excluída com sucesso.']);
	}

	public function institucionalHabilidadesImportar(): void
	{
		if (!$this->canAccessSubservice('cadastro_de_habilidades')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$payload = $this->getJsonOrPostPayload();
		$linhas = isset($payload['linhas']) && is_array($payload['linhas']) ? $payload['linhas'] : [];

		if ($linhas === []) {
			$this->respondJson(['ok' => false, 'message' => 'Nenhuma linha válida para importação.'], 422);
		}

		$disciplinasByName = $this->buildDisciplinasByNormalizedName();
		$rows = [];
		foreach ($linhas as $linha) {
			if (!is_array($linha)) {
				continue;
			}

			$normalized = $this->normalizeHabilidadePayload($linha, $disciplinasByName);
			if ($normalized['codigo'] === '' || $normalized['descricao'] === '' || $normalized['ano_escolar'] === '' || $normalized['disciplina_id'] <= 0) {
				continue;
			}

			$rows[] = $normalized;
		}

		if ($rows === []) {
			$this->respondJson(['ok' => false, 'message' => 'Nenhuma linha pôde ser importada. Verifique disciplina, ano escolar e descrição.'], 422);
		}

		$model = new HabilidadeModel();

		try {
			$total = $model->upsertMany($rows);
		} catch (Throwable) {
			$this->respondJson(['ok' => false, 'message' => 'Não foi possível importar as habilidades agora.'], 500);
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Importação concluída com sucesso.',
			'total' => $total,
		]);
	}

	private function getJsonOrPostPayload(): array
	{
		$contentType = strtolower(trim((string) ($_SERVER['CONTENT_TYPE'] ?? '')));
		if (str_contains($contentType, 'application/json')) {
			$raw = file_get_contents('php://input');
			$decoded = json_decode((string) $raw, true);
			return is_array($decoded) ? $decoded : [];
		}

		if ($_POST !== []) {
			return $_POST;
		}

		$raw = file_get_contents('php://input');
		$decoded = json_decode((string) $raw, true);
		return is_array($decoded) ? $decoded : [];
	}

	private function buildDisciplinasByNormalizedName(): array
	{
		$model = new DisciplinaModel();
		try {
			$disciplinas = $model->getSimpleOptions();
		} catch (Throwable) {
			$disciplinas = [];
		}

		$result = [];
		foreach ($disciplinas as $disciplina) {
			if (!is_array($disciplina)) {
				continue;
			}

			$id = (int) ($disciplina['id'] ?? 0);
			$nome = trim((string) ($disciplina['nome'] ?? ''));
			if ($id <= 0 || $nome === '') {
				continue;
			}

			$key = $this->normalizeImportKey($nome);
			if ($key !== '') {
				$result[$key] = $id;
			}
		}

		return $result;
	}

	private function normalizeHabilidadePayload(array $payload, array $disciplinasByName): array
	{
		$codigo = strtoupper(trim((string) ($payload['codigo'] ?? '')));
		$descricao = trim((string) ($payload['descricao'] ?? ''));
		$tipo = trim((string) ($payload['tipo'] ?? 'Habilidade'));
		$documento = strtoupper(trim((string) ($payload['documento'] ?? 'BNCC')));
		$anoEscolarRaw = trim((string) ($payload['ano_escolar'] ?? ($payload['anoEscolar'] ?? '')));
		// Normalizar ano_escolar para formato numérico: "1º, 2º, 3º" → "1,2,3"
		preg_match_all('/\d+/', $anoEscolarRaw, $anoMatches);
		$anoNums = array_unique($anoMatches[0] ?? []);
		sort($anoNums, SORT_NUMERIC);
		$anoEscolar = implode(',', $anoNums);
		$etapaEnsino = trim((string) ($payload['etapa_ensino'] ?? 'Ensino Fundamental'));
		$disciplinaId = (int) ($payload['disciplina_id'] ?? ($payload['disciplinaId'] ?? 0));

		if ($disciplinaId <= 0) {
			$disciplinaNome = trim((string) ($payload['disciplina_nome'] ?? ''));
			$key = $this->normalizeImportKey($disciplinaNome);
			if ($key !== '' && isset($disciplinasByName[$key])) {
				$disciplinaId = (int) $disciplinasByName[$key];
			}
		}

		if ($disciplinaId <= 0 && preg_match('/^EF\d{2}([A-Z]{2})\d{2}$/', $codigo, $matches) === 1) {
			$sigla = strtoupper((string) ($matches[1] ?? ''));
			$disciplinaBySigla = match ($sigla) {
				'AR' => 'Arte',
				'CI' => 'Ciências',
				'EF' => 'Educação Física',
				'ER', 'HI' => 'História',
				'GE' => 'Geografia',
				'LI' => 'Língua Inglesa',
				'LP' => 'Língua Portuguesa',
				'MA' => 'Matemática',
				default => '',
			};

			if ($disciplinaBySigla !== '') {
				$key = $this->normalizeImportKey($disciplinaBySigla);
				if ($key !== '' && isset($disciplinasByName[$key])) {
					$disciplinaId = (int) $disciplinasByName[$key];
				}
			}
		}

		return [
			'id' => (int) ($payload['id'] ?? 0),
			'codigo' => $codigo,
			'descricao' => $descricao,
			'tipo' => $tipo !== '' ? $tipo : 'Habilidade',
			'documento' => $documento !== '' ? $documento : 'BNCC',
			'disciplina_id' => $disciplinaId,
			'ano_escolar' => $anoEscolar,
			'etapa_ensino' => $etapaEnsino !== '' ? $etapaEnsino : 'Ensino Fundamental',
			'unidade_tematica' => trim((string) ($payload['unidade_tematica'] ?? '')),
			'objeto_conhecimento' => trim((string) ($payload['objeto_conhecimento'] ?? '')),
			'habilidade_complementar' => trim((string) ($payload['habilidade_complementar'] ?? '')),
			'ativo' => (int) (($payload['ativo'] ?? 1) ? 1 : 0),
		];
	}

	private function normalizeImportKey(string $value): string
	{
		$normalized = $this->normalizePermissionToken($value);
		return str_replace('_', '', $normalized);
	}

	private function normalizeImportedDateValue($value): ?string
	{
		$raw = trim((string) ($value ?? ''));
		if ($raw === '') {
			return null;
		}

		if (is_numeric($raw)) {
			$serial = (float) $raw;
			if ($serial > 0) {
				$timestamp = (int) round(($serial - 25569) * 86400);
				if ($timestamp > 0) {
					return gmdate('Y-m-d', $timestamp);
				}
			}
		}

		$dateFormats = ['Y-m-d', 'd/m/Y', 'd-m-Y', 'd.m.Y', 'm/d/Y'];
		foreach ($dateFormats as $format) {
			$date = DateTimeImmutable::createFromFormat($format, $raw);
			if ($date instanceof DateTimeImmutable) {
				return $date->format('Y-m-d');
			}
		}

		$date = date_create($raw);
		if ($date === false) {
			return null;
		}

		return $date->format('Y-m-d');
	}

	private function normalizeNullableText($value, int $maxLength): ?string
	{
		$text = trim((string) ($value ?? ''));
		if ($text === '') {
			return null;
		}

		if ($maxLength > 0) {
			$text = mb_substr($text, 0, $maxLength);
		}

		return $text;
	}

	private function normalizeIntListParam($value, int $min, int $max): array
	{
		$rawItems = [];

		if (is_array($value)) {
			$rawItems = $value;
		} else {
			$raw = trim((string) $value);
			if ($raw !== '') {
				$rawItems = preg_split('/[\s,;|]+/u', $raw) ?: [];
			}
		}

		$result = [];
		foreach ($rawItems as $item) {
			if (!is_scalar($item)) {
				continue;
			}
			$number = (int) trim((string) $item);
			if ($number < $min || $number > $max) {
				continue;
			}
			$result[$number] = $number;
		}

		return array_values($result);
	}

	public function institucionalSubservicoConteudo(): void
	{
		$subserviceKey = $this->normalizePermissionToken((string) ($_GET['key'] ?? ''));

		if ($subserviceKey === '' || !$this->canAccessSubservice($subserviceKey)) {
			$this->redirect('/404');
		}

		if ($this->isAvaliacoesSubserviceKey($subserviceKey)) {
			$this->redirect('/institucional/avaliacoes');
		}

		if ($subserviceKey === 'notas_e_desempenho' || $subserviceKey === 'notas_desempenho') {
			$this->redirect('/institucional/notas-desempenho');
		}

		if ($subserviceKey === 'meus_agendamentos') {
			$this->redirect('/institucional/meus-agendamentos');
		}

		if ($subserviceKey === 'corretor_de_gabaritos') {
			$this->redirect('/institucional/corretor-gabaritos');
		}

		if ($subserviceKey === 'modulacao' || $subserviceKey === 'modulacao_e_horarios') {
			$this->redirect('/institucional/modulacao');
		}

		$subserviceName = $this->findSubserviceNameByKey($subserviceKey) ?? $this->humanizeSubserviceName($subserviceKey);
		$subserviceHtmlPath = $this->resolveSubserviceHtmlPath($subserviceKey, $subserviceName);
		$isStandaloneFrame = (string) ($_GET['standalone'] ?? '') === '1';

		if ($subserviceHtmlPath === null || !is_file($subserviceHtmlPath)) {
			$this->redirect('/404');
		}

		if ($isStandaloneFrame) {
			$this->renderStandaloneEmbeddedFile($subserviceHtmlPath, [
				'standaloneTitle' => $subserviceName,
				'standaloneBodyClass' => 'embedded-standalone-page embedded-institutional-frame',
			]);
			exit;
		}

		if (!headers_sent()) {
			header('Content-Type: text/html; charset=UTF-8');
		}

		readfile($subserviceHtmlPath);
		exit;
	}

	private function canAccessTurmasCatalog(): bool
	{
		return $this->canAccessSubservice('cadastro_de_turmas')
			|| $this->canAccessSubservice('cadastro_de_estudantes')
			|| $this->canAccessSubservice('avaliacoes');
	}

	private function canAccessNotasDesempenhoCatalog(): bool
	{
		return $this->canAccessSubservice('notas_e_desempenho')
			|| $this->canAccessSubservice('notas_desempenho')
			|| (bool) (($_SESSION['auth']['tipo'] ?? '') === 'admin');
	}

	private function canAccessAvaliacoesCatalog(): bool
	{
		if ($this->canAccessSubservice('avaliacoes')
			|| $this->canAccessSubservice('cadastro_de_avaliacoes')
			|| $this->canAccessSubservice('gerenciar_avaliacoes')) {
			return true;
		}

		$userId = (int) ($_SESSION['auth']['id'] ?? 0);
		if ($userId <= 0) {
			return false;
		}

		try {
			$avaliacaoModel = new AvaliacaoModel();
			return $avaliacaoModel->hasAccessibleAvaliacaoForUser($userId);
		} catch (Throwable) {
			return false;
		}
	}

	private function canAccessInstitucionalAvaliacaoCorrecao(array $avaliacao): bool
	{
		$authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
		if ($authType === 'admin') {
			return true;
		}

		$currentUserId = (int) ($_SESSION['auth']['id'] ?? 0);
		if ($currentUserId <= 0) {
			return false;
		}

		$autorId = (int) ($avaliacao['autor_id'] ?? 0);
		if ($autorId > 0 && $autorId === $currentUserId) {
			return true;
		}

		$aplicadoresIds = is_array($avaliacao['aplicadores_relacionados_ids'] ?? null)
			? $avaliacao['aplicadores_relacionados_ids']
			: [];

		if ($aplicadoresIds === []) {
			$legacyAplicadorId = (int) ($avaliacao['aplicador_id'] ?? 0);
			if ($legacyAplicadorId > 0) {
				$aplicadoresIds = [$legacyAplicadorId];
			}
		}

		return in_array($currentUserId, $aplicadoresIds, true);
	}

	private function extractAvaliacaoQuestionItems(array $avaliacao): array
	{
		$gabaritoRaw = trim((string) ($avaliacao['gabarito'] ?? ''));
		if ($gabaritoRaw === '') {
			return [];
		}

		$decoded = json_decode($gabaritoRaw, true);
		if (!is_array($decoded)) {
			return [];
		}

		$itens = $decoded['itens'] ?? [];
		return is_array($itens) ? array_values($itens) : [];
	}

	private function normalizeInstitutionalSearch(string $value): string
	{
		$text = trim(mb_strtolower($value, 'UTF-8'));
		if ($text === '') {
			return '';
		}

		$converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
		if (is_string($converted) && $converted !== '') {
			$text = $converted;
		}

		$text = preg_replace('/[^a-z0-9]+/i', ' ', $text) ?? '';
		return trim($text);
	}

	private function resolveInstitutionalDisciplinaLabel(string $value): string
	{
		$label = trim($value);
		if ($label === '') {
			return '';
		}

		if (ctype_digit($label)) {
			try {
				$disciplinaModel = new DisciplinaModel();
				$disciplina = $disciplinaModel->findById((int) $label);
				if (is_array($disciplina)) {
					$nome = trim((string) ($disciplina['nome'] ?? ''));
					if ($nome !== '') {
						return $nome;
					}
				}
			} catch (Throwable) {
			}
		}

		return $label;
	}

	private function normalizeInstitutionalQuestionType(string $value): string
	{
		$normalized = $this->normalizeInstitutionalSearch($value);
		return str_contains($normalized, 'discurs') ? 'discursiva' : 'objetiva';
	}

	private function buildInstitutionalCorrecoesSnapshot(array $itens, array $respostas): array
	{
		$normalizedRespostas = [];
		$correcoes = [];
		$acertos = 0;
		$totalQuestoes = 0;
		$pontuacao = 0.0;
		$pontuacaoTotal = 0.0;

		foreach ($itens as $index => $item) {
			if (!is_array($item)) {
				continue;
			}

			$questionNumber = $index + 1;
			$key = (string) $questionNumber;
			$tipo = $this->normalizeInstitutionalQuestionType((string) ($item['tipo'] ?? ''));
			$peso = round((float) ($item['peso'] ?? 1), 2);
			if ($peso <= 0) {
				$peso = 1.0;
			}

			$totalQuestoes++;
			$pontuacaoTotal += $peso;

			$respostaRaw = $respostas[$key] ?? null;
			if ($tipo === 'discursiva') {
				$nota = $respostaRaw !== null && $respostaRaw !== '' ? round((float) $respostaRaw, 2) : 0.0;
				if ($nota < 0) {
					$nota = 0.0;
				}
				if ($nota > $peso) {
					$nota = $peso;
				}

				$isCorrect = $nota >= $peso;
				if ($isCorrect) {
					$acertos++;
				}
				$pontuacao += $nota;

				$normalizedRespostas[$key] = $nota;
				$correcoes[] = [
					'questionNumber' => $questionNumber,
					'selectedAnswer' => (string) $nota,
					'correctAnswer' => null,
					'isCorrect' => $isCorrect,
					'pontuacao' => round($nota, 2),
					'tipo' => 'discursiva',
					'peso' => $peso,
				];
				continue;
			}

			$selected = strtoupper(trim((string) ($respostaRaw ?? '')));
			$selected = preg_match('/^[A-Z]$/', $selected) ? $selected : '';
			$correta = strtoupper(trim((string) ($item['correta'] ?? $item['resposta'] ?? '')));
			$correta = preg_match('/^[A-Z]$/', $correta) ? $correta : '';

			$isCorrect = $selected !== '' && $correta !== '' && $selected === $correta;
			$earned = $isCorrect ? $peso : 0.0;
			if ($isCorrect) {
				$acertos++;
			}
			$pontuacao += $earned;

			$normalizedRespostas[$key] = $selected !== '' ? $selected : null;
			$correcoes[] = [
				'questionNumber' => $questionNumber,
				'selectedAnswer' => $selected !== '' ? $selected : null,
				'correctAnswer' => $correta !== '' ? $correta : null,
				'isCorrect' => $isCorrect,
				'pontuacao' => round($earned, 2),
				'tipo' => 'objetiva',
				'peso' => $peso,
			];
		}

		$percentual = $pontuacaoTotal > 0 ? round(($pontuacao / $pontuacaoTotal) * 100, 2) : 0.0;

		return [
			'respostas' => $normalizedRespostas,
			'correcoes' => $correcoes,
			'acertos' => $acertos,
			'total_questoes' => $totalQuestoes,
			'pontuacao' => round($pontuacao, 2),
			'pontuacao_total' => round($pontuacaoTotal, 2),
			'percentual' => $percentual,
		];
	}

	private function getAvaliacaoAplicadoresOptions(): array
	{
		try {
			$pdo = Database::connection();
			$rows = $pdo->query('SELECT id, nome, usuario, email FROM usuarios ORDER BY nome ASC')?->fetchAll() ?: [];
		} catch (Throwable) {
			$rows = [];
		}

		$options = [];
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$id = (int) ($row['id'] ?? 0);
			if ($id <= 0) {
				continue;
			}

			$nome = trim((string) ($row['nome'] ?? ''));
			if ($nome === '') {
				$nome = trim((string) ($row['usuario'] ?? ''));
			}
			if ($nome === '') {
				$nome = trim((string) ($row['email'] ?? ''));
			}

			if ($nome === '') {
				continue;
			}

			$options[] = [
				'id' => $id,
				'nome' => $nome,
			];
		}

		return $options;
	}

	private function canAccessModulacaoCatalog(): bool
	{
		return $this->canAccessSubservice('modulacao')
			|| $this->canAccessSubservice('modulacao_e_horarios');
	}

	private function isNotasDesempenhoScopeExemptUser(): bool
	{
		$authType = $this->normalizePermissionToken((string) ($_SESSION['auth']['tipo'] ?? ''));
		if ($authType === 'admin') {
			return true;
		}

		$departmentId = (int) ($_SESSION['auth']['departamento'] ?? 0);
		if ($departmentId <= 0) {
			return false;
		}

		$departments = $this->getAdminDepartments();
		$departmentName = '';
		foreach ($departments as $department) {
			if (!is_array($department)) {
				continue;
			}
			if ((int) ($department['id'] ?? 0) !== $departmentId) {
				continue;
			}
			$departmentName = trim((string) ($department['nome'] ?? ''));
			break;
		}

		$departmentNormalized = $this->normalizeInstitutionalSearch($departmentName);
		return in_array($departmentNormalized, ['coordenacao pedagogica', 'gestor'], true);
	}

	private function getNotasDesempenhoUserScope(): array
	{
		$userId = (int) ($_SESSION['auth']['id'] ?? 0);
		if ($userId <= 0) {
			return [
				'turma_ids' => [],
				'disciplina_ids' => [],
				'disciplina_nomes' => [],
				'turma_disciplina_map' => [],
			];
		}

		try {
			$pdo = Database::connection();
			$statement = $pdo->prepare(
				'SELECT pm.turma_id, pm.disciplina_id, d.nome AS disciplina_nome
				 FROM professor_modulacoes pm
				 INNER JOIN disciplinas d ON d.id = pm.disciplina_id
				 WHERE pm.professor_id = :usuario_id'
			);
			$statement->execute(['usuario_id' => $userId]);
			$rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
		} catch (Throwable) {
			$rows = [];
		}

		$turmaIds = [];
		$disciplinaIds = [];
		$disciplinaNomes = [];
		$turmaDisciplinaMap = [];

		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}

			$turmaId = (int) ($row['turma_id'] ?? 0);
			$disciplinaId = (int) ($row['disciplina_id'] ?? 0);
			$disciplinaNome = trim((string) ($row['disciplina_nome'] ?? ''));

			if ($turmaId > 0) {
				$turmaIds[$turmaId] = true;
			}
			if ($disciplinaId > 0) {
				$disciplinaIds[$disciplinaId] = true;
			}
			if ($disciplinaNome !== '') {
				$disciplinaNorm = $this->normalizeInstitutionalSearch($disciplinaNome);
				if ($disciplinaNorm !== '') {
					$disciplinaNomes[$disciplinaNorm] = $disciplinaNome;
					$this->appendNotasDesempenhoScopePair($turmaDisciplinaMap, $turmaId, $disciplinaNorm, $disciplinaNome);
				}
			}
		}

		return [
			'turma_ids' => array_map('intval', array_keys($turmaIds)),
			'disciplina_ids' => array_map('intval', array_keys($disciplinaIds)),
			'disciplina_nomes' => array_values($disciplinaNomes),
			'turma_disciplina_map' => $turmaDisciplinaMap,
		];
	}

	private function assertNotasDesempenhoScopeAllows(?int $turmaId, string $disciplina): void
	{
		if ($this->isNotasDesempenhoScopeExemptUser()) {
			return;
		}

		$scope = $this->getNotasDesempenhoUserScope();
		if ($scope['turma_ids'] === [] || $scope['disciplina_ids'] === []) {
			throw new InvalidArgumentException('Você não possui vínculos de modulação para esta operação.');
		}

		$turmaDisciplinaMap = is_array($scope['turma_disciplina_map'] ?? null)
			? $scope['turma_disciplina_map']
			: [];

		if ($turmaId !== null && $turmaId > 0 && !in_array($turmaId, $scope['turma_ids'], true)) {
			throw new InvalidArgumentException('Você não possui vínculo de modulação com esta turma.');
		}

		$disciplinaNorm = $this->normalizeInstitutionalSearch($disciplina);
		$allowedDisciplinesNorm = array_map(function (string $nome): string {
			return $this->normalizeInstitutionalSearch($nome);
		}, $scope['disciplina_nomes']);

		if ($disciplinaNorm === '' || !in_array($disciplinaNorm, $allowedDisciplinesNorm, true)) {
			throw new InvalidArgumentException('Você não possui vínculo de modulação com esta disciplina.');
		}

		if ($turmaId !== null && $turmaId > 0) {
			$turmaKey = (string) $turmaId;
			$disciplinasTurma = is_array($turmaDisciplinaMap[$turmaKey] ?? null)
				? $turmaDisciplinaMap[$turmaKey]
				: [];
			if (!isset($disciplinasTurma[$disciplinaNorm])) {
				throw new InvalidArgumentException('Você não possui vínculo direto desta disciplina com a turma informada.');
			}
		}
	}

	private function applyNotasDesempenhoDataScope(array $data, array $scope, array $selectedTurmaIds = []): array
	{
		$allowedTurmaMap = array_flip(array_map('intval', (array) ($scope['turma_ids'] ?? [])));
		$allowedDiscNormMap = [];
		foreach ((array) ($scope['disciplina_nomes'] ?? []) as $disciplinaNome) {
			$normalized = $this->normalizeInstitutionalSearch((string) $disciplinaNome);
			if ($normalized !== '') {
				$allowedDiscNormMap[$normalized] = true;
			}
		}
		$turmaDisciplinaMap = is_array($scope['turma_disciplina_map'] ?? null)
			? $scope['turma_disciplina_map']
			: [];

		$selectedTurmaMap = [];
		foreach ($selectedTurmaIds as $turmaId) {
			$tid = (int) $turmaId;
			if ($tid > 0 && isset($allowedTurmaMap[$tid])) {
				$selectedTurmaMap[$tid] = true;
			}
		}
		if ($selectedTurmaMap === []) {
			$selectedTurmaMap = $allowedTurmaMap;
		}

		$allowedDiscBySelectedTurmas = [];
		foreach (array_keys($selectedTurmaMap) as $turmaId) {
			$disciplinasTurma = is_array($turmaDisciplinaMap[(string) $turmaId] ?? null)
				? $turmaDisciplinaMap[(string) $turmaId]
				: [];
			foreach ($disciplinasTurma as $discNorm => $enabled) {
				if ($enabled) {
					$allowedDiscBySelectedTurmas[(string) $discNorm] = true;
				}
			}
		}
		if ($allowedDiscBySelectedTurmas === []) {
			$allowedDiscBySelectedTurmas = $allowedDiscNormMap;
		}

		$data['turmas'] = array_values(array_filter((array) ($data['turmas'] ?? []), static function ($item) use ($allowedTurmaMap): bool {
			if (!is_array($item)) {
				return false;
			}
			$id = (int) ($item['id'] ?? 0);
			return $id > 0 && isset($allowedTurmaMap[$id]);
		}));

		$data['disciplinas'] = array_values(array_filter((array) ($data['disciplinas'] ?? []), function ($disciplinaNome) use ($allowedDiscBySelectedTurmas): bool {
			$normalized = $this->normalizeInstitutionalSearch((string) $disciplinaNome);
			return $normalized !== '' && isset($allowedDiscBySelectedTurmas[$normalized]);
		}));

		$data['boletim'] = array_values(array_filter((array) ($data['boletim'] ?? []), static function ($row) use ($allowedTurmaMap): bool {
			if (!is_array($row)) {
				return false;
			}
			$turmaId = (int) ($row['turma_id'] ?? 0);
			return $turmaId > 0 && isset($allowedTurmaMap[$turmaId]);
		}));

		foreach ($data['boletim'] as &$row) {
			$rowTurmaId = (int) ($row['turma_id'] ?? 0);
			$allowedDisciplinaTurma = is_array($turmaDisciplinaMap[(string) $rowTurmaId] ?? null)
				? $turmaDisciplinaMap[(string) $rowTurmaId]
				: [];
			$disciplinasRow = is_array($row['disciplinas'] ?? null) ? $row['disciplinas'] : [];
			$filtered = [];
			foreach ($disciplinasRow as $disciplinaNome => $disciplinaData) {
				$normalized = $this->normalizeInstitutionalSearch((string) $disciplinaNome);
				if ($normalized === '' || !isset($allowedDiscNormMap[$normalized])) {
					continue;
				}
				if ($rowTurmaId > 0 && !isset($allowedDisciplinaTurma[$normalized])) {
					continue;
				}
				$filtered[$disciplinaNome] = $disciplinaData;
			}
			$row['disciplinas'] = $filtered;

			$somaNotas = 0.0;
			$countNotas = 0;
			foreach ($filtered as $disciplinaData) {
				if (!is_array($disciplinaData)) {
					continue;
				}
				$notaFinal = $disciplinaData['nota_final'] ?? null;
				if (!is_numeric($notaFinal)) {
					continue;
				}
				$somaNotas += (float) $notaFinal;
				$countNotas++;
			}

			if ($countNotas > 0) {
				$mediaGeral = round($somaNotas / $countNotas, 2);
				$row['media_geral'] = $mediaGeral;
				$row['proficiencia_geral'] = $this->classifyNotasDesempenhoProficiencia($mediaGeral);
			} else {
				$row['media_geral'] = null;
				$row['proficiencia_geral'] = null;
			}
		}
		unset($row);

		$data['entries'] = array_values(array_filter((array) ($data['entries'] ?? []), function ($item) use ($allowedTurmaMap, $allowedDiscNormMap, $turmaDisciplinaMap): bool {
			if (!is_array($item)) {
				return false;
			}
			$turmaId = (int) ($item['turma_id'] ?? 0);
			if ($turmaId <= 0) {
				return false;
			}
			if (!isset($allowedTurmaMap[$turmaId])) {
				return false;
			}
			$disciplinaNorm = $this->normalizeInstitutionalSearch((string) ($item['disciplina'] ?? ''));
			if ($disciplinaNorm === '') {
				return false;
			}
			if (!isset($allowedDiscNormMap[$disciplinaNorm])) {
				return false;
			}

			$disciplinasTurma = is_array($turmaDisciplinaMap[(string) $turmaId] ?? null)
				? $turmaDisciplinaMap[(string) $turmaId]
				: [];
			return isset($disciplinasTurma[$disciplinaNorm]);
		}));

		$diagnosticoFiltrado = [];
		foreach ((array) ($data['diagnostico'] ?? []) as $item) {
			if (!is_array($item)) {
				continue;
			}

			$questoes = [];
			foreach ((array) ($item['questoes'] ?? []) as $questao) {
				if (!is_array($questao)) {
					continue;
				}

				$disciplinaNorm = $this->normalizeInstitutionalSearch((string) ($questao['disciplina'] ?? ''));
				if ($disciplinaNorm === '' || !isset($allowedDiscBySelectedTurmas[$disciplinaNorm])) {
					continue;
				}

				$questoes[] = $questao;
			}

			if ($questoes === []) {
				continue;
			}

			$item['questoes'] = $questoes;
			$diagnosticoFiltrado[] = $item;
		}
		$data['diagnostico'] = array_values($diagnosticoFiltrado);

		$painel = is_array($data['painel_grafico'] ?? null) ? $data['painel_grafico'] : [];
		$painel['disciplinas'] = array_values(array_filter((array) ($painel['disciplinas'] ?? []), function ($item) use ($allowedDiscNormMap): bool {
			if (!is_array($item)) {
				return false;
			}
			$disciplinaNorm = $this->normalizeInstitutionalSearch((string) ($item['disciplina'] ?? ''));
			return $disciplinaNorm !== '' && isset($allowedDiscNormMap[$disciplinaNorm]);
		}));
		$data['painel_grafico'] = $painel;
		$data['scope_pairs'] = $turmaDisciplinaMap;

		return $data;
	}

	private function classifyNotasDesempenhoProficiencia(?float $nota): ?string
	{
		if ($nota === null) {
			return null;
		}

		if ($nota >= 9.5) {
			return 'Avançado';
		}
		if ($nota >= 6.0) {
			return 'Adequado';
		}
		if ($nota >= 4.0) {
			return 'Insuficiente';
		}

		return 'Crítico';
	}

	private function appendNotasDesempenhoScopePair(array &$turmaDisciplinaMap, int $turmaId, string $disciplinaNorm, string $disciplinaNome = ''): void
	{
		if ($turmaId <= 0 || $disciplinaNorm === '') {
			return;
		}

		$turmaKey = (string) $turmaId;
		if (!isset($turmaDisciplinaMap[$turmaKey]) || !is_array($turmaDisciplinaMap[$turmaKey])) {
			$turmaDisciplinaMap[$turmaKey] = [];
		}

		$turmaDisciplinaMap[$turmaKey][$disciplinaNorm] = $disciplinaNome !== '' ? $disciplinaNome : true;
	}

	private function buildEmptyNotasDesempenhoData(): array
	{
		return [
			'overview' => [
				'total_alunos' => 0,
				'total_avaliados' => 0,
				'participacao' => 0,
				'media_geral' => null,
				'faixas' => [
					'insuficiente' => 0,
					'basico' => 0,
					'adequado' => 0,
					'avancado' => 0,
				],
			],
			'disciplinas' => [],
			'boletim' => [],
			'diagnostico' => [],
			'painel_grafico' => [
				'disciplinas' => [],
				'ranking_top' => [],
				'ranking_alerta' => [],
			],
			'entries' => [],
			'turmas' => [],
		];
	}

	private function canAccessAgendamentoSubservice(): bool
	{
		return $this->canAccessSubservice('agendamento')
			|| $this->canAccessSubservice('reserva_de_equipamentos')
			|| $this->canAccessSubservice('agendamento_de_recursos');
	}

	private function canAccessMeusAgendamentos(): bool
	{
		return $this->canAccessAgendamentoSubservice()
			|| $this->canAccessSubservice('meus_agendamentos')
			|| $this->canAccessSubservice('meus_agendamento');
	}

	private function sanitizeAgendamentoTempOwnerToken(string $value): string
	{
		$value = trim($value);
		if ($value === '') {
			return '';
		}

		$value = preg_replace('/[^a-zA-Z0-9:_-]/', '', $value) ?? '';
		if ($value === '') {
			return '';
		}

		return substr($value, 0, 96);
	}

	private function handleAgendamentoItemImageUpload(?array $file, int $itemId): ?string
	{
		if (!is_array($file)) {
			return null;
		}

		$errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
		if ($errorCode === UPLOAD_ERR_NO_FILE) {
			return null;
		}

		if ($errorCode !== UPLOAD_ERR_OK) {
			throw new RuntimeException('Falha no upload da imagem do item.');
		}

		$tmpName = trim((string) ($file['tmp_name'] ?? ''));
		if ($tmpName === '' || !is_uploaded_file($tmpName)) {
			throw new RuntimeException('Arquivo de imagem inválido.');
		}

		$fileSize = (int) ($file['size'] ?? 0);
		if ($fileSize <= 0 || $fileSize > (5 * 1024 * 1024)) {
			throw new RuntimeException('A imagem deve ter até 5MB.');
		}

		$mimeType = (string) (mime_content_type($tmpName) ?: '');
		$allowedMimes = [
			'image/jpeg' => 'jpg',
			'image/png' => 'png',
			'image/webp' => 'webp',
			'image/gif' => 'gif',
		];

		$extension = $allowedMimes[$mimeType] ?? null;
		if ($extension === null) {
			throw new RuntimeException('Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.');
		}

		$relativeDir = 'uploads/imagens/agendamento-itens';
		$absoluteDir = dirname(__DIR__, 2) . '/' . $relativeDir;
		if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0775, true) && !is_dir($absoluteDir)) {
			throw new RuntimeException('Não foi possível preparar o diretório de imagens.');
		}

		$filename = 'item-' . $itemId . '-' . bin2hex(random_bytes(6)) . '.' . $extension;
		$relativePath = $relativeDir . '/' . $filename;
		$absolutePath = dirname(__DIR__, 2) . '/' . $relativePath;

		if (!move_uploaded_file($tmpName, $absolutePath)) {
			throw new RuntimeException('Não foi possível salvar a imagem enviada.');
		}

		return str_replace('\\', '/', $relativePath);
	}

	private function deleteAgendamentoItemImageByPath(?string $relativePath): void
	{
		$normalized = str_replace('\\', '/', trim((string) $relativePath));
		if ($normalized === '' || !str_starts_with($normalized, 'uploads/imagens/')) {
			return;
		}

		$absolutePath = dirname(__DIR__, 2) . '/' . $normalized;
		if (is_file($absolutePath)) {
			@unlink($absolutePath);
		}
	}

	private function isAvaliacoesSubserviceKey(string $subserviceKey): bool
	{
		return in_array($subserviceKey, ['avaliacoes', 'cadastro_de_avaliacoes', 'gerenciar_avaliacoes'], true);
	}

	private function canAccessEntradaSaidaModule(): bool
	{
		foreach (['controle_entrada_e_saida', 'controle_de_entrada_e_saida', 'controle_entrada_saida', 'entrada_e_saida'] as $key) {
			if ($this->canAccessSubservice($key)) {
				return true;
			}
		}

		return false;
	}

	// ======================================================================
	// Controle de Refeitório
	// ======================================================================

	public function refeitorio(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Controle de Refeitório', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function refeitorioDados(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		try {
			$tipos  = $model->getTodos();
			$turmas = (new TurmaModel())->getAllOrdered();
			$today  = date('Y-m-d');
			$resumo = $model->resumoHoje($today);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => 'Erro ao carregar dados: ' . $e->getMessage()], 500);
		}

		$this->respondJson([
			'ok'     => true,
			'tipos'  => $tipos,
			'turmas' => $turmas,
			'resumo' => $resumo,
			'hoje'   => $today,
		]);
	}

	public function refeitorioBuscarAluno(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$matricula = trim((string) ($_GET['matricula'] ?? ''));
		$tipoId    = (int) ($_GET['tipo_id'] ?? 0);

		if ($matricula === '') {
			$this->respondJson(['ok' => false, 'message' => 'Matrícula não informada.'], 422);
		}

		if ($tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione o tipo de refeição antes de escanear.'], 422);
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		$aluno = $model->buscarAlunoPorMatricula($matricula);

		if ($aluno === null) {
			$this->respondJson(['ok' => false, 'message' => 'Aluno não encontrado para esta matrícula.'], 404);
		}

		$today      = date('Y-m-d');
		$jaConsumed = $model->jaConsumiu((int) $aluno['id'], $tipoId, $today);

		$this->respondJson([
			'ok'           => true,
			'aluno'        => [
				'id'        => (int) $aluno['id'],
				'nome'      => $aluno['nome'],
				'matricula' => $aluno['matricula'],
				'turma'     => $aluno['turma'],
			],
			'ja_consumiu'  => $jaConsumed,
		]);
	}

	public function refeitorioPoll(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();
		$today   = date('Y-m-d');
		$resumo  = $model->resumoHoje($today);
		$ultimas = $model->ultimasEntradasHoje($today, 10);

		$this->respondJson([
			'ok'               => true,
			'resumo_hoje'      => $resumo,
			'ultimas_entradas' => $ultimas,
		]);
	}

	public function refeitorioSearchAlunos(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$q       = trim((string) ($_GET['q']       ?? ''));
		$tipoId  = (int) ($_GET['tipo_id']  ?? 0);
		$turmaId = (int) ($_GET['turma_id'] ?? 0);

		if (mb_strlen($q) < 2) {
			$this->respondJson(['ok' => true, 'alunos' => []]);
			return;
		}

		if ($tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione o tipo de refeição antes de buscar.'], 422);
		}

		$model  = new RefeitorioModel();
		$model->ensureTableStructure();
		$alunos = $model->pesquisarAlunos($q, $turmaId, $tipoId);

		$this->respondJson(['ok' => true, 'alunos' => $alunos]);
	}

	public function refeitorioRegistrar(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$alunoId = (int) ($_POST['aluno_id'] ?? 0);
		$tipoId  = (int) ($_POST['tipo_id']  ?? 0);
		$obs     = trim((string) ($_POST['obs'] ?? ''));

		if ($alunoId <= 0 || $tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Dados insuficientes para registrar.'], 422);
		}

		$model  = new RefeitorioModel();
		$model->ensureTableStructure();

		$today   = date('Y-m-d');
		$horario = date('H:i:s');

		if ($model->jaConsumiu($alunoId, $tipoId, $today)) {
			$this->respondJson(['ok' => false, 'message' => 'Este aluno já consumiu esta refeição hoje.'], 409);
		}

		$usuarioId = isset($_SESSION['auth']['id']) ? (int) $_SESSION['auth']['id'] : null;

		try {
			$id = $model->registrarConsumo($alunoId, $tipoId, $today, $horario, $usuarioId, $obs);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => 'Erro ao registrar: ' . $e->getMessage()], 500);
		}

		$this->respondJson([
			'ok'      => true,
			'message' => 'Consumo registrado com sucesso.',
			'id'      => $id,
			'horario' => $horario,
		]);
	}

	public function refeitorioTiposSalvar(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id         = (int)    ($_POST['id']          ?? 0);
		$nome       = trim((string) ($_POST['nome']   ?? ''));
		$descricao  = trim((string) ($_POST['descricao'] ?? ''));
		$horIni     = trim((string) ($_POST['horario_ini'] ?? ''));
		$horFim     = trim((string) ($_POST['horario_fim'] ?? ''));
		$cor        = trim((string) ($_POST['cor']    ?? '#4a90d9'));
		$ativo      = (bool) ($_POST['ativo'] ?? true);

		if ($nome === '') {
			$this->respondJson(['ok' => false, 'message' => 'Informe o nome do tipo de refeição.'], 422);
		}

		if (!preg_match('/^#[0-9a-fA-F]{6}$/', $cor)) {
			$cor = '#4a90d9';
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		try {
			$savedId = $model->salvarTipo($id, $nome, $descricao, $horIni, $horFim, $cor, $ativo);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 500);
		}

		$this->respondJson(['ok' => true, 'id' => $savedId, 'message' => 'Tipo de refeição salvo com sucesso.']);
	}

	public function refeitorioTiposExcluir(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'ID inválido.'], 422);
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		try {
			$model->excluirTipo($id);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson(['ok' => true, 'message' => 'Tipo de refeição excluído.']);
	}

	public function refeitorioRelatorio(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$dataInicio = trim((string) ($_GET['data_inicio'] ?? ''));
		$dataFim    = trim((string) ($_GET['data_fim']    ?? ''));
		$tipoId     = (int) ($_GET['tipo_id'] ?? 0);
		$turmaId    = trim((string) ($_GET['turma_id'] ?? ''));

		if ($dataInicio === '' || $dataFim === '') {
			$dataInicio = date('Y-m-d');
			$dataFim    = date('Y-m-d');
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		try {
			$registros = $model->relatorio(
				$dataInicio, $dataFim,
				$tipoId > 0 ? $tipoId : null,
				$turmaId !== '' ? $turmaId : null
			);
			$totais    = $model->totalPorTipoNoPeriodo(
				$dataInicio,
				$dataFim,
				$tipoId > 0 ? $tipoId : null,
				$turmaId !== '' ? $turmaId : null
			);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 500);
		}

		$this->respondJson([
			'ok'         => true,
			'registros'  => $registros,
			'totais'     => $totais,
			'data_inicio'=> $dataInicio,
			'data_fim'   => $dataFim,
		]);
	}

	public function refeitorioQrCodes(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$turmaId = (int) ($_GET['turma_id'] ?? 0);
		$model   = new RefeitorioModel();
		$model->ensureTableStructure();

		try {
			$alunos = $model->listarAlunosParaQr($turmaId > 0 ? $turmaId : null);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 500);
		}

		$this->respondJson(['ok' => true, 'alunos' => $alunos]);
	}

	public function refeitorioRegistroBuscar(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$id = (int) ($_GET['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'ID inválido.'], 422);
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		$registro = $model->buscarRegistroPorId($id);
		if (!$registro) {
			$this->respondJson(['ok' => false, 'message' => 'Registro não encontrado.'], 404);
		}

		$this->respondJson(['ok' => true, 'registro' => $registro]);
	}

	public function refeitorioRegistroSalvar(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id      = (int)    ($_POST['id']               ?? 0);
		$data    = trim((string) ($_POST['data']         ?? ''));
		$horario = trim((string) ($_POST['horario']      ?? ''));
		$tipoId  = (int)    ($_POST['tipo_refeicao_id']  ?? 0);
		$obs     = trim((string) ($_POST['obs']          ?? ''));

		if ($id <= 0 || $data === '' || $horario === '' || $tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Dados incompletos.'], 422);
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		try {
			$model->salvarRegistro($id, $data, $horario, $tipoId, $obs);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson(['ok' => true, 'message' => 'Registro atualizado com sucesso.']);
	}

	public function refeitorioRegistroExcluir(): void
	{
		if (!$this->canAccessSubservice('controle_refeitorio')) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'ID inválido.'], 422);
		}

		$model = new RefeitorioModel();
		$model->ensureTableStructure();

		try {
			$model->excluirRegistro($id);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson(['ok' => true, 'message' => 'Registro excluído com sucesso.']);
	}

	// ======================================================================
	// Controle de Entrada e Saída
	// ======================================================================

	public function entradaSaida(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->redirect('/404');
		}

		$this->render('home/Institucional/Controle de Entrada e Saída', [
			'schoolName' => SCHOOL_NAME,
		]);
	}

	public function entradaSaidaDados(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		try {
			$tipos = $model->getTodos();
			$turmas = (new TurmaModel())->getAllOrdered();
			$today = date('Y-m-d');
			$resumo = $model->resumoHoje($today);
			$meta = $model->resumoPresencaHoje($today);
			$liberacoesAtivas = $model->listarLiberacoesAtivas($today);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => 'Erro ao carregar dados: ' . $e->getMessage()], 500);
		}

		$this->respondJson([
			'ok' => true,
			'tipos' => $tipos,
			'turmas' => $turmas,
			'resumo' => $resumo,
			'meta' => $meta,
			'liberacoes_ativas' => $liberacoesAtivas,
			'hoje' => $today,
		]);
	}

	public function entradaSaidaPoll(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();
		$today = date('Y-m-d');

		$this->respondJson([
			'ok' => true,
			'resumo_hoje' => $model->resumoHoje($today),
			'ultimas_entradas' => $model->ultimasMovimentacoesHoje($today, 10),
			'meta' => $model->resumoPresencaHoje($today),
			'liberacoes_ativas' => $model->listarLiberacoesAtivas($today),
		]);
	}

	public function entradaSaidaBuscarAluno(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$matricula = trim((string) ($_GET['matricula'] ?? ''));
		$tipoId = (int) ($_GET['tipo_id'] ?? 0);

		if ($matricula === '') {
			$this->respondJson(['ok' => false, 'message' => 'Matrícula não informada.'], 422);
		}

		if ($tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione a movimentação antes de escanear.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();
		$aluno = $model->buscarAlunoPorMatricula($matricula);

		if ($aluno === null) {
			$this->respondJson(['ok' => false, 'message' => 'Aluno não encontrado para esta matrícula.'], 404);
		}

		$today = date('Y-m-d');
		if (!empty($aluno['data_saida']) && (string) $aluno['data_saida'] <= $today) {
			$this->respondJson(['ok' => false, 'message' => 'Este estudante está inativo no cadastro.'], 409);
		}

		try {
			$avaliacao = $model->avaliarMovimentacao((int) $aluno['id'], $tipoId, $today);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson([
			'ok' => true,
			'aluno' => [
				'id' => (int) $aluno['id'],
				'nome' => $aluno['nome'],
				'matricula' => $aluno['matricula'],
				'turma' => $aluno['turma'],
			],
			'ja_consumiu' => $avaliacao['permitido'] ? false : true,
			'mensagem_status' => $avaliacao['message'],
			'ultima_movimentacao' => $avaliacao['ultima_movimentacao'],
			'estado_atual' => $avaliacao['estado_atual'],
			'liberacao_antecipada' => $avaliacao['liberacao_antecipada'] ?? false,
		]);
	}

	public function entradaSaidaSearchAlunos(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$q = trim((string) ($_GET['q'] ?? ''));
		$tipoId = (int) ($_GET['tipo_id'] ?? 0);
		$turmaId = (int) ($_GET['turma_id'] ?? 0);

		if (mb_strlen($q) < 2) {
			$this->respondJson(['ok' => true, 'alunos' => []]);
		}

		if ($tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione a movimentação antes de buscar.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		$this->respondJson([
			'ok' => true,
			'alunos' => $model->pesquisarAlunos($q, $turmaId, $tipoId, date('Y-m-d')),
		]);
	}

	public function entradaSaidaSearchAlunosLiberacao(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$q = trim((string) ($_GET['q'] ?? ''));
		$turmaId = (int) ($_GET['turma_id'] ?? 0);

		if (mb_strlen($q) < 2) {
			$this->respondJson(['ok' => true, 'alunos' => []]);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		$this->respondJson([
			'ok' => true,
			'alunos' => $model->pesquisarAlunosParaLiberacao($q, $turmaId, date('Y-m-d')),
		]);
	}

	public function entradaSaidaRegistrar(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$alunoId = (int) ($_POST['aluno_id'] ?? 0);
		$tipoId = (int) ($_POST['tipo_id'] ?? 0);
		$obs = trim((string) ($_POST['obs'] ?? ''));

		if ($alunoId <= 0 || $tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Dados insuficientes para registrar.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();
		$today = date('Y-m-d');
		$horario = date('H:i:s');

		try {
			$avaliacao = $model->avaliarMovimentacao($alunoId, $tipoId, $today, $horario);
			if (!$avaliacao['permitido']) {
				$this->respondJson(['ok' => false, 'message' => $avaliacao['message']], 409);
			}

			$usuarioId = isset($_SESSION['auth']['id']) ? (int) $_SESSION['auth']['id'] : null;
			$id = $model->registrarMovimentacao($alunoId, $tipoId, $today, $horario, $usuarioId, $obs);
			$tipo = $model->getTipoById($tipoId);
			if (!empty($avaliacao['liberacao_antecipada']) && !empty($avaliacao['liberacao']['id'])) {
				$model->consumirLiberacaoSaida((int) $avaliacao['liberacao']['id'], $id);
			}
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => 'Erro ao registrar: ' . $e->getMessage()], 500);
		}

		$this->respondJson([
			'ok' => true,
			'id' => $id,
			'horario' => $horario,
			'tipo_nome' => (string) ($tipo['nome'] ?? ''),
			'message' => 'Movimentação registrada com sucesso.',
		]);
	}

	public function entradaSaidaLiberarSaida(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$alunoId = (int) ($_POST['aluno_id'] ?? 0);
		$obs = trim((string) ($_POST['obs'] ?? ''));

		if ($alunoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Selecione um estudante para liberar.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();
		$today = date('Y-m-d');
		$aluno = $model->buscarAlunoPorId($alunoId);

		if ($aluno === null) {
			$this->respondJson(['ok' => false, 'message' => 'Estudante não encontrado.'], 404);
		}

		if (!empty($aluno['data_saida']) && (string) $aluno['data_saida'] <= $today) {
			$this->respondJson(['ok' => false, 'message' => 'Este estudante está inativo no cadastro.'], 409);
		}

		try {
			$usuarioId = isset($_SESSION['auth']['id']) ? (int) $_SESSION['auth']['id'] : null;
			$liberacao = $model->concederLiberacaoSaida($alunoId, $today, $usuarioId, $obs);
			$liberacoesAtivas = $model->listarLiberacoesAtivas($today);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson([
			'ok' => true,
			'message' => 'Liberação antecipada registrada com sucesso.',
			'liberacao' => $liberacao,
			'liberacoes_ativas' => $liberacoesAtivas,
			'aluno' => [
				'id' => (int) $aluno['id'],
				'nome' => $aluno['nome'],
				'matricula' => $aluno['matricula'],
				'turma' => $aluno['turma'],
			],
		]);
	}

	public function entradaSaidaTiposSalvar(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$nome = trim((string) ($_POST['nome'] ?? ''));
		$natureza = trim((string) ($_POST['natureza'] ?? 'entrada'));
		$descricao = trim((string) ($_POST['descricao'] ?? ''));
		$horIni = trim((string) ($_POST['horario_ini'] ?? ''));
		$horFim = trim((string) ($_POST['horario_fim'] ?? ''));
		$cor = trim((string) ($_POST['cor'] ?? '#2563eb'));
		$ativo = (bool) ($_POST['ativo'] ?? true);

		if ($nome === '') {
			$this->respondJson(['ok' => false, 'message' => 'Informe o nome do tipo de movimentação.'], 422);
		}

		if (!in_array($natureza, ['entrada', 'saida'], true)) {
			$this->respondJson(['ok' => false, 'message' => 'Natureza inválida.'], 422);
		}

		if (!preg_match('/^#[0-9a-fA-F]{6}$/', $cor)) {
			$cor = '#2563eb';
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		try {
			$savedId = $model->salvarTipo($id, $nome, $natureza, $descricao, $horIni, $horFim, $cor, $ativo);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 500);
		}

		$this->respondJson(['ok' => true, 'id' => $savedId, 'message' => 'Tipo de movimentação salvo com sucesso.']);
	}

	public function entradaSaidaTiposExcluir(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'ID inválido.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		try {
			$model->excluirTipo($id);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson(['ok' => true, 'message' => 'Tipo de movimentação excluído.']);
	}

	public function entradaSaidaRelatorio(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$dataInicio = trim((string) ($_GET['data_inicio'] ?? ''));
		$dataFim = trim((string) ($_GET['data_fim'] ?? ''));
		$tipoId = (int) ($_GET['tipo_id'] ?? 0);
		$turmaId = trim((string) ($_GET['turma_id'] ?? ''));

		if ($dataInicio === '' || $dataFim === '') {
			$dataInicio = date('Y-m-d');
			$dataFim = date('Y-m-d');
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		try {
			$registros = $model->relatorio(
				$dataInicio,
				$dataFim,
				$tipoId > 0 ? $tipoId : null,
				$turmaId !== '' ? $turmaId : null
			);
			$totais = $model->totalPorTipoNoPeriodo(
				$dataInicio,
				$dataFim,
				$tipoId > 0 ? $tipoId : null,
				$turmaId !== '' ? $turmaId : null
			);
			$meta = [
				'total_alunos_ativos' => $model->totalAlunosAtivos($turmaId !== '' ? (int) $turmaId : null),
			];
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 500);
		}

		$this->respondJson([
			'ok' => true,
			'registros' => $registros,
			'totais' => $totais,
			'meta' => $meta,
			'data_inicio' => $dataInicio,
			'data_fim' => $dataFim,
		]);
	}

	public function entradaSaidaQrCodes(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$turmaId = (int) ($_GET['turma_id'] ?? 0);
		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		try {
			$alunos = $model->listarAlunosParaQr($turmaId > 0 ? $turmaId : null);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 500);
		}

		$this->respondJson(['ok' => true, 'alunos' => $alunos]);
	}

	public function entradaSaidaRegistroBuscar(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		$id = (int) ($_GET['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'ID inválido.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();
		$registro = $model->buscarRegistroPorId($id);

		if (!$registro) {
			$this->respondJson(['ok' => false, 'message' => 'Registro não encontrado.'], 404);
		}

		$this->respondJson(['ok' => true, 'registro' => $registro]);
	}

	public function entradaSaidaRegistroSalvar(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		$data = trim((string) ($_POST['data'] ?? ''));
		$horario = trim((string) ($_POST['horario'] ?? ''));
		$tipoId = (int) ($_POST['tipo_refeicao_id'] ?? 0);
		$obs = trim((string) ($_POST['obs'] ?? ''));

		if ($id <= 0 || $data === '' || $horario === '' || $tipoId <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'Dados incompletos.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		try {
			$model->salvarRegistro($id, $data, $horario, $tipoId, $obs);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson(['ok' => true, 'message' => 'Registro atualizado com sucesso.']);
	}

	public function entradaSaidaRegistroExcluir(): void
	{
		if (!$this->canAccessEntradaSaidaModule()) {
			$this->respondJson(['ok' => false, 'message' => 'Acesso negado.'], 403);
		}

		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
			$this->respondJson(['ok' => false, 'message' => 'Método não permitido.'], 405);
		}

		$id = (int) ($_POST['id'] ?? 0);
		if ($id <= 0) {
			$this->respondJson(['ok' => false, 'message' => 'ID inválido.'], 422);
		}

		$model = new EntradaSaidaModel();
		$model->ensureTableStructure();

		try {
			$model->excluirRegistro($id);
		} catch (Throwable $e) {
			$this->respondJson(['ok' => false, 'message' => $e->getMessage()], 409);
		}

		$this->respondJson(['ok' => true, 'message' => 'Registro excluído com sucesso.']);
	}
}
