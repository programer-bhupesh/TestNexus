require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs",
  },
});

// Parse test data
const testDataElement = document.getElementById("test-data");
const test = JSON.parse(testDataElement.textContent);

// Ensure DOM is loaded before initializing editors and timer
document.addEventListener("DOMContentLoaded", function () {
  require(["vs/editor/editor.main"], function () {
    document.querySelectorAll(".code-editor").forEach((textarea) => {
      const questionId = textarea.name.match(/answers\[(.+)\]/)[1];
      const languageSelect = document.getElementById(`language-${questionId}`);
      const editorContainer = document.getElementById(`editor-${questionId}`);

      const editor = monaco.editor.create(editorContainer, {
        value: "// Write your code here...\n",
        language: languageSelect.value,
        theme: "vs-dark",
        fontSize: 14,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        lineNumbers: "on",
        wordWrap: "on",
        padding: { top: 10 },
        tabSize: 4,
        insertSpaces: true,
        autoClosingBrackets: "always",
        autoIndent: "full",
        formatOnType: true,
        formatOnPaste: true,
      });

      textarea.editor = editor;

      // Sync editor with textarea
      editor.onDidChangeModelContent(() => {
        textarea.value = editor.getValue();
      });

      // Update language
      languageSelect.addEventListener("change", () => {
        monaco.editor.setModelLanguage(editor.getModel(), languageSelect.value);
      });
    });

    // "Run Code" button
    document.querySelectorAll(".run-code").forEach((button) => {
      button.addEventListener("click", async () => {
        const questionId = button.getAttribute("data-question-id");
        const textarea = document.querySelector(
          `textarea[name="answers[${questionId}]"]`
        );
        let code = textarea.value;
        const language = document.getElementById(
          `language-${questionId}`
        ).value;
        const outputDiv = document.getElementById(`output-${questionId}`);

        const question = test.questions.find((q) => q._id === questionId);
        if (!question || !question.testCases) {
          outputDiv.textContent = "Error: Test cases not found";
          return;
        }

        const t = question.testCases.length;
        const combinedInput = `${t}\n${question.testCases
          .map((tc) => tc.input)
          .join("\n")}`;
        outputDiv.textContent = "Running...";

        if (
          language === "cpp" &&
          !code.includes("\n") &&
          code.includes("cout<<")
        ) {
          code = code.replace(/cout<<a\+b;/g, "cout<<a+b<<endl;");
        }

        try {
          const response = await fetch("/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: "<%= process.env.JDOODLE_CLIENT_ID %>",
              clientSecret: "<%= process.env.JDOODLE_CLIENT_SECRET %>",
              script: code,
              language: language === "javascript" ? "nodejs" : language,
              versionIndex: "0",
              stdin: combinedInput,
            }),
          });
          const result = await response.json();
          outputDiv.textContent = result.output || result.error || "No output";
          outputDiv.style.background = result.error
            ? "rgba(231, 76, 60, 0.2)"
            : "rgba(255, 255, 255, 0.15)";
          setTimeout(
            () => (outputDiv.style.background = "rgba(255, 255, 255, 0.1)"),
            1000
          );
        } catch (error) {
          outputDiv.textContent = "Error running code: " + error.message;
          outputDiv.style.background = "rgba(231, 76, 60, 0.2)";
        }
      });
    });

    // "Run Test Cases" button
    document.querySelectorAll(".run-tests").forEach((button) => {
      button.addEventListener("click", async () => {
        const questionId = button.getAttribute("data-question-id");
        const textarea = document.querySelector(
          `textarea[name="answers[${questionId}]"]`
        );
        let code = textarea.value;
        const language = document.getElementById(
          `language-${questionId}`
        ).value;
        const outputDiv = document.getElementById(`output-${questionId}`);

        const question = test.questions.find((q) => q._id === questionId);
        if (!question || !question.testCases) {
          outputDiv.textContent = "Error: Test cases not found";
          return;
        }

        const t = question.testCases.length;
        const combinedInput = `${t}\n${question.testCases
          .map((tc) => tc.input)
          .join("\n")}`;
        const expectedOutput = question.testCases
          .map((tc) => tc.expectedOutput)
          .join("\n");

        outputDiv.textContent = "Running test cases...";

        if (
          language === "cpp" &&
          !code.includes("\n") &&
          code.includes("cout<<")
        ) {
          code = code.replace(/cout<<a\+b;/g, "cout<<a+b<<endl;");
        }

        try {
          const response = await fetch("/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: "<%= process.env.JDOODLE_CLIENT_ID %>",
              clientSecret: "<%= process.env.JDOODLE_CLIENT_SECRET %>",
              script: code,
              language: language === "javascript" ? "nodejs" : language,
              versionIndex: "0",
              stdin: combinedInput,
            }),
          });
          const result = await response.json();
          if (result.error) {
            outputDiv.innerHTML = "Error: " + result.error;
            outputDiv.style.background = "rgba(231, 76, 60, 0.2)";
          } else {
            const actualOutput = result.output ? result.output.trim() : "";
            const expected = expectedOutput.trim();

            const actualLines = actualOutput
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line !== "");
            const expectedLines = expected
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line !== "");

            let passed = true;
            if (actualLines.length !== expectedLines.length) {
              passed = false;
            } else {
              for (let i = 0; i < expectedLines.length; i++) {
                if (actualLines[i] !== expectedLines[i]) {
                  passed = false;
                  break;
                }
              }
            }

            if (passed) {
              outputDiv.innerHTML = '<span class="accepted">Accepted</span>';
              outputDiv.style.background = "rgba(46, 204, 113, 0.2)";
            } else {
              outputDiv.innerHTML =
                '<span class="wrong">Wrong Answer</span><br>' +
                "Expected:<br>" +
                expected +
                "<br><br>Your Output:<br>" +
                actualOutput;
              outputDiv.style.background = "rgba(231, 76, 60, 0.2)";
            }
            setTimeout(
              () => (outputDiv.style.background = "rgba(255, 255, 255, 0.1)"),
              1000
            );
          }
        } catch (error) {
          outputDiv.textContent = "Error running test cases: " + error.message;
          outputDiv.style.background = "rgba(231, 76, 60, 0.2)";
        }
      });
    });

    // Sync editor content on form submission
    document
      .getElementById("testForm")
      .addEventListener("submit", function (event) {
        console.log("Form submission triggered (manual or auto)");
        document.querySelectorAll(".code-editor").forEach((textarea) => {
          if (textarea.editor) {
            textarea.value = textarea.editor.getValue();
            console.log(
              `Synced editor content for question ${textarea.name}: ${textarea.value}`
            );
          }
        });
      });

    // Timer logic
    const duration = test.duration;
    const totalSeconds =
      duration.hours * 3600 + duration.minutes * 60 + duration.seconds;
    let timeLeft = totalSeconds;
    let hasSubmitted = false; // Flag to prevent multiple submissions

    const timerElement = document.getElementById("timer");
    const form = document.getElementById("testForm");
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");

    function updateTimer() {
      if (hasSubmitted) {
        console.log("Timer update skipped: Form already submitted");
        return;
      }

      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      const seconds = timeLeft % 60;

      timerElement.textContent = `Time Left: ${String(hours).padStart(
        2,
        "0"
      )}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0"
      )}`;

      // Warning logic: change timer color in last 60 seconds
      if (timeLeft <= 60) {
        timerElement.style.color = "red";
        timerElement.style.fontWeight = "bold";
        // Optionally, uncomment to show alert at 1 minute left:
        // if (timeLeft === 60) alert("⚠️ Only 1 minute remaining!");
      } else {
        timerElement.style.color = "";
        timerElement.style.fontWeight = "";
      }

      console.log(`Timer updated: ${timerElement.textContent}`);

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerElement.textContent = "Time's Up!";
        console.log("Timer reached zero, initiating auto-submission");

        if (!hasSubmitted) {
          hasSubmitted = true;
          console.log("Syncing editor content before auto-submission");
          document.querySelectorAll(".code-editor").forEach((textarea) => {
            if (textarea.editor) {
              textarea.value = textarea.editor.getValue();
              console.log(
                `Synced editor content for question ${textarea.name}: ${textarea.value}`
              );
            }
          });

          console.log("Submitting form programmatically");
          form.submit();

          console.log("Displaying popup");
          overlay.style.display = "block";
          popup.style.display = "block";
          const popupMessage = popup.querySelector("p");
          if (popupMessage) {
            popupMessage.textContent =
              "The time for the allotted test is completed.";
            console.log("Popup message set:", popupMessage.textContent);
          } else {
            console.error("Popup message element not found");
          }
        }
      }

      timeLeft--;
    }

    // Start the timer
    if (totalSeconds > 0) {
      console.log(`Starting timer with total seconds: ${totalSeconds}`);
      updateTimer();
      var timerInterval = setInterval(updateTimer, 1000);
    } else {
      timerElement.textContent = "No time limit";
      console.log("No time limit set for this test");
    }
  });
});
