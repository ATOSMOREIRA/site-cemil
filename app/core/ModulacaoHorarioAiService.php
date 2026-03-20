<?php
declare(strict_types=1);

class ModulacaoHorarioAiService
{
	private const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

	public function generate(array $context, string $userPrompt): array
	{
		$apiKey = $this->resolveApiKey();
		if ($apiKey === '') {
			throw new RuntimeException('A chave da API do Groq não foi encontrada no .env. Configure GROQ_API_KEY.');
		}

		$model = trim((string) app_env('GROQ_MODEL', 'llama-3.3-70b-versatile'));
		if ($model === '') {
			$model = 'llama-3.3-70b-versatile';
		}

		$messages = [
			[
				'role' => 'system',
				'content' => $this->buildSystemPrompt(),
			],
			[
				'role' => 'user',
				'content' => $this->buildUserPrompt($context, $userPrompt),
			],
		];

		$payload = [
			'model' => $model,
			'temperature' => 0.2,
			'messages' => $messages,
		];

		$responseContent = $this->performRequest($apiKey, $payload);
		$decoded = json_decode($responseContent, true);
		if (!is_array($decoded)) {
			throw new RuntimeException('A resposta do Groq não pôde ser interpretada.');
		}

		$content = (string) ($decoded['choices'][0]['message']['content'] ?? '');
		if (trim($content) === '') {
			throw new RuntimeException('O Groq não retornou conteúdo para a grade.');
		}

		$jsonPayload = $this->extractJsonPayload($content);
		$result = json_decode($jsonPayload, true);
		if (!is_array($result)) {
			throw new RuntimeException('O modelo retornou um formato inválido para a grade.');
		}

		return [
			'entries' => array_values(is_array($result['entries'] ?? null) ? $result['entries'] : []),
			'notes' => array_values(array_filter(array_map(static function ($item): string {
				return trim((string) $item);
			}, is_array($result['notes'] ?? null) ? $result['notes'] : []), static function (string $value): bool {
				return $value !== '';
			})),
			'raw_content' => $content,
		];
	}

	private function resolveApiKey(): string
	{
		$candidates = [
			app_env('GROQ_API_KEY', null),
			app_env('APIKEY_GROQ', null),
			app_env('API_KEY_GROQ', null),
			app_env('GROQ_KEY', null),
		];

		foreach ($candidates as $candidate) {
			if (is_string($candidate) && trim($candidate) !== '') {
				return trim($candidate);
			}
		}

		return '';
	}

	private function buildSystemPrompt(): string
	{
		return implode("\n", [
			'Você é um agente especialista em gerar horários escolares semanais.',
			'Retorne apenas JSON válido.',
			'Formato obrigatório:',
			'{',
			'  "entries": [',
			'    {',
			'      "professor_id": 0,',
			'      "turma_id": 0,',
			'      "disciplina_id": 0,',
			'      "dia_semana": "segunda|terca|quarta|quinta|sexta",',
			'      "inicio": "HH:MM",',
			'      "fim": "HH:MM",',
			'      "observacoes": "opcional"',
			'    }',
			'  ],',
			'  "notes": ["texto opcional"]',
			'}',
			'Regras rígidas:',
			'- Use apenas IDs e horários fornecidos no contexto.',
			'- Nunca crie conflito de professor no mesmo dia/horário.',
			'- Nunca crie conflito de turma no mesmo dia/horário.',
			'- Nunca use horários bloqueados por Planejamento ou Livre Docência.',
			'- Nunca gere aulas no sábado ou domingo.',
			'- Nunca use disciplina que o professor não tenha vínculo.',
			'- Se não for possível completar tudo, retorne apenas as alocações válidas e explique em notes o que faltou.',
			'- Não escreva markdown, comentários, introduções ou texto fora do JSON.',
		]);
	}

