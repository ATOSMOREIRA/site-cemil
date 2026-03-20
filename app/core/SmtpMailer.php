<?php
declare(strict_types=1);

class SmtpMailer
{
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    private string $encryption;
    private int $timeout;

    public function __construct(string $host, int $port, string $username, string $password, string $encryption = 'tls', int $timeout = 15)
    {
        $this->host = trim($host);
        $this->port = max(1, $port);
        $this->username = trim($username);
        $this->password = $password;
        $this->encryption = trim(strtolower($encryption)) === 'ssl' ? 'ssl' : 'tls';
        $this->timeout = max(5, $timeout);
    }

    public static function fromConfig(): self
    {
        if (SMTP_HOST === '' || SMTP_USER === '' || SMTP_PASS === '') {
            throw new RuntimeException('Configuração SMTP incompleta.');
        }

        return new self(
            SMTP_HOST,
            SMTP_PORT_TLS > 0 ? SMTP_PORT_TLS : SMTP_PORT_SSL,
            SMTP_USER,
            SMTP_PASS,
            SMTP_PORT_TLS > 0 ? 'tls' : 'ssl'
        );
    }

    public function sendTemporaryPassword(string $recipientEmail, string $recipientName, string $temporaryPassword, DateTimeInterface $expiresAt): void
    {
        $subject = 'Senha temporaria de acesso';
        $textBody = implode("\r\n", [
            'Ola ' . trim($recipientName !== '' ? $recipientName : 'usuario') . ',',
            '',
            'Recebemos uma solicitacao de redefinicao de senha para sua conta no sistema ' . SCHOOL_NAME . '.',
            '',
            'Sua senha temporaria e: ' . $temporaryPassword,
            'Validade: ' . $expiresAt->format('d/m/Y H:i'),
            '',
            'Ao entrar com essa senha temporaria, voce devera cadastrar uma nova senha.',
            'Se voce nao solicitou essa redefinicao, entre em contato com a escola.',
            '',
            SCHOOL_NAME,
        ]);

        $htmlBody = $this->buildTemporaryPasswordHtml($recipientName, $temporaryPassword, $expiresAt);

        $this->sendMail($recipientEmail, $recipientName, $subject, $textBody, $htmlBody);
    }

    public function sendTextMail(string $recipientEmail, string $recipientName, string $subject, string $body): void
    {
        $this->sendMail($recipientEmail, $recipientName, $subject, $body, null);
    }

