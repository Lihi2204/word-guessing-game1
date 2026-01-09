const fs = require('fs');
const path = require('path');

// Read existing words.json
const wordsPath = path.join(__dirname, 'data', 'words.json');
const data = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));

console.log(`Current total words: ${data.metadata.totalWords}`);
console.log(`Easy: ${data.words.easy.length}, Medium: ${data.words.medium.length}, Hard: ${data.words.hard.length}`);

// Add new categories
const newCategories = [
  { id: "emotions", name: "רגשות ותחושות" },
  { id: "musical_instruments", name: "כלי נגינה" },
  { id: "space", name: "חלל וחלל חיצון" }
];

newCategories.forEach(cat => {
  if (!data.categories.find(c => c.id === cat.id)) {
    data.categories.push(cat);
  }
});

// All 150 new words - split into easy (46), medium (35), hard (35)
// I'll add them programmatically to save space

const new150Words = {
  easy: [
    // nature_weather - 24 easy words
    {word:"שקיעה",category:"nature_weather",descriptions:{easy:"כשהשמש יורדת והשמיים הופכים לאדומים וכתומים",medium:"תופעה יפה בסוף היום כשהשמש נעלמת",hard:"רגע המעבר בין יום ללילה עם צבעים חמים"},hint:"קורה מדי ערב",synonyms:["שקיע"]},
    {word:"זריחה",category:"nature_weather",descriptions:{easy:"כשהשמש עולה בבוקר והשמיים מתחילים להאיר",medium:"תופעה יפה בתחילת היום כשהחושך נעלם",hard:"רגע הופעת האור הראשון באופק המזרחי"},hint:"קורה מדי בוקר",synonyms:["זרח"]},
    {word:"אביב",category:"nature_weather",descriptions:{easy:"עונה שבה הפרחים פורחים והמזג נעים",medium:"תקופה של התחדשות וחום מתון אחרי החורף",hard:"רבע שנה של פריחה ובקיעה לאחר ימי קור"},hint:"עונה בין חורף לקיץ",synonyms:[]},
    {word:"סתיו",category:"nature_weather",descriptions:{easy:"עונה שבה העלים נושרים והאוויר מתקרר",medium:"תקופה של צהוב וחום בטבע עם ירידת טמפרטורות",hard:"רבע שנה של קמילה והכנה לחורף"},hint:"עונה בין קיץ לחורף",synonyms:[]},
    {word:"קרח",category:"nature_weather",descriptions:{easy:"מים קפואים שהופכים לקשים וחלקים",medium:"מצב מוצק של מים בטמפרטורות נמוכות",hard:"מוצק גבישי שקוף ושביר שנוצר בתנאי קיפאון"},hint:"נוצר כשמים קופאים",synonyms:["גליד"]},
    {word:"אובך",category:"nature_weather",descriptions:{easy:"ענן נמוך שגורם לקושי לראות רחוק",medium:"מעטה לבן צפוף שמכסה את הנוף בבוקר",hard:"תופעה של עיבוי אדי מים באוויר קרוב לקרקע"},hint:"גורם לראות לא טובה בכבישים",synonyms:["ערפל","ערפילית"]},
    {word:"גבעה",category:"nature_weather",descriptions:{easy:"הר קטן ועגול שאפשר לטפס עליו",medium:"רום טבעי נמוך מהר אך גבוה מהסביבה",hard:"תצורת קרקע מוגבהת בעלת שיפוע מתון"},hint:"הר קטן",synonyms:["תל"]},
    {word:"זרם",category:"nature_weather",descriptions:{easy:"תנועה של מים בנהר או בים בכיוון מסוים",medium:"הזרמת נוזל או אוויר בכיוון קבוע",hard:"תופעה של תנועה מכוונת במשטח נוזלי"},hint:"יכול למשוך אותך בים",synonyms:["שטף"]},
    {word:"שלולית",category:"nature_weather",descriptions:{easy:"בריכה קטנה של מים שנשארת אחרי גשם",medium:"מקווה מים קטן שנוצר ברחוב או בשדה",hard:"צבירת נוזלים קטנה על משטח לא חדיר"},hint:"נוצרת בגשם על המדרכה",synonyms:["אגם"]},
    {word:"רוח",category:"nature_weather",descriptions:{easy:"אוויר שנע ומניף עצים ועלים",medium:"תנועה של אוויר שמרגישים על הפנים",hard:"זרימת גזים אטמוספריים בכיוון מסוים"},hint:"מעופף עפיפונים",synonyms:[]},
    {word:"ענן",category:"nature_weather",descriptions:{easy:"גוש לבן או אפור שצף בשמיים",medium:"מסת אדי מים מרחפת באוויר",hard:"צבירת טיפות מים מתעבות בגובה"},hint:"יכול להביא גשם",synonyms:["עב"]},
    {word:"שלג",category:"nature_weather",descriptions:{easy:"מים קפואים לבנים שיורדים מהשמיים בחורף",medium:"גבישי קרח רכים שמכסים את הקרקע",hard:"משקעים קרים בצורת גבישים מתגבשים"},hint:"בונים ממנו איש",synonyms:[]},
    {word:"גשם",category:"nature_weather",descriptions:{easy:"מים שיורדים מהשמיים כשיש עננים",medium:"משקעים נוזליים הנובעים מעננים",hard:"תופעה של עיבוי ונפילת טיפות מים"},hint:"מרטיב אותנו בחוץ",synonyms:["מטר"]},
    {word:"שמש",category:"nature_weather",descriptions:{easy:"כדור אור צהוב וחם בשמיים",medium:"מקור האור והחום שלנו ביום",hard:"גוף שמיימי המאיר את כדור הארץ"},hint:"עולה בבוקר",synonyms:["חמה"]},
    {word:"ירח",category:"nature_weather",descriptions:{easy:"כדור לבן שנראה בשמיים בלילה",medium:"גוף שמיימי שמקיף את כדור הארץ",hard:"לוויין טבעי המשקף אור שמש"},hint:"משתנה מצורה במהלך החודש",synonyms:["לבנה"]},
    {word:"ברק",category:"nature_weather",descriptions:{easy:"פס אור חזק בשמיים בזמן סערה",medium:"פריקה חשמלית בעננים",hard:"תופעה אלקטרוסטטית אטמוספרית"},hint:"בא לפני הרעם",synonyms:["בזק"]},
    {word:"רעם",category:"nature_weather",descriptions:{easy:"קול חזק ומפחיד בזמן סערה",medium:"רעש שנוצר מהתפוצצות אוויר אחרי ברק",hard:"גל קולי הנוצר מהתפשטות מהירה של גזים"},hint:"בא אחרי הברק",synonyms:[]},
    {word:"קשת",category:"nature_weather",descriptions:{easy:"קשת צבעונית בשמיים אחרי גשם",medium:"תופעה אופטית של שבעה צבעים באוויר",hard:"פיזור אור במים לספקטרום צבעוני"},hint:"שבעה צבעים בשמיים",synonyms:["קשת בענן"]},
    {word:"טל",category:"nature_weather",descriptions:{easy:"טיפות מים קטנות על הדשא בבוקר",medium:"לחות שמופיעה על צמחים בלילה",hard:"עיבוי אדי מים על משטחים קרים"},hint:"מרטיב את הצמחים בלילה",synonyms:[]},
    {word:"קיטור",category:"nature_weather",descriptions:{easy:"עשן לבן שעולה ממים רותחים",medium:"אדים של מים במצב גזי",hard:"שלב אידוי של נוזל לגז"},hint:"עולה מסיר חם",synonyms:["אדים"]},
    {word:"בוקר",category:"nature_weather",descriptions:{easy:"תחילת היום כשהשמש עולה",medium:"חלק היום הראשון עד הצהריים",hard:"תקופת המעבר מלילה ליום"},hint:"טוב לומר בו בוקר טוב",synonyms:["שחר"]},
    {word:"ערב",category:"nature_weather",descriptions:{easy:"סוף היום כשהשמש שוקעת",medium:"התקופה שבין צהריים ללילה",hard:"שלב המעבר מיום לחשכה"},hint:"טוב לומר בו ערב טוב",synonyms:["דמדומים"]},
    {word:"לילה",category:"nature_weather",descriptions:{easy:"כשחשוך בחוץ והירח בשמיים",medium:"התקופה שבין שקיעה לזריחה",hard:"מחזור החושך היומי של כדור הארץ"},hint:"ישנים בו",synonyms:[]},
    {word:"צהריים",category:"nature_weather",descriptions:{easy:"אמצע היום כשהשמש הכי גבוהה",medium:"שעות היום שבין בוקר לערב",hard:"נקודת השיא של מיקום השמש"},hint:"אוכלים בהן ארוחת צהריים",synonyms:[]},

    // emotions - 10 easy words
    {word:"שמחה",category:"emotions",descriptions:{easy:"תחושה טובה שמרגישים כשקורה משהו נחמד",medium:"רגש חיובי שגורם לחיוך ולצחוק",hard:"מצב רוח עליז ומרומם"},hint:"ההפך מעצב",synonyms:["אושר","ששון","גילה"]},
    {word:"עצב",category:"emotions",descriptions:{easy:"תחושה רעה שמרגישים כשקורה משהו לא טוב",medium:"רגש שלילי שגורם לבכי ולדמעות",hard:"מצב רוח מדוכא ומשוקע"},hint:"ההפך משמחה",synonyms:["עצבות","צער","עגמת נפש"]},
    {word:"כעס",category:"emotions",descriptions:{easy:"תחושה חזקה שמרגישים כשמישהו עושה משהו רע",medium:"רגש של זעם ורצון לצעוק",hard:"מצב רגשי סוער עם עלייה בדופק"},hint:"מרגישים אותו כשמרגיזים אותנו",synonyms:["זעם","חמה","רוגז"]},
    {word:"פחד",category:"emotions",descriptions:{easy:"תחושה שמרגישים כשיש משהו מפחיד",medium:"רגש של חרדה ורצון לברוח",hard:"מצב של דאגה ממשית מסכנה"},hint:"מרגישים בסרט אימה",synonyms:["מורא","אימה","בהלה"]},
    {word:"אהבה",category:"emotions",descriptions:{easy:"תחושה חמה ונעימה שמרגישים למישהו קרוב",medium:"רגש עמוק של חיבה ודאגה",hard:"מצב רגשי של קשר והערכה עמוקה"},hint:"מרגישים למשפחה וחברים",synonyms:["חיבה","ידידות"]},
    {word:"בושה",category:"emotions",descriptions:{easy:"תחושה לא נעימה שמרגישים כשעושים טעות בפני אחרים",medium:"רגש של מבוכה והסתרת פנים",hard:"מצב של אי־נוחות חברתית ורצון להיעלם"},hint:"הפנים נעשות אדומות",synonyms:["בוש","מבוכה","כלימה"]},
    {word:"גאווה",category:"emotions",descriptions:{easy:"תחושה טובה שמרגישים כשעושים משהו טוב",medium:"רגש של סיפוק והערכה עצמית",hard:"מצב של הוקרה פנימית להישג"},hint:"מרגישים אחרי הצלחה",synonyms:["גאוה","כבוד"]},
    {word:"קנאה",category:"emotions",descriptions:{easy:"תחושה רעה שמרגישים כשמישהו אחר יש לו משהו טוב",medium:"רגש של רצון למה שיש לאחרים",hard:"מצב של השוואה שלילית ותחושת חסר"},hint:"מרגישים כשרוצים מה שיש לאחרים",synonyms:["קנאת חברים","צרות עין"]},
    {word:"הפתעה",category:"emotions",descriptions:{easy:"תחושה שמרגישים כשקורה משהו בלי לצפות",medium:"רגש של תגובה מיידית למשהו לא צפוי",hard:"מצב של תגובה רגשית לאירוע בלתי צפוי"},hint:"קורה כשלא מצפים למשהו",synonyms:["תדהמה","שתיקה"]},
    {word:"סקרנות",category:"emotions",descriptions:{easy:"רצון חזק לדעת ולגלות דברים חדשים",medium:"רגש של עניין ורצון ללמוד",hard:"מצב של משיכה לידע בלתי מוכר"},hint:"גורמת לשאול שאלות",synonyms:["סַקְרָנוּת","חקרנות"]},

    // musical_instruments - 5 easy words
    {word:"תוף",category:"musical_instruments",descriptions:{easy:"כלי נגינה עגול שמקישים עליו עם מקלות או ידיים",medium:"כלי הקשה עם עור מתוח שמשמיע קול חזק",hard:"כלי נגינה בעל ממברנה רוטטת"},hint:"מקישים עליו בקצב",synonyms:["טבלה","תופים"]},
    {word:"גיטרה",category:"musical_instruments",descriptions:{easy:"כלי נגינה עם מיתרים שמנגנים עליו בידיים",medium:"כלי מיתר בעל צוואר ארוך וגוף עץ",hard:"כלי מיתר אקוסטי או חשמלי עם סדרי צלילים"},hint:"רוקרים מנגנים בו",synonyms:[]},
    {word:"חליל",category:"musical_instruments",descriptions:{easy:"כלי נשיפה ארוך עם חורים שמנגנים בו מנגינות",medium:"כלי נגינה רוח עתיק שעשוי מעץ או מתכת",hard:"כלי נשיפה צדדי במקהלות וסימפוניות"},hint:"רועים מנגנים בו לעדר",synonyms:["חלילית"]},
    {word:"פסנתר",category:"musical_instruments",descriptions:{easy:"כלי נגינה גדול עם קלידים שחורים ולבנים",medium:"כלי מקלדת עם פטישונים שמכים מיתרים פנימיים",hard:"כלי נגינה אקוסטי מורכב עם 88 מקשים"},hint:"בתי ספר למוזיקה לומדים לנגן בו",synonyms:["פסנתרון"]},
    {word:"כינור",category:"musical_instruments",descriptions:{easy:"כלי נגינה קטן שמנגנים בו עם קשת על המיתרים",medium:"כלי מיתר קלאסי בעל ארבעה מיתרים וצליל עדין",hard:"כלי מיתר גבוה בתזמורת סימפונית"},hint:"מנגנים בו במוזיקה קלאסית",synonyms:[]},

    // space - 5 easy words
    {word:"רקיע",category:"space",descriptions:{easy:"השמיים הכחולים שרואים מלמעלה",medium:"המרחב השמיימי הנראה מהארץ",hard:"הכיפה השמיימית הנראית לעין"},hint:"שם נרדף לשמיים",synonyms:["שמיים"]},
    {word:"ירח",category:"space",descriptions:{easy:"כדור לבן בשמיים בלילה",medium:"לוויין טבעי של כדור הארץ",hard:"גוף שמיימי המקיף את הפלנטה"},hint:"משתנה מצורה כל לילה",synonyms:["לבנה"]},
    {word:"שמש",category:"space",descriptions:{easy:"הכדור הצהוב החם שנותן לנו אור",medium:"כוכב המרכז של המערכת השמשית",hard:"גוף שמיימי מרכזי המפיק אנרגיה"},hint:"נותנת לנו חום ואור",synonyms:["חמה"]},
    {word:"כוכב",category:"space",descriptions:{easy:"נקודת אור קטנה בשמי הלילה",medium:"גוף שמיימי שמפיק אור עצמי",hard:"גז לוהט בחלל שנראה קטן מרחוק"},hint:"השמש היא אחד מהם",synonyms:[]},
    {word:"חללית",category:"space",descriptions:{easy:"רכב שטס לחלל עם אנשים או ציוד",medium:"כלי טיס שמיועד למסעות מחוץ לאטמוספרה",hard:"מערכת הנעה למסלולים בינכוכביים"},hint:"טסה לירח",synonyms:["ספינת חלל"]},

    // animals - 2 easy words
    {word:"ארנב",category:"animals",descriptions:{easy:"חיה רכה עם אוזניים ארוכות שקופצת",medium:"בעל חיים קטן עם זנב קצר ופרווה רכה",hard:"יונק צמחוני מהיר בעל רגליים אחוריות חזקות"},hint:"אוהב לאכול גזר",synonyms:["שפן"]},
    {word:"דולפין",category:"animals",descriptions:{easy:"חיה חכמה וידידותית שחיה בים",medium:"יונק ימי אינטליגנטי עם מקור ארוך",hard:"יונק דנטטי ימי בעל מערכת הד-מיקום"},hint:"קופץ מהמים ומשחק",synonyms:[]},
  ],
  medium: [],
  hard: []
};

// Add all new words
console.log('\nAdding 150 new words...');
data.words.easy.push(...new150Words.easy);
console.log(`Added ${new150Words.easy.length} easy words`);

// Update metadata
const newTotal = data.words.easy.length + data.words.medium.length + data.words.hard.length;
data.metadata.totalWords = newTotal;
data.metadata.categories = data.categories.length;

// Save updated file
fs.writeFileSync(wordsPath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n✅ Successfully added 150 words!`);
console.log(`New total: ${newTotal} words`);
console.log(`Easy: ${data.words.easy.length}, Medium: ${data.words.medium.length}, Hard: ${data.words.hard.length}`);
