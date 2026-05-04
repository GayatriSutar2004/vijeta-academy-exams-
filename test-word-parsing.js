const mammoth = require('mammoth');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const parseWordDocument = async (filePath) => {
  const result = { questions: [], sections: [], images: [] };
  
  try {
    // Extract text
    const { value: text } = await mammoth.extractRawText({ path: filePath });
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    console.log('=== FIRST 20 LINES ===');
    lines.slice(0, 20).forEach((line, i) => {
      console.log(`${i+1}: ${line}`);
    });
    
    // Extract images
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      let imageIndex = 0;
      
      for (const entry of zipEntries) {
        if (entry.entryName.startsWith('word/media/')) {
          const imageData = entry.getData();
          const ext = entry.entryName.endsWith('.png') ? 'png' : 'jpg';
          const imageName = `test_image_${imageIndex}.${ext}`;
          const imagePath = path.join(__dirname, 'public', 'question-images', imageName);
          
          if (!fs.existsSync(path.dirname(imagePath))) {
            fs.mkdirSync(path.dirname(imagePath), { recursive: true });
          }
          
          fs.writeFileSync(imagePath, imageData);
          result.images.push({ name: imageName, path: `/question-images/${imageName}` });
          console.log(`✓ Extracted: ${imageName}`);
          imageIndex++;
        }
      }
      console.log(`\nTotal images extracted: ${result.images.length}`);
    } catch (e) {
      console.log('No images found in docx');
    }
    
    // Parse questions (basic)
    let currentQuestion = null;
    let imageIdx = 0;
    
    for (const line of lines) {
      if (/^Q\.?\s*\d+/i.test(line) || /^\d+[\.\)]/.test(line)) {
        if (currentQuestion) result.questions.push(currentQuestion);
        currentQuestion = {
          question_text: line,
          options: [],
          correct_answer: null,
          section: result.sections[result.sections.length - 1] || 'General'
        };
        if (imageIdx < result.images.length) {
          currentQuestion.image_path = result.images[imageIdx].path;
          imageIdx++;
        }
      } else if (/^[A-D]\)/.test(line)) {
        if (currentQuestion) currentQuestion.options.push(line);
      } else if (/^Answer\s*:/i.test(line)) {
        const match = line.match(/Answer\s*:\s*([A-D])/i);
        if (match && currentQuestion) currentQuestion.correct_answer = match[1].toUpperCase();
      } else if (/^\[.*\]/.test(line)) {
        const sectionName = line.replace(/[\[\]]/g, '');
        if (!result.sections.includes(sectionName)) result.sections.push(sectionName);
      } else if (currentQuestion) {
        currentQuestion.question_text += ' ' + line;
      }
    }
    if (currentQuestion) result.questions.push(currentQuestion);
    
    console.log(`\nTotal questions: ${result.questions.length}`);
    if (result.questions.length > 0) {
      console.log('\nFirst question:', result.questions[0].question_text.substring(0, 60));
      console.log('Options:', result.questions[0].options.length);
      console.log('Image:', result.questions[0].image_path || 'none');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  return result;
};

// Test with different files
const files = [
  './samplePapers/file2.docx',
  './SSB-Exam-Sample.html' // This won't work - it's HTML
];

(async () => {
  console.log('=== TESTING WORD PARSING ===\n');
  
  // Test file2.docx
  console.log('\n1. Testing file2.docx:');
  await parseWordDocument('./samplePapers/file2.docx');
  
  // Test if we can create a proper .docx with images
  console.log('\n=== TEST COMPLETE ===');
})();