	private function buildUserPrompt(array $context, string $userPrompt): string
	{
		$normalizedPrompt = trim($userPrompt);
		if ($normalizedPrompt === '') {
			$normalizedPrompt = 'Gere a melhor distribuição semanal possível com equilíbrio entre os dias e evitando lacunas longas quando isso for viável.';
		}

		return implode("\n", [
			'Instruções do usuário:',
			$normalizedPrompt,
			'',
			'Contexto estruturado em JSON:',
			json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
		]);
	}

	private function performRequest(string $apiKey, array $payload): string
	{
		$body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
		if (!is_string($body) || $body === '') {
			throw new RuntimeException('Não foi possível serializar a requisição para o Groq.');
		}

		if (function_exists('curl_init')) {
			$ch = curl_init(self::ENDPOINT);
			curl_setopt_array($ch, [
				CURLOPT_POST => true,
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_HTTPHEADER => [
					'Authorization: Bearer ' . $apiKey,
					'Content-Type: application/json',
				],
				CURLOPT_POSTFIELDS => $body,
				CURLOPT_TIMEOUT => 90,
			]);

			$response = curl_exec($ch);
			$statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
			$errorMessage = curl_error($ch);
			curl_close($ch);

			if (!is_string($response) || $response === '') {
				throw new RuntimeException($errorMessage !== '' ? 'Falha ao chamar o Groq: ' . $errorMessage : 'O Groq retornou uma resposta vazia.');
			}

			if ($statusCode < 200 || $statusCode >= 300) {
				throw new RuntimeException($this->extractRemoteErrorMessage($response, $statusCode));
			}

			return $response;
		}

		$context = stream_context_create([
			'http' => [
				'method' => 'POST',
				'header' => implode("\r\n", [
					'Authorization: Bearer ' . $apiKey,
					'Content-Type: application/json',
				]),
				'content' => $body,
				'timeout' => 90,
				'ignore_errors' => true,
			],
		]);

		$response = @file_get_contents(self::ENDPOINT, false, $context);
		if (!is_string($response) || $response === '') {
			throw new RuntimeException('Falha ao chamar o Groq. Verifique a conectividade do servidor.');
		}

		$statusCode = 200;
		if (isset($http_response_header) && is_array($http_response_header)) {
			foreach ($http_response_header as $headerLine) {
				if (preg_match('/HTTP\/\S+\s+(\d{3})/', (string) $headerLine, $matches) === 1) {
					$statusCode = (int) ($matches[1] ?? 200);
					break;
				}
			}
		}

		if ($statusCode < 200 || $statusCode >= 300) {
			throw new RuntimeException($this->extractRemoteErrorMessage($response, $statusCode));
		}

		return $response;
	}

	private function extractRemoteErrorMessage(string $response, int $statusCode): string
	{
		$decoded = json_decode($response, true);
		$message = '';
		if (is_array($decoded)) {
			$message = trim((string) ($decoded['error']['message'] ?? $decoded['message'] ?? ''));
		}

		if ($message !== '') {
			return 'Groq respondeu com erro: ' . $message;
		}

		return 'Groq respondeu com erro HTTP ' . $statusCode . '.';
	}

	private function extractJsonPayload(string $content): string
	{
		$content = trim($content);
		if ($content !== '' && $content[0] === '{' && substr($content, -1) === '}') {
			return $content;
		}

		$start = strpos($content, '{');
		if ($start === false) {
			throw new RuntimeException('O conteúdo retornado pelo modelo não contém JSON.');
		}

		$length = strlen($content);
		$depth = 0;
		$inString = false;
		$escaped = false;
		for ($index = $start; $index < $length; $index++) {
			$char = $content[$index];

			if ($inString) {
				if ($escaped) {
					$escaped = false;
					continue;
				}

				if ($char === '\\') {
					$escaped = true;
					continue;
				}

				if ($char === '"') {
					$inString = false;
				}

				continue;
			}

			if ($char === '"') {
				$inString = true;
				continue;
			}

			if ($char === '{') {
				$depth++;
				continue;
			}

			if ($char === '}') {
				$depth--;
				if ($depth === 0) {
					return substr($content, $start, ($index - $start) + 1);
				}
			}
		}

		throw new RuntimeException('O JSON retornado pelo modelo está incompleto.');
	}
}