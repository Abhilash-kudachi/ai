// src/api/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

// --- 1. Plan Generation ---
export const generateFitnessPlan = async (userData) => {
    const response = await axios.post(`${API_BASE_URL}/generate-plan`, userData);
    return response.data;
};

// --- 2. Image Generation ---
export const generateImage = async (itemName, isExercise = true) => {
    const response = await axios.post(`${API_BASE_URL}/generate-image`, { 
        item_name: itemName, 
        is_exercise: isExercise 
    });
    return response.data.imageUrl;
};

// --- 3. TTS (Voice) ---
export const readPlanSection = async (textToSpeak) => {
    const response = await fetch(`${API_BASE_URL}/read-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_to_speak: textToSpeak }),
    });

    if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        return true;
    }
    throw new Error('Failed to play audio.');
};

// --- 4. PDF Export (FIXED) ---
export const exportPlanAsPdf = async (planData) => {
    const response = await fetch(`${API_BASE_URL}/export-pdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
    });

    if (response.ok) {
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'AI_Fitness_Plan.pdf';
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const matches = /filename="?([^"]*)"?/.exec(disposition);
            if (matches && matches[1]) filename = matches[1];
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url); 
        
        return true;
    }
    throw new Error('Server failed to generate PDF.');
};