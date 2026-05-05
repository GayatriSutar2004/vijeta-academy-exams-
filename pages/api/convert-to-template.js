import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Convert any Word document to template format
const convertToTemplateFormat = async (filePath) => {
  const result = { formatted_text: '', total_questions: 0, sections: [] };
  
  try {
    // Extract text from Word document
    const { value: text } = await mammoth.extractRawText({ path: filePath });
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let currentSection = 'General';
    let questions = [];
    let currentQuestion = null;
    let questionCounter = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect section headers like [General Knowledge]
      if (/^\[.*\]$/.test(line)) {
        currentSection = line.replace(/[\[\]]/g, '').trim();
        if (!result.sections.includes(currentSection)) {
          result.sections.push(currentSection);
        }
        continue;
      }
      
      // Detect section headers without brackets
      if (/^(section\s+\w+|general\s+knowledge|general\s+science|mathematics|english|physics|chemistry|biology)/i.test(line)) {
        currentSection = line.trim();
        if (!result.sections.includes(currentSection)) {
          result.sections.push(currentSection);
        }
        continue;
      }
      
      // Detect question start - various formats: Q1, Q1., 1., Question 1, etc.
      const questionMatch = line.match(/^(?:Q\.?\s*(\d+)|(\d+)[\.\)]\s*|Question\s*(\d+)[\.\)]\s*)/i);
      
      if (questionMatch) {
        // Save previous question
        if (currentQuestion && currentQuestion.options.length === 4) {
          questions.push(currentQuestion);
        }
        
        // Get question number
        const qNum = questionMatch[1] || questionMatch[2] || questionMatch[3] || (questionCounter + 1).toString();
        questionCounter = parseInt(qNum) || questionCounter + 1;
        
        // Extract question text (remove the question number prefix)
        let questionText = line.replace(/^(?:Q\.?\s*\d+|(\d+)[\.\)]\s*|Question\s*\d+[\.\)]\s*)/i, '').trim();
        
        currentQuestion = {
          number: questionCounter,
          text: questionText,
          options: [],
          answer: null,
          section: currentSection
        };
        continue;
      }
      
      // Detect options - A), A., A) text, etc.
      const optionMatch = line.match(/^([A-D])[\.\)]\s*(.+)/i);
      if (optionMatch && currentQuestion) {
        const optionLetter = optionMatch[1].toUpperCase();
        const optionText = optionMatch[2].trim();
        
        // Map to A, B, C, D
        const optionIndex = optionLetter.charCodeAt(0) - 65;
        if (optionIndex >= 0 && optionIndex < 4) {
          currentQuestion.options[optionIndex] = optionText;
        }
        continue;
      }
      
      // Detect answer line: Answer: B, Ans: B, Correct: B
      const answerMatch = line.match(/^(?:Answer|Ans|Correct)\s*:\s*([A-D])/i);
      if (answerMatch && currentQuestion) {
        currentQuestion.answer = answerMatch[1].toUpperCase();
        continue;
      }
      
      // If line looks like continuation of question text
      if (currentQuestion && currentQuestion.options.length === 0 && !/^[A-D][\.\)]\s/.test(line)) {
        currentQuestion.text += ' ' + line;
        continue;
      }
    }
    
    // Don't forget the last question
    if (currentQuestion && currentQuestion.options.length === 4) {
      questions.push(currentQuestion);
    }
    
    // Build formatted text
    let formattedText = '';
    let currentSectionName = '';
    
    for (const q of questions) {
      if (q.section !== currentSectionName) {
        currentSectionName = q.section;
        formattedText += '\n[' + currentSectionName + ']\n\n';
      }
      
      formattedText += 'Q' + q.number + '. ' + q.text + '\n';
      formattedText += 'A) ' + (q.options[0] || '') + '\n';
      formattedText += 'B) ' + (q.options[1] || '') + '\n';
      formattedText += 'C) ' + (q.options[2] || '') + '\n';
      formattedText += 'D) ' + (q.options[3] || '') + '\n';
      formattedText += 'Answer: ' + (q.answer || 'B') + '\n\n';
    }
    
    result.formatted_text = formattedText.trim();
    result.total_questions = questions.length;
    
    if (result.sections.length === 0) {
      result.sections.push('General');
    }
    
  } catch (error) {
    console.error('Error converting to template format:', error);
    throw error;
  }
  
  return result;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const tempPath = path.join(process.cwd(), 'temp', file.name);
    if (!fs.existsSync(path.dirname(tempPath))) {
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    }
    
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    
    try {
      const result = await convertToTemplateFormat(tempPath);
      
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      
      return res.status(200).json({
        success: true,
        formatted_text: result.formatted_text,
        total_questions: result.total_questions,
        sections: result.sections
      });
    } catch (err) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return res.status(500).json({ error: 'Conversion failed: ' + err.message });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
