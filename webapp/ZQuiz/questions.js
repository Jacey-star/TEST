document.addEventListener("DOMContentLoaded", async function() {
    const questionText = document.getElementById("question-text");
    const questionNumber = document.getElementById("question-number");
    const options = document.querySelectorAll(".option");
    const progressBar = document.querySelector(".progress-per");
    const progressIcon = document.getElementById("progress-icon"); // 获取 GIF 动图
    let currentQuestionIndex = 0;
    const totalQuestions = 5; 

    // 预加载音效
    const correctSound = new Audio("sounds/correct.mp3");
    const wrongSound = new Audio("sounds/wrong.mp3");

    const questions = [
        { text: "What is the center of the solar system?", options: { A: "Earth", B: "Mars", C: "Sun", D: "Jupiter" }, correctAnswer: "C" },
        { text: "What is the chemical formula of water?", options: { A: "H2O", B: "CO2", C: "O2", D: "H2" }, correctAnswer: "A" },
        { text: "What is the highest mountain in the world?", options: { A: "K2", B: "Mount Everest", C: "Kangchenjunga", D: "Annapurna" }, correctAnswer: "B" },
        { text: "Who is one of the founders of Apple Inc.?", options: { A: "Bill Gates", B: "Steve Jobs", C: "Mark Zuckerberg", D: "Larry Page" }, correctAnswer: "B" },
        { text: "What are the first two decimal places of π (pi)?", options: { A: "3.12", B: "3.15", C: "3.14", D: "3.16" }, correctAnswer: "C" }
    ];
    

    function loadQuestion() {
        if (currentQuestionIndex >= totalQuestions) {
            return;
        }

        let question = questions[currentQuestionIndex];
        questionText.textContent = question.text;
        questionNumber.textContent = `Question ${currentQuestionIndex + 1}`;

        options.forEach((button, index) => {
            const optionKey = ["A", "B", "C", "D"][index];
            button.innerHTML = `${optionKey}. ${question.options[optionKey]}`;
            button.classList.remove("correct", "wrong");
            button.disabled = false; 

            button.onclick = () => checkAnswer(button, optionKey, question.correctAnswer);
        });
    }

    function checkAnswer(button, selectedOption, correctAnswer) {
        options.forEach(btn => btn.disabled = true);

        if (selectedOption === correctAnswer) {
            button.classList.add("correct");
            correctSound.play();
        } else {
            button.classList.add("wrong");
            wrongSound.play();
            options.forEach(btn => {
                if (btn.getAttribute("data-option") === correctAnswer) {
                    btn.classList.add("correct");
                }
            });
        }

        updateProgress(() => {
            if (currentQuestionIndex + 1 < totalQuestions) {
                setTimeout(() => {
                    currentQuestionIndex++;
                    loadQuestion();
                }, 300);
            } else {
                setTimeout(() => {
                    window.location.href = "result.html";
                }, 600);
            }
        });
    }

    function updateProgress(callback) {
        let progress = ((currentQuestionIndex + 1) / totalQuestions) * 100; // 计算进度

        progressBar.style.transition = "width 0.5s ease-in-out";
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute("per", `${Math.round(progress)}%`);

        // 让 GIF 动图同步移动
        progressIcon.style.transition = "left 0.5s ease-in-out";
        progressIcon.style.left = `${progress}%`;

        progressBar.addEventListener("transitionend", function handleTransition() {
            progressBar.removeEventListener("transitionend", handleTransition);
            callback();
        });
    }

    loadQuestion();
});
