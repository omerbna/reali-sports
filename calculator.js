// Global variables to store data
let scoresData = {}; // Now stores data per field
let optionsData = [];
let testInfoData = [];

// Load all data when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
        // Load CSV files
        await loadAllData();

        // Populate dropdowns
        populateDropdowns();

        // Build info section
        buildInfoSection();

        // Add event listeners
        document.getElementById('field').addEventListener('change', updateScoreInput);
        document.getElementById('scoreForm').addEventListener('submit', calculateScore);
        document.getElementById('score').addEventListener('input', handleScoreInput);

    } catch (error) {
        console.error('Error initializing app:', error);
        showError('שגיאה בטעינת קבצי הנתונים (CSV). אנא וודא שקבצי options.csv ו-fields.csv נמצאים בתיקייה ונסה שוב.');
        // Disable the form
        document.getElementById('scoreForm').querySelectorAll('input, select, button').forEach(element => {
            element.disabled = true;
        });
    }
}

// Load all data
async function loadAllData() {
    await Promise.all([
        loadOptionsData(),
        loadFieldsData()
    ]);
    console.log('נתונים נטענו מקבצי CSV');
}

// Load options data from CSV
async function loadOptionsData() {
    try {
        const response = await fetch('options.csv');
        const csvText = await response.text();
        optionsData = parseCSV(csvText);
    } catch (error) {
        console.error('Error loading options data:', error);
        throw error;
    }
}

// Load fields data from CSV
async function loadFieldsData() {
    try {
        const response = await fetch('fields.csv');
        const csvText = await response.text();
        testInfoData = parseCSV(csvText).map(field => ({
            test_type: field.value,
            title: field.label,
            description: field.description,
            input_format: field.input_format
        }));
    } catch (error) {
        console.error('Error loading fields data:', error);
        throw error;
    }
}

// Load scores data for a specific field
async function loadScoresForField(field) {
    // Check if already loaded
    if (scoresData[field]) {
        return scoresData[field];
    }

    try {
        const response = await fetch(`scores/${field}.csv`);
        const csvText = await response.text();
        scoresData[field] = parseCSV(csvText);
        return scoresData[field];
    } catch (error) {
        console.error(`Error loading scores for ${field}:`, error);
        throw error;
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index];
        });
        return obj;
    });
}

// Populate dropdowns from options data
function populateDropdowns() {
    // Populate grade dropdown
    const gradeSelect = document.getElementById('grade');
    const gradeOptions = optionsData.filter(opt => opt.field === 'grade');
    gradeSelect.innerHTML = '<option value="">בחר שכבה</option>';
    gradeOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        gradeSelect.appendChild(optElement);
    });

    // Populate gender dropdown
    const genderSelect = document.getElementById('gender');
    const genderOptions = optionsData.filter(opt => opt.field === 'gender');
    genderSelect.innerHTML = '<option value="">בחר מגדר</option>';
    genderOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        genderSelect.appendChild(optElement);
    });

    // Populate field dropdown from testInfoData (sorted alphabetically)
    const fieldSelect = document.getElementById('field');
    fieldSelect.innerHTML = '<option value="">בחר מבחן</option>';

    // Sort fields alphabetically by title
    const sortedFields = [...testInfoData].sort((a, b) => a.title.localeCompare(b.title, 'he'));

    sortedFields.forEach(field => {
        const optElement = document.createElement('option');
        optElement.value = field.test_type;
        optElement.textContent = field.title;
        fieldSelect.appendChild(optElement);
    });
}

// Build info section from field info data
function buildInfoSection() {
    const infoGrid = document.querySelector('.info-grid');
    infoGrid.innerHTML = '';

    testInfoData.forEach(field => {
        const infoCard = document.createElement('div');
        infoCard.className = 'info-card';

        // Get benchmark scores for this field
        const benchmarks = getBenchmarkScores(field.test_type);

        infoCard.innerHTML = `
            <h4>${field.title}</h4>
            <p>${field.description}</p>
            <div class="benchmark-scores">
                <strong>ציון 100:</strong>
                ${benchmarks}
            </div>
        `;
        infoGrid.appendChild(infoCard);
    });
}

// Get benchmark scores for a field
function getBenchmarkScores(field) {
    let html = '<div class="benchmark-group">';
    html += '<div class="gender-group"><strong>טווח ציונים:</strong> 40-100</div>';
    html += '</div>';
    return html;
}

// Update score input placeholder based on field
function updateScoreInput() {
    const field = document.getElementById('field').value;
    const scoreInput = document.getElementById('score');
    const helpText = document.getElementById('helpText');

    const fieldInfo = testInfoData.find(f => f.test_type === field);

    if (fieldInfo) {
        // Use the description from field data which includes proper units
        helpText.textContent = fieldInfo.description || '';

        // Set placeholder based on format
        switch(fieldInfo.input_format) {
            case 'time':
                scoreInput.placeholder = 'לדוגמה: 8:30';
                break;
            case 'count':
                scoreInput.placeholder = 'לדוגמה: 20';
                break;
            case 'seconds':
                scoreInput.placeholder = 'לדוגמה: 12.5';
                break;
            case 'decimal':
                scoreInput.placeholder = 'לדוגמה: 2.5';
                break;
            default:
                scoreInput.placeholder = 'הזן תוצאה';
        }
    } else {
        scoreInput.placeholder = 'הזן תוצאה';
        helpText.textContent = '';
    }

    // Clear the input value when field changes
    scoreInput.value = '';
}

// Validate score input format
function validateScoreInput(scoreValue, inputFormat) {
    if (!scoreValue || scoreValue.trim() === '') {
        return { valid: false, message: 'אנא הזן תוצאה' };
    }

    const trimmedValue = scoreValue.trim();

    switch(inputFormat) {
        case 'time':
            // Validate MM:SS format
            const timePattern = /^\d+:\d{2}$/;
            if (!timePattern.test(trimmedValue)) {
                return { valid: false, message: 'פורמט זמן לא תקין. השתמש בפורמט דקות:שניות (לדוגמה: 8:30)' };
            }
            const [minutes, seconds] = trimmedValue.split(':').map(Number);
            if (minutes < 0 || seconds < 0 || seconds >= 60) {
                return { valid: false, message: 'ערכי זמן לא תקינים. השניות חייבות להיות בין 0 ל-59' };
            }
            if (minutes === 0 && seconds === 0) {
                return { valid: false, message: 'הזמן חייב להיות גדול מאפס' };
            }
            break;

        case 'count':
            // Validate positive integer
            const countPattern = /^\d+$/;
            if (!countPattern.test(trimmedValue)) {
                return { valid: false, message: 'אנא הזן מספר שלם חיובי (לדוגמה: 20)' };
            }
            const countValue = parseInt(trimmedValue);
            if (countValue < 0) {
                return { valid: false, message: 'המספר לא יכול להיות שלילי' };
            }
            break;

        case 'seconds':
        case 'decimal':
            // Validate positive decimal number
            const decimalPattern = /^\d+\.?\d*$/;
            if (!decimalPattern.test(trimmedValue)) {
                return { valid: false, message: 'אנא הזן מספר חיובי (לדוגמה: 12.5)' };
            }
            const decimalValue = parseFloat(trimmedValue);
            if (decimalValue <= 0 || isNaN(decimalValue)) {
                return { valid: false, message: 'המספר חייב להיות גדול מאפס' };
            }
            break;

        default:
            return { valid: false, message: 'סוג מבחן לא תקין' };
    }

    return { valid: true };
}

// Handle real-time score input validation
function handleScoreInput() {
    const scoreInput = document.getElementById('score');
    const field = document.getElementById('field').value;
    const helpText = document.getElementById('helpText');

    // Only validate if field is selected
    if (!field) {
        scoreInput.classList.remove('invalid');
        return;
    }

    const fieldInfo = testInfoData.find(f => f.test_type === field);
    if (!fieldInfo) {
        return;
    }

    const value = scoreInput.value.trim();

    // Don't show error on empty input (user might still be typing)
    if (value === '') {
        scoreInput.classList.remove('invalid');
        helpText.style.color = '';
        return;
    }

    const validation = validateScoreInput(value, fieldInfo.input_format);

    if (!validation.valid) {
        scoreInput.classList.add('invalid');
        helpText.style.color = '#d32f2f';
    } else {
        scoreInput.classList.remove('invalid');
        helpText.style.color = '#4caf50';
    }
}

