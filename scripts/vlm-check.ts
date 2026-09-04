import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function analyze(imagePath: string, prompt: string) {
  const zai = await ZAI.create();
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
        ]
      }
    ],
    thinking: { type: 'disabled' }
  });
  return response.choices?.[0]?.message?.content ?? '(no reply)';
}

async function main() {
  const [, , imagePath, ...promptParts] = process.argv;
  if (!imagePath) {
    console.log('Usage: bun run vlm-check.ts <image> <prompt>');
    process.exit(1);
  }
  const prompt = promptParts.join(' ') || 'Describe this screenshot. Any layout bugs, overflow, misalignment, or broken elements?';
  try {
    const reply = await analyze(imagePath, prompt);
    console.log(reply);
  } catch (err: any) {
    console.error('VLM failed:', err?.message || err);
    process.exit(1);
  }
}

main();
