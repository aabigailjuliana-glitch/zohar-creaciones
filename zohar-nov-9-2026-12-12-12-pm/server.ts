import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Shared Gemini AI instance on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API route to generate branding images (square or horizontal cover)
app.post('/api/generate-branding', async (req, res) => {
  try {
    const { prompt, format } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Debes proporcionar una descripción (prompt) para la imagen.' });
    }

    const aspectRatio = format === 'horizontal' ? '16:9' : '1:1';

    // Call gemini-3.1-flash-lite-image
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: `${prompt}. High quality, professional branding, aesthetic stationery, clean composition.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio,
        },
      },
    });

    let imageUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: 'El modelo no devolvió datos de imagen. Intenta con una descripción diferente o usa el diseñador vectorial.',
      });
    }

    return res.json({ imageUrl, format, success: true });
  } catch (error: any) {
    console.error('Error generating branding image:', error);
    const msg = error?.message || 'Error al generar la imagen con Inteligencia Artificial.';
    return res.status(500).json({
      error: msg,
      needsPaidKey: msg.toLowerCase().includes('paid') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('permission'),
    });
  }
});

// Start Express server and mount Vite in development mode
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
