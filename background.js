// Background script to handle Gemini API calls
// Using the REST API to avoid bundling complex client libraries

try {
    importScripts('sheets.js');
} catch (e) {
    console.error(e);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeCV") {
        analyzeWithGemini(request.data)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }

    if (request.action === "saveToSheet") {
        saveJobToSheet(request.data)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function saveJobToSheet(jobData) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, async (token) => {
            if (chrome.runtime.lastError || !token) {
                return reject(new Error("Please login via the extension popup first."));
            }

            try {
                // Ensure SheetsService is available (imported via importScripts)
                if (typeof SheetsService === 'undefined') {
                    throw new Error("SheetsService not loaded");
                }

                const sheetId = await SheetsService.getOrCreateSheet(token);
                const result = await SheetsService.appendJob(token, sheetId, jobData);
                resolve(result);
            } catch (err) {
                console.error("Save to Sheet Error:", err);
                reject(err);
            }
        });
    });
}

async function analyzeWithGemini(data) {
    const { apiKey, cvText, jobDescription } = data;

    console.log("jd----", data);
    if (!apiKey) {
        throw new Error("API Key is missing. Please set it in the extension popup.");
    }

    // const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    // const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    // const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;



    const prompt = `
        You are an expert ATS (Applicant Tracking System) and Career Coach.
        
        I will provide you with a Candidate's CV and a Job Description. 
        Your task is to analyze the match between them.

        JOB DESCRIPTION:
        ${jobDescription}

        CANDIDATE CV:
        ${cvText}

        STRICT OUTPUT RULES:
            - Output MUST be valid JSON
            - Output MUST start with { and end with }
            - Do NOT include explanations or markdown
            - Keep ALL string values under 30 words
            - matchingSkills and missingSkills must each have MAX 10 items
            - If output cannot fit, return {} only

        Please provide the output in the following JSON format ONLY (no markdown code blocks):
        {
            "matchPercentage": "Integer between 0 and 100",
            "matchingSkills": ["List of skills present in both"],
            "missingSkills": ["List of skills required but missing in CV"],
            "experienceAnalysis": "Brief analysis of experience match (1-2 sentences)",
            "summary": "Brief summary of the compatibility"
        }
    `;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 10000
        }
    };



    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to fetch from Gemini API");
        }


        const textResponse =
            responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log("textResponse", textResponse);
        console.log("textResponse type", typeof textResponse);

        if (!textResponse) {
            throw new Error("Empty response from Gemini");
        }

        const start = textResponse.indexOf("{");
        const end = textResponse.lastIndexOf("}");

        console.log("start", start);
        console.log("end", end);

        if (start === -1 || end === -1) {
            throw new Error("Model did not return valid JSON");
        }

        const jsonString = textResponse.slice(start, end + 1);

        console.log("jsonString", jsonString);

        return JSON.parse(jsonString);


    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
