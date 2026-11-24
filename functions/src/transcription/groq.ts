const ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = 'whisper-large-v3-turbo';
const MAX_ATTEMPTS = 3;

export type Transcription = { text: string; language: string | null; provider: 'groq'; model: string };

class TranscriptionError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestOnce(audio: Buffer, fileName: string, contentType: string, apiKey: string) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: contentType }), fileName);
  form.append('model', MODEL);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new TranscriptionError(`Groq ${response.status}: ${(await response.text()).slice(0, 300)}`, retryable);
  }
  const body = (await response.json()) as { text?: string; language?: string };
  return { text: (body.text ?? '').trim(), language: body.language ?? null };
}

/** Transcribes a short audio clip, retrying rate limits and server errors with backoff. */
export async function transcribe(audio: Buffer, fileName: string, contentType: string, apiKey: string): Promise<Transcription> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const result = await requestOnce(audio, fileName, contentType, apiKey);
      return { ...result, provider: 'groq', model: MODEL };
    } catch (error) {
      const retryable = error instanceof TranscriptionError ? error.retryable : true;
      if (!retryable || attempt >= MAX_ATTEMPTS) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
}
