document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("copyBtn");
    const msg = document.getElementById("copyMsg");
    const prompt = document.getElementById("aiPrompt");

    btn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(prompt.innerText);
            msg.style.opacity = 1;
            setTimeout(() => {
                msg.style.opacity = 0;
            }, 2000);
        } catch (err) {
            console.error("Clipboard error:", err);
            alert("Failed to copy text. Please copy manually.");
        }
    });
});
