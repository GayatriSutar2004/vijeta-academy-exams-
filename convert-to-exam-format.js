const mammoth = require('mammoth');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const convertToExamFormat = async (inputFile, outputFile) => {
  console.log(`=== Converting ${inputFile} ===`);
  
  try {
    // Extract text from Word doc
    const { value: text } = await mammoth.extractRawText({ path: inputFile });
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    // Process into exam format
    const result = {
      exam_name: path.basename(inputFile, path.extname(inputFile)),
      questions: [],
      sections: [],
      images: []
    };
    
    let currentQuestion = null;
    let currentSection = 'General';
    let imageIndex = 0;
    
    // Extract images first
    try {
      const zip = new AdmZip(inputFile);
      const zipEntries = zip.getEntries();
      
      for (const entry of zipEntries) {
        if (entry.entryName.startsWith('word/media/')) {
          const imageData = entry.getData();
          const ext = entry.entryName.endsWith('.png') ? 'png' : 'jpg';
          const imageName = `q_image_${imageIndex}.${ext}`;
          const imagePath = path.join(__dirname, 'public', 'question-images', imageName);
          
          if (!fs.existsSync(path.dirname(imagePath))) {
            fs.mkdirSync(path.dirname(imagePath), { recursive: true });
          }
          
          fs.writeFileSync(imagePath, imageData);
          result.images.push({
            name: imageName,
            path: `/question-images/${imageName}`,
            index: imageIndex
          });
          imageIndex++;
        }
      }
      console.log(`✓ Extracted ${result.images.length} images`);
    } catch (e) {
      console.log('No images found');
    }
    
    // Parse questions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Section header: [Section 1: General Knowledge]
      if (/^\[.*\]/.test(line)) {
        currentSection = line.replace(/[\[\]]/g, '').trim();
        if (!result.sections.includes(currentSection)) {
          result.sections.push(currentSection);
        }
        continue;
      }
      
      // Question: Q1. or 1. or Question 1
      if (/^Q\.?\s*\d+/i.test(line) || /^\d+[\.\)]/.test(line)) {
        if (currentQuestion) {
          result.questions.push(currentQuestion);
        }
        
        currentQuestion = {
          question_number: result.questions.length + 1,
          question_text: line,
          options: [],
          correct_answer: null,
          section: currentSection,
          image_path: null
        };
        
        // Assign image if available
        if (result.images.length > 0 && result.questions.length < result.images.length) {
          const imgIdx = result.questions.length;
          if (result.images[imgIdx]) {
            currentQuestion.image_path = result.images[imgIdx].path;
          }
        }
        continue;
      }
      
      // Option: A) B) C) D)
      if (/^[A-D]\)/.test(line)) {
        if (currentQuestion) {
          currentQuestion.options.push(line);
        }
        continue;
      }
      
      // Answer: Answer: B
      if (/^Answer\s*:/i.test(line)) {
        if (currentQuestion) {
          const match = line.match(/Answer\s*:\s*([A-D])/i);
          if (match) {
            currentQuestion.correct_answer = match[1].toUpperCase();
          }
        }
        continue;
      }
      
      // Continuation of question text
      if (currentQuestion && currentQuestion.question_text && !currentQuestion.options.length) {
        currentQuestion.question_text += ' ' + line;
      }
    }
    
    // Push last question
    if (currentQuestion) {
      result.questions.push(currentQuestion);
    }
    
    console.log(`✓ Parsed ${result.questions.length} questions`);
    console.log(`✓ Found ${result.sections.length} sections`);
    
    // Save as JSON (can be imported to MongoDB)
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`✓ Saved to ${outputFile}`);
    
    return result;
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Run conversion
const input = process.argv[2] || './samplePapers/file2.docx';
const output = process.argv[3] || './converted-exam.json';

convertToExamFormat(input, output)
  .then(() => {
    console.log('\n=== CONVERSION COMPLETE ===');
    console.log('Next steps:');
    console.log('1. Check converted-exam.json');
    console.log('2. Import to MongoDB: node import-to-mongodb.js');
  })
  .catch(console.error);