document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const cvTextInput = document.getElementById('cvText');
    const saveBtn = document.getElementById('saveBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const status = document.getElementById('status');

    // Auth UI Elements
    const loginSection = document.getElementById('loginSection');
    const logoutSection = document.getElementById('logoutSection');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const createSheetBtn = document.getElementById('createSheetBtn');
    const sheetStatus = document.getElementById('sheetStatus');

    // --- Authentication Logic ---

    function updateAuthUI(token) {
        if (token) {
            loginSection.style.display = 'none';
            logoutSection.style.display = 'block';
            checkSheetStatus(token);
        } else {
            loginSection.style.display = 'block';
            logoutSection.style.display = 'none';
        }
    }

    function checkAuth() {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError || !token) {
                updateAuthUI(null);
            } else {
                updateAuthUI(token);
            }
        });
    }

    async function checkSheetStatus(token) {
        // Update button text based on if sheet exists locally
        const storage = await chrome.storage.local.get(['spreadsheetId']);
        if (storage.spreadsheetId) {
            createSheetBtn.textContent = "Open Tracker Sheet";
            createSheetBtn.onclick = () => {
                window.open(`https://docs.google.com/spreadsheets/d/${storage.spreadsheetId}`, '_blank');
            };
        } else {
            createSheetBtn.textContent = "Create Tracker Sheet";
            createSheetBtn.onclick = () => handleCreateSheet(token);
        }
    }

    async function handleCreateSheet(token) {
        createSheetBtn.disabled = true;
        createSheetBtn.textContent = "Creating...";

        try {
            // SheetsService is available from sheets.js included in popup.html
            const sheetId = await SheetsService.getOrCreateSheet(token);
            sheetStatus.textContent = "Sheet ready!";
            sheetStatus.style.color = "green";
            checkSheetStatus(token); // Refresh button state
        } catch (err) {
            console.error(err);
            sheetStatus.textContent = "Error: " + err.message;
            sheetStatus.style.color = "red";
        } finally {
            createSheetBtn.disabled = false;
        }
    }

    // Login
    loginBtn.addEventListener('click', () => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                alert("Login failed: " + chrome.runtime.lastError.message);
                return;
            }
            updateAuthUI(token);
        });
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                chrome.identity.removeCachedAuthToken({ token: token }, () => {
                    updateAuthUI(null);
                    alert("Logged out.");
                });
            } else {
                updateAuthUI(null);
            }
        });
    });

    // Initial Check
    checkAuth();

    // --- Existing Settings Logic ---

    // Load saved settings
    chrome.storage.local.get(['geminiApiKey', 'userCvText'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
        if (result.userCvText) {
            cvTextInput.value = result.userCvText;
        }
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const cvText = cvTextInput.value.trim();

        chrome.storage.local.set({
            geminiApiKey: apiKey,
            userCvText: cvText
        }, () => {
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 2000);
        });
    });

    // Analyze Current Page
    analyzeBtn.addEventListener('click', () => {
        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "triggerAnalysis" }, (response) => {
                    // Always re-enable button if we are still here (e.g. error case)
                    analyzeBtn.textContent = 'Analyze Current Page';
                    analyzeBtn.disabled = false;

                    if (chrome.runtime.lastError) {
                        alert("Could not connect to page. Try refreshing the page first.");
                    } else if (response && response.success) {
                        // Success only: Close the popup
                        window.close();
                    } else {
                        // Error case: The content script likely showed an alert, but we keep popup open just in case user missed it 
                        // or to allow retry.
                    }
                });
            }
        });
    });
});
