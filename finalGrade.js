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
            if (countValue < 0) return { valid: false, message: 'המספר חייב להיות גדול מאפס' };
            break;

        case 'seconds':
        case 'decimal':
            const decimalPattern = /^\d+\.?\d*$/;
            if (!decimalPattern.test(trimmedValue)) return { valid: false, message: 'אנא הזן מספר חיובי (לדוגמה: 12.5)' };
            const decimalValue = parseFloat(trimmedValue);
            if (decimalValue <= 0 || isNaN(decimalValue)) return { valid: false, message: 'המספר חייב להיות גדול מאפס' };
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
    // gender dropdown element
    const genderSelect = document.getElementById('gender');
    const testInputsDiv = document.getElementById('testInputs');
    const form = document.getElementById('finalGradeForm');
    const resultDiv = document.getElementById('finalResult');
    const finalGradeValue = document.getElementById('finalGradeValue');
    const errorDiv = document.getElementById('error');

    let fields = [];
    let weights = [];
    try {
        const [optionsText, fieldsText, weightsText] = await Promise.all([
            loadText('options.csv'),
            loadText('fields.csv'),
            loadText('test_weights.csv')
        ]);

        const options = parseCSV(optionsText);
        const genders = options.filter(o => o.field === 'gender').map(o => ({ value: o.value, label: o.label }));
        // grades are irrelevant here since grade is a constant
        fields = parseCSV(fieldsText).map(f => ({ value: f.value, label: f.label, description: f.description, input_format: f.input_format }));
        // build gender options for selector
        buildSelectOptions(genderSelect, genders);

        weights = parseCSV(weightsText).map(w => ({ test_type: w.test_type || w.value || w.testType, label: w.label, weight: parseFloat(w.weight_percent || w.weight || '0') }));

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

    // Build inputs for tests with non-zero weight
    console.log('loaded weights', weights);
    const testsWithWeight = weights.filter(w => w.weight && w.weight > 0);
    console.log('testsWithWeight', testsWithWeight);
    if (testsWithWeight.length === 0) {
        // show a prominent error so the user notices there's nothing to fill
        showError('לא הוגדרו מבחנים עם משקל > 0 ב-test_weights.csv');
        // still populate the div so the form remains visible (user can fix file and reload)
        const p = document.createElement('p');
        p.textContent = 'לא הוגדרו מבחנים עם משקל > 0 ב-test_weights.csv';
        testInputsDiv.appendChild(p);
        return; // stop further setup
    } else {
        testsWithWeight.forEach(w => {
            const fieldMeta = fields.find(f => f.value === w.test_type);
            const wrapper = document.createElement('div');
            wrapper.className = 'form-group test-group';

            const label = document.createElement('label');
            label.htmlFor = 'test_' + w.test_type;
            label.textContent = fieldMeta ? fieldMeta.label + ` (${w.weight}% )` : (w.label || w.test_type) + ` (${w.weight}% )`;

            const input = document.createElement('input');
            input.id = 'test_' + w.test_type;
            input.name = w.test_type;
            input.type = 'text';
            input.dataset.format = fieldMeta ? fieldMeta.input_format : 'count';
            input.placeholder = fieldMeta ? fieldMeta.description : 'הזן תוצאה';

            const help = document.createElement('div');
            help.className = 'help-text';
            help.id = input.id + '_help';
            help.textContent = '';

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            wrapper.appendChild(help);
            testInputsDiv.appendChild(wrapper);

            // Real-time validation for this input (matches calculator.js behavior)
            input.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                const fmt = e.target.dataset.format || 'count';
                const helpEl = document.getElementById(e.target.id + '_help');

                // Don't show error on empty input (user might still be typing)
                if (val === '') {
                    e.target.classList.remove('invalid');
                    if (helpEl) helpEl.style.color = '';
                    return;
                }

                const validation = validateScoreInput(val, fmt);
                if (!validation.valid) {
                    e.target.classList.add('invalid');
                    if (helpEl) {
                        helpEl.textContent = validation.message;
                        helpEl.style.color = '#d32f2f';
                    }
                } else {
                    e.target.classList.remove('invalid');
                    if (helpEl) {
                        helpEl.textContent = '';
                        helpEl.style.color = '#4caf50';
                    }
                }
            });
        });
    }

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
        // Convert input to comparable numeric value
        let studentVal;
        if (inputFormat === 'time') studentVal = parseTimeToSeconds(inputValue);
        else studentVal = parseFloat(inputValue);

        const rows = await loadScoreFile(testType);
        if (!rows) {
            // If no mapping file, return null to indicate cannot compute
            return null;
        }

        // Column name like 'boys_grade9'
        const colName = `${gender}_grade${grade}`;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const finalScore = parseInt((row.final_score || row.final_score || Object.values(row)[0]) .toString().trim());
            let cell = (row[colName] || row[colName] || '').toString().trim();
            // skip empty or zero entries (treated as gaps)
            if (!cell || cell === '0') continue;

            try {
                let cellVal;
                if (inputFormat === 'time') cellVal = parseTimeToSeconds(cell);
                else cellVal = parseFloat(cell);

                // again, if parsing produced 0 or NaN treat as gap
                if (cellVal === 0 || isNaN(cellVal)) continue;

                if (inputFormat === 'time' || inputFormat === 'seconds') {
                    // lower is better -> studentVal <= cellVal means at least this finalScore
                    if (studentVal <= cellVal) return finalScore;
                } else {
                    // higher is better -> studentVal >= cellVal
                    if (studentVal >= cellVal) return finalScore;
                }
            } catch (err) {
                continue;
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

        const grade = GRADE;
        const gender = document.getElementById('gender').value;
        if (!gender) {
            errorDiv.textContent = 'אנא בחר מגדר';
            errorDiv.classList.remove('hidden');
            return;
        }

        // Before we validate inputs, ensure the configured weights add up to 100%
        const staticTotalWeight = testsWithWeight.reduce((sum, w) => sum + w.weight, 0);
        if (Math.abs(staticTotalWeight - 100) > 0.001) {
            showError('סכום המשקלים חייב להיות 100%. עיין ב-test_weights.csv');
            return;
        }

        // Validate each test input
        const inputs = testsWithWeight.map(w => {
            const el = document.getElementById('test_' + w.test_type);
            return { meta: w, el };
        });

        for (const item of inputs) {
            const val = item.el.value || '';
            const fmt = item.el.dataset.format || 'count';
            const validation = validateScoreInput(val, fmt);
            const help = document.getElementById(item.el.id + '_help');
            if (!validation.valid) {
                help.textContent = validation.message;
                help.style.color = '#d32f2f';
                item.el.classList.add('invalid');
                showError('אנא תקן שגיאות בקלטים');
                return;
            } else {
                help.textContent = '';
                help.style.color = '#4caf50';
                item.el.classList.remove('invalid');
            }
        }

        // Compute weighted grade
        let totalWeight = 0;
        let weightedSum = 0;

        for (const item of inputs) {
            const w = item.meta.weight;
            totalWeight += w;
            const fmt = item.el.dataset.format || 'count';
            const val = item.el.value.trim();
            const finalScore = await computeTestFinalScore(item.meta.test_type, val, fmt, grade, gender);
            if (finalScore === null) {
                // Cannot compute for this test; skip and reduce total weight
                totalWeight -= w;
                continue;
            }
            weightedSum += finalScore * (w / 100);
        }

        if (totalWeight === 0) {
            errorDiv.textContent = 'לא ניתן לחשב ציון סופי — אין משקל תקף או חסרים קבצי ציונים.';
            errorDiv.classList.remove('hidden');
            return;
        }

        // We already confirmed the configured weights sum to 100, so totalWeight
        // should equal 100 unless some tests were skipped due to missing score data.
        // If totalWeight differs now, we still normalize so the partial set scales
        // appropriately, but no error is shown (this situation is rare).
        const normalized = (weightedSum / (totalWeight / 100));
        const finalNumber = Math.floor(normalized);

        finalGradeValue.textContent = finalNumber;
        resultDiv.classList.remove('hidden');
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});
