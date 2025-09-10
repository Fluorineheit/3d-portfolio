const progressBar = document.getElementById('progressBar');
const logoFill = document.getElementById('logoFill');
const progressText = document.getElementById('progressText');
const loadingScreen = document.getElementById('loadingScreen');
const particlesContainer = document.getElementById('particles');

let currentProgress = 0;
const loadingSteps = [
    { progress: 10, text: "Loading Models..." },
    { progress: 25, text: "Loading Textures..." },
    { progress: 40, text: "Loading Fonts..." },
    { progress: 55, text: "Loading Icons..." },
    { progress: 70, text: "Initializing Scene..." },
    { progress: 85, text: "Setting up Controls..." },
    { progress: 100, text: "Ready!" }
];


/**
 * @param {number} newProgress - A value between 0 and 100.
 * @param {string|null} customText - Optional text to display.
 */

function updateProgress(newProgress, customText = null) {
    currentProgress = Math.min(newProgress, 100);
    
    // Update progress bar and logo fill
    progressBar.style.width = currentProgress + '%';
    logoFill.style.width = currentProgress + '%';
    
    // Update text
    if (customText) {
        progressText.textContent = customText;
    } else {
        const currentStep = loadingSteps.find(step => currentProgress <= step.progress);
        if (currentStep) {
            progressText.textContent = currentStep.text;
        }
    }
    
    // Auto-hide when complete
    if (currentProgress >= 100) {
        setTimeout(() => {
            hideLoadingScreen();
        }, 1000);
    }
}

function hideLoadingScreen() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
}

function showLoadingScreen() {
    loadingScreen.style.display = 'flex';
    loadingScreen.classList.remove('fade-out');
}

function createParticles() {
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Demo function to simulate loading progress
// function startDemo() {
//     let progress = 0;
//     const interval = setInterval(() => {
//         progress += Math.random() * 15;
//         updateProgress(progress);
        
//         if (progress >= 100) {
//             clearInterval(interval);
//         }
//     }, 800);
// }

// --- Initialization ---
function init() {
    createParticles();
    // startDemo(); // Call the demo to show it works
}

init();


export { updateProgress, showLoadingScreen };