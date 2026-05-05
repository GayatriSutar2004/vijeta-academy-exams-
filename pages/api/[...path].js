import { MongoClient, ObjectId } from 'mongodb';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export const config = {
  api: {
    bodyParser: true,
  },
};

let client;
let db;

const getDb = async () => {
  if (db) return db;
  
  if (!client) {
    const mongoUri = process.env.MONGODB_URI;
    client = new MongoClient(mongoUri);
  }
  
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'vijeta_db');
  return db;
};

// Word file parser with image extraction
const parseWordDocument = async (filePath) => {
  const result = { questions: [], sections: [], images: [] };
  
  try {
    // Extract text
    const { value: text } = await mammoth.extractRawText({ path: filePath });
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Extract images from docx (zip format)
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      let imageIndex = 0;
      
      for (const entry of zipEntries) {
        if (entry.entryName.startsWith('word/media/')) {
          const imageData = entry.getData();
          const ext = entry.entryName.endsWith('.png') ? 'png' : 'jpg';
          const imageName = `image_${Date.now()}_${imageIndex}.${ext}`;
          const tempPath = path.join(process.cwd(), 'public', 'question-images', `temp_${imageName}`);
          const finalPath = path.join(process.cwd(), 'public', 'question-images', imageName);
          
          // Ensure directory exists
          const dir = path.dirname(tempPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Save temporarily
          fs.writeFileSync(tempPath, imageData);
          
          try {
            // Compress image (resize to max 800px width)
            await sharp(tempPath)
              .resize(800, null, { fit: 'inside' })
              .toFile(finalPath);
            fs.unlinkSync(tempPath); // Remove temp file
            console.log(`✓ Compressed: ${imageName}`);
          } catch (compressErr) {
            // If compression fails, use original
            fs.renameSync(tempPath, finalPath);
            console.log(`✓ Saved (no compression): ${imageName}`);
          }
          
          result.images.push({ name: imageName, path: `/question-images/${imageName}` });
          imageIndex++;
        }
      }
    } catch (e) {
      console.log('No images found in docx');
    }
    
    // Parse questions (simplified - adjust regex as needed)
    let currentQuestion = null;
    let imageIdx = 0;
    
    for (const line of lines) {
      // Question start (Q1, 1., Question 1, etc.)
      if (/^Q\.?\s*\d+/i.test(line) || /^\d+[\.\)]/.test(line)) {
        if (currentQuestion) {
          result.questions.push(currentQuestion);
        }
        
        currentQuestion = {
          question_text: line,
          options: [],
          correct_answer: null,
          section: result.sections[result.sections.length - 1] || 'General'
        };
        
        // Link image if available
        if (imageIdx < result.images.length) {
          currentQuestion.image_path = result.images[imageIdx].path;
          imageIdx++;
        }
      }
      // Option (A), B), etc.)
      else if (/^[A-D]\)/.test(line)) {
        if (currentQuestion) {
          currentQuestion.options.push(line);
        }
      }
      // Answer
      else if (/^Answer\s*:/.test(line)) {
        if (currentQuestion) {
          const match = line.match(/Answer\s*:\s*([A-D])/i);
          if (match) {
            currentQuestion.correct_answer = match[1].toUpperCase();
          }
        }
      }
      // Section header
      else if (/^\[.*\]/.test(line)) {
        const sectionName = line.replace(/[\[\]]/g, '');
        if (!result.sections.includes(sectionName)) {
          result.sections.push(sectionName);
        }
      }
      // Question text continuation
      else if (currentQuestion && !currentQuestion.question_text.includes(line)) {
        currentQuestion.question_text += ' ' + line;
      }
    }
    
    if (currentQuestion) {
      result.questions.push(currentQuestion);
    }
    
  } catch (error) {
    console.error('Error parsing Word document:', error);
  }
  
  return result;
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
      
      // Detect section headers like "Section A", "General Knowledge", etc.
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
      
      // Detect question start - various formats
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
      
      // Detect options - various formats
      const optionMatch = line.match(/^([A-D])[\.\)\s]\s*(.+)/i);
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
      
      // Detect answer line
      const answerMatch = line.match(/^(?:Answer|Ans|Correct)[\s:]*([A-D])/i);
      if (answerMatch && currentQuestion) {
        currentQuestion.answer = answerMatch[1].toUpperCase();
        continue;
      }
      
      // If line looks like continuation of question text
      if (currentQuestion && currentQuestion.options.length === 0 && !/^[A-D][\.\)\s]/.test(line)) {
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
        formattedText += `\n[${currentSectionName}]\n\n`;
      }
      
      formattedText += `Q${q.number}. ${q.text}\n`;
      formattedText += `A) ${q.options[0] || ''}\n`;
      formattedText += `B) ${q.options[1] || ''}\n`;
      formattedText += `C) ${q.options[2] || ''}\n`;
      formattedText += `D) ${q.options[3] || ''}\n`;
      formattedText += `Answer: ${q.answer || 'B'}\n\n`;
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
  const path = req.url?.replace('/api/', '').replace(/\?.*/, '') || '';
  const database = await getDb();
  
  // Root route fix
  if (path === '' || path === '/') {
    return res.status(200).json({
      status: 'ok',
      message: 'Vijeta API is running',
      version: '1.0.0',
      endpoints: {
        admin: '/api/admin',
        students: '/api/students',
        exams: '/api/exams',
        examAttempts: '/api/exam-attempts',
        adminResults: '/api/admin-results'
      }
    });
  }
  
  try {
    if (req.method === 'GET') {
      // Admin collection
      if (path === 'admin' || path === '') {
        const results = await database.collection('admin').find({}).toArray();
        return res.status(200).json(results);
      }
      
      // Students collection
      if (path === 'students') {
        const results = await database.collection('students').find({}).sort({ student_name: 1 }).toArray();
        return res.status(200).json(results);
      }
      
      // Exams collection
      if (path === 'exams') {
        const results = await database.collection('exams').find({}).sort({ created_at: -1 }).toArray();
        return res.status(200).json(results);
      }
      
// Admin Results - exam attempts with student and exam info (only latest)
       if (path === 'admin-results') {
         const results = await database.collection('exam_attempts').aggregate([
           { $match: { is_latest: true } },
           { $lookup: { from: 'students', localField: 'student_id', foreignField: '_id', as: 'student' } },
           { $lookup: { from: 'exams', localField: 'exam_id', foreignField: '_id', as: 'exam' } },
           { $unwind: '$student' },
           { $unwind: '$exam' },
           { $addFields: { student_name: '$student.student_name', roll_no: '$student.roll_no', exam_name: '$exam.exam_name', result_published: '$exam.result_published' } },
           { $sort: { submitted_at: -1 } }
         ]).toArray();
         return res.status(200).json(results);
       }
       
       // Toggle result published
       if (path.startsWith('exams/') && path.endsWith('/publish-result')) {
         const id = path.split('/')[1];
         const { publish } = req.body;
         await database.collection('exams').updateOne(
           { _id: new ObjectId(id) },
           { $set: { result_published: publish } }
         );
         return res.status(200).json({ success: true, result_published: publish });
       }
       
// Get latest attempt for student+exam
        if (path === 'latest-attempt') {
          const { student_id, exam_id } = req.body;
          const attempt = await database.collection('exam_attempts').findOne(
            { student_id: new ObjectId(student_id), exam_id: new ObjectId(exam_id), is_latest: true }
          );
          return res.status(200).json(attempt || { error: 'No attempt found' });
        }
        
        // Download result as PDF
        if (path === 'download-result') {
          const { attempt_id } = req.body;
          
          if (!attempt_id) {
            return res.status(400).json({ error: 'attempt_id required' });
          }
          
          const attempt = await database.collection('exam_attempts').findOne({ _id: new ObjectId(attempt_id) });
          if (!attempt) {
            return res.status(404).json({ error: 'Attempt not found' });
          }
          
          const student = await database.collection('students').findOne({ _id: attempt.student_id });
          const exam = await database.collection('exams').findOne({ _id: attempt.exam_id });
          const responses = await database.collection('student_responses').find({ attempt_id: new ObjectId(attempt_id) }).toArray();
          
          // Create simple HTML for PDF
          let html = `
            <!DOCTYPE html>
            <html>
            <head><style>
              body { font-family: Arial; margin: 40px; }
              h1 { color: #1e5bbf; text-align: center; }
              .info { margin: 20px 0; padding: 10px; background: #f8f9fa; }
              .question { margin: 15px 0; padding: 10px; border-left: 3px solid #1e5bbf; }
              .correct { color: #28a745; font-weight: bold; }
              .wrong { color: #dc3545; font-weight: bold; }
            </style></head>
            <body>
              <h1>Exam Result</h1>
              <div class="info">
                <p><strong>Student:</strong> ${student?.student_name || 'N/A'}</p>
                <p><strong>Roll No:</strong> ${student?.roll_no || 'N/A'}</p>
                <p><strong>Exam:</strong> ${exam?.exam_name || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(attempt.submitted_at).toLocaleDateString()}</p>
              </div>
              <h2>Question-wise Results:</h2>
          `;
          
          for (let i = 0; i < responses.length; i++) {
            const r = responses[i];
            const status = r.is_correct ? 'correct' : 'wrong';
            const statusText = r.is_correct ? '✓ Correct' : '✗ Wrong';
            html += `
              <div class="question">
                <p><strong>Q${i+1}:</strong> ${r.selected_answer || 'Not attempted'}</p>
                <p class="${status}">${statusText}</p>
              </div>
            `;
          }
          
          html += `</body></html>`;
          
          // For now, return HTML (can be converted to PDF with Puppeteer)
          res.setHeader('Content-Type', 'text/html');
          return res.status(200).send(html);
        }
      
      // Get student by ID
      if (path.startsWith('students/')) {
        const id = path.split('/')[1];
        const result = await database.collection('students').findOne({ _id: new ObjectId(id) });
        return res.status(200).json(result || { error: 'Not found' });
      }
      
      // Get exam by ID
      if (path.startsWith('exams/')) {
        const parts = path.split('/');
        const id = parts[1];
        
        // Get exam questions
        if (parts[2] === 'questions') {
          const questions = await database.collection('questions').find({ exam_id: new ObjectId(id) }).toArray();
          return res.status(200).json(questions);
        }
        
        const result = await database.collection('exams').findOne({ _id: new ObjectId(id) });
        return res.status(200).json(result || { error: 'Not found' });
      }
      
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    if (req.method === 'POST') {
      const body = req.body;
      
      // Admin login
      if (path === 'admin/login') {
        const result = await database.collection('admin').findOne({ email: body.email, password_hash: body.password });
        if (!result) return res.status(401).json({ error: 'Invalid credentials' });
        return res.status(200).json({ message: 'Login successful', admin: result });
      }
      
      // Student login
      if (path === 'students/login') {
        const result = await database.collection('students').findOne({ email: body.email, password_hash: body.password });
        if (!result) return res.status(401).json({ error: 'Invalid credentials' });
        return res.status(200).json({ message: 'Login successful', student: result });
      }
      
      // Add student
      if (path === 'students/add') {
        const newStudent = {
          student_name: body.student_name,
          batch_name: body.batch_name,
          admission_year: parseInt(body.admission_year),
          roll_no: body.roll_no,
          mobile_no: body.mobile_no,
          email: body.email,
          password_hash: body.password_hash,
          exam_type: body.exam_type || 'NDA',
          created_at: new Date()
        };
        const result = await database.collection('students').insertOne(newStudent);
        return res.status(200).json({ message: 'Student added', student_id: result.insertedId });
      }
      
// Add exam
        if (path === 'exams/add') {
          const newExam = {
            exam_name: body.exam_name,
            duration_minutes: parseInt(body.duration_minutes),
            total_questions: parseInt(body.total_questions),
            exam_type: body.exam_type,
            exam_date: body.exam_date,
            exam_time: body.exam_time,
            created_by: body.created_by,
            result_published: false,
            created_at: new Date()
          };
          const result = await database.collection('exams').insertOne(newExam);
          return res.status(200).json({ message: 'Exam created', exam_id: result.insertedId });
        }
        
        // Upload and parse Word file
        if (path === 'upload-exam') {
          const { exam_id, file_path } = body;
          
          if (!file_path || !exam_id) {
            return res.status(400).json({ error: 'exam_id and file_path required' });
          }
          
          const parseResult = await parseWordDocument(file_path);
          
          // Insert questions
          if (parseResult.questions && parseResult.questions.length > 0) {
            const questionsToInsert = parseResult.questions.map((q, idx) => ({
              exam_id: new ObjectId(exam_id),
              question_text: q.question_text,
              options: q.options || [],
              correct_answer: q.correct_answer || '',
              section: q.section || 'General',
              question_number: idx + 1,
              marks: 1,
              created_at: new Date()
            }));
            
            await database.collection('questions').insertMany(questionsToInsert);
            
            // Update exam with total questions
            await database.collection('exams').updateOne(
              { _id: new ObjectId(exam_id) },
              { $set: { total_questions: parseResult.questions.length } }
            );
          }
          
          return res.status(200).json({
            success: true,
            questions_parsed: parseResult.questions?.length || 0,
            images_extracted: parseResult.images?.length || 0
          });
        }
      
// Submit exam attempt (allow multiple, latest = final)
       if (path === 'exam-attempts') {
         const { student_id, exam_id, answers } = body;
         
         // Mark all previous attempts as not latest
         await database.collection('exam_attempts').updateMany(
           { exam_id: new ObjectId(exam_id), student_id: new ObjectId(student_id) },
           { $set: { is_latest: false } }
         );
         
         const attempt = {
           exam_id: new ObjectId(exam_id),
           student_id: new ObjectId(student_id),
           start_time: new Date(),
           end_time: new Date(),
           submitted_at: new Date(),
           attempt_status: 'Submitted',
           is_latest: true
         };
         
         const result = await database.collection('exam_attempts').insertOne(attempt);
         const attemptId = result.insertedId;
         
         // Insert all answers
         if (answers) {
           const responses = [];
           for (const [questionId, selectedAnswer] of Object.entries(answers)) {
             responses.push({
               attempt_id: attemptId,
               question_id: new ObjectId(questionId),
               selected_answer: selectedAnswer
             });
           }
           await database.collection('student_responses').insertMany(responses);
         }
         
         return res.status(200).json({ success: true, attempt_id: attemptId });
       }
      
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    if (req.method === 'PUT') {
      const body = req.body;
      
      // Update student
      if (path.startsWith('students/')) {
        const id = path.split('/')[1];
        await database.collection('students').updateOne(
          { _id: new ObjectId(id) },
          { $set: { student_name: body.student_name, batch_name: body.batch_name, mobile_no: body.mobile_no, email: body.email } }
        );
        return res.status(200).json({ message: 'Student updated' });
      }
      
      // Update exam
      if (path.startsWith('exams/')) {
        const id = path.split('/')[1];
        await database.collection('exams').updateOne(
          { _id: new ObjectId(id) },
          { $set: { exam_name: body.exam_name, exam_date: body.exam_date, exam_time: body.exam_time, duration_minutes: parseInt(body.duration_minutes), exam_status: body.exam_status, exam_type: body.exam_type } }
        );
        return res.status(200).json({ message: 'Exam updated' });
      }
      
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    if (req.method === 'DELETE') {
      // Delete student
      if (path.startsWith('students/')) {
        const id = path.split('/')[1];
        await database.collection('students').deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ message: 'Student deleted' });
      }
      
      // Delete exam
      if (path.startsWith('exams/')) {
        const id = path.split('/')[1];
        await database.collection('exams').deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ message: 'Exam deleted' });
      }
      
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    // Convert any Word document to template format
    if (path === 'convert-to-template' && req.method === 'POST') {
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
        return res.status(500).json({ error: 'Conversion failed: ' + err.message });
      }
    }
    
    // Generate formatted Word document from text
    if (path === 'generate-formatted-docx' && req.method === 'POST') {
      const { text, filename } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }
      
      try {
        const doc = new Document({
          sections: [{
            properties: {},
            children: text.split('\n').map(line => 
              new Paragraph({
                children: [new TextRun(line || ' ')]
              })
            )
          }]
        });
        
        const buffer = await Packer.toBuffer(doc);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'formatted_document'}.docx"`);
        
        return res.status(200).send(buffer);
      } catch (err) {
        return res.status(500).json({ error: 'Failed to generate document: ' + err.message });
      }
    }
    
    // Convert Word document to exam format
    if (path === 'convert-to-exam' && req.method === 'POST') {
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
        const result = await parseWordDocument(tempPath);
        
        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        
        return res.status(200).json({
          success: true,
          exam_name: path.basename(file.name, path.extname(file.name)),
          questions: result.questions,
          sections: result.sections,
          images: result.images,
          total_questions: result.questions.length
        });
      } catch (err) {
        return res.status(500).json({ error: 'Conversion failed: ' + err.message });
      }
    }
    
     return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}