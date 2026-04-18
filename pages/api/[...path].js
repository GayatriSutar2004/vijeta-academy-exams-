import { MongoClient, ObjectId } from 'mongodb';

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

export default async function handler(req, res) {
  const path = req.url?.replace('/api/', '').replace(/\?.*/, '') || '';
  const database = await getDb();
  
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
      
      // Admin Results - exam attempts with student and exam info
      if (path === 'admin-results') {
        const results = await database.collection('exam_attempts').aggregate([
          { $lookup: { from: 'students', localField: 'student_id', foreignField: '_id', as: 'student' } },
          { $lookup: { from: 'exams', localField: 'exam_id', foreignField: '_id', as: 'exam' } },
          { $unwind: '$student' },
          { $unwind: '$exam' },
          { $addFields: { student_name: '$student.student_name', roll_no: '$student.roll_no', exam_name: '$exam.exam_name' } },
          { $sort: { submitted_at: -1 } }
        ]).toArray();
        return res.status(200).json(results);
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
          created_at: new Date()
        };
        const result = await database.collection('exams').insertOne(newExam);
        return res.status(200).json({ message: 'Exam created', exam_id: result.insertedId });
      }
      
      // Submit exam attempt
      if (path === 'exam-attempts') {
        const { student_id, exam_id, answers } = body;
        
        const attempt = {
          exam_id: new ObjectId(exam_id),
          student_id: new ObjectId(student_id),
          start_time: new Date(),
          end_time: new Date(),
          submitted_at: new Date(),
          attempt_status: 'Submitted'
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
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}