import { MongoClient, ObjectId } from 'mongodb';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import getRawBody from 'raw-body';

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseBody = async (req) => {
  try {
    const raw = await getRawBody(req);
    return JSON.parse(raw.toString());
  } catch (e) {
    return {};
  }
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
          const imageName = `image_${Date.now()}_${imageIndex}.png`;
          const imagePath = path.join(process.cwd(), 'public', 'question-images', imageName);
          
          // Ensure directory exists
          const dir = path.dirname(imagePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(imagePath, imageData);
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
  
  // Parse body based on content type
  let body = {};
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    body = await parseBody(req);
  }
  
  // Handle FormData for exam creation
  if (path === 'exams/add' && req.method === 'POST' && contentType.includes('multipart/form-data')) {
    const { formidable } = await import('formidable');
    const form = formidable({ multiples: true });
    try {
      const [fields, files] = await form.parse(req);
      const file = files.file?.[0];
      
      if (!file || !fields.exam_name?.[0]) {
        return res.status(400).json({ error: 'Missing file or exam name' });
      }
      
      // Parse the Word document
      const parseResult = await parseWordDocument(file.filepath);
      
      // Create exam
      const newExam = {
        exam_name: fields.exam_name[0],
        duration_minutes: parseInt(fields.duration_minutes?.[0] || '60'),
        total_questions: parseResult.questions.length,
        exam_type: fields.exam_type?.[0] || 'NDA',
        exam_date: fields.exam_date?.[0] || new Date().toISOString().split('T')[0],
        exam_time: fields.exam_time?.[0] || '09:00:00',
        target_batch_name: fields.target_batch_name?.[0] || '',
        target_admission_year: fields.target_admission_year?.[0] ? parseInt(fields.target_admission_year[0]) : null,
        result_published: false,
        created_at: new Date()
      };
      
      const examResult = await database.collection('exams').insertOne(newExam);
      const examId = examResult.insertedId;
      
      // Insert questions
      if (parseResult.questions.length > 0) {
        const questionsToInsert = parseResult.questions.map((q, idx) => ({
          exam_id: examId,
          question_text: q.question_text,
          options: q.options || [],
          correct_answer: q.correct_answer || '',
          section: q.section || 'General',
          question_number: idx + 1,
          image_path: q.image_path || null,
          marks: 1,
          created_at: new Date()
        }));
        
        await database.collection('questions').insertMany(questionsToInsert);
      }
      
      // Clean up temp file
      fs.unlinkSync(file.filepath);
      
      return res.status(200).json({ 
        message: 'Exam created', 
        exam_id: examId,
        questions_parsed: parseResult.questions.length,
        images_extracted: parseResult.images?.length || 0
      });
    } catch (err) {
      console.error('Exam creation error:', err);
      return res.status(500).json({ error: 'Failed to create exam: ' + err.message });
    }
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
       
       // Get single admin result details
       if (path.startsWith('admin-results/')) {
         const attemptId = path.split('/')[1];
         const attempt = await database.collection('exam_attempts').findOne({ _id: new ObjectId(attemptId) });
         if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
         
         const responses = await database.collection('student_responses').aggregate([
           { $match: { attempt_id: new ObjectId(attemptId) } },
           { $lookup: { from: 'questions', localField: 'question_id', foreignField: '_id', as: 'question' } },
           { $unwind: '$question' },
           { $project: {
             question_id: '$question._id',
             question_text: '$question.question_text',
             image_path: '$question.image_path',
             options: '$question.options',
             correct_answer: '$question.correct_answer',
             selected_answer: '$selected_answer',
             is_correct: { $eq: ['$selected_answer', '$question.correct_answer'] }
           }}
         ]).toArray();
         
         const total = responses.length;
         const correct = responses.filter(r => r.is_correct).length;
         const percentage = total > 0 ? (correct / total) * 100 : 0;
         
         return res.status(200).json({
           attempt: {
             ...attempt,
             exam_name: attempt.exam_name || '',
             student_name: attempt.student_name || '',
             exam_type: attempt.exam_type || ''
           },
           responses,
           performance: {
             total_questions: total,
             correct_answers: correct,
             percentage
           }
         });
       }
       
       // Get exam attempts for a student
       if (path.startsWith('exam-attempts/student/')) {
         const studentId = path.split('/').pop();
         const attempts = await database.collection('exam_attempts').find({ student_id: new ObjectId(studentId) }).toArray();
         return res.status(200).json(attempts);
       }
       
        // Get single exam attempt details
        if (path.startsWith('exam-attempts/')) {
          const attemptId = path.split('/')[1];
          
          const responses = await database.collection('student_responses').aggregate([
            { $match: { attempt_id: new ObjectId(attemptId) } },
            { $lookup: { from: 'questions', localField: 'question_id', foreignField: '_id', as: 'question' } },
            { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
            { $project: {
              question_id: '$question._id',
              question_text: '$question.question_text',
              image_path: '$question.image_path',
              options: '$question.options',
              correct_option_label: '$question.correct_answer',
              correct_option_text: '$question.correct_answer',
              explanation_text: '$question.explanation',
              selected_answer: '$selected_answer',
              is_correct: { $eq: ['$selected_answer', '$question.correct_answer'] }
            }}
          ]).toArray();
          
          const attempt = await database.collection('exam_attempts').aggregate([
            { $match: { _id: new ObjectId(attemptId) } },
            { $lookup: { from: 'exams', localField: 'exam_id', foreignField: '_id', as: 'exam' } },
            { $lookup: { from: 'students', localField: 'student_id', foreignField: '_id', as: 'student' } },
            { $unwind: { path: '$exam', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
            { $project: {
              exam_name: '$exam.exam_name',
              exam_type: '$exam.exam_type',
              student_name: '$student.student_name',
              roll_no: '$student.roll_no',
              submitted_at: 1,
              attempt_status: 1,
              percentage: 1,
              result_status: 1,
              correct_answers: 1,
              total_questions: 1
            }}
          ]).toArray().then(r => r[0] || null);
          
          const total = responses.length;
          const correct = responses.filter(r => r.is_correct).length;
          const wrong = total - correct;
          const percentage = total > 0 ? (correct / total) * 100 : 0;
          
          return res.status(200).json({
            attempt: attempt || { exam_name: '', student_name: '', exam_type: '' },
            responses,
            performance: {
              total_questions: total,
              correct_answers: correct,
              wrong_answers: wrong,
              percentage,
              result_status: percentage >= 40 ? 'Pass' : 'Fail'
            }
          });
        }
       
       // Get available exams for student
       if (path.startsWith('student-exams/available/')) {
         const studentId = path.split('/').pop();
         const student = await database.collection('students').findOne({ _id: new ObjectId(studentId) });
         if (!student) return res.status(404).json({ error: 'Student not found' });
         
         const exams = await database.collection('exams').find({}).sort({ created_at: -1 }).toArray();
         return res.status(200).json({ available_exams: exams });
       }
       
       // Check exam access for student
       if (path.match(/^student-exams\/[^/]+\/check-access\/[^/]+$/)) {
         const parts = path.split('/');
         const examId = parts[1];
         const studentId = parts[3];
         
         const exam = await database.collection('exams').findOne({ _id: new ObjectId(examId) });
         if (!exam) return res.status(404).json({ error: 'Exam not found' });
         
         const student = await database.collection('students').findOne({ _id: new ObjectId(studentId) });
         if (!student) return res.status(404).json({ error: 'Student not found' });
         
         return res.status(200).json({ access_status: 'ELIGIBLE', exam });
       }
       
        // Get exam questions for student
        if (path.match(/^student-exams\/[^/]+\/questions\/[^/]+$/)) {
          const parts = path.split('/');
          const examId = parts[1];
          const studentId = parts[3];
          
          const exam = await database.collection('exams').findOne({ _id: new ObjectId(examId) });
          if (!exam) return res.status(404).json({ error: 'Exam not found' });
          
          const questions = await database.collection('questions').find({ exam_id: new ObjectId(examId) }).sort({ question_number: 1 }).toArray();
          
          // Group by section
          const questionsBySection = {};
          questions.forEach(q => {
            const section = q.section || 'General';
            if (!questionsBySection[section]) questionsBySection[section] = [];
            questionsBySection[section].push(q);
          });
          
          const sections = Object.keys(questionsBySection);
          
          return res.status(200).json({ 
            exam, 
            questions_by_section: questionsBySection,
            sections,
            total_questions: exam.total_questions || questions.length
          });
        }
       
       // Get next roll number
       if (path === 'students/next-roll-no') {
         const allStudents = await database.collection('students').find({}).sort({ roll_no: -1 }).toArray();
         let nextRoll = 1001;
         for (const s of allStudents) {
           const num = parseInt(s.roll_no);
           if (!isNaN(num) && num >= nextRoll) {
             nextRoll = num + 1;
           }
         }
         return res.status(200).json({ next_roll_no: nextRoll });
       }
       
       // Get students with results
       if (path === 'students/with-results') {
         const students = await database.collection('students').find({}).sort({ student_name: 1 }).toArray();
         return res.status(200).json(students);
       }
       
       // Toggle result published (GET fallback)
       if (path.startsWith('exams/') && path.endsWith('/publish-result')) {
         const id = path.split('/')[1];
         await database.collection('exams').updateOne(
           { _id: new ObjectId(id) },
           { $set: { result_published: true } }
         );
          return res.status(200).json({ success: true, result_published: true });
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
      
      // Get latest attempt for student+exam
      if (path === 'latest-attempt') {
        const { student_id, exam_id } = body;
        const attempt = await database.collection('exam_attempts').findOne(
          { student_id: new ObjectId(student_id), exam_id: new ObjectId(exam_id), is_latest: true }
        );
        return res.status(200).json(attempt || { error: 'No attempt found' });
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
      // Update admin profile
      if (path.startsWith('admin/update/')) {
        const adminId = path.split('/').pop();
        await database.collection('admin').updateOne(
          { _id: new ObjectId(adminId) },
          { $set: { admin_name: body.admin_name, email: body.email, mobile_no: body.mobile_no } }
        );
        return res.status(200).json({ message: 'Admin profile updated successfully' });
      }
      
      // Change admin password
      if (path.startsWith('admin/password/')) {
        const adminId = path.split('/').pop();
        const admin = await database.collection('admin').findOne({ _id: new ObjectId(adminId) });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        
        if (admin.password_hash !== body.oldPassword) {
          return res.status(400).json({ message: 'Old password is incorrect' });
        }
        
        await database.collection('admin').updateOne(
          { _id: new ObjectId(adminId) },
          { $set: { password_hash: body.newPassword } }
        );
        return res.status(200).json({ message: 'Password changed successfully' });
      }
      
      // Reset student password
      if (path.startsWith('students/reset-password/')) {
        const id = path.split('/').pop();
        await database.collection('students').updateOne(
          { _id: new ObjectId(id) },
          { $set: { password_hash: body.new_password } }
        );
        return res.status(200).json({ message: 'Password reset successfully' });
      }
      
      // Update student (students/update/{id} or students/{id})
      if (path.startsWith('students/update/') || path.startsWith('students/')) {
        const parts = path.split('/');
        const id = parts[parts.length - 1];
        await database.collection('students').updateOne(
          { _id: new ObjectId(id) },
          { $set: { student_name: body.student_name, batch_name: body.batch_name, mobile_no: body.mobile_no, email: body.email, exam_type: body.exam_type } }
        );
        return res.status(200).json({ message: 'Student updated successfully' });
      }
      
      // Update exam
      if (path.startsWith('exams/')) {
        const parts = path.split('/');
        const id = parts[1];
        const updateData = {
          exam_name: body.exam_name,
          exam_date: body.exam_date,
          exam_time: body.exam_time,
          duration_minutes: parseInt(body.duration_minutes),
          exam_status: body.exam_status,
          exam_type: body.exam_type,
          target_batch_name: body.target_batch_name,
          target_admission_year: body.target_admission_year ? parseInt(body.target_admission_year) : null
        };
        await database.collection('exams').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        return res.status(200).json({ message: 'Exam updated successfully' });
      }
      
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    if (req.method === 'DELETE') {
      // Delete student (students/delete/{id} or students/{id})
      if (path.startsWith('students/delete/') || path.startsWith('students/')) {
        const parts = path.split('/');
        const id = parts[parts.length - 1];
        await database.collection('students').deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ message: 'Student deleted successfully' });
      }
      
      // Delete exam
      if (path.startsWith('exams/')) {
        const id = path.split('/')[1];
        await database.collection('exams').deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ message: 'Exam deleted successfully' });
      }
      
      // Delete admin result
      if (path.startsWith('admin-results/')) {
        const attemptId = path.split('/')[1];
        await database.collection('exam_attempts').deleteOne({ _id: new ObjectId(attemptId) });
        await database.collection('student_responses').deleteMany({ attempt_id: new ObjectId(attemptId) });
        return res.status(200).json({ message: 'Result deleted successfully' });
      }
      
      // Toggle result published
      if (path.startsWith('exams/') && path.endsWith('/publish-result')) {
        const id = path.split('/')[1];
        await database.collection('exams').updateOne(
          { _id: new ObjectId(id) },
          { $set: { result_published: body.publish ?? true } }
        );
        return res.status(200).json({ success: true, result_published: body.publish ?? true });
      }
      
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
