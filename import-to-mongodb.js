const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const importToMongoDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'vijeta_db');
    
    // Read converted JSON
    const data = JSON.parse(fs.readFileSync('./converted-exam.json', 'utf8'));
    
    console.log(`\n=== IMPORTING: ${data.exam_name} ===`);
    
    // 1. Create exam
    const exam = {
      exam_name: data.exam_name,
      duration_minutes: data.duration_minutes || 60,
      total_questions: data.questions.length,
      exam_type: data.exam_type || 'NDA',
      exam_date: data.exam_date || new Date().toISOString().split('T')[0],
      exam_time: data.exam_time || '09:00:00',
      result_published: false,
      created_at: new Date()
    };
    
    const examResult = await db.collection('exams').insertOne(exam);
    const examId = examResult.insertedId;
    console.log(`✓ Exam created: ${examId}`);
    
    // 2. Import questions
    if (data.questions && data.questions.length > 0) {
      const questions = data.questions.map(q => ({
        exam_id: examId,
        question_text: q.question_text,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        section: q.section || 'General',
        question_number: q.question_number || 0,
        image_path: q.image_path || null,
        marks: q.marks || 1,
        created_at: new Date()
      }));
      
      await db.collection('questions').insertMany(questions);
      console.log(`✓ Imported ${questions.length} questions`);
    }
    
    // 3. Import images info (already in public/)
    if (data.images && data.images.length > 0) {
      console.log(`✓ Images (${data.images.length}) are in: /public/question-images/`);
    }
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Exam ID: ${examId}`);
    console.log('Total Questions:', data.questions.length);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
};

importToMongoDB();