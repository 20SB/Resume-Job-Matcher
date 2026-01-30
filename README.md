# Resume Job Matcher: AI CV Analysis & Optimization

**Resume Job Matcher** is a Chrome extension that leverages the power of Google's Gemini AI to help you land your dream job. It analyzes your resume against any job description to provide a match score, identify missing skills, and offer actionable optimization tips.

## Features

- **Instant Match Score**: Get a percentage score indicating how well your resume matches a specific job description.
- **AI-Powered Analysis**: Uses Google's Gemini models for deep semantic understanding of skills and requirements.
- **Skill Gap Analysis**: Identifies critical skills missing from your profile.
- **Optimization Tips**: actionable advice on how to improve your resume for better ATS ranking.
- **Universal Compatibility**: Works on LinkedIn, Indeed, and any other job board or website.
- **Privacy Focused**: Your data is processed securely via your own API key.

## Prerequisites

To use this extension, you need a **Google Gemini API Key**.

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a new API key (the free tier is sufficient for personal use).
3. Copy the key to use in the extension settings.

## Installation

1. **Clone or Download** this repository to your local machine.
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click on **Load unpacked**.
5. Select the folder containing the extension files (where `manifest.json` is located).
6. The extension icon should appear in your browser toolbar.

## Usage

1. **Setup**:
    - Click the extension icon.
    - Enter your **Gemini API Key**.
    - Paste the raw text of your **Resume/CV**. (See `help.html` for tips on extracting text from PDFs).
    - Click **Save Settings**.

2. **Analyze a Job**:
    - Navigate to any job posting (e.g., on LinkedIn).
    - Click the **"Analyze Job"** button (floating on LinkedIn) or open the extension popup and click **"Analyze Current Page"**.
    - The AI will analyze the job description and present your match report.

## Permissions

- `activeTab` & `scripting`: To read the job description from the current page.
- `storage`: To securely save your API key and resume text locally in your browser.
- `host_permissions`: `<all_urls>` to allow analysis on any job board website.

## Credits

Made by **Subha Biswal**
