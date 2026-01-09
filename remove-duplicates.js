const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, 'data', 'words.json');
const data = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

console.log('מצב התחלתי:');
console.log(`Easy: ${data.words.easy.length}, Medium: ${data.words.medium.length}, Hard: ${data.words.hard.length}`);
console.log(`סה"כ: ${data.metadata.totalWords} מילים\n`);

// פונקציה למציאת ומחיקת כפילויות
function removeDuplicates(words) {
  const seen = new Set();
  const toRemove = [];

  words.forEach((word, index) => {
    if (seen.has(word.word)) {
      toRemove.push(index);
      console.log(`  מוחק כפילות: ${word.word} באינדקס ${index}`);
    } else {
      seen.add(word.word);
    }
  });

  // מחיקה מהסוף להתחלה כדי לא לשבש אינדקסים
  for (let i = toRemove.length - 1; i >= 0; i--) {
    words.splice(toRemove[i], 1);
  }

  return toRemove.length;
}

// מחיקת כפילויות בתוך כל רמת קושי
console.log('מוחק כפילויות בתוך easy:');
const easyRemoved = removeDuplicates(data.words.easy);

console.log('\nמוחק כפילויות בתוך medium:');
const mediumRemoved = removeDuplicates(data.words.medium);

console.log('\nמוחק כפילויות בתוך hard:');
const hardRemoved = removeDuplicates(data.words.hard);

// עכשיו מוחק כפילויות בין רמות קושי שונות
console.log('\nמוחק כפילויות בין רמות קושי:');
const allSeen = new Set();
let crossRemoved = 0;

// קודם מוסיף את כל ה-easy
data.words.easy.forEach(w => allSeen.add(w.word));

// עכשיו בודק medium
const mediumToRemove = [];
data.words.medium.forEach((word, index) => {
  if (allSeen.has(word.word)) {
    mediumToRemove.push(index);
    console.log(`  מוחק כפילות מ-medium: ${word.word} באינדקס ${index}`);
  } else {
    allSeen.add(word.word);
  }
});

for (let i = mediumToRemove.length - 1; i >= 0; i--) {
  data.words.medium.splice(mediumToRemove[i], 1);
}
crossRemoved += mediumToRemove.length;

// עכשיו בודק hard
const hardToRemove = [];
data.words.hard.forEach((word, index) => {
  if (allSeen.has(word.word)) {
    hardToRemove.push(index);
    console.log(`  מוחק כפילות מ-hard: ${word.word} באינדקס ${index}`);
  } else {
    allSeen.add(word.word);
  }
});

for (let i = hardToRemove.length - 1; i >= 0; i--) {
  data.words.hard.splice(hardToRemove[i], 1);
}
crossRemoved += hardToRemove.length;

// עדכון metadata
data.metadata.totalWords = data.words.easy.length + data.words.medium.length + data.words.hard.length;

console.log('\n=== סיכום המחיקה ===');
console.log(`הוסר מ-easy: ${easyRemoved}`);
console.log(`הוסר מ-medium: ${mediumRemoved}`);
console.log(`הוסר מ-hard: ${hardRemoved}`);
console.log(`הוסר בין רמות: ${crossRemoved}`);
console.log(`סה"כ נמחק: ${easyRemoved + mediumRemoved + hardRemoved + crossRemoved}\n`);

console.log('מצב סופי:');
console.log(`Easy: ${data.words.easy.length}, Medium: ${data.words.medium.length}, Hard: ${data.words.hard.length}`);
console.log(`סה"כ: ${data.metadata.totalWords} מילים`);

// שמירה
fs.writeFileSync(wordsPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('\n✅ הקובץ נשמר בהצלחה!');
