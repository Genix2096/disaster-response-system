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
async function generateSummary(incident) {
  const client = getGroqClient();

  if (!client) {
    logger.warn('Groq API key not configured. Using fallback summary.');
    return createFallbackSummary(incident.description);
  }

  try {
    const promptData = `
Incident ID: ${incident.incidentId}
Incident Type: ${incident.type}
Location: ${incident.location}
Description: ${incident.description}
Reported At: ${incident.createdAt}
Priority: ${incident.priority}
Departments: ${incident.departments?.join(', ') || 'None'}
Photo Uploaded: ${incident.imageKey ? 'Yes' : 'No'}
Photo Geotag: ${incident.photoHasGeotag ? 'Yes' : 'No'}
Evidence Strength: ${incident.evidenceStrength}
Status: ${incident.status}
    `.trim();

    const response = await client.chat.completions.create({
      model: config.groqModel,
      messages: [
        {
          role: 'system',
          content: `You are an incident reporting assistant.

Create a concise but informative incident summary from the structured incident data below.

Do not simply repeat the user's description.

Combine the incident type, location, description, timestamp, priority, notification departments, evidence information, and incident status into a natural summary.

Mention:
1. What happened / incident type
2. Where it happened
3. When it was reported
4. The important details from the description
5. Priority/severity if available
6. Which department(s) the incident was routed/notified to
7. Relevant evidence information if available

Do not invent facts.
Do not claim that a department physically responded.
Only say that a department was notified/routed if the backend says so.

Keep the summary concise and professional.`,
        },
        {
          role: 'user',
          content: promptData,
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

    return createFallbackSummary(incident.description);
  } catch (error) {
    // Groq failure must NOT break incident creation
    logger.error('Groq API call failed. Using fallback summary.', { error });
    return createFallbackSummary(incident.description);
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
