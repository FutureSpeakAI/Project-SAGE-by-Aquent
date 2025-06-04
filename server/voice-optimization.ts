import { Request, Response } from 'express';

interface TextChunk {
  text: string;
  index: number;
  isLast: boolean;
}

/**
 * Split text into optimal chunks for faster TTS processing
 */
export function splitTextForTTS(text: string, maxChunkLength: number = 200): TextChunk[] {
  if (text.length <= maxChunkLength) {
    return [{ text, index: 0, isLast: true }];
  }

  const chunks: TextChunk[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  
  let currentChunk = '';
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + sentence;
    
    if (potentialChunk.length <= maxChunkLength) {
      currentChunk = potentialChunk;
    } else {
      // Save current chunk if it has content
      if (currentChunk) {
        chunks.push({
          text: currentChunk + '.',
          index: chunkIndex++,
          isLast: false
        });
      }
      // Start new chunk with current sentence
      currentChunk = sentence;
    }
  }

  // Add final chunk
  if (currentChunk) {
    chunks.push({
      text: currentChunk + (currentChunk.endsWith('.') ? '' : '.'),
      index: chunkIndex,
      isLast: true
    });
  }

  // Mark the last chunk
  if (chunks.length > 0) {
    chunks[chunks.length - 1].isLast = true;
  }

  return chunks;
}

/**
 * Generate audio for multiple text chunks in parallel
 */
export async function generateChunkedAudio(
  chunks: TextChunk[],
  voiceId: string = 'XB0fDUnXU5powFXDhCwa'
): Promise<Buffer[]> {
  const audioPromises = chunks.map(async (chunk) => {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      },
      body: JSON.stringify({
        text: chunk.text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.7,
          style: 0.0,
          use_speaker_boost: true
        },
        output_format: "mp3_22050_32"
      })
    });

    if (!response.ok) {
      throw new Error(`Chunk ${chunk.index} failed: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  });

  return Promise.all(audioPromises);
}

/**
 * Combine multiple audio buffers into a single MP3
 */
export function combineAudioBuffers(audioBuffers: Buffer[]): Buffer {
  // Simple concatenation - in production, proper audio merging would be ideal
  return Buffer.concat(audioBuffers);
}

/**
 * Optimized TTS endpoint with chunking support
 */
export async function handleOptimizedTTS(req: Request, res: Response) {
  try {
    const { text, voiceId = 'XB0fDUnXU5powFXDhCwa', useChunking = true } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    console.log(`Optimized TTS request: ${text.length} characters, chunking: ${useChunking}`);
    const startTime = Date.now();

    let audioBuffer: Buffer;

    if (useChunking && text.length > 200) {
      // Use chunked processing for long text
      const chunks = splitTextForTTS(text);
      console.log(`Split into ${chunks.length} chunks`);
      
      const audioBuffers = await generateChunkedAudio(chunks, voiceId);
      audioBuffer = combineAudioBuffers(audioBuffers);
    } else {
      // Use standard processing for short text
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.7,
            style: 0.0,
            use_speaker_boost: true
          },
          output_format: "mp3_22050_32"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        return res.status(response.status).json({ error: 'Text-to-speech generation failed' });
      }

      audioBuffer = Buffer.from(await response.arrayBuffer());
    }

    const processingTime = Date.now() - startTime;
    console.log(`Optimized TTS completed in ${processingTime}ms for ${text.length} characters`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Optimized TTS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}