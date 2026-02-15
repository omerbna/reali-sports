// Global variables to store data
let scoresData = [];
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
        document.getElementById('testType').addEventListener('change', updateScoreInput);
        document.getElementById('scoreForm').addEventListener('submit', calculateScore);
        document.getElementById('score').addEventListener('input', handleScoreInput);

    } catch (error) {
        console.error('Error initializing app:', error);
        showError('שגיאה בטעינת קבצי הנתונים (CSV). אנא וודא שקבצי options.csv ו-scores.csv נמצאים בתיקייה ונסה שוב.');
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
        loadScoresData()
    ]);
    console.log('נתונים נטענו מקבצי CSV');

    // Build testInfoData from optionsData
    buildTestInfoFromOptions();
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

// Build test info data from options data
function buildTestInfoFromOptions() {
    testInfoData = optionsData
        .filter(opt => opt.field === 'test_type')
        .map(opt => ({
            test_type: opt.value,
            title: opt.label,
            description: opt.description,
            input_format: opt.input_format
        }));
}

// Load scores data from CSV
async function loadScoresData() {
    try {
        const response = await fetch('scores.csv');
        const csvText = await response.text();
        scoresData = parseCSV(csvText);
    } catch (error) {
        console.error('Error loading scores data:', error);
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
    // Get unique field types
    const fields = ['grade', 'gender', 'test_type'];

    fields.forEach(fieldName => {
        const selectElement = document.getElementById(fieldName === 'test_type' ? 'testType' : fieldName);
        const fieldOptions = optionsData.filter(opt => opt.field === fieldName);

        // Clear existing options except the first (placeholder)
        selectElement.innerHTML = '<option value="">בחר ' +
            (fieldName === 'grade' ? 'שכבה' :
             fieldName === 'gender' ? 'מגדר' : 'מבחן') +
            '</option>';

        // Add options from CSV
        fieldOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.label;
            selectElement.appendChild(optElement);
        });
    });
}

// Build info section from test info data
function buildInfoSection() {
    const infoGrid = document.querySelector('.info-grid');
    infoGrid.innerHTML = '';

    testInfoData.forEach(test => {
        const infoCard = document.createElement('div');
        infoCard.className = 'info-card';

        // Get benchmark scores for this test
        const benchmarks = getBenchmarkScores(test.test_type);

        infoCard.innerHTML = `
            <h4>${test.title}</h4>
            <p>${test.description}</p>
            <div class="benchmark-scores">
                <strong>ציון 100:</strong>
                ${benchmarks}
            </div>
        `;
        infoGrid.appendChild(infoCard);
    });
}

// Get benchmark scores for a test type
function getBenchmarkScores(testType) {
    const testScores = scoresData.filter(row => row.test_type === testType);

    if (testScores.length === 0) {
        return '<p>לא זמין</p>';
    }

    // Group by gender
    const maleScores = testScores.filter(s => s.gender === 'male');
    const femaleScores = testScores.filter(s => s.gender === 'female');

    let html = '<div class="benchmark-group">';

    if (maleScores.length > 0) {
        html += '<div class="gender-group"><strong>בנים:</strong> ';
        const maleRange = getScoreRange(maleScores);
        html += maleRange + '</div>';
    }

    if (femaleScores.length > 0) {
        html += '<div class="gender-group"><strong>בנות:</strong> ';
        const femaleRange = getScoreRange(femaleScores);
        html += femaleRange + '</div>';
    }

    html += '</div>';
    return html;
}

// Get score range (best to lowest across all grades)
function getScoreRange(scores) {
    if (scores.length === 0) return 'לא זמין';

    const topValues = scores.map(s => s.top_score);
    const bottomValues = scores.map(s => s.bottom_score);

    // For time-based tests, lower is better
    const testInfo = testInfoData.find(t => t.test_type === scores[0].test_type);

    if (testInfo && (testInfo.input_format === 'time' || testInfo.input_format === 'seconds')) {
        // Sort numerically (convert to seconds if needed) - lower is better
        const sortedTop = topValues.sort((a, b) => {
            const aVal = testInfo.input_format === 'time' ? parseTimeToSeconds(a) : parseFloat(a);
            const bVal = testInfo.input_format === 'time' ? parseTimeToSeconds(b) : parseFloat(b);
            return aVal - bVal;
        });
        return `ציון 100: ${sortedTop[0]} - ${sortedTop[sortedTop.length - 1]}`;
    } else {
        // For count-based and decimal, higher is better
        const sortedTop = topValues.sort((a, b) => {
            const aVal = testInfo && testInfo.input_format === 'decimal' ? parseFloat(a) : parseInt(a);
            const bVal = testInfo && testInfo.input_format === 'decimal' ? parseFloat(b) : parseInt(b);
            return aVal - bVal;
        });
        return `ציון 100: ${sortedTop[0]} - ${sortedTop[sortedTop.length - 1]}`;
    }
}

// Update score input placeholder based on test type
function updateScoreInput() {
    const testType = document.getElementById('testType').value;
    const scoreInput = document.getElementById('score');
    const helpText = document.getElementById('helpText');

    const testInfo = testInfoData.find(t => t.test_type === testType);

    if (testInfo) {
        // Use the description from test data which includes proper units
        helpText.textContent = testInfo.description || '';

        // Set placeholder based on format
        switch(testInfo.input_format) {
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

    // Clear the input value when test type changes
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
            if (countValue <= 0) {
                return { valid: false, message: 'המספר חייב להיות גדול מאפס' };
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
    const testType = document.getElementById('testType').value;
    const helpText = document.getElementById('helpText');

    // Only validate if test type is selected
    if (!testType) {
        scoreInput.classList.remove('invalid');
        return;
    }

    const testInfo = testInfoData.find(t => t.test_type === testType);
    if (!testInfo) {
        return;
    }

    const value = scoreInput.value.trim();

    // Don't show error on empty input (user might still be typing)
    if (value === '') {
        scoreInput.classList.remove('invalid');
        helpText.style.color = '';
        return;
    }

    const validation = validateScoreInput(value, testInfo.input_format);

    if (!validation.valid) {
        scoreInput.classList.add('invalid');
        helpText.style.color = '#d32f2f';
    } else {
        scoreInput.classList.remove('invalid');
        helpText.style.color = '#4caf50';
    }
}

// Calculate the final score
function calculateScore(event) {
    event.preventDefault();

    // Hide previous results and errors
    document.getElementById('result').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');

    // Get form values
    const grade = document.getElementById('grade').value;
    const gender = document.getElementById('gender').value;
    const testType = document.getElementById('testType').value;
    const scoreInput = document.getElementById('score').value;

    // Validate inputs
    if (!grade || !gender || !testType) {
        showError('אנא מלא את כל השדות');
        return;
    }

    // Get test info to determine input format
    const testInfo = testInfoData.find(t => t.test_type === testType);

    if (!testInfo) {
        showError('סוג מבחן לא תקין');
        return;
    }

    // Validate score input format
    const validation = validateScoreInput(scoreInput, testInfo.input_format);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    // Find matching data in CSV
    const matchingData = scoresData.find(row =>
        row.test_type === testType &&
        row.gender === gender &&
        row.grade === grade
    );

    if (!matchingData) {
        showError('לא נמצאו נתונים עבור הקומבינציה שבחרת');
        return;
    }

    // Parse student score and benchmarks
    let studentScore, topScore, bottomScore;

    try {
        if (testInfo.input_format === 'time') {
            studentScore = parseTimeToSeconds(scoreInput);
            topScore = parseTimeToSeconds(matchingData.top_score);
            bottomScore = parseTimeToSeconds(matchingData.bottom_score);
        } else if (testInfo.input_format === 'seconds' || testInfo.input_format === 'decimal') {
            studentScore = parseFloat(scoreInput);
            topScore = parseFloat(matchingData.top_score);
            bottomScore = parseFloat(matchingData.bottom_score);
        } else { // count
            studentScore = parseInt(scoreInput);
            topScore = parseInt(matchingData.top_score);
            bottomScore = parseInt(matchingData.bottom_score);
        }

        if (isNaN(studentScore)) {
            showError('פורמט התוצאה אינו תקין');
            return;
        }
    } catch (error) {
        showError('פורמט התוצאה אינו תקין');
        return;
    }

    // Calculate final score
    const finalScore = computeFinalScore(studentScore, topScore, bottomScore, testInfo.input_format);

    // Display result
    displayResult(finalScore, testType);
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

// Compute final score based on performance using linear interpolation
function computeFinalScore(studentScore, topScore, bottomScore, inputFormat) {
    let finalScore;

    if (inputFormat === 'time' || inputFormat === 'seconds') {
        // For time-based tests: lower is better
        // topScore is the best (fastest), bottomScore is the worst (slowest)

        if (studentScore <= topScore) {
            // Student is faster than or equal to top score - grade 100
            finalScore = 100;
        } else if (studentScore >= bottomScore) {
            // Student is slower than or equal to bottom score - grade 55
            finalScore = 55;
        } else {
            // Linear interpolation between top (100) and bottom (55)
            const progress = (bottomScore - studentScore) / (bottomScore - topScore);
            finalScore = 55 + progress * 45;
        }
    } else {
        // For count-based tests: higher is better
        // topScore is the best (most reps/highest value), bottomScore is the worst

        if (studentScore >= topScore) {
            // Student achieved more than or equal to top score - grade 100
            finalScore = 100;
        } else if (studentScore <= bottomScore) {
            // Student achieved less than or equal to bottom score - grade 55
            finalScore = 55;
        } else {
            // Linear interpolation between bottom (55) and top (100)
            const progress = (studentScore - bottomScore) / (topScore - bottomScore);
            finalScore = 55 + progress * 45;
        }
    }

    return Math.round(finalScore);
}

// Display the calculated result
function displayResult(finalScore, testType) {
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