// Calculate the final score
async function calculateScore(event) {
    event.preventDefault();

    // Hide previous results and errors
    document.getElementById('result').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');

    // Get form values
    const grade = document.getElementById('grade').value;
    const gender = document.getElementById('gender').value;
    const field = document.getElementById('field').value;
    const scoreInput = document.getElementById('score').value;

    // Validate inputs
    if (!grade || !gender || !field) {
        showError('אנא מלא את כל השדות');
        return;
    }

    // Get field info to determine input format
    const fieldInfo = testInfoData.find(f => f.test_type === field);

    if (!fieldInfo) {
        showError('סוג מבחן לא תקין');
        return;
    }

    // Validate score input format
    const validation = validateScoreInput(scoreInput, fieldInfo.input_format);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    // Load scores for this field
    let fieldScores;
    try {
        fieldScores = await loadScoresForField(field);
    } catch (error) {
        showError('שגיאה בטעינת נתוני הציונים למבחן זה');
        return;
    }

    // Parse student score
    let studentScore;
    try {
        if (fieldInfo.input_format === 'time') {
            studentScore = parseTimeToSeconds(scoreInput);
        } else if (fieldInfo.input_format === 'seconds' || fieldInfo.input_format === 'decimal') {
            studentScore = parseFloat(scoreInput);
        } else { // count
            studentScore = parseInt(scoreInput);
        }

        if (isNaN(studentScore)) {
            showError('פורמט התוצאה אינו תקין');
            return;
        }
    } catch (error) {
        showError('פורמט התוצאה אינו תקין');
        return;
    }

    // Calculate final score using new structure
    const columnName = `${gender}_grade${grade}`;
    const finalScore = computeFinalScoreFromTable(studentScore, fieldScores, columnName, fieldInfo.input_format);

    if (finalScore === null) {
        showError('לא ניתן לחשב ציון עבור התוצאה שהוזנה');
        return;
    }

    // Display result
    displayResult(finalScore, field);
}

// Convert time string (MM:SS) to seconds
function parseTimeToSeconds(timeString) {
    const parts = timeString.split(':');
    if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return minutes * 60 + seconds;
    }
    throw new Error('Invalid time format');
}

// Compute final score from the new table structure
function computeFinalScoreFromTable(studentScore, fieldScores, columnName, inputFormat) {
    const parseBenchmark = (value) => {
        if (inputFormat === 'time') {
            return parseTimeToSeconds(value);
        } else {
            return parseFloat(value);
        }
    };

    if (!fieldScores[0] || !(columnName in fieldScores[0])) {
        return null;
    }

    const lowerIsBetter = inputFormat === 'time' || inputFormat === 'seconds';

    // Loop from top (usually final_score 100) to bottom
    for (let i = 0; i < fieldScores.length; i++) {
    const row = fieldScores[i];
    // .trim() removes hidden spaces that might be in your CSV
    const benchmarkValueStr = (row[columnName] || '').trim();

    // IMPORTANT: If the cell is empty, skip to the next row (Score 96, 95, etc.)
    if (benchmarkValueStr === "" || benchmarkValueStr === null) {
        continue; 
    }

    let benchmarkValue = parseFloat(benchmarkValueStr);
    const finalScore = parseInt(row.final_score);

    // For pushups/pullups (Higher is better)
    if (studentScore >= benchmarkValue) {
        return finalScore; // It should stop at 98 if studentScore is 29
    }
}

    // Fallback if the student didn't meet even the lowest requirement
    return 40; 
}

// Display the calculated result
function displayResult(finalScore, field) {
    const resultDiv = document.getElementById('result');
    const finalScoreSpan = document.getElementById('finalScore');
    const resultMessage = document.getElementById('resultMessage');

    finalScoreSpan.textContent = finalScore;

    // Add message based on score
    let message = '';
    if (finalScore >= 100) {
        message = 'כל הכבוד! ביצוע מעולה!';
        resultDiv.style.backgroundColor = '#e8f5e9';
        resultDiv.style.borderColor = '#4caf50';
        finalScoreSpan.style.color = '#4caf50';
    } else if (finalScore >= 80) {
        message = 'ביצוע טוב מאוד!';
        resultDiv.style.backgroundColor = '#f0f7ff';
        resultDiv.style.borderColor = '#001cf7';
        finalScoreSpan.style.color = '#001cf7';
    } else if (finalScore >= 60) {
        message = 'ביצוע סביר, המשך להתאמן!';
        resultDiv.style.backgroundColor = '#fff8e1';
        resultDiv.style.borderColor = '#ffa726';
        finalScoreSpan.style.color = '#f57c00';
    } else {
        message = 'המשך להתאמן, תשתפר!';
        resultDiv.style.backgroundColor = '#ffebee';
        resultDiv.style.borderColor = '#ef5350';
        finalScoreSpan.style.color = '#d32f2f';
    }

    resultMessage.textContent = message;
    resultDiv.classList.remove('hidden');

    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
