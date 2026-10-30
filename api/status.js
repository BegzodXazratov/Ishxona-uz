module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    brain: !!process.env.ANTHROPIC_API_KEY,
    stt: !!(process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY),
    sttProvider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : process.env.OPENAI_API_KEY ? 'openai' : null
  });
};
