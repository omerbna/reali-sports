# מחשבון ציוני ספורט - בית הספר הריאלי

אתר סטטי לחישוב ציוני מבחני ספורט לתלמידי תיכון, ותיקון ציון סופי משוקלל לכיתה י"ב.

## מה יש בפרויקט

- `index.html` - עמוד כניסה למחשבון ציונים.
- `finalGrade.html` - עמוד לחישוב ציון סופי משוקלל עבור כיתה י"ב.
- `training.html` - עמוד אימונים נוסף.
- `styles.css` - עיצוב ממשק המשתמש.
- `calculator.js` - לוגיקת חישוב ציונים פרטניים.
- `finalGrade.js` - לוגיקת חישוב ציון סופי משוקלל.
- `options.csv` - אפשרויות בחירה של שכבה ומגדר.
- `fields.csv` - הגדרת מבחנים, תוויות והוראות קלט.
- `test_weights.csv` - משקלים למבחנים עבור כל מגדר בדף הסופי.
- `scores/` - תיקיית קבצי ציונים לכל מבחן.
- `realiLogo.png`, `sportLogo.png` - נכסי תמונה לשימוש באתר.

## איך האתר עובד

האתר מתבסס על קבצי CSV שנקראים ב-JavaScript. כל שינוי ב-
`options.csv`, `fields.csv`, `test_weights.csv` או בקבצים בתוך `scores/` משפיע על החישוב ללא צורך בשינוי בקוד.

### נתונים ופורמטים

#### `options.csv`
מגדיר אפשרויות בחירה עבור:
- `grade` - שכבה
- `gender` - מגדר

#### `fields.csv`
מגדיר את המבחנים והקלטים שלהם:
- `value` - מזהה מבחן, גם שם קובץ הציונים ב-`scores/`
- `label` - תווית בעברית
- `description` - הוראות קלט למשתמש
- `input_format` - סוג הקלט (`time`, `seconds`, `count`, `decimal`)

#### `test_weights.csv`
מגדיר את המשקל של מבחנים בדף `finalGrade.html` לכל מגדר.
רק מבחנים עם `weight_percent` גדול מ-0 נכללים בחישוב.

#### `scores/<test_type>.csv`
כל קובץ מכיל טבלת ציונים בין 100 ל-40 עבור כל כיתה ומגדר:
- `final_score`
- `boys_grade9`, `boys_grade10`, `boys_grade11`, `boys_grade12`
- `girls_grade9`, `girls_grade10`, `girls_grade11`, `girls_grade12`

### כללי חישוב

- מבחני `time` ו-`seconds`: ערך נמוך יותר = ביצוע טוב יותר.
- מבחני `count` ו-`decimal`: ערך גבוה יותר = ביצוע טוב יותר.
- אם שדה אינו רלוונטי, ניתן להשאירו ריק או למלא `0`.
- המערכת מחפשת את הציון המתאים בטבלת `scores` ומחזירה ציון בין 100 ל-40.

## `finalGrade.html`

העמוד מחשב ציון סופי עבור כיתה י"ב בלבד. המשתמש בוחר רק מגדר.

- השכבה קבועה כ-כיתה י"ב.
- המשקלים מוגדרים ב-`test_weights.csv`.
- הציון הסופי הוא ממוצע משוקלל של ציוני המבחנים.
- אם קובץ ציונים עבור מבחן חסר, המערכת מדלגת עליו ומנרמלת את המשקלים מחדש.
- קלטי המשתמש נבדקים באותם חוקי פורמט כמו ב-`calculator.js`.

## הוספת מבחן חדש

1. הוסף שורה חדשה ל-`fields.csv` עם מזהה, תווית, תיאור ופורמט קלט.
2. צור קובץ `scores/<value>.csv` עם טבלת ציונים מלאה ל-100–40.
3. אם המבחן צריך להיכלל בחישוב הסופי, הוסף אותו ל-`test_weights.csv` עם משקל לכל מגדר.

## הפעלת האתר

האתר סטטי, אך בגלל קריאת CSV בדפדפן יש להשתמש בשרת מקומי או להציע את הקבצים כאתר סטטי.

לדוגמה:
- ב-VS Code: הפעל `Live Server`.
- ב-Python: `python -m http.server` בתיקיית הפרויקט.

## מבנה הקבצים הנוכחי

```
reali-sports/
├── index.html
├── finalGrade.html
├── training.html
├── styles.css
├── calculator.js
├── finalGrade.js
├── options.csv
├── fields.csv
├── test_weights.csv
├── README.md
├── realiLogo.png
├── sportLogo.png
└── scores/
    ├── 1000m.csv
    ├── 1500m.csv
    ├── 2000m.csv
    ├── 3000m.csv
    ├── 4x10m.csv
    ├── beep_test.csv
    ├── long_jump.csv
    ├── plank.csv
    ├── pullups.csv
    ├── pushups.csv
    ├── seat_ups.csv
    ├── skipping_rope.csv
    └── squats.csv
```

## טכנולוגיות

- HTML5
- CSS3
- JavaScript (Vanilla)
- CSV לאחסון נתונים
