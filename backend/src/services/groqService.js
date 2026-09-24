const Groq = require('groq-sdk');
const config = require('../config');
const logger = require('../utils/logger');

let groqClient = null;

function getGroqClient() {
  if (!groqClient && config.groqApiKey) {
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
}

/**
 * Generate an AI summary of the incident description using Groq API.
 * If Groq fails, returns a fallback summary from the original description.
 */
async function generateSummary(description, incidentType) {
  const client = getGroqClient();

  if (!client) {
    logger.warn('Groq API key not configured. Using fallback summary.');
    return createFallbackSummary(description);
  }

  try {
    const response = await client.chat.completions.create({
      model: config.groqModel,
      messages: [
        {
          role: 'system',
          content: `You are an incident report summarizer. Create a brief, factual one-to-two sentence summary of the following incident report. Rules:
- Keep the summary concise and factual.
- Do NOT invent or assume information not provided.
- Do NOT determine priority or severity.
- Do NOT make emergency response recommendations.
- Only summarize the information given by the reporter.`,
        },
        {
          role: 'user',
          content: `Incident Type: ${incidentType}\n\nDescription: ${description}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const summary = response.choices?.[0]?.message?.content?.trim();

    if (summary) {
      logger.info('AI summary generated via Groq');
      return summary;
    }

    return createFallbackSummary(description);
  } catch (error) {
    // Groq failure must NOT break incident creation
    logger.error('Groq API call failed. Using fallback summary.', { error });
    return createFallbackSummary(description);
  }
}

/**
 * Fallback: truncate the original description to serve as a summary.
 */
function createFallbackSummary(description) {
  const maxLength = 200;
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength).trim() + '...';
}

module.exports = { generateSummary };
