// MQTT Configuration
const brokerURL = "ws://broker.hivemq.com:8000/mqtt"; // Public MQTT broker
const client = mqtt.connect(brokerURL, {
    keepalive: 60,
    reconnectPeriod: 5000, // Reconnect every 5 seconds
    clean: true,
});
// MQTT Topics
const topics = {
    soilMoisture: "smart_irrigation/soil_moisture",
    lightIntensity: "smart_irrigation/light_intensity",
    threshold: "smart_irrigation/threshold",
    pumpState: "smart_irrigation/pump_state",
    irrigationMode: "smart_irrigation/irrigation_mode",
};

// HTML Elements
const soilMoistureDisplay = document.getElementById("soil-moisture");
const lightIntensityDisplay = document.getElementById("light-intensity");
const pumpStateDisplay = document.getElementById("pump-state");
const moistureThresholdInput = document.getElementById("moisture-threshold");
const setThresholdButton = document.getElementById("set-threshold");
const irrigationModeSelect = document.getElementById("irrigation-daytime");
const startRecordingButton = document.getElementById("start-recording");
const voiceFeedback = document.getElementById("voice-feedback");

// Connect to MQTT Broker
client.on("connect", () => {
    console.log("Connected to MQTT broker");

    // Subscribe to topics
    client.subscribe([
        topics.soilMoisture,
        topics.lightIntensity,
        topics.pumpState,
    ], (err) => {
        if (err) console.error("Subscription error:", err);
    });
});

// Handle incoming messages
client.on("message", (topic, message) => {
    const data = message.toString();
    if (topic === topics.soilMoisture) {
        soilMoistureDisplay.textContent = data;
    } else if (topic === topics.lightIntensity) {
        lightIntensityDisplay.textContent = data;
    } else if (topic === topics.pumpState) {
        pumpStateDisplay.textContent = data;
    }
});

// Handle connection issues
client.on("close", () => {
    console.error("Disconnected from MQTT broker");
    alert("Disconnected from MQTT broker. Reconnecting...");
    client.reconnect();
});

// Voice Command Setup
let recognition;
let isRecording = false;

function startVoiceRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.start();
    voiceFeedback.textContent = "Listening... Please say 'Set threshold to [number]' or 'Set daytime to [on/off]'.";
    console.log("Voice recognition started");

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Voice command:", transcript);

        const thresholdMatch = transcript.match(/set threshold to (\d+)/);
        if (thresholdMatch && thresholdMatch[1]) {
            const thresholdValue = thresholdMatch[1];
            moistureThresholdInput.value = thresholdValue;
            voiceFeedback.textContent = `Threshold set to ${thresholdValue}%`;
            client.publish(topics.threshold, thresholdValue);
        }

        const irrigationMatch = transcript.match(/set daytime to (on|off)/);
        if (irrigationMatch && irrigationMatch[1]) {
            const irrigationMode = irrigationMatch[1].toUpperCase();
            irrigationModeSelect.value = irrigationMode;
            voiceFeedback.textContent = `Daytime irrigation set to ${irrigationMode}`;
            client.publish(topics.irrigationMode, irrigationMode);
        }
    };

    recognition.onerror = function(event) {
        voiceFeedback.textContent = "Sorry, there was an error recognizing your voice. Please try again.";
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = function() {
        isRecording = false;
        voiceFeedback.textContent = "Voice recognition stopped. Click 'Start Voice Recording' to try again.";
    };
}

startRecordingButton.addEventListener("click", () => {
    if (isRecording) {
        recognition.stop();
        voiceFeedback.textContent = "Voice recognition stopped.";
    } else {
        startVoiceRecognition();
        isRecording = true;
    }
});

setThresholdButton.addEventListener("click", () => {
    const threshold = moistureThresholdInput.value.trim();
    if (threshold !== "" && threshold >= 0 && threshold <= 100) {
        client.publish(topics.threshold, threshold);
        alert(`Threshold set to ${threshold}%`);
    } else {
        alert("Please enter a valid threshold (0-100)");
    }
});

irrigationModeSelect.addEventListener("change", () => {
    const mode = irrigationModeSelect.value;
    client.publish(topics.irrigationMode, mode);
    console.log(`Irrigation mode set to: ${mode}`);
});
