export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, messages, temperature, max_tokens, top_p } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    // Validate API key
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in Vercel environment variables.' 
      });
    }

    // Validate request body
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request. Missing required fields: model, messages' 
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 1000,
        top_p: top_p || 0.95
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      console.error('OpenAI API Error:', errorData);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid OpenAI API key' 
        });
      }
      
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Failed to get response from OpenAI' 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('API Route Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}
