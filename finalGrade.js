// finalGrade.js - builds dynamic inputs for tests with non-zero weight,
// validates inputs similarly to calculator.js, and computes weighted final grade.

// CSV parsing helper (simple)
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n').map(l => l.trim()).filter(l => l.length);
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => obj[header] = (values[index] || '').trim());
        return obj;
    });
}

function parseTimeToSeconds(timeString) {
    const parts = timeString.split(':');
    if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return minutes * 60 + seconds;
    }
    throw new Error('Invalid time format');
}

function validateScoreInput(scoreValue, inputFormat) {
    if (!scoreValue || scoreValue.trim() === '') {
        return { valid: false, message: 'אנא הזן תוצאה' };
    }

    const trimmedValue = scoreValue.trim();

    switch(inputFormat) {
        case 'time':
            const timePattern = /^\d+:\d{2}$/;
            if (!timePattern.test(trimmedValue)) return { valid: false, message: 'פורמט זמן לא תקין. השתמש בפורמט דקות:שניות (לדוגמה: 8:30)' };
            const [minutes, seconds] = trimmedValue.split(':').map(Number);
            if (minutes < 0 || seconds < 0 || seconds >= 60) return { valid: false, message: 'ערכי זמן לא תקינים. השניות חייבות להיות בין 0 ל-59' };
            if (minutes === 0 && seconds === 0) return { valid: false, message: 'הזמן חייב להיות גדול מאפס' };
            break;
        case 'count':
            const countPattern = /^\d+$/;
            if (!countPattern.test(trimmedValue)) return { valid: false, message: 'אנא הזן מספר שלם חיובי (לדוגמה: 20)' };
            const countValue = parseInt(trimmedValue);
            if (countValue < 0) return { valid: false, message: 'המספר לא יכול להיות שלילי' };
            break;

        case 'seconds':
        case 'decimal':
            const decimalPattern = /^\d*\.?\d+$/; // allows .5 as well as 12.5
            if (!decimalPattern.test(trimmedValue)) return { valid: false, message: 'אנא הזן מספר חיובי (לדוגמה: 12.5)' };
            const decimalValue = parseFloat(trimmedValue);
            if (decimalValue < 0 || isNaN(decimalValue)) return { valid: false, message: 'המספר לא יכול להיות שלילי' };
            break;
        default:
            return { valid: false, message: 'סוג מבחן לא תקין' };
    }

    return { valid: true };
}

function buildSelectOptions(selectEl, optionsArray) {
    optionsArray.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.value;
        el.textContent = opt.label;
        selectEl.appendChild(el);
    });
}

async function loadText(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error('Failed to load ' + path);
    return resp.text();
}

document.addEventListener('DOMContentLoaded', async () => {
    // page is specific to 12th grade; use constant rather than selector
    const GRADE = '12';
    const genderSelect = document.getElementById('gender');
    const testInputsDiv = document.getElementById('testInputs');
    const form = document.getElementById('finalGradeForm');
    const resultDiv = document.getElementById('finalResult');
    const finalGradeValue = document.getElementById('finalGradeValue');
    const errorDiv = document.getElementById('error');

    let fields = [];
    let allWeights = [];
    try {
        const [optionsText, fieldsText, weightsText] = await Promise.all([
            loadText('options.csv'),
            loadText('fields.csv'),
            loadText('test_weights.csv')
        ]);

        const options = parseCSV(optionsText);
        const genders = options.filter(o => o.field === 'gender').map(o => ({ value: o.value, label: o.label }));
        
        // 1. Map the fields (for formatting and descriptions)
        fields = parseCSV(fieldsText).map(f => ({ 
            value: f.value, 
            label: f.label, 
            description: f.description, 
            input_format: f.input_format 
        }));
        
        // 2. Build the gender dropdown
        buildSelectOptions(genderSelect, genders);

        // 3. Map weights with the new GENDER column
        allWeights = parseCSV(weightsText).map(w => ({ 
            test_type: String(w.test_type || w.value || '').trim(), 
            label: String(w.label || '').trim(), 
            weight: parseFloat(w.weight_percent || w.weight || '0'),
            // This removes spaces AND handles upper/lowercase mismatches
            gender: String(w.gender || '').toLowerCase().trim() 
        }));

    } catch (err) {
        console.error('Error loading CSVs:', err);
        showError('שגיאה בטעינת קבצי התצורה. אנא ודא שקבצי CSV קיימים.');
        return;
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // also pop a browser alert so the user can't miss it (especially when using file://)
        try { alert(message); } catch (e) { /* ignore if alerts disabled */ }
    }

    function renderTestInputs(selectedGender) {
    testInputsDiv.innerHTML = ''; // Clear existing inputs
    
    // Filter weights for the selected gender
   // This ensures 'Female' matches 'female' and removes hidden spaces
const genderValue = genderSelect.value.toLowerCase().trim();
const activeWeights = allWeights.filter(w => 
    w.gender.toLowerCase().trim() === genderValue && 
    w.weight > 0
);
    

    if (activeWeights.length === 0) {
        testInputsDiv.innerHTML = '<p>לא הוגדרו מבחנים למגדר זה.</p>';
        return;
    }

    activeWeights.forEach(w => { 
        const fieldMeta = fields.find(f => f.value === w.test_type);
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group test-group';

        const label = document.createElement('label');
        label.htmlFor = 'test_' + w.test_type;
        label.textContent = fieldMeta ? `${fieldMeta.label} (${w.weight}%)` : `${w.label} (${w.weight}%)`;

        const input = document.createElement('input');
        input.id = 'test_' + w.test_type;
        input.name = w.test_type;
        input.type = 'text';
        input.dataset.format = fieldMeta ? fieldMeta.input_format : 'count';
        input.placeholder = fieldMeta ? fieldMeta.description : 'הזן תוצאה';

        const help = document.createElement('div');
        help.className = 'help-text';
        help.id = input.id + '_help';

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        wrapper.appendChild(help);
        testInputsDiv.appendChild(wrapper);

        // Keep your existing validation listener here
        input.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const fmt = e.target.dataset.format || 'count';
            const helpEl = document.getElementById(e.target.id + '_help');
            if (val === '') {
                e.target.classList.remove('invalid');
                return;
            }
            const validation = validateScoreInput(val, fmt);
            if (!validation.valid) {
                e.target.classList.add('invalid');
                if (helpEl) helpEl.textContent = validation.message;
            } else {
                e.target.classList.remove('invalid');
                if (helpEl) helpEl.textContent = '';
            }
        });
    });
}

// Listen for gender dropdown change
    genderSelect.addEventListener('change', (e) => {
    const val = e.target.value.toLowerCase().trim(); // Add .trim()
    if (val) {
        errorDiv.classList.add('hidden');
        renderTestInputs(val); // Pass the cleaned value
        resultDiv.classList.add('hidden');
    }
});

    // Preload score CSVs for quick lookup
    const scoreCache = {};
    async function loadScoreFile(testType) {
        if (scoreCache[testType]) return scoreCache[testType];
        try {
            const text = await loadText('scores/' + testType + '.csv');
            const parsed = parseCSV(text);
            scoreCache[testType] = parsed;
            return parsed;
        } catch (err) {
            console.warn('Missing score file for', testType);
            scoreCache[testType] = null;
            return null;
        }
    }

    async function computeTestFinalScore(testType, inputValue, inputFormat, grade, gender) {
    let studentVal;
    if (inputFormat === 'time') studentVal = parseTimeToSeconds(inputValue);
    else studentVal = parseFloat(inputValue);

    const rows = await loadScoreFile(testType);
    if (!rows) return null;

    const colName = `${gender}_grade${grade}`;

    for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const finalScore = parseInt(row.final_score);
    let cell = (row[colName] || '').toString().trim();

    // 1. SKIP EMPTY CELLS: This prevents the "29 returns 97" error
    if (cell === '' || cell === null) continue;

    let cellVal;
    if (inputFormat === 'time') {
        cellVal = parseTimeToSeconds(cell);
    } else {
        cellVal = parseFloat(cell);
        // 2. Ignore non-numeric or 0 values for count-based tests
        if (isNaN(cellVal) || cellVal <= 0) continue;
    }

    // 3. Evaluation logic (Higher is better for counts/pushups)
    if (inputFormat === 'time' || inputFormat === 'seconds') {
        if (studentVal <= cellVal) return finalScore;
    } else {
        if (studentVal >= cellVal) return finalScore;
    }
}

        // If not found, take last row's final_score (worst)
        const last = rows[rows.length - 1];
        return last ? parseInt(last.final_score) : null;
    }

    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    const gender = genderSelect.value.toLowerCase();
    if (!gender) {
        showError('אנא בחר מגדר');
        return;
    }

    // 1. Get weights ONLY for the selected gender
    const activeWeights = allWeights.filter(w => w.gender === gender && w.weight > 0);
    
    // 2. Validate that these weights add up to 100
    const totalWeightCheck = activeWeights.reduce((sum, w) => sum + w.weight, 0);
    if (Math.abs(totalWeightCheck - 100) > 0.001) {
        showError(`סכום המשקלים למגדר זה הוא ${totalWeightCheck}%. הוא חייב להיות 100%.`);
        return;
    }

    // 3. Collect the inputs and validate values
    let weightedSum = 0;
    let totalWeightUsed = 0;

    for (const w of activeWeights) {
        const inputEl = document.getElementById('test_' + w.test_type);
        if (!inputEl) continue;

        const val = inputEl.value.trim();
        const fmt = inputEl.dataset.format || 'count';
        
        // Validation check
        const validation = validateScoreInput(val, fmt);
        if (!validation.valid) {
            showError(`שגיאה ב${w.label}: ${validation.message}`);
            inputEl.classList.add('invalid');
            return;
        }

        // Calculate individual score
        const score = await computeTestFinalScore(w.test_type, val, fmt, GRADE, gender);
        
        console.log(`Test: ${w.test_type}, Score: ${score}, Weight: ${w.weight}%`);

        if (score !== null) {
            weightedSum += (score * w.weight);
            totalWeightUsed += w.weight;
        }
    }

        // 4. Final Calculation
        if (totalWeightUsed > 0) {
         const finalNumber = Math.floor(weightedSum / totalWeightUsed);
            finalGradeValue.textContent = finalNumber;
            resultDiv.classList.remove('hidden');
         resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
});
