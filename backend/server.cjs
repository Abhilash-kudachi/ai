// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const Replicate = require('replicate');
const html_to_pdf = require('html-pdf-node'); // Added for PDF export
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js'); // Added for TTS

const app = express();
const PORT = process.env.PORT || 4000;

// --- API Key Validation ---
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not set in .env file.");
    process.exit(1); 
}

// Initialize clients
const ai = new GoogleGenAI({});
const replicate = new Replicate({});
// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({}); 

// Middleware
// FIX: Ensure CORS origin matches your frontend's port
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());

// ---------------------------------------------------------------------
// --- 1. JSON Schema for Gemini Output ---
// ---------------------------------------------------------------------
const planSchema = {
    type: "object",
    properties: {
        workout_plan: {
            type: "array",
            description: "A 5-day array of daily workout routines.",
            items: {
                type: "object",
                properties: {
                    day: { type: "string" },
                    exercises: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                sets: { type: "string" },
                                reps: { type: "string" },
                                rest_time: { type: "string" }
                            },
                            required: ["name", "sets", "reps", "rest_time"]
                        }
                    }
                },
                required: ["day", "exercises"]
            }
        },
        diet_plan: { 
            type: "array", 
            description: "A 5-day array of daily meal plans, including breakfast, lunch, dinner, and snacks.",
            items: {
                type: "object",
                properties: {
                    day: { type: "string" },
                    meals: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                type: { type: "string", description: "Meal type: Breakfast, Lunch, Dinner, Snack." },
                                item: { type: "string", description: "Specific food item or recipe name." }
                            },
                            required: ["type", "item"]
                        }
                    }
                },
                required: ["day", "meals"]
            }
        },
        ai_tips: { 
            type: "array", 
            description: "3-5 key lifestyle or posture tips.",
            items: {
                type: "string" 
            }
        },
        daily_motivation_quote: { type: "string" }
    },
    required: ["workout_plan", "diet_plan", "ai_tips", "daily_motivation_quote"]
};

const createPlanPrompt = (input) => {
    return `You are an expert fitness coach and nutritionist. Generate a personalized, structured 5-day workout plan and a corresponding 5-day diet plan based on the user's details.
        User Details: Goal: ${input.goal}, Level: ${input.level}, Location: ${input.location}, Diet: ${input.diet}, Age: ${input.age}, Gender: ${input.gender || 'N/A'}, Height: ${input.height || 'N/A'}cm, Weight: ${input.weight || 'N/A'}kg, Medical History: ${input.medicalHistory || 'None'}, Stress Level: ${input.stressLevel || 'N/A'}.
        Constraint: The entire response MUST be a single, valid JSON object that strictly adheres to the schema.
    `;
};


// ---------------------------------------------------------------------
// --- 2. API Route: Plan Generation (/api/generate-plan) ---
// ---------------------------------------------------------------------
app.post('/api/generate-plan', async (req, res) => {
    try {
        const userInput = req.body;
        const prompt = createPlanPrompt(userInput);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: planSchema,
                temperature: 0.7,
            }
        });
        
        const rawText = response.text;
        let plan;
        
        // --- Robust JSON Parsing ---
        try {
            let jsonString = rawText.trim();
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.substring(7, jsonString.lastIndexOf('```')).trim();
            } else if (jsonString.startsWith('```')) {
                 jsonString = jsonString.substring(3, jsonString.lastIndexOf('```')).trim();
            }
            
            plan = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('JSON Parsing Failed:', parseError.message);
            console.error('Raw text received:', rawText);
            
            return res.status(500).json({ 
                error: 'AI output was not parsable JSON. Please try again.',
                details: 'Parsing error on server.'
            });
        }
        
        res.status(200).json(plan);

    } catch (error) {
        console.error('Plan Generation Failed with API/Client Error:', error.message);
        
        let errorMessage = 'Internal Server Error. Check API keys and server logs.';
        if (error.message && error.message.includes('API key')) {
            errorMessage = 'Authentication Error: Invalid or missing GEMINI_API_KEY.';
        } else if (error.message && error.message.includes('INVALID_ARGUMENT')) {
             errorMessage = 'Schema Error: Gemini API rejected the request (INVALID_ARGUMENT). Check planSchema.';
        }
        
        return res.status(500).json({ 
            error: errorMessage,
            details: error.message 
        });
    }
});


