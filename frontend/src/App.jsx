import React, { useState } from 'react';
// Make sure all these functions are present in your src/api/api.js file
import { 
    generateFitnessPlan, 
    generateImage, 
    readPlanSection, 
    exportPlanAsPdf // Added for PDF export
} from './api/api'; 
import './App.css'; 

function App() {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imageModal, setImageModal] = useState({ url: null, title: '' });

    // --- FULL USER INPUT STATE ---
    const [userInput, setUserInput] = useState({
        // Personal Details
        name: '',
        age: 30,
        gender: 'Male',
        height: 175, // cm
        weight: 70,  // kg
        
        // Fitness Configuration 
        goal: 'Muscle Gain',
        level: 'Intermediate',
        location: 'Gym',
        diet: 'Non-Veg',
        
        // Optional Details
        medicalHistory: '',
        stressLevel: 'Low',
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserInput({
            ...userInput,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    // -----------------------------------------------------------------
    // --- 1. CORE PLAN GENERATION FUNCTION ---
    // -----------------------------------------------------------------
    const handleGenerate = async () => {
        if (!userInput.name || !userInput.age || !userInput.weight) {
            setError("Please fill in Name, Age, and Weight.");
            return;
        }

        setLoading(true);
        setError(null);
        setPlan(null);
        
        // Data sent to the Backend (matching LLM prompt requirements)
        const dataToSend = {
            goal: userInput.goal, level: userInput.level, location: userInput.location,
            diet: userInput.diet, age: userInput.age, gender: userInput.gender, 
            height: userInput.height, weight: userInput.weight,
            medicalHistory: userInput.medicalHistory, stressLevel: userInput.stressLevel
        };

        try {
            const generatedPlan = await generateFitnessPlan(dataToSend);
            
            if (generatedPlan && generatedPlan.workout_plan) {
                setPlan(generatedPlan);
            } else {
                throw new Error("Invalid plan structure received from AI.");
            }
        } catch (e) {
            console.error("Plan Generation Error:", e);
            let errMsg = 'Could not generate plan. Check backend server and API keys.';
            
            if (e.response) {
                // Axios received a response from the server (e.g., status 500)
                if (e.response.data && e.response.data.error) {
                    errMsg = `Server Error (${e.response.status}): ${e.response.data.error}`;
                } else {
                    errMsg = `Server responded with status ${e.response.status}. Check Node.js console.`;
                }
            } else if (e.request) {
                errMsg = 'No response from server. Is the Node.js server running on port 4000?';
            }
            
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };
    
    // -----------------------------------------------------------------
    // --- 2. IMAGE GENERATION FUNCTION (handleItemClick) ---
    // -----------------------------------------------------------------
    const handleItemClick = async (itemName, isExercise) => {
        if (loading || imageModal.title) return;
        
        setImageModal({ url: null, title: `Generating visual for "${itemName}"...` });
        try {
            const imageUrl = await generateImage(itemName, isExercise);
            setImageModal({ url: imageUrl, title: itemName });
        } catch (e) {
            console.error("Image Generation Error:", e);
            setImageModal({ url: null, title: `Error generating image for ${itemName}. Check Replicate API key.` });
        }
    };

    // -----------------------------------------------------------------
    // --- 3. TTS VOICE FUNCTION (handleReadPlan) - FIX for ReferenceError ---
    // -----------------------------------------------------------------
    const handleReadPlan = async (section) => {
        if (!plan) return;
        
        let text = "";
        
        if (section === 'workout' && plan.workout_plan) {
            text = plan.workout_plan.map(d => 
                `${d.day}. The exercises are: ${d.exercises.map(e => `${e.name} for ${e.sets} sets of ${e.reps}`).join('. ')}`
            ).join('. ');
        } else if (section === 'diet' && plan.diet_plan) {
            text = plan.diet_plan.map(d => 
                `${d.day}'s meals are: ${d.meals.map(m => `${m.type}, which is ${m.item}`).join('. ')}`
            ).join('. ');
        }
        
        if (plan.ai_tips && plan.ai_tips.length > 0) {
            text += `. Coach's tip: ${plan.ai_tips[0]}`;
        }

        try {
            readPlanSection(text);
        } catch (e) {
            console.error("TTS Playback Error:", e);
            alert("Failed to play audio. Check ElevenLabs API status.");
        }
    };

    // -----------------------------------------------------------------
    // --- 4. PDF EXPORT FUNCTION ---
    // -----------------------------------------------------------------
    const handleExportPdf = async () => {
        if (!plan) return;
        try {
            setLoading(true);
            await exportPlanAsPdf(plan);
        } catch (e) {
            console.error("PDF Export Error:", e);
            alert('Failed to download PDF. Check backend console for pdf-node errors.');
        } finally {
            setLoading(false);
        }
    };


    // -----------------------------------------------------------------
    // --- 5. RENDER FUNCTIONS ---
    // -----------------------------------------------------------------
    const renderPlanDetails = (planData) => (
        <div className="plan-container">
            <div className="plan-controls">
                <button className="button-secondary" onClick={() => handleReadPlan('workout')}>🔊 Read Workout</button>
                <button className="button-secondary" onClick={() => handleReadPlan('diet')}>🔊 Read Diet</button>
                <button className="button-secondary" onClick={handleExportPdf} disabled={loading}>
                    📄 Export as PDF
                </button>
            </div>

            <p className="motivation">**Motivation:** "{planData.daily_motivation_quote}"</p>
            
            {/* Workout Section */}
            <div className="card section-card">
                <h3>🏋️ Workout Routine</h3>
                {planData.workout_plan?.map((dayPlan, index) => (
                    <div key={index} className="day-card">
                        <h4>{dayPlan.day}</h4>
                        <ul>
                            {dayPlan.exercises?.map((ex, i) => (
                                <li key={i} onClick={() => handleItemClick(ex.name, true)} className="clickable-item">
                                    **{ex.name}**: {ex.sets} sets of {ex.reps} ({ex.rest_time} rest)
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            
            {/* Diet Section */}
            <div className="card section-card">
                <h3>🥗 Diet Plan</h3>
                {planData.diet_plan?.map((dayPlan, index) => (
                    <div key={index} className="day-card">
                        <h4>{dayPlan.day}</h4>
                        <ul>
                            {dayPlan.meals?.map((meal, i) => (
                                <li key={i} onClick={() => handleItemClick(meal.item, false)} className="clickable-item">
                                    **{meal.type}**: {meal.item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* AI Tips Section */}
            <div className="card section-card ai-tips-card">
                <h3>💡 Coach's Tips</h3>
                <ul>
                    {planData.ai_tips?.map((tip, i) => (
                        <li key={i}>{tip}</li>
                    ))}
                </ul>
            </div>
            <button className="button-secondary regenerate-button" onClick={handleGenerate} disabled={loading}>
                🔄 Regenerate Plan
            </button>
        </div>
    );
    
    const renderInputForm = () => (
        <div className="card input-form-card">
            <h2>👤 Tell us about your goals</h2>
            
            {/* --- Personal & Health Details --- */}
            <div className="form-group-row">
                <div className="form-group">
                    <label>Name:</label>
                    <input name="name" type="text" value={userInput.name} onChange={handleInputChange} placeholder="Your Name" />
                </div>
                <div className="form-group">
                    <label>Age:</label>
                    <input name="age" type="number" value={userInput.age} onChange={handleInputChange} min="16" max="99" />
                </div>
            </div>

            <div className="form-group-row">
                <div className="form-group">
                    <label>Gender:</label>
                    <select name="gender" value={userInput.gender} onChange={handleInputChange}>
                        <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Height (cm) / Weight (kg):</label>
                    <input name="height" type="number" value={userInput.height} onChange={handleInputChange} placeholder="Height (cm)" />
                    <input name="weight" type="number" value={userInput.weight} onChange={handleInputChange} placeholder="Weight (kg)" />
                </div>
            </div>

            {/* --- Goal & Preference Configuration --- */}
            <div className="form-group-row">
                <div className="form-group">
                    <label>Fitness Goal:</label>
                    <select name="goal" value={userInput.goal} onChange={handleInputChange}>
                        <option value="Weight Loss">Weight Loss</option>
                        <option value="Muscle Gain">Muscle Gain</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Endurance">Endurance</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Current Fitness Level:</label>
                    <select name="level" value={userInput.level} onChange={handleInputChange}>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>
            </div>

            <div className="form-group-row">
                <div className="form-group">
                    <label>Workout Location:</label>
                    <select name="location" value={userInput.location} onChange={handleInputChange}>
                        <option value="Home">Home</option>
                        <option value="Gym">Gym</option>
                        <option value="Outdoor">Outdoor</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Dietary Preferences:</label>
                    <select name="diet" value={userInput.diet} onChange={handleInputChange}>
                        <option value="Non-Veg">Non-Veg</option>
                        <option value="Veg">Veg</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Keto">Keto</option>
                    </select>
                </div>
            </div>

            {/* --- Optional Fields --- */}
            <div className="form-group">
                <label>Medical History / Injuries (Optional):</label>
                <textarea name="medicalHistory" value={userInput.medicalHistory} onChange={handleInputChange} rows="2" placeholder="e.g., knee injury, high blood pressure"></textarea>
            </div>
            <div className="form-group">
                <label>Stress Level:</label>
                <select name="stressLevel" value={userInput.stressLevel} onChange={handleInputChange}>
                    <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                </select>
            </div>
            
            <button className="button-primary generate-button" onClick={handleGenerate} disabled={loading}>
                {loading ? '🧠 Generating Plan...' : '🚀 Generate Personalized Plan'}
            </button>
            {error && <p className="error-message">{error}</p>}
        </div>
    );


    return (
        <div className="app-container">
            <header>
                <h1>💪 AI Fitness Coach</h1>
            </header>
            
            <main>
                {!plan ? renderInputForm() : renderPlanDetails(plan)}
            </main>

            {/* Image Modal (Simplified) */}
            {imageModal.title && (
                <div className="image-modal" onClick={() => setImageModal({url: null, title: ''})}>
                    <div className="modal-content">
                        <h4>{imageModal.title}</h4>
                        {imageModal.url ? 
                            <img src={imageModal.url} alt={imageModal.title} className="generated-image"/> : 
                            <p>Loading image. Please wait...</p>
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;