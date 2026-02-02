# Resume Job Matcher: AI CV Analysis & Optimization

**Resume Job Matcher** is a Chrome extension that leverages the power of Google's Gemini AI to help you land your dream job. It analyzes your resume against any job description to provide a match score, identify missing skills, and offer actionable optimization tips.

This repository contains:

- **Chrome Extension**: The core extension source code.
- **Promotional Website**: The landing page and documentation site for the extension.

## 📂 Repository Structure

- `extension/` - Contains all source code for the Chrome Extension (`manifest.json`, `background.js`, `popup` logic, etc.).
- `website/` - Contains the source code for the promotional website (`index.html`, `how-it-works.html`, etc.).

## ✨ Features

- **Instant Match Score**: Get a percentage score indicating how well your resume matches a specific job description.
- **Job Tracking**: Automatically save interesting jobs (with match scores) to your **Google Sheets**.
- **AI-Powered Analysis**: Uses Google's Gemini models for deep semantic understanding.
- **Skill Gap Analysis**: Identifies critical skills missing from your profile.
- **Universal Compatibility**: Works on LinkedIn, Indeed, and generic web pages.

## 🚀 Installation (Extension)

1. **Clone or Download** this repository.
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click on **Load unpacked**.
5. Select the **`extension/`** folder from this repository.

## 🌐 Promotional Website

The `website/` folder contains a static site designed to showcase the extension.

## 🛡️ Privacy & Security

- **Your Keys**: Your Gemini API Key is stored locally in your browser (`chrome.storage.local`).
- **Your Data**: Resume text is processed only when you click analyze.
- **Google Sheets**: We use OAuth2 to append data directly to your sheet; we do not store your data on any intermediate server.

## Credits

Made by **Subha Biswal**