// ---------------------------------------------------------------------
// --- 3. API Route: Image Generation ---
// ---------------------------------------------------------------------

app.post('/api/generate-image', async (req, res) => {
    try {
        const { item_name, is_exercise } = req.body;
        
        const prompt = is_exercise
            ? `High-quality, realistic photo of a person performing a "${item_name}" in a modern gym. Clear form, no text.`
            : `High-quality food photography of a "${item_name}" meal. Studio lighting, close-up, no text.`;

        const output = await replicate.run(
            "black-forest-labs/flux-schnell",
            { input: { prompt: prompt, aspect_ratio: "1:1", num_outputs: 1 } }
        );

        const imageUrl = output && output.length > 0 ? output[0] : null;
        if (!imageUrl) throw new Error("No image URL received.");

        res.status(200).json({ imageUrl });

    } catch (error) {
        console.error('Image Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate image. Check Replicate API token.' });
    }
});


// ---------------------------------------------------------------------
// --- 4. API Route: TTS Voice (/api/read-plan) ---
// ---------------------------------------------------------------------

app.post('/api/read-plan', async (req, res) => {
    try {
        const { text_to_speak, voice_id = '21m00Tcm4TlvDq8ikWAM' } = req.body; 
        
        if (!text_to_speak) return res.status(400).json({ error: 'Text to speak is required.' });

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        const audioStream = await elevenlabs.generate({
            voice: voice_id,
            text: text_to_speak,
            model_id: 'eleven_turbo_v2_5',
        });

        audioStream.pipe(res);

    } catch (error) {
        console.error('TTS Generation Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to convert text to speech. Check ElevenLabs API key.' });
        }
    }
});


// ---------------------------------------------------------------------
// --- 5. API Route: PDF Export (/api/export-pdf) ---
// ---------------------------------------------------------------------

function generatePlanHTML(plan) {
    // Generates a styled HTML document from the JSON plan data
    const planHTML = `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
                h1 { color: #ff6600; border-bottom: 2px solid #ccc; padding-bottom: 5px; }
                h2 { color: #3f51b5; margin-top: 20px; }
                .section-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .day-card { margin-bottom: 10px; border-left: 3px solid #00bcd4; padding-left: 10px; }
                ul { list-style-type: none; padding-left: 0; }
                li { margin-bottom: 5px; font-size: 0.9em; }
                .motivation { text-align: center; font-style: italic; color: #ff6600; margin: 25px 0; }
            </style>
        </head>
        <body>
            <h1>💪 Personalized Fitness Plan</h1>
            <p>Generated by AI Coach on ${new Date().toLocaleDateString()}</p>
            
            <div class="motivation">"${plan.daily_motivation_quote}"</div>

            <h2>🏋️ Workout Plan</h2>
            <div class="section-card">
                ${plan.workout_plan.map(dayPlan => `
                    <div class="day-card">
                        <h3>${dayPlan.day}</h3>
                        <ul>
                            ${dayPlan.exercises.map(ex => `
                                <li><strong>${ex.name}:</strong> ${ex.sets} sets of ${ex.reps} (${ex.rest_time} rest)</li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>

            <h2>🥗 Diet Plan</h2>
            <div class="section-card">
                ${plan.diet_plan.map(dayPlan => `
                    <div class="day-card">
                        <h3>${dayPlan.day}</h3>
                        <ul>
                            ${dayPlan.meals.map(meal => `
                                <li><strong>${meal.type}:</strong> ${meal.item}</li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>

            <h2>💡 Coach's Tips</h2>
            <div class="section-card">
                <ul>
                    ${plan.ai_tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>

        </body>
        </html>
    `;
    return planHTML;
}

app.post('/api/export-pdf', async (req, res) => {
    try {
        const planData = req.body;
        
        if (!planData || !planData.workout_plan) {
            return res.status(400).json({ error: 'Plan data is missing or incomplete.' });
        }

        const content = generatePlanHTML(planData);
        
        const file = { content: content };
        const options = { format: 'A4', printBackground: true };
        
        const pdfBuffer = await html_to_pdf.generatePdf(file, options);

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="AI_Fitness_Plan.pdf"',
        });

        res.end(pdfBuffer);

    } catch (error) {
        console.error('PDF Export Error:', error);
        res.status(500).json({ error: 'Failed to generate and export PDF.' });
    }
});


// Start the server
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
  });
}


module.exports = app;

