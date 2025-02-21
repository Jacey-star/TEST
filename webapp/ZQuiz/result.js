// 模拟后端 API 请求，实际使用时请替换为真实的 API 地址
async function fetchQuizResults() {
    try {
        // 这里填写后端 API 地址，例如：'/api/quiz-results'
        const response = await fetch('YOUR_BACKEND_API_URL_HERE'); 
        const resultData = await response.json(); // 解析 JSON 数据
    
        document.getElementById('correct').innerText = `Correct: ${resultData.correctAnswers}`;
        document.getElementById('wrong').innerText = `Wrong: ${resultData.wrongAnswers}`;
        document.getElementById('round-score').innerText = `Round Score: ${resultData.roundScore}`;
        document.getElementById('total-score').innerText = `Total Score: ${resultData.totalScore}`;
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
    const colors = ["pink", "yellow", "blue", "red", "purple", "white"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < 20; i++) { // 生成 20 个粒子
        const firework = document.createElement("div");
        firework.classList.add("firework");
        firework.style.setProperty("--color", color);
        const angle = (Math.PI * 2) * (i / 20); // 计算角度
        const distance = Math.random() * 80 + 50; // 随机扩散距离
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



