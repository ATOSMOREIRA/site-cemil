<?php
declare(strict_types=1);

class HomeModel
{
    public function getHomeData(array $postLinks = [], bool $includeInstagramPosts = true): array
    {
        $instagramPosts = $includeInstagramPosts ? $this->getInstagramPosts($postLinks) : [];

        return [
            'headline' => 'Site em construção',
            'subheadline' => 'Estamos preparando um novo portal institucional.',
            'schoolName' => SCHOOL_NAME,
            'logoUrl' => SCHOOL_LOGO,
            'instagramPosts' => $instagramPosts,
            'instagramProfileUrl' => 'https://www.instagram.com/' . INSTAGRAM_USERNAME . '/',
        ];
    }

    public function getInstagramPosts(array $postLinks = []): array
    {
        $embedPosts = $postLinks;

        if ($embedPosts === []) {
            $embedPosts = INSTAGRAM_EMBED_POSTS;
        }

        if (!is_array($embedPosts)) {
            $embedPosts = [];
        }

        return $this->buildInstagramCards(array_values(array_slice($embedPosts, 0, 3)));
    }

    private function buildInstagramCards(array $postUrls): array
    {
        $cards = [];

        foreach ($postUrls as $postUrl) {
            $url = trim((string) $postUrl);
            if ($url === '') {
                continue;
            }

            $html = $this->fetchUrl($url);
            $coverUrl = null;
            $title = 'Postagem do Instagram';

            if ($html !== null) {
                $metaImage = $this->extractMetaContent($html, 'og:image');
                if ($metaImage === null) {
                    $metaImage = $this->extractMetaContent($html, 'og:image:secure_url');
                }
                $metaTitle = $this->extractMetaContent($html, 'og:title');

                if ($metaImage !== null) {
                    $coverUrl = $metaImage;
                }

                if ($metaTitle !== null && $metaTitle !== '') {
                    $title = $metaTitle;
                }
            }

            $title = $this->shortenText($title, 90);

            $cards[] = [
                'permalink' => $url,
                'coverUrl' => $coverUrl,
                'title' => $title,
            ];
        }

        return $cards;
    }

    private function shortenText(string $text, int $limit): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $text) ?? $text);

        if ($normalized === '') {
            return 'Postagem do Instagram';
        }

        if (mb_strlen($normalized) <= $limit) {
            return $normalized;
        }

        return rtrim(mb_substr($normalized, 0, $limit - 3)) . '...';
    }

    private function fetchUrl(string $url): ?string
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 8,
                'ignore_errors' => true,
                'header' => "User-Agent: Mozilla/5.0\r\n",
            ],
        ]);

        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            return null;
        }

        return $response;
    }

    private function extractMetaContent(string $html, string $property): ?string
    {
        $pattern = '/<meta[^>]+property=["\']' . preg_quote($property, '/') . '["\'][^>]+content=["\']([^"\']+)["\'][^>]*>/i';

        if (preg_match($pattern, $html, $matches) === 1 && !empty($matches[1])) {
            return html_entity_decode((string) $matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        $patternReversed = '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' . preg_quote($property, '/') . '["\'][^>]*>/i';

        if (preg_match($patternReversed, $html, $matches) === 1 && !empty($matches[1])) {
            return html_entity_decode((string) $matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return null;
    }
}
