let questionCount = 1;

function addQuestion() {
  const container = document.getElementById("questions-container");
  const newQuestion = document.createElement("div");
  newQuestion.className = "question-form";
  newQuestion.id = `question-${questionCount}`;
  newQuestion.innerHTML = `
                <div class="form-group">
                    <label for="questions[${questionCount}][questionText]">Question Text</label>
                    <textarea name="questions[${questionCount}][questionText]" required placeholder="Enter question text"></textarea>
                </div>
                <div class="form-group">
                    <label for="questions[${questionCount}][type]">Question Type</label>
                    <select name="questions[${questionCount}][type]" onchange="toggleFields(this, ${questionCount})" required>
                        <option value="" disabled selected>Select type</option>
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="coding">Coding</option>
                    </select>
                </div>
                <div class="mc-fields" id="mc-fields-${questionCount}" style="display: none;">
                    <div class="form-group option-group">
                        <label>Options</label>
                        <input type="text" name="questions[${questionCount}][options][]" placeholder="Option 1" required>
                        <input type="text" name="questions[${questionCount}][options][]" placeholder="Option 2" required>
                        <input type="text" name="questions[${questionCount}][options][]" placeholder="Option 3" required>
                        <input type="text" name="questions[${questionCount}][options][]" placeholder="Option 4" required>
                    </div>
                    <div class="form-group">
                        <label for="questions[${questionCount}][correctAnswer]">Correct Answer (0-3)</label>
                        <input type="number" name="questions[${questionCount}][correctAnswer]" min="0" max="3" required placeholder="e.g., 0">
                    </div>
                </div>
                <div class="coding-fields" id="coding-fields-${questionCount}" style="display: none;">
                    <div class="form-group test-case-group">
                        <label for="questions[${questionCount}][testCasesCount]">Number of Test Cases</label>
                        <input type="number" name="questions[${questionCount}][testCasesCount]" id="testCasesCount-${questionCount}" min="1" onchange="updateTestCases(${questionCount})" required placeholder="e.g., 2">
                    </div>
                    <div class="form-group test-case-group">
                        <label>Test Case Inputs (First line: count, then inputs)</label>
                        <textarea name="questions[${questionCount}][testCasesInput]" id="testCasesInput-${questionCount}" required placeholder="e.g.\n2\n1 2\n3 4"></textarea>
                    </div>
                    <div class="form-group test-case-group">
                        <label>Test Case Outputs (One per line)</label>
                        <textarea name="questions[${questionCount}][testCasesOutput]" id="testCasesOutput-${questionCount}" required placeholder="e.g.\n3\n7"></textarea>
                    </div>
                </div>
            `;
  container.appendChild(newQuestion);
  questionCount++;
}

function toggleFields(select, index) {
  const mcFields = document.getElementById(`mc-fields-${index}`);
  const codingFields = document.getElementById(`coding-fields-${index}`);
  if (select.value === "multiple-choice") {
    mcFields.style.display = "block";
    codingFields.style.display = "none";
    mcFields
      .querySelectorAll("input")
      .forEach((input) => (input.required = true));
    codingFields
      .querySelectorAll("input, textarea")
      .forEach((input) => (input.required = false));
  } else if (select.value === "coding") {
    mcFields.style.display = "none";
    codingFields.style.display = "block";
    mcFields
      .querySelectorAll("input")
      .forEach((input) => (input.required = false));
    codingFields
      .querySelectorAll("input, textarea")
      .forEach((input) => (input.required = true));
  } else {
    mcFields.style.display = "none";
    codingFields.style.display = "none";
  }
}

function updateTestCases(index) {
  const countInput = document.getElementById(`testCasesCount-${index}`);
  const inputTextarea = document.getElementById(`testCasesInput-${index}`);
  const outputTextarea = document.getElementById(`testCasesOutput-${index}`);
  const count = parseInt(countInput.value) || 0;

  inputTextarea.addEventListener("input", () => {
    const lines = inputTextarea.value.trim().split("\n");
    if (lines.length > 0 && parseInt(lines[0]) !== lines.length - 1) {
      inputTextarea.setCustomValidity(
        `Expected ${parseInt(lines[0]) + 1} lines including count, got ${
          lines.length
        }`
      );
    } else {
      inputTextarea.setCustomValidity("");
    }
  });

  outputTextarea.addEventListener("input", () => {
    const lines = outputTextarea.value.trim().split("\n");
    if (lines.length !== count) {
      outputTextarea.setCustomValidity(
        `Expected ${count} output lines, got ${lines.length}`
      );
    } else {
      outputTextarea.setCustomValidity("");
    }
  });
}
