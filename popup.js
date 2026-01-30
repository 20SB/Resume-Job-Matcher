document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const cvTextInput = document.getElementById('cvText');
    const saveBtn = document.getElementById('saveBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const status = document.getElementById('status');

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
    // Verify save logic is preserved... (This comment is for context, not replacement)

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
