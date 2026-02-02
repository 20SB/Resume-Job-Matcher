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

    function updateAuthUI(token, email) {
        if (token) {
            loginSection.style.display = 'none';
            logoutSection.style.display = 'block';

            // Show user email if available
            const emailDisplay = document.getElementById('userEmailDisplay') || createEmailDisplay();
            emailDisplay.textContent = email ? `Logged in as: ${email}` : 'Logged in';

            checkSheetStatus(token, email);
        } else {
            loginSection.style.display = 'block';
            logoutSection.style.display = 'none';
            const emailDisplay = document.getElementById('userEmailDisplay');
            if (emailDisplay) emailDisplay.textContent = '';
        }
    }

    function createEmailDisplay() {
        const div = document.createElement('div');
        div.id = 'userEmailDisplay';
        div.style.marginBottom = '10px';
        div.style.fontSize = '12px';
        div.style.color = '#666';
        div.style.textAlign = 'center';
        logoutSection.insertBefore(div, logoutBtn);
        return div;
    }

    async function getUserEmail(token) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                return data.email;
            }
        } catch (e) {
            console.error("Failed to fetch email", e);
        }
        return null;
    }

    function checkAuth() {
        chrome.identity.getAuthToken({ interactive: false }, async (token) => {
            if (chrome.runtime.lastError || !token) {
                updateAuthUI(null, null);
            } else {
                const email = await getUserEmail(token);
                updateAuthUI(token, email);
            }
        });
    }

    async function checkSheetStatus(token, email) {
        if (!email) {
            createSheetBtn.textContent = "Error: Email needed";
            createSheetBtn.disabled = true;
            return;
        }

        // Update button text based on if sheet exists locally (using email key)
        const storageKey = `spreadsheetId_${email}`;
        const storage = await chrome.storage.local.get([storageKey]);
        const sheetId = storage[storageKey];

        if (sheetId) {
            createSheetBtn.textContent = "Open Tracker Sheet";
            createSheetBtn.onclick = () => {
                window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank');
            };
        } else {
            createSheetBtn.textContent = "Create Tracker Sheet";
            createSheetBtn.onclick = () => handleCreateSheet(token, email);
        }
    }

    async function handleCreateSheet(token, email) {
        createSheetBtn.disabled = true;
        createSheetBtn.textContent = "Creating...";

        try {
            // SheetsService is available from sheets.js included in popup.html
            const sheetId = await SheetsService.getOrCreateSheet(token, email);
            sheetStatus.textContent = "Sheet ready!";
            sheetStatus.style.color = "green";
            checkSheetStatus(token, email); // Refresh button state
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
        chrome.identity.getAuthToken({ interactive: true }, async (token) => {
            if (chrome.runtime.lastError) {
                alert("Login failed: " + chrome.runtime.lastError.message);
                return;
            }
            const email = await getUserEmail(token);
            updateAuthUI(token, email);
        });
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                // 1. Revoke token on Google's server to force re-consent/account choice next time
                fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
                    .then(() => {
                        // 2. Remove from Chrome's cache
                        chrome.identity.removeCachedAuthToken({ token: token }, () => {
                            updateAuthUI(null, null);
                            alert("Logged out successfully.");
                        });
                    })
                    .catch(err => {
                        console.error('Revocation failed', err);
                        // Fallback: remove from cache anyway
                        chrome.identity.removeCachedAuthToken({ token: token }, () => {
                            updateAuthUI(null, null);
                        });
                    });
            } else {
                updateAuthUI(null, null);
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
