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
    // Use LinkedIn classes for font/look but our ID will override structure
    btn.className = 'artdeco-button artdeco-button--2 artdeco-button--primary ember-view';

    // Inline styles removed - delegated to styles.css for easier animation management
    // We only keep the event listener attachment

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

// Helper to get Job Metadata (Title, Company, URL)
function getJobMetadata() {
    let title = "Unknown Title";
    let company = "Unknown Company";

    if (window.location.hostname.includes('linkedin.com')) {
        // LinkedIn Specific Selectors
        const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title') ||
            document.querySelector('h1');
        if (titleEl) title = titleEl.innerText.trim();

        const companyEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description a') ||
            document.querySelector('.job-details-jobs-unified-top-card__company-name a');
        if (companyEl) company = companyEl.innerText.trim();
    } else {
        // Generic Fallback
        const h1 = document.querySelector('h1');
        if (h1) title = h1.innerText.trim();
    }

    return {
        title: title,
        company: company,
        url: window.location.href
    };
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

            // 2. Scrape Job Description & Metadata
            const jobDescription = getJobDescription();
            const jobMetadata = getJobMetadata();

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
                    jobDescription: jobDescription,
                    jobMetadata: jobMetadata // Pass metadata too
                }
            }, (response) => {
                resetBtn();

                if (chrome.runtime.lastError) {
                    alert('Error: ' + chrome.runtime.lastError.message);
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }

                if (response.success) {
                    // Combine analysis data with metadata for the view
                    const fullData = { ...response.data, ...jobMetadata };
                    showResultsOverlay(fullData);
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
    const recommendation = data.recommendation || ""; // Should come from analysis? currently not strictly fields, usually summary includes it.

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

            <div class="section" style="border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
                <button id="saveToSheetBtn" style="
                    background-color: #0f9d58;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                    gap: 5px;
                ">
                    <span>Save to Google Sheet</span>
                </button>
                <div id="saveStatus" style="font-size: 11px; margin-top: 5px; color: #666;"></div>
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

    // Handle Save to Sheet
    const saveBtn = overlay.querySelector('#saveToSheetBtn');
    const statusDiv = overlay.querySelector('#saveStatus');

    saveBtn.addEventListener('click', () => {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.7';
        saveBtn.innerText = 'Saving...';

        chrome.runtime.sendMessage({
            action: "saveToSheet",
            data: {
                title: data.title,
                company: data.company,
                url: data.url,
                matchScore: matchPercentage,
                recommendation: summary // Using summary as notes/rec for now
            }
        }, (response) => {
            if (response && response.success) {
                saveBtn.innerText = 'Saved!';
                statusDiv.innerText = 'Row added to spreadsheet.';
                statusDiv.style.color = 'green';
            } else {
                saveBtn.innerText = 'Retry Save';
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                statusDiv.innerText = 'Error: ' + (response ? response.error : 'Unknown error');
                statusDiv.style.color = 'red';
            }
        });
    });
}

setInterval(createAnalyzeButton, 2000);
