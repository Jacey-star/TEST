async function fetchQuizResults() {
    try {
        const response = await fetch('/api/quiz-results/');
        const resultText = await response.text();
    
        //return text like: "5|2|75|150"
        const [correct, wrong, roundScore, totalScore] = resultText.split('|');
        

        document.getElementById('correct').innerText = `Correct: ${correct}`;
        document.getElementById('wrong').innerText = `Wrong: ${wrong}`;
        document.getElementById('round-score').innerText = `Round Score: ${roundScore}`;
        document.getElementById('total-score').innerText = `Total Score: ${totalScore}`;
    } catch (error) {
        console.error("Error fetching quiz results:", error);
    }
}

window.onload = fetchQuizResults;

//firework
function createFirework() {
    const fireworkContainer = document.createElement("div");
    fireworkContainer.classList.add("firework-container");
    document.body.appendChild(fireworkContainer);
    
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const colors = ["orange", "blue", "red", "purple", "green"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < 20; i++) { 
        const firework = document.createElement("div");
        firework.classList.add("firework");
        firework.style.setProperty("--color", color);
        const angle = (Math.PI * 2) * (i / 20); 
        const distance = Math.random() * 80 + 50; 
        firework.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
        firework.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
        firework.style.left = `${x}px`;
        firework.style.top = `${y}px`;

        fireworkContainer.appendChild(firework);
    }
    setTimeout(() => {
        fireworkContainer.remove();
    }, 1500);
}
setInterval(createFirework, 800);



