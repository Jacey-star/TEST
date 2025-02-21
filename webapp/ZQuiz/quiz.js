document.addEventListener("DOMContentLoaded", function() {
    // quizpage->questionpage
    document.getElementById("start").addEventListener("click", function() {
        window.location.href = "questions.html";
    });

    // quizpage->navpage
    document.getElementById("back").addEventListener("click", function() {
        window.history.back();
    });
});
