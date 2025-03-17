// Configure Monaco Editor
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs",
  },
});

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
});

// Parse test data
const testDataElement = document.getElementById("test-data");
const test = JSON.parse(testDataElement.textContent);

// "Run Code" button
document.querySelectorAll(".run-code").forEach((button) => {
  button.addEventListener("click", async () => {
    const questionId = button.getAttribute("data-question-id");
    const textarea = document.querySelector(
      `textarea[name="answers[${questionId}]"]`
    );
    let code = textarea.value;
    const language = document.getElementById(`language-${questionId}`).value;
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

    if (language === "cpp" && !code.includes("\n") && code.includes("cout<<")) {
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
    const language = document.getElementById(`language-${questionId}`).value;
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

    if (language === "cpp" && !code.includes("\n") && code.includes("cout<<")) {
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
          outputDiv.style.background =
            "rgba(46, 204, 113, 0.2)"; /* Green tint */
        } else {
          outputDiv.innerHTML =
            '<span class="wrong">Wrong Answer</span><br>' +
            "Expected:<br>" +
            expected +
            "<br><br>Your Output:<br>" +
            actualOutput;
          outputDiv.style.background = "rgba(231, 76, 60, 0.2)"; /* Red tint */
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
document.getElementById("testForm").addEventListener("submit", function () {
  document.querySelectorAll(".code-editor").forEach((textarea) => {
    if (textarea.editor) {
      textarea.value = textarea.editor.getValue();
    }
  });
});
