<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory as SpreadsheetIOFactory;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use Smalot\PdfParser\Parser as PdfParser;

class DocumentTextExtractorService
{
    public const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    /** @var array<string, list<string>> */
    private const ALLOWED_MIMES_BY_EXTENSION = [
        'pdf' => ['application/pdf', 'application/x-pdf', 'application/octet-stream'],
        'docx' => [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip',
            'application/octet-stream',
        ],
        'xlsx' => [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'application/octet-stream',
        ],
        'txt' => ['text/plain', 'text/x-plain', 'application/octet-stream'],
    ];

    public const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'txt'];

    /**
     * @return array{text: string, mime: string, extension: string}
     */
    public function extract(UploadedFile $file): array
    {
        if ($file->getSize() > self::MAX_FILE_SIZE_BYTES) {
            throw new \InvalidArgumentException('Il file supera la dimensione massima di 10 MB.');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new \InvalidArgumentException('Formato file non supportato. Usa PDF, DOCX, XLSX o TXT.');
        }

        $mime = $file->getMimeType() ?: '';
        $allowedMimes = self::ALLOWED_MIMES_BY_EXTENSION[$extension] ?? [];
        if ($mime !== '' && !in_array($mime, $allowedMimes, true)) {
            throw new \InvalidArgumentException(
                'Tipo file non riconosciuto. Assicurati di caricare un PDF, DOCX, XLSX o TXT valido.'
            );
        }

        $text = match ($extension) {
            'pdf' => $this->extractPdf($file),
            'docx' => $this->extractDocx($file),
            'xlsx' => $this->extractXlsx($file),
            'txt' => $this->extractTxt($file),
            default => throw new \InvalidArgumentException('Formato file non supportato.'),
        };

        $text = $this->sanitizeText($text);
        if (mb_strlen($text) === 0) {
            throw new \InvalidArgumentException(
                'Il documento non contiene testo leggibile. Prova con un altro file o un PDF con testo selezionabile.'
            );
        }

        return [
            'text' => $text,
            'mime' => $mime,
            'extension' => $extension,
        ];
    }

    public function sanitizeText(string $text): string
    {
        // Remove null bytes and control characters except newlines/tabs
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
        $text = strip_tags($text);
        $text = preg_replace('/\r\n|\r/', "\n", $text) ?? $text;
        $text = preg_replace('/\n{4,}/', "\n\n\n", $text) ?? $text;
        $text = trim($text);

        // Limit length sent to AI (keep reasonable context window)
        if (mb_strlen($text) > 50000) {
            $text = mb_substr($text, 0, 50000) . "\n\n[... testo troncato ...]";
        }

        return $text;
    }

    private function extractPdf(UploadedFile $file): string
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($file->getRealPath());

        return $pdf->getText() ?: '';
    }

    private function extractDocx(UploadedFile $file): string
    {
        $phpWord = WordIOFactory::load($file->getRealPath());
        $text = '';

        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $text .= $this->extractWordElementText($element) . "\n";
            }
        }

        return $text;
    }

    private function extractWordElementText(mixed $element): string
    {
        if (method_exists($element, 'getText')) {
            return (string) $element->getText();
        }

        if (method_exists($element, 'getElements')) {
            $parts = [];
            foreach ($element->getElements() as $child) {
                $parts[] = $this->extractWordElementText($child);
            }

            return implode(' ', array_filter($parts));
        }

        return '';
    }

    private function extractXlsx(UploadedFile $file): string
    {
        $spreadsheet = SpreadsheetIOFactory::load($file->getRealPath());
        $lines = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            $lines[] = "=== Foglio: {$sheetName} ===";

            foreach ($sheet->toArray(null, true, true, false) as $row) {
                $cells = array_map(fn ($cell) => trim((string) ($cell ?? '')), $row);
                $cells = array_filter($cells, fn ($c) => $c !== '');
                if (!empty($cells)) {
                    $lines[] = implode(' | ', $cells);
                }
            }
        }

        return implode("\n", $lines);
    }

    private function extractTxt(UploadedFile $file): string
    {
        $content = file_get_contents($file->getRealPath());
        if ($content === false) {
            throw new \RuntimeException('Impossibile leggere il file di testo.');
        }

        // Detect and convert encoding to UTF-8
        $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true) ?: 'UTF-8';
        if ($encoding !== 'UTF-8') {
            $content = mb_convert_encoding($content, 'UTF-8', $encoding);
        }

        return $content;
    }
}
