🏋️‍♂️ AI Fitness Coach

An AI-powered Fitness Coach web application that generates personalized workout and diet plans based on user input using AI APIs.
Built with React (Vite) for the frontend and Node.js + Express for the backend.

🚀 Features

✅ Personalized Workout Plan

✅ Customized Diet Plan

✅ AI-based Daily Motivation Quotes

✅ Text-to-Speech (AI reads the plan)

✅ AI Image Generation for exercises & meals

✅ Voice + Image based Interactive UI

✅ Secure API integration using .env file

🧠 Tech Stack
Frontend

React (Vite)

CSS

Axios / Fetch API

Backend

Node.js

Express.js

OpenAI / Gemini / ElevenLabs APIs (or similar)

dotenv

📂 Project Structure
AI-COACH/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env   (ignored on GitHub)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── api/
│   │       └── api.js
│   ├── index.html
│   └── package.json
│
└── README.md

🔐 Environment Variables Setup

Create a .env file inside the backend folder and add:

AI_API_KEY=your_api_key_here
VOICE_API_KEY=your_voice_api_key_here
IMAGE_API_KEY=your_image_api_key_here
PORT=4000


⚠️ Never upload .env to GitHub

⚙️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/YOUR_USERNAME/ai-fitness-coach.git
cd ai-fitness-coach

2️⃣ Install Backend Dependencies
cd backend
npm install

3️⃣ Install Frontend Dependencies
cd frontend
npm install

▶️ Running the Project
✅ Start Backend (Port 4000)
cd backend
npm start


or

node server.js

✅ Start Frontend (Port 5173)
cd frontend
npm run dev

🌐 App Usage

Enter:

Name, Age, Gender

Height & Weight

Goal (Weight Loss, Muscle Gain, etc.)

Fitness Level

Workout Location

Diet Preference

Click Generate Plan

Get:

Weekly Workout Plan

Daily Diet Plan

Motivation Quotes

Click any workout/diet item to:

🔊 Hear AI Voice

🖼️ See AI-generated Images

✅ Security

.env file is ignored using .gitignore

API Keys are never pushed to GitHub

Backend runs securely on localhost:4000

📌 Future Enhancements

✅ User Authentication

✅ BMI & Health Score Calculation

✅ Progress Tracking Dashboard

✅ Mobile App Version

✅ Payment Integration for Premium Plans

🧑‍💻 Author

Developed by: Abhilash Kudachi
💡 Full Stack Developer | AI Enthusiast