    public function sendMail(string $recipientEmail, string $recipientName, string $subject, string $textBody, ?string $htmlBody = null): void
    {
        $recipientEmail = trim($recipientEmail);
        if ($recipientEmail === '') {
            throw new RuntimeException('Destinatario invalido para envio de e-mail.');
        }

        $transport = $this->encryption === 'ssl' ? 'ssl://' : 'tcp://';
        $socket = @stream_socket_client($transport . $this->host . ':' . $this->port, $errorCode, $errorMessage, $this->timeout);
        if (!is_resource($socket)) {
            throw new RuntimeException('Nao foi possivel conectar ao servidor SMTP: ' . $errorMessage);
        }

        stream_set_timeout($socket, $this->timeout);

        try {
            $this->readResponse($socket, [220]);
            $this->sendCommand($socket, 'EHLO localhost', [250]);

            if ($this->encryption === 'tls') {
                $this->sendCommand($socket, 'STARTTLS', [220]);

                $cryptoEnabled = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                if ($cryptoEnabled !== true) {
                    throw new RuntimeException('Nao foi possivel habilitar a criptografia TLS no SMTP.');
                }

                $this->sendCommand($socket, 'EHLO localhost', [250]);
            }

            $this->sendCommand($socket, 'AUTH LOGIN', [334]);
            $this->sendCommand($socket, base64_encode($this->username), [334]);
            $this->sendCommand($socket, base64_encode($this->password), [235]);
            $this->sendCommand($socket, 'MAIL FROM:<' . SMTP_FROM_EMAIL . '>', [250]);
            $this->sendCommand($socket, 'RCPT TO:<' . $recipientEmail . '>', [250, 251]);
            $this->sendCommand($socket, 'DATA', [354]);

            $boundary = 'mailpart_' . bin2hex(random_bytes(12));

            $headers = [
                'Date: ' . date(DATE_RFC2822),
                'From: ' . $this->formatAddress(SMTP_FROM_EMAIL, SMTP_FROM_NAME),
                'To: ' . $this->formatAddress($recipientEmail, $recipientName),
                'Subject: ' . $this->encodeHeader($subject),
                'MIME-Version: 1.0',
                'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
            ];

            $parts = [
                '--' . $boundary,
                'Content-Type: text/plain; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
                '',
                chunk_split(base64_encode($textBody), 76, "\r\n"),
            ];

            if ($htmlBody !== null && trim($htmlBody) !== '') {
                $parts[] = '--' . $boundary;
                $parts[] = 'Content-Type: text/html; charset=UTF-8';
                $parts[] = 'Content-Transfer-Encoding: base64';
                $parts[] = '';
                $parts[] = chunk_split(base64_encode($htmlBody), 76, "\r\n");
            }

            $parts[] = '--' . $boundary . '--';
            $parts[] = '';

            $payload = implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $parts);
            $payload = preg_replace('/^\./m', '..', $payload) ?? $payload;

            fwrite($socket, $payload . "\r\n.\r\n");
            $this->readResponse($socket, [250]);
            $this->sendCommand($socket, 'QUIT', [221]);
        } finally {
            fclose($socket);
        }
    }

    private function sendCommand($socket, string $command, array $expectedCodes): void
    {
        fwrite($socket, $command . "\r\n");
        $this->readResponse($socket, $expectedCodes);
    }

    private function readResponse($socket, array $expectedCodes): void
    {
        $response = '';

        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;

            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }

        $statusCode = (int) substr($response, 0, 3);
        if (!in_array($statusCode, $expectedCodes, true)) {
            throw new RuntimeException('Resposta SMTP inesperada: ' . trim($response));
        }
    }

    private function formatAddress(string $email, string $name): string
    {
        $email = trim($email);
        $name = trim($name);

        if ($name === '') {
            return '<' . $email . '>';
        }

        return $this->encodeHeader($name) . ' <' . $email . '>';
    }

    private function encodeHeader(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }

    private function buildTemporaryPasswordHtml(string $recipientName, string $temporaryPassword, DateTimeInterface $expiresAt): string
    {
        $safeRecipientName = $this->escapeHtml(trim($recipientName !== '' ? $recipientName : 'usuario'));
        $safePassword = $this->escapeHtml($temporaryPassword);
        $safeSchoolName = $this->escapeHtml(SCHOOL_NAME);
        $safeExpiry = $this->escapeHtml($expiresAt->format('d/m/Y H:i'));
        $loginUrl = $this->resolveAppUrl('/entrar');
        $logoUrl = $this->resolveLogoUrl();
        $loginButtonHtml = '';
        $logoHtml = '';

        if ($logoUrl !== '') {
            $logoHtml = '<img src="' . $this->escapeHtml($logoUrl) . '" alt="' . $safeSchoolName . '" width="88" style="display:block;width:88px;max-width:88px;height:auto;margin:0 auto 16px auto;border:0;outline:none;text-decoration:none;">';
        }

        if ($loginUrl !== '') {
            $safeLoginUrl = $this->escapeHtml($loginUrl);
            $loginButtonHtml = '<tr><td align="center" style="padding:0 32px 28px 32px;"><a href="' . $safeLoginUrl . '" style="display:inline-block;padding:14px 24px;background:#b71c1c;border-radius:999px;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none;">Entrar no sistema</a></td></tr>';
        }

        return '<!doctype html>'
            . '<html lang="pt-BR">'
            . '<head>'
            . '<meta charset="UTF-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
            . '<title>Senha temporaria</title>'
            . '</head>'
            . '<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#17212b;">'
            . '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f6f8;width:100%;margin:0;padding:24px 0;">'
            . '<tr>'
            . '<td align="center" style="padding:0 16px;">'
            . '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 12px 30px rgba(15,23,32,0.10);">'
            . '<tr>'
            . '<td style="padding:32px 32px 20px 32px;background:linear-gradient(135deg,#fff4f1 0%,#fffaf8 100%);text-align:center;border-bottom:1px solid #f1d7d2;">'
            . $logoHtml
            . '<div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fde8e8;color:#b71c1c;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Recuperacao de acesso</div>'
            . '<h1 style="margin:18px 0 10px 0;font-size:28px;line-height:1.2;color:#111827;">Sua senha temporaria esta pronta</h1>'
            . '<p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">Use o codigo abaixo para entrar no sistema e cadastrar uma nova senha no primeiro acesso.</p>'
            . '</td>'
            . '</tr>'
            . '<tr>'
            . '<td style="padding:28px 32px 8px 32px;">'
            . '<p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#1f2937;">Ola <strong>' . $safeRecipientName . '</strong>,</p>'
            . '<p style="margin:0 0 18px 0;font-size:15px;line-height:1.75;color:#4b5563;">Recebemos uma solicitacao de redefinicao de senha para sua conta no sistema <strong>' . $safeSchoolName . '</strong>.</p>'
            . '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 18px 0;background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;">'
            . '<tr>'
            . '<td style="padding:22px 24px;text-align:center;">'
            . '<div style="font-size:12px;line-height:1.4;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;margin-bottom:8px;">Senha temporaria</div>'
            . '<div style="font-size:30px;line-height:1.2;font-weight:800;letter-spacing:.08em;color:#7c2d12;">' . $safePassword . '</div>'
            . '<div style="margin-top:10px;font-size:13px;line-height:1.6;color:#9a3412;">Validade ate ' . $safeExpiry . '</div>'
            . '</td>'
            . '</tr>'
            . '</table>'
            . '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 18px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;">'
            . '<tr><td style="padding:18px 20px;">'
            . '<div style="font-size:14px;line-height:1.7;color:#374151;">'
            . '<strong style="color:#111827;">Como usar:</strong><br>'
            . '1. Entre no sistema com essa senha temporaria.<br>'
            . '2. Defina uma nova senha com pelo menos 8 caracteres.<br>'
            . '3. Guarde sua nova senha em local seguro.'
            . '</div>'
            . '</td></tr>'
            . '</table>'
            . '<p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#6b7280;">Se voce nao solicitou essa redefinicao, ignore este e-mail e entre em contato com a equipe da escola.</p>'
            . '</td>'
            . '</tr>'
            . $loginButtonHtml
            . '<tr>'
            . '<td style="padding:0 32px 32px 32px;">'
            . '<div style="padding-top:18px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;text-align:center;">'
            . '<strong style="color:#111827;">' . $safeSchoolName . '</strong><br>'
            . 'Este e-mail foi enviado automaticamente para apoio ao acesso do sistema.'
            . '</div>'
            . '</td>'
            . '</tr>'
            . '</table>'
            . '</td>'
            . '</tr>'
            . '</table>'
            . '</body>'
            . '</html>';
    }

    private function resolveAppUrl(string $path = ''): string
    {
        $baseUrl = trim((string) APP_URL);
        if ($baseUrl === '') {
            return '';
        }

        $normalizedPath = '/' . ltrim($path, '/');
        return rtrim($baseUrl, '/') . ($normalizedPath === '/' ? '' : $normalizedPath);
    }

    private function resolveLogoUrl(): string
    {
        $logoUrl = trim((string) SCHOOL_LOGO_URL);
        return filter_var($logoUrl, FILTER_VALIDATE_URL) ? $logoUrl : '';
    }

    private function escapeHtml(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}