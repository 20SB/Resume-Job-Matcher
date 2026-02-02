/**
 * Google Sheets API Service
 * Handles creation and updating of the Job Tracker sheet.
 */

const SheetsService = {
    SPREADSHEET_TITLE: 'Job Application Tracker - CV Matcher',

    /**
     * Get or create the tracker spreadsheet
     */
    async getOrCreateSheet(token, email) {
        if (!email) throw new Error("User email required for storage key");
        const storageKey = `spreadsheetId_${email}`;

        // 1. Check if we have a stored ID
        const storage = await chrome.storage.local.get([storageKey]);
        const storedId = storage[storageKey];

        if (storedId) {
            // Validate if it still exists
            try {
                await this.getSheetDetails(token, storedId);
                return storedId;
            } catch (e) {
                console.warn('Stored spreadsheet ID invalid or not found, creating new one.', e);
                // Fall through to create new
            }
        }

        // 2. Search for existing sheet by name (to prevent duplicates if local storage cleared)
        const searchResult = await this.searchSheetByName(token, this.SPREADSHEET_TITLE);
        if (searchResult) {
            await chrome.storage.local.set({ [storageKey]: searchResult });
            return searchResult;
        }

        // 3. Create new sheet
        const newId = await this.createNewSheet(token);
        await chrome.storage.local.set({ [storageKey]: newId });
        return newId;
    },

    /**
     * Search for a spreadsheet by name
     */
    async searchSheetByName(token, name) {
        const query = `name = '${name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        return null;
    },

    /**
     * Get sheet details to verify existence
     */
    async getSheetDetails(token, spreadsheetId) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Sheet not found');
        return await response.json();
    },

    /**
     * Create a new spreadsheet with headers
     */
    async createNewSheet(token) {
        const url = 'https://sheets.googleapis.com/v4/spreadsheets';
        const body = {
            properties: {
                title: this.SPREADSHEET_TITLE
            },
            sheets: [{
                properties: {
                    gridProperties: {
                        frozenRowCount: 1
                    }
                },
                data: [{
                    startRow: 0,
                    startColumn: 0,
                    rowData: [{
                        values: [
                            { userEnteredValue: { stringValue: "Date" }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: "Company" }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: "Job Title" }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: "Job URL" }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: "Match Score" }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: "Status" }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: "Notes" }, userEnteredFormat: { textFormat: { bold: true } } }
                        ]
                    }]
                }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Failed to create spreadsheet');
        const data = await response.json();
        return data.spreadsheetId;
    },

    /**
     * Append a job row
     */
    async appendJob(token, spreadsheetId, jobData) {
        const range = 'Sheet1!A:G';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

        const body = {
            values: [[
                new Date().toLocaleDateString(),
                jobData.company || "Unknown",
                jobData.title || "Unknown",
                jobData.url || "",
                jobData.matchScore ? `${jobData.matchScore}%` : "N/A",
                "Analyzed", // Initial status
                jobData.recommendation || ""
            ]]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to append data');
        }

        return await response.json();
    }
};

// Make available globally or via module export depending on context
// Supports both Window (Popup) and Service Worker (Background) environments
if (typeof self !== 'undefined') {
    self.SheetsService = SheetsService;
} else if (typeof window !== 'undefined') {
    window.SheetsService = SheetsService;
} else {
    globalThis.SheetsService = SheetsService;
}
