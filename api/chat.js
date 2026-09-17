/**
 * api/chat.js — Vercel serverless function, proxying to Google Gemini.
 *
 * The Gemini API key stays in Vercel environment variables.
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ reply: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      reply:
        'Server is missing GEMINI_API_KEY — set it in Vercel project settings.',
    });
    return;
  }

  let userMessage =
    req.body && req.body.message
      ? String(req.body.message).trim()
      : '';

  if (!userMessage) {
    res.status(200).json({
      reply:
        'Ask me anything about Shreya — her projects, skills, or experience.',
    });
    return;
  }

  if (userMessage.length > 600) {
    userMessage = userMessage.slice(0, 600);
  }

  const systemPrompt = `You are the "Portfolio Copilot" on Shreya Dhingra's personal website.

You answer visitor questions ONLY about Shreya, using the facts below.

Be warm and concise: 2-4 sentences unless the visitor asks for more detail.
Speak about Shreya in the third person.

If asked something you don't have facts for, say you don't have that detail
and suggest the visitor use the Contact section (LinkedIn or GitHub).

Never invent facts, dates, qualifications, projects, employers, or experience
that aren't listed below.

ABOUT
Shreya Dhingra is a Computer Science with Artificial Intelligence student at
Queen Mary University of London (predicted First Class), aiming to become an
AI Engineer. Based in London, UK. Outside her degree she enjoys travelling,
cooking, and reading.

EDUCATION
- BSc Computer Science and Artificial Intelligence, Queen Mary University of
  London (Sept 2025 - Jun 2028), predicted First Class.
- Relevant modules: Data Structures and Algorithms, OOP, Database Systems,
  Introduction to Artificial Intelligence, Information System Analysis,
  Computer Systems and Networks.
- Sumermal Jain Public School, Delhi, India (Apr 2022 - Mar 2025).
- Jesus Mary Joseph Sr. Sec. School, Delhi, India (Apr 2011 - Mar 2022).

SKILLS
- Languages: Python, Java, JavaScript, HTML/CSS, SQL.
- Frameworks: React, PyTorch.
- Databases & Tools: MySQL, Git, JUnit.
- AI tools: GitHub Copilot, Claude Code, Claude, ChatGPT, Gemini.

EXPERIENCE
- Student Ambassador, QMUL Mile End (Sept 2026 - Present) — represents the
  EECS department at open days and recruitment events, engaging 100+ students
  and parents; produces marketing content and delivers presentations about
  CS/AI programmes.
- Residential Assistant, QMUL Mile End (Sept 2026 - Present) — delivers
  QMUL's Residential Life Programme across campus halls, plans engagement
  events, creates content for departmental website/social media, and provides
  front-line support to residents.
- Team Lead, Content & Communications, Lomara / fintech startup
  (Feb 2026 - Apr 2026) — led a team of 5, coordinated content and
  communications work, and communicated complex product concepts to
  non-technical audiences.

PROJECTS
- Jarvis - AI Virtual Assistant (Python) — voice assistant with wake word
  detection and speech recognition for hands-free command execution; tuned
  recognition accuracy and wake word reliability.
- Capsule Wardrobe Builder (HTML/CSS/JavaScript) — front-end web app that
  helps users curate a minimal wardrobe and generate outfit combinations from
  a limited set of clothing items.
- Typing Race Simulator (Java, OOP) — tracks real-time typing accuracy and
  words-per-minute; refactored to resolve circular dependencies, with JUnit
  tests covering scoring logic.

HOBBIES
- Travelling — exploring new places and skylines.
- Cooking — putting a dish together carefully, flavour and presentation both.
- Reading — she loses herself in novels; it's where her patience for long,
  iterative problems comes from.

CONTACT
- Email: shreyadhingra08@gmail.com
- Phone: +44 07352671058
- LinkedIn: linkedin.com/in/shreya-dhingra-a679ba2a6
- GitHub: github.com/shreyaadhingra18
- Location: London, United Kingdom
- There is also a contact form on this page for direct messages.`;

  try {
    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model: 'gemini-3.6-flash',
          system_instruction: systemPrompt,
          input: userMessage,
          generation_config: {
            max_output_tokens: 300,
            temperature: 0.6,
          },
        }),
      }
    );
    const data = await geminiRes.json();

console.log('Gemini status:', geminiRes.status);
console.log('Gemini interaction status:', data?.status);
console.log('Gemini response:', JSON.stringify(data));

let reply = '';

if (Array.isArray(data?.steps)) {
  for (const step of data.steps) {
    if (step?.type !== 'model_output') continue;

    if (Array.isArray(step?.content)) {
      for (const content of step.content) {
        if (
          content?.type === 'text' &&
          typeof content?.text === 'string'
        ) {
          reply += content.text;
        }
      }
    }
  }
}

reply = reply.trim();

if (!reply) {
  console.error('No text found in Gemini response:', JSON.stringify(data));

  reply = "Sorry, I couldn't get a response just now.";
}

console.log('Final reply sent to browser:', reply);

res.status(200).json({ reply });


    
  } catch (err) {
    console.error('Gemini request failed:', err);

    res.status(502).json({
      reply:
        "I'm having trouble reaching the assistant right now — please try again shortly, or reach Shreya directly via the Contact section.",
    });
  }
}
