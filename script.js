document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const playButton = document.getElementById('play-button');
    const playAgainButton = document.getElementById('play-again-button');

    const timerDisplay = document.getElementById('timer-display');
    const timerProgress = document.getElementById('timer-progress');
    const scoreDisplay = document.getElementById('score-display');
    const startHighScoreDisplay = document.getElementById('start-high-score');
    const gameHighScoreDisplay = document.getElementById('game-high-score');
    const endHighScoreDisplay = document.getElementById('end-high-score');

    const questionText = document.getElementById('question-text');
    const answerOptionsContainer = document.getElementById('answer-options');
    const feedbackText = document.getElementById('feedback-text');
    const qaContainer = document.getElementById('qa-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const questionContainer = document.getElementById('question-container'); // Container untuk animasi soal

    const comboDisplay = document.getElementById('combo-display');

    const finalScoreDisplay = document.getElementById('final-score');

    // Audio elements (optional)
    const correctSound = document.getElementById('correct-sound');
    const wrongSound = document.getElementById('wrong-sound');
    const gameOverSound = document.getElementById('game-over-sound');
    const clickSound = document.getElementById('click-sound');

    // --- Game State Variables ---
    let score = 0;
    let timer = 100;
    let timerInterval = null;
    let highScore = localStorage.getItem('cryptarithmHighScore') ? parseInt(localStorage.getItem('cryptarithmHighScore')) : 0;
    let currentQuestion = null;
    let currentLevel = 1;
    let questionsAnswered = 0;
    let correctAnswersInARow = 0;
    let comboMultiplier = 1;
    let isPlaying = false;
    let questionTimeout = null; // Untuk delay antar soal
    let isLoadingNextQuestion = false;

    // --- Cryptarithm Questions Pool ---
    // Format: { puzzle: "A+B=C", values: {A:1, B:2}, question: "Berapa nilai C?", answer: 3, difficulty: 1 }
    const questions = [
        // Level 1: Penjumlahan 1 digit sederhana
        { puzzle: "A+B=C", values: { A: 3, B: 4 }, question: "Jika A=3, B=4, berapa C?", answer: 7, difficulty: 1 },
        { puzzle: "X+Y=Z", values: { X: 5, Y: 2 }, question: "Jika X=5, Y=2, berapa Z?", answer: 7, difficulty: 1 },
        { puzzle: "M+M=N", values: { M: 4 }, question: "Jika M=4, berapa N?", answer: 8, difficulty: 1 },
        { puzzle: "P+Q=R", values: { P: 1, Q: 6 }, question: "Jika P=1, Q=6, berapa R?", answer: 7, difficulty: 1 },
        { puzzle: "D+E=F", values: { D: 2, E: 5 }, question: "Jika D=2, E=5, berapa F?", answer: 7, difficulty: 1 },

        // Level 2: Penjumlahan melibatkan angka belasan, pengurangan sederhana
        { puzzle: "A+B=C", values: { A: 8, B: 5 }, question: "Jika A=8, B=5, berapa C?", answer: 13, difficulty: 2 },
        { puzzle: "K+L=M", values: { K: 7, L: 9 }, question: "Jika K=7, L=9, berapa M?", answer: 16, difficulty: 2 },
        { puzzle: "S+T=U", values: { S: 6, T: 6 }, question: "Jika S=6, T=6, berapa U?", answer: 12, difficulty: 2 },
        { puzzle: "X-Y=Z", values: { X: 9, Y: 3 }, question: "Jika X=9, Y=3, berapa Z?", answer: 6, difficulty: 2 },
        { puzzle: "N-P=Q", values: { N: 15, P: 6 }, question: "Jika N=15, P=6, berapa Q?", answer: 9, difficulty: 2 },

        // Level 3: Penjumlahan 2 digit, perkalian sederhana
        { puzzle: "AB+C=DE", values: { A:1, B:2, C: 5 }, question: "Jika AB=12, C=5, berapa DE?", answer: 17, difficulty: 3 },
        { puzzle: "X*Y=Z", values: { X: 4, Y: 3 }, question: "Jika X=4, Y=3, berapa Z?", answer: 12, difficulty: 3 },
        { puzzle: "M*N=P", values: { M: 5, N: 6 }, question: "Jika M=5, N=6, berapa P?", answer: 30, difficulty: 3 },
        { puzzle: "AA+B=CC", values: { A: 2, B: 3 }, question: "Jika AA=22, B=3, berapa CC?", answer: 25, difficulty: 3 },
        { puzzle: "G*G=H", values: { G: 7 }, question: "Jika G=7, berapa H?", answer: 49, difficulty: 3 },
         // Tambahkan lebih banyak soal untuk variasi dan level kesulitan yang lebih tinggi
    ];

    // --- Utility Functions ---
    const playSound = (soundElement) => {
        if (soundElement && soundElement.readyState >= 2) { // Check if sound is ready
             soundElement.currentTime = 0; // Rewind to start
             soundElement.play().catch(e => console.log("Audio play failed:", e)); // Play and catch errors
        }
    };

    // Function to shuffle array (Fisher-Yates shuffle)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
    }

    // Function to generate answer options
    function generateOptions(correctAnswer, difficulty) {
        const options = new Set([correctAnswer]); // Use Set to avoid duplicates initially
        const range = difficulty * 5 + 5; // Increase variance for harder questions

        // Generate 3 incorrect options
        while (options.size < 4) {
            // Generate numbers somewhat close to the correct answer
            const offset = Math.floor(Math.random() * range) - Math.floor(range / 2);
            let incorrectAnswer = correctAnswer + offset;
            // Ensure it's not the correct answer and not negative (usually)
            if (incorrectAnswer !== correctAnswer && incorrectAnswer >= 0) {
                options.add(incorrectAnswer);
            } else if (options.size < 3 && incorrectAnswer < 0 && correctAnswer > 0) {
                 // Add a different positive number if generating negative failed
                 options.add(Math.abs(correctAnswer + Math.floor(Math.random()*5) + 1));
            }
            // Fallback for edge cases (e.g., correct answer is 0)
            if(options.size < 4 && incorrectAnswer == correctAnswer) {
                 options.add(correctAnswer + options.size + 1); // Add a simple distinct number
            }
        }

        const optionsArray = Array.from(options);
        shuffleArray(optionsArray); // Shuffle the final options
        return optionsArray;
    }

     // Function for count-up animation
    function animateCountUp(element, start, end, duration) {
        if (start === end) return;
        const range = end - start;
        let current = start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));

        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            if (current == end) {
                clearInterval(timer);
            }
        }, stepTime);
    }

      // Function to show score increase animation
    function showScoreIncrease(amount) {
        const scoreContainer = document.querySelector('.score-container'); // Get container for positioning
        const popup = document.createElement('div');
        popup.textContent = `+${amount}`;
        popup.className = 'score-popup';
        gameScreen.appendChild(popup); // Append to game screen

        // Remove the element after animation ends
        popup.addEventListener('animationend', () => {
            popup.remove();
        });
    }

    // --- Game Logic Functions ---
    function updateHighScoreDisplay() {
        startHighScoreDisplay.textContent = highScore;
        gameHighScoreDisplay.textContent = highScore;
        endHighScoreDisplay.textContent = highScore;
    }

    function saveHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('cryptarithmHighScore', highScore);
            updateHighScoreDisplay();
        }
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = timer;
        const progressPercentage = (timer / 100) * 100; // Assuming initial timer is 100
        timerProgress.style.width = `${Math.max(0, progressPercentage)}%`; // Ensure width doesn't go below 0
         // Change color based on time remaining
        if (progressPercentage < 25) {
            timerProgress.style.background = 'linear-gradient(90deg, #ff6b6b, #f06595)'; // Red gradient
        } else if (progressPercentage < 50) {
            timerProgress.style.background = 'linear-gradient(90deg, #ff8c00, #ffaf60)'; // Orange gradient
        } else {
             timerProgress.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)'; // Green gradient (default)
        }
    }

     function updateScoreDisplay(increment = 0) {
        const oldScore = score;
        const pointsToAdd = increment * comboMultiplier;
        score += pointsToAdd;

        // Animate score increase
        animateCountUp(scoreDisplay, oldScore, score, 300);

        // Show visual "+score" popup only if score increased
        if (pointsToAdd > 0) {
            showScoreIncrease(pointsToAdd);
        }
         // Update high score during game
         if (score > highScore) {
            gameHighScoreDisplay.textContent = score; // Update live high score display
        }

        // Increase difficulty based on score milestones
        if (score >= 50 && currentLevel < 2) {
            currentLevel = 2;
            console.log("Level Up! Difficulty 2");
        } else if (score >= 120 && currentLevel < 3) {
            currentLevel = 3;
             console.log("Level Up! Difficulty 3");
        }
         // Add more levels as needed
    }

    function updateComboDisplay() {
        if (correctAnswersInARow >= 3) {
            comboMultiplier = 2; // Example: 2x multiplier after 3 correct answers
            comboDisplay.textContent = `Combo x${comboMultiplier}!`;
            comboDisplay.classList.add('show');
        } else {
            comboMultiplier = 1;
            comboDisplay.textContent = '';
            comboDisplay.classList.remove('show');
        }
    }

    function loadQuestion() {
         isLoadingNextQuestion = true; // Mark as loading
         clearTimeout(questionTimeout); // Clear previous timeout if any
         feedbackText.classList.remove('show', 'correct', 'wrong'); // Hide feedback

        // --- Transition Out ---
        questionContainer.classList.add('fade-out');
        answerOptionsContainer.classList.add('fade-out');
        loadingOverlay.classList.add('show'); // Show loading text

        questionTimeout = setTimeout(() => {
            // Filter questions by current difficulty level
            const availableQuestions = questions.filter(q => q.difficulty <= currentLevel);
            if (availableQuestions.length === 0) {
                // Handle case where no questions are available (e.g., show a message or end game)
                console.error("No more questions available for this level!");
                 // For now, let's just reuse questions (simple fallback)
                 currentQuestion = questions[Math.floor(Math.random() * questions.length)];
                 if (!currentQuestion) { endGame(); return; } // Truly end if no questions at all
            } else {
                 // Select a random question from the filtered list
                currentQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
            }


            // Update question text
            questionText.textContent = currentQuestion.question;
             // Clear previous answer options
            answerOptionsContainer.innerHTML = '';

            // Generate and display answer options
            const options = generateOptions(currentQuestion.answer, currentQuestion.difficulty);
            options.forEach(option => {
                const button = document.createElement('button');
                button.textContent = option;
                button.classList.add('btn', 'answer-option');
                button.dataset.value = option; // Store the answer value in data attribute
                button.addEventListener('click', handleAnswerClick);
                answerOptionsContainer.appendChild(button);
            });

             // --- Transition In ---
            loadingOverlay.classList.remove('show'); // Hide loading text
            questionContainer.classList.remove('fade-out');
            questionContainer.classList.add('fade-in'); // Add fade-in class for clarity, though default state works too
            answerOptionsContainer.classList.remove('fade-out');
            answerOptionsContainer.classList.add('fade-in');

             isLoadingNextQuestion = false; // Mark as finished loading
        }, 500); // 500ms delay for the loading text & transition
    }

    function handleAnswerClick(event) {
        if (isLoadingNextQuestion) return; // Prevent clicking while loading

        playSound(clickSound);
        const selectedAnswer = parseInt(event.target.dataset.value);
        const correctAnswer = currentQuestion.answer;

        // Disable buttons temporarily to prevent multiple clicks
        const buttons = answerOptionsContainer.querySelectorAll('.answer-option');
        buttons.forEach(button => button.disabled = true);


        if (selectedAnswer === correctAnswer) {
            // --- Correct Answer ---
            playSound(correctSound);
            event.target.classList.add('correct-answer-effect'); // Glow effect
            feedbackText.textContent = "Benar!";
            feedbackText.className = 'feedback-text show correct'; // Reset classes and add show + correct

            timer += 2; // Add time
            correctAnswersInARow++;
            updateComboDisplay(); // Update combo before score calculation
            updateScoreDisplay(10); // Add score (base 10 points) * comboMultiplier
            questionsAnswered++;


        } else {
            // --- Wrong Answer ---
            playSound(wrongSound);
            event.target.classList.add('wrong-answer-effect'); // Shake effect
            feedbackText.textContent = "Salah!";
            feedbackText.className = 'feedback-text show wrong';
            qaContainer.classList.add('flash-red'); // Flash background red
            setTimeout(() => qaContainer.classList.remove('flash-red'), 300);

            // Highlight correct answer (optional)
             buttons.forEach(button => {
                if (parseInt(button.dataset.value) === correctAnswer) {
                    button.classList.add('correct-answer-effect'); // Show the correct one
                }
            });

            correctAnswersInARow = 0; // Reset combo
             updateComboDisplay();
            // Optional: Penalty? (e.g., timer -= 5;)
        }

        // Load next question after a short delay to show feedback
        isLoadingNextQuestion = true; // Prevent further clicks during feedback
        clearTimeout(questionTimeout); // Clear any pending loading timeout
        questionTimeout = setTimeout(() => {
             buttons.forEach(button => button.disabled = false); // Re-enable buttons if needed (though they get replaced)
            loadQuestion();
        }, 1000); // Delay before loading next question (e.g., 1 second)
    }

    function startTimer() {
        clearInterval(timerInterval); // Clear any existing timer
        updateTimerDisplay(); // Initial display

        timerInterval = setInterval(() => {
            timer--;
            updateTimerDisplay();

            if (timer <= 0) {
                endGame();
            }
        }, 1000); // Update every second
    }

    function switchScreen(hideScreen, showScreen) {
         if (hideScreen) {
            hideScreen.classList.remove('active');
            // Wait for the transition out before showing the next screen
            // Using setTimeout matches the CSS transition duration
            setTimeout(() => {
                 hideScreen.style.display = 'none'; // Hide completely after transition
                 if (showScreen) {
                     showScreen.style.display = 'block'; // Make it block *before* adding active class
                     // Force reflow/repaint before adding the class for transition to work reliably
                     void showScreen.offsetWidth;
                     showScreen.classList.add('active');
                 }
            }, 500); // Match CSS transition duration
         } else if (showScreen) {
            // If no screen to hide (initial state), just show the target screen
             showScreen.style.display = 'block';
             void showScreen.offsetWidth;
             showScreen.classList.add('active');
         }

    }

    function startGame() {
        if (isPlaying) return; // Prevent starting multiple times
        isPlaying = true;
        isLoadingNextQuestion = false;

        playSound(clickSound);

        // Reset game state
        score = 0;
        timer = 100; // Reset timer to initial value
        currentLevel = 1;
        questionsAnswered = 0;
        correctAnswersInARow = 0;
        comboMultiplier = 1;
        scoreDisplay.textContent = '0'; // Reset display immediately
        updateComboDisplay();
        updateHighScoreDisplay(); // Ensure high score is current

        // Switch screens
        switchScreen(startScreen, gameScreen);
        switchScreen(gameOverScreen, null); // Make sure game over is hidden


        // Start game processes
        startTimer();
        loadQuestion(); // Load the first question
    }

    function endGame() {
        isPlaying = false;
        clearInterval(timerInterval); // Stop the timer
         clearTimeout(questionTimeout); // Stop any pending question loads
        playSound(gameOverSound);

        saveHighScore(); // Save score before displaying game over

        // Display final results
        finalScoreDisplay.textContent = score;
        updateHighScoreDisplay(); // Ensure high score display on game over screen is updated

        // Switch screens
        switchScreen(gameScreen, gameOverScreen);
    }

    // --- Event Listeners ---
    playButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', startGame);

    // --- Initial Setup ---
    updateHighScoreDisplay(); // Show high score on start screen initially
    switchScreen(null, startScreen); // Show start screen on page load

});
