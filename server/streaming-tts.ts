import { Request, Response } from 'express';

/**
 * Fast streaming TTS endpoint that processes text in real-time
 */
export async function handleStreamingTTS(req: Request, res: Response) {
  try {
    const { text, voiceId = 'XB0fDUnXU5powFXDhCwa' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    console.log(`Streaming TTS: ${text.length} characters`);
    const startTime = Date.now();

    // Use streaming endpoint for faster response
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2', // Fastest model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        },
        output_format: "mp3_22050_32" // Optimized format
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs streaming error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Streaming TTS failed' });
    }

    const processingTime = Date.now() - startTime;
    console.log(`Streaming TTS started in ${processingTime}ms`);

    // Set headers for streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the audio directly to the client
    if (response.body) {
      response.body.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
          console.log(`Streaming TTS completed in ${Date.now() - startTime}ms`);
        }
      }));
    } else {
      res.status(500).json({ error: 'No audio stream received' });
    }

  } catch (error) {
    console.error('Streaming TTS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}