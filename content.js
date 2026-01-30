// Content script for CV Matcher

let overlay = null;

function createAnalyzeButton() {
    // ONLY show floating button on LinkedIn
    if (!window.location.hostname.includes('linkedin.com')) return;

    // Check if button already exists
    if (document.getElementById('cv-matcher-analyze-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'cv-matcher-analyze-btn';
    btn.textContent = 'Analyze Match';
    btn.className = 'artdeco-button artdeco-button--2 artdeco-button--primary ember-view';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    btn.style.backgroundColor = '#0a66c2';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '24px';
    btn.style.padding = '10px 24px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';

    btn.addEventListener('click', handleAnalyzeClick);
    document.body.appendChild(btn);
}

function getJobDescription() {
    // 1. LinkedIn Specific
    if (window.location.hostname.includes('linkedin.com')) {
        const descriptionContainer = document.querySelector('.jobs-description') ||
            document.querySelector('.jobs-description-content__text') ||
            document.querySelector('#job-details');
        if (descriptionContainer) return descriptionContainer.innerText;
    }

    // 2. Generic Selection (Improvement for other sites)
    // Try to find a large block of text that might be the description
    const articles = document.getElementsByTagName('article');
    if (articles.length > 0) return articles[0].innerText;

    const mains = document.getElementsByTagName('main');
    if (mains.length > 0) return mains[0].innerText;

    // Fallback: Try to grab main body text, excluding nav/footer if possible
    return document.body.innerText;
}

// Listen for messages from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "triggerAnalysis") {
        handleAnalyzeClick()
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep channel open for async response
    }
});

async function handleAnalyzeClick() {
    return new Promise(async (resolve) => {
        // If triggered from popup, we might not have a button reference
        let btn = document.getElementById('cv-matcher-analyze-btn');
        let originalText = '';

        if (btn) {
            originalText = btn.textContent;
            btn.textContent = 'Analyzing...';
            btn.disabled = true;
        }

        const resetBtn = () => {
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        };

        try {
            // 1. Get Settings (API Key & CV & Model)
            const storage = await chrome.storage.local.get(['geminiApiKey', 'userCvText', 'geminiModel']);

            if (!storage.geminiApiKey || !storage.userCvText) {
                alert('Please configure your Gemini API Key and CV in the extension settings first.');
                resetBtn();
                resolve({ success: false, error: 'Configuration missing' });
                return;
            }

            // 2. Scrape Job Description
            const jobDescription = getJobDescription();
            if (!jobDescription || jobDescription.length < 50) {
                alert('Could not find a valid job description on this page.');
                resetBtn();
                resolve({ success: false, error: 'Job description not found' });
                return;
            }

            // 3. Send to Background
            chrome.runtime.sendMessage({
                action: "analyzeCV",
                data: {
                    apiKey: storage.geminiApiKey,
                    cvText: storage.userCvText,
                    modelName: storage.geminiModel,
                    jobDescription: jobDescription
                }
            }, (response) => {
                resetBtn();

                if (chrome.runtime.lastError) {
                    alert('Error: ' + chrome.runtime.lastError.message);
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }

                if (response.success) {
                    showResultsOverlay(response.data);
                    resolve({ success: true });
                } else {
                    alert('Analysis failed: ' + response.error);
                    resolve({ success: false, error: response.error });
                }
            });

        } catch (err) {
            console.error(err);
            resetBtn();
            alert('An unexpected error occurred.');
            resolve({ success: false, error: err.message });
        }
    });
}

function showResultsOverlay(data) {
    if (overlay) {
        document.body.removeChild(overlay);
        overlay = null; // Clean ref
    }

    // Ensure safe defaults
    const matchPercentage = data.matchPercentage || 0;
    const summary = data.summary || "No summary provided.";
    const matchingSkills = Array.isArray(data.matchingSkills) ? data.matchingSkills : [];
    const missingSkills = Array.isArray(data.missingSkills) ? data.missingSkills : [];
    const experienceAnalysis = data.experienceAnalysis || "No analysis provided.";

    overlay = document.createElement('div');
    overlay.id = 'cv-matcher-overlay';

    // Determine color based on score
    let scoreColor = '#d93025'; // Red
    if (matchPercentage >= 70) scoreColor = '#188038'; // Green
    else if (matchPercentage >= 40) scoreColor = '#f9ab00'; // Yellow

    overlay.innerHTML = `
        <div class="cv-matcher-content">
            <button class="close-btn">&times;</button>
            <div class="header">
                <h3>CV Match Analysis</h3>
                <div class="score" style="background-color: ${scoreColor}">${matchPercentage}%</div>
            </div>
            
            <div class="section">
                <h4>Summary</h4>
                <p>${summary}</p>
            </div>

            <div class="section">
                <h4>✅ Matching Skills</h4>
                <div class="tags">
                    ${matchingSkills.length > 0 ? matchingSkills.map(skill => `<span class="tag match">${skill}</span>`).join('') : '<span class="tag">None</span>'}
                </div>
            </div>

            <div class="section">
                <h4>❌ Missing Skills</h4>
                <div class="tags">
                    ${missingSkills.length > 0 ? missingSkills.map(skill => `<span class="tag missing">${skill}</span>`).join('') : '<span class="tag">None</span>'}
                </div>
            </div>

            <div class="section">
                <h4>Experience Analysis</h4>
                <p>${experienceAnalysis}</p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Re-query the button inside the overlay just created
    overlay.querySelector('.close-btn').addEventListener('click', () => {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        overlay = null;
    });
}

setInterval(createAnalyzeButton, 2000);
