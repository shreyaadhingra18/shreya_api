/**
 * api/chat.js — Vercel serverless function, proxying to Google Gemini.
 *
 * Deployed separately from the InfinityFree site, because InfinityFree's
 * free tier blocks POST requests to PHP scripts at the server level (their
 * anti-bot layer, not a code problem). This function lives on Vercel
 * instead, where that block doesn't apply.
 *
 * Your Gemini key stays here as a Vercel environment variable — never in
 * the frontend code.
 */

export default async function handler(req, res) {
  // CORS: allow your InfinityFree domain to call this function.
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
        'Server is missing GEMINI_API_KEY — set it in Vercel project settings.'
    });
    return;
  }

  let userMessage =
    req.body && req.body.message
      ? String(req.body.message).trim()
      : '';

  if (userMessage === '') {
    res.status(200).json({
      reply:
        'Ask me anything about Shreya — her projects, skills, or experience.'
    });
    return;
  }

  if (userMessage.length > 600) {
    userMessage = userMessage.slice(0, 600);
  }

  // Everything the assistant is allowed to know about Shreya lives here.
  // Update this as her CV / projects change — no other code changes needed.
  const systemPrompt = `You are the "Portfolio Copilot" on Shreya Dhingra's personal website. You answer
visitor questions ONLY about Shreya, using the facts below. Be warm, concise
(2-4 sentences unless asked for detail), and speak about Shreya in the third
person. If asked something you don't have facts for, say you don't have that
detail and suggest the visitor use the Contact section (LinkedIn or GitHub).
Never invent facts, dates, or projects that aren't listed here.

ABOUT
Shreya Dhingra is a Computer Science with Artificial Intelligence student at
Queen Mary University of London (predicted First Class), aiming to become an
AI Engineer. Based in London, UK. Outside her degree she enjoys travelling,
cooking, and reading.

EDUCATION
- BSc Computer Science and Artificial Intelligence, Queen Mary University of
  London (Sept 2025 - Jun 2028), predicted First Class. Relevant modules:
  Data Structures and Algorithms, OOP, Database Systems, Introduction to
  Artificial Intelligence, Information System Analysis, Computer Systems and
  Networks.
- Sumermal Jain Public School, Delhi, India (Apr 2022 - Mar 2025).
- Jesus Mary Joseph Sr. Sec. School, Delhi, India (Apr 2011 - Mar 2022).

SKILLS
- Languages: Python, Java, JavaScript, HTML/CSS, SQL.
- Frameworks: React, PyTorch.
- Databases & Tools: MySQL, Git, JUnit.
- AI tools she uses: GitHub Copilot, Claude Code, Claude, ChatGPT, Gemini.

EXPERIENCE
- Student Ambassador, QMUL Mile End (Sept 2026 - Present) — represents the
  EECS department at open days and recruitment events, engaging 100+
  prospective students and parents; produces marketing content and delivers
  presentations about the CS/AI programmes.
- Residential Assistant, QMUL Mile End (Sept 2026 - Present) — delivers
  QMUL's Residential Life Programme across campus halls, plans engagement
  events, creates content for the departmental website/social media, and
  provides front-line support to residents.
- Team Lead, Content & Communications, Lomara / fintech startup (Feb 2026 -
  Apr 2026) — led a team of 5, coordinated content and communications work,
  and communicated complex product concepts to non-technical audiences.

PROJECTS
- Jarvis - AI Virtual Assistant (Python) — a voice assistant with wake word
  detection and speech recognition for hands-free command execution; tuned
  recognition accuracy and wake word reliability.
- Capsule Wardrobe Builder (HTML/CSS/JavaScript) — a front-end web app that
  helps users curate a minimal wardrobe and generate outfit combinations from
  a limited set of clothing items.
- Typing Race Simulator (Java, OOP) — tracks real-time typing accuracy and
  words-per-minute; refactored to resolve circular dependencies, with JUnit
  tests covering the scoring logic.

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

  const model = 'gemini-3.6-flash';

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.6
        }
      })
    });

    if (!geminiRes.ok) {
      res.status(502).json({
        reply:
          "I'm having trouble reaching the assistant right now — please try again shortly, or reach Shreya directly via the Contact section."
      });
      return;
    }

    const data = await geminiRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Sorry, I didn't catch that — could you rephrase?";

    res.status(200).json({ reply });

  } catch (err) {
    res.status(502).json({
      reply:
        "I'm having trouble reaching the assistant right now — please try again shortly, or reach Shreya directly via the Contact section."
    });
  }
}
