// Replace with your deployed Apps Script webapp URL:
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwb6PItVzMStZspmJX8IhL5K-b-0zFHSiQkfd9ptKJvBtXlJEkYMPWVAyufkccFDkmV/exec";

const tfButtons = document.querySelectorAll(".tf-btn");
const symbolSelect = document.getElementById("symbol");
const genBtn = document.getElementById("genBtn");
const aiSignalBox = document.getElementById("ai_signal");
const confidenceText = document.getElementById("confidence_text");
const autoLevBox = document.getElementById("auto_lev");
const posBox = document.getElementById("pos_box");
const matchedBox = document.getElementById("matched_box");

let selectedTimeframe = "1m";

// ❌ LIVE CHART COMPLETELY REMOVED  
// (chart initialization & loadLiveChart removed)


// ==============================
//   TRADE TIMER FUNCTION
// ==============================
function calculateTradeTimer(timeframe, confidence, leverage) {
    let baseMinutes = 5;

    switch (timeframe) {
        case "1m": baseMinutes = 5; break;
        case "5m": baseMinutes = 15; break;
        case "15m": baseMinutes = 35; break;
        case "1h": baseMinutes = 90; break;
        case "4h": baseMinutes = 360; break;
    }

    let confFactor = 1;
    if (confidence < 30) confFactor = 0.6;
    else if (confidence < 60) confFactor = 1;
    else if (confidence < 80) confFactor = 1.3;
    else confFactor = 1.6;

    let levFactor = 1 - (leverage / 150);
    if (levFactor < 0.4) levFactor = 0.4;

    return Math.round(baseMinutes * confFactor * levFactor);
}


// ==============================
//   TIMEFRAME BUTTON HANDLER
// ==============================
tfButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        tfButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedTimeframe = btn.textContent.trim();
    });
});


// ==============================
//   MAIN SIGNAL FETCH
// ==============================
genBtn.addEventListener("click", fetchSignal);

async function fetchSignal() {
    try {
        aiSignalBox.textContent = "Loading...";
        confidenceText.textContent = "Confidence: --%";
        autoLevBox.textContent = "--";
        posBox.textContent = "--";
        matchedBox.innerHTML = "Loading...";

        const pairFull = symbolSelect.value;
        const pair = pairFull.split("/")[0];

        const url = `${APPS_SCRIPT_URL}?pair=${encodeURIComponent(pair)}&timeframe=${encodeURIComponent(selectedTimeframe)}`;
        const resp = await fetch(url);

        if (!resp.ok) throw new Error("Network response not OK: " + resp.status);

        const data = await resp.json();

        if (data.status === "error") {
            aiSignalBox.textContent = "ERROR";
            matchedBox.innerHTML = `<div class="rule">Backend error: ${data.message}</div>`;
            return;
        }

        aiSignalBox.textContent = data.signal || "NEUTRAL";
        confidenceText.textContent = `Confidence: ${data.confidence ?? "--"}%`;
        autoLevBox.textContent = data.leverage ? data.leverage + "x" : "--";

        if (data.position?.positionSizeUSD !== undefined) {
            posBox.textContent = "$" + Number(data.position.positionSizeUSD).toLocaleString();
        } else {
            posBox.textContent = "--";
        }

        // Matched Rules
        if (Array.isArray(data.matched_rules) && data.matched_rules.length > 0) {
            matchedBox.innerHTML = "";
            data.matched_rules.forEach(m => {
                const el = document.createElement("div");
                el.className = "rule";
                el.innerHTML = `
                    <strong>${m.source}</strong> — ${m.rule_name || ""}
                    <div style="opacity:0.8;font-size:12px">${m.description || ""}</div>`;
                matchedBox.appendChild(el);
            });
        } else {
            matchedBox.innerHTML = "<div class='rule'>No matching rules.</div>";
        }

        // Timer
        const timerMinutes = calculateTradeTimer(
            selectedTimeframe,
            data.confidence,
            data.leverage
        );

        document.getElementById("trade_timer").textContent = timerMinutes + " minutes";

        console.log("Signal response:", data);

    } catch (err) {
        console.error(err);
        aiSignalBox.textContent = "ERROR";
        confidenceText.textContent = "Error fetching";
        matchedBox.innerHTML = `<div class="rule">Fetch error: ${err}</div>`;
    }
}

// ❌ No chart initialization needed anymore
// document.addEventListener('DOMContentLoaded', initChart); (removed)

