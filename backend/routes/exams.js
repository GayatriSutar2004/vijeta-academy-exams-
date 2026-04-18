const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const mammoth = require('mammoth');
const fs = require('fs');
const EnhancedQuestionParser = require('../enhanced-question-parser');

const upload = multer({ dest: 'uploads/' });

function cleanupUploadedFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (cleanupError) {
    console.warn('Could not delete uploaded file:', filePath, cleanupError.message);
  }
}

// Get all exams with student counts
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT e.*, 
      (SELECT COUNT(*) FROM exam_students es WHERE es.exam_id = e.exam_id) as assigned_students
      FROM exams e
      ORDER BY e.created_at DESC
    `);
    res.json(results);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add new exam
router.post('/add', upload.single('file'), async (req, res) => {
  console.log("=== EXAM UPLOAD REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Uploaded file:", req.file);
  
  const {
    exam_name,
    duration_minutes,
    total_questions,
    exam_type,
    exam_date,
    exam_time,
    created_by,
    target_batch_name,
    target_admission_year
  } = req.body;
  const file = req.file;

  console.log("Extracted values:", {
    exam_name,
    duration_minutes,
    total_questions,
    exam_type,
    fileName: file?.originalname,
    fileSize: file?.size,
    filePath: file?.path
  });

  if(!exam_name || !duration_minutes || !total_questions || !file) {
    console.log("Validation failed - missing required fields");
    return res.status(400).json({ message: "Please fill all required fields and upload a file" });
  }

  try {
    // Map exam_type to exam_type_id
    const examTypeMapping = {
      'NDA': 3,
      'NEET': 5,
      'JEE': 5,
      'SSB': 1,
      'SSC': 2,
      'Police': 4,
      'Other': 5
    };
    
    const examTypeId = examTypeMapping[exam_type] || 5; // Default to 'Other' if not found
    
    // First, insert the exam
    const creatorId = Number(created_by) || 1;

    const [result] = await db.query(
      `INSERT INTO exams (exam_name, duration_minutes, total_questions, exam_type_id, exam_type, target_batch_name, target_admission_year, exam_date, exam_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [
        exam_name, 
        duration_minutes, 
        total_questions, 
        examTypeId, 
        exam_type || 'NDA', 
        target_batch_name || null,
        target_admission_year ? Number(target_admission_year) : null,
        exam_date || new Date().toISOString().split('T')[0], 
        exam_time || '09:00:00', 
        creatorId
      ]
    );
    const examId = result.insertId;

    // Now parse the file based on extension
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    let parsedData;

    if (fileExtension === 'docx' || fileExtension === 'doc') {
      // Parse Word document with enhanced parser
      const parser = new EnhancedQuestionParser();
      parsedData = await parser.parseWordDocument(file.path);
    } else if (fileExtension === 'txt') {
      // Parse text file with enhanced parser
      const parser = new EnhancedQuestionParser();
      const text = fs.readFileSync(file.path, 'utf8');
      parser.parseDocumentContent(text);
      parsedData = {
        sections: parser.sections,
        questions: parser.questions
      };
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload .docx, .doc, or .txt files." });
    }

    if (!parsedData.questions.length && (fileExtension === 'docx' || fileExtension === 'doc')) {
      console.log('Primary parse returned 0 questions. Running fallback parser on raw text.');
      const fallbackText = (await mammoth.extractRawText({ path: file.path })).value;
      const fallbackParser = new EnhancedQuestionParser();
      const fallbackQuestions = fallbackParser.parseAlternativeFormat(fallbackText)
        .map((question, index) => ({
          ...question,
          question_number: question.question_number || index + 1,
          section: 'General'
        }))
        .filter(question => question.options?.length > 0);

      parsedData = {
        sections: fallbackQuestions.length ? [{ name: 'General', questions: fallbackQuestions }] : [],
        questions: fallbackQuestions
      };
    }

    if (!parsedData.questions.length) {
      const previewText = fileExtension === 'txt'
        ? fs.readFileSync(file.path, 'utf8')
        : (await mammoth.extractRawText({ path: file.path })).value;

      cleanupUploadedFile(file.path);
      return res.status(400).json({
        error: 'No questions could be extracted from the uploaded file.',
        preview: previewText.substring(0, 400)
      });
    }

    await insertParsedQuestions(parsedData, examId, file.path, res, {
      examType: exam_type || 'NDA',
      targetBatchName: target_batch_name || '',
      targetAdmissionYear: target_admission_year || ''
    });
  } catch (err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

async function assignExamToEligibleStudents(examId, { examType, targetBatchName, targetAdmissionYear }) {
  try {
    // Build query based on what's provided
    let query = 'SELECT student_id FROM students WHERE 1=1';
    const params = [];

    // ALWAYS filter by exam type (required)
    if (examType) {
      query += ' AND exam_type = ?';
      params.push(examType);
    }

    // If batch specified, add to filter
    if (targetBatchName && targetBatchName.trim() !== '') {
      query += ' AND batch_name = ?';
      params.push(targetBatchName);
    }

    // If year specified, add to filter  
    if (targetAdmissionYear) {
      query += ' AND admission_year = ?';
      params.push(Number(targetAdmissionYear));
    }

    // Skip account_status filter if column doesn't exist
    // query += ' AND (account_status = "Active" OR account_status IS NULL OR account_status = "")';
    
    console.log('Assignment query:', query);
    console.log('Params:', params);
    
    const [students] = await db.query(query, params);

    console.log(`Found ${students.length} students matching: exam_type=${examType}, batch=${targetBatchName}, year=${targetAdmissionYear}`);

    let assignedCount = 0;
    for (const student of students) {
      try {
        await db.query(
          'INSERT IGNORE INTO exam_students (exam_id, student_id) VALUES (?, ?)',
          [examId, student.student_id]
        );
        assignedCount++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.error(`Failed to assign student ${student.student_id}:`, err.message);
        }
      }
    }

    return assignedCount;
  } catch (err) {
    console.error('Error in assignExamToEligibleStudents:', err.message);
    return 0;
  }
}

async function insertParsedQuestions(parsedData, examId, filePath, res, assignmentConfig) {
  try {
    console.log('=== INSERTING PARSED QUESTIONS ===');
    console.log('Sections:', parsedData.sections.length);
    console.log('Questions:', parsedData.questions.length);
    
    let insertedQuestions = 0;
    const insertedQuestionIds = [];
    
    for (const question of parsedData.questions) {
      try {
        // Insert the question
        const [questionResult] = await db.query(
          `INSERT INTO questions (exam_type_id, subject_id, question_text, marks, negative_marks, difficulty_level, explanation_text, created_by, section_name, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            1,
            1,
            question.question_text,
            1.00,
            0.00,
            'Medium',
            question.explanation || null,
            1,
            question.section || 'General',
            question.image_path || null
          ]
        );
        
        const questionId = questionResult.insertId;
        insertedQuestionIds.push(questionId);
        console.log('Inserted question ID:', questionId);
        
        // Insert options if they exist
        if (question.options && question.options.length > 0) {
          for (const option of question.options) {
            await db.query(
              `INSERT INTO question_options (question_id, option_label, option_text, is_correct) VALUES (?, ?, ?, ?)`,
              [
                questionId,
                option.label,
                option.text,
                option.label === question.correct_answer ? 1 : 0
              ]
            );
          }
          console.log('Inserted', question.options.length, 'options for question', questionId);
        }
        
        insertedQuestions++;
      } catch (questionError) {
        console.error('Error inserting individual question:', questionError);
        throw questionError;
      }
    }
    
    // Link questions to exam using exam_questions table
    if (insertedQuestionIds.length > 0) {
      try {
        // Link each inserted question directly to this exam
        for (let index = 0; index < insertedQuestionIds.length; index++) {
          const questionId = insertedQuestionIds[index];
          await db.query(
            'INSERT INTO exam_questions (exam_id, question_id, default_sequence) VALUES (?, ?, ?)',
            [examId, questionId, index + 1]
          );
        }
        
        console.log('Linked', insertedQuestionIds.length, 'questions to exam', examId);
      } catch (linkError) {
        console.error('Error linking questions to exam:', linkError);
        throw linkError;
      }
    }

    if (insertedQuestions === 0) {
      throw new Error('Questions were parsed but none were inserted into the database.');
    }

    const assignedStudents = await assignExamToEligibleStudents(examId, assignmentConfig);
    
    // Delete the uploaded file
    cleanupUploadedFile(filePath);
    
    res.json({ 
      message: `Exam created successfully with ${insertedQuestions} questions!`, 
      exam_id: examId,
      questions_inserted: insertedQuestions,
      sections_found: parsedData.sections.length,
      students_assigned: assignedStudents
    });
    
  } catch (err) {
    console.log("Error inserting parsed questions:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get individual exam
router.get('/:examId', async (req, res) => {
  const examId = req.params.examId;
  try {
    const [results] = await db.query("SELECT * FROM exams WHERE exam_id = ?", [examId]);
    if (results.length === 0) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(results[0]);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get questions for an exam
router.get('/:examId/questions', async (req, res) => {
  const examId = req.params.examId;
  console.log("Fetching questions for exam_id:", examId);
  try {
    // Get questions linked to this specific exam
    const [examQuestions] = await db.query(`
      SELECT q.* FROM questions q
      INNER JOIN exam_questions eq ON q.question_id = eq.question_id
      WHERE eq.exam_id = ?
      ORDER BY q.question_id
    `, [examId]);
    
    console.log("Found questions:", examQuestions.length);
    
    // Transform the data and fetch options for each question
    const transformedQuestions = [];
    
    for (const question of examQuestions) {
      // Get options for this question
      const [options] = await db.query(`
        SELECT option_label, option_text, is_correct 
        FROM question_options 
        WHERE question_id = ?
        ORDER BY option_label
      `, [question.question_id]);
      
      // Format options as array of strings
      const formattedOptions = options.map(opt => `${opt.option_label}) ${opt.option_text}`);
      
      // Find correct answer index
      const correctAnswerIndex = options.findIndex(opt => opt.is_correct === 1);
      
      transformedQuestions.push({
        question_id: question.question_id,
        question_text: question.question_text,
        options: JSON.stringify(formattedOptions),
        correct_answer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
        marks: question.marks,
        negative_marks: question.negative_marks,
        difficulty_level: question.difficulty_level,
        explanation: question.explanation_text,
        image_path: question.image_path || null
      });
    }
    
    console.log("Transformed questions with options:", transformedQuestions.length);
    res.json(transformedQuestions);
    
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Function to parse questions from Word document text
function parseQuestionsFromText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const questions = [];
  let currentQuestion = null;
  let options = [];
  let correctAnswer = null;
  
  for (let line of lines) {
    if (line.match(/^Question \d+:/i)) {
      // Save previous question if exists
      if (currentQuestion && options.length === 4 && correctAnswer !== null) {
        questions.push({
          question_text: currentQuestion,
          options: JSON.stringify(options),
          correct_answer: correctAnswer
        });
      }
      
      // Start new question
      currentQuestion = line.replace(/^Question \d+:\s*/i, '');
      options = [];
      correctAnswer = null;
    } else if (line.match(/^[A-D]\)/i)) {
      // Option line
      const optionText = line.replace(/^[A-D]\)\s*/i, '');
      options.push(optionText);
    } else if (line.match(/^Correct:/i)) {
      // Correct answer line
      const correctLetter = line.replace(/^Correct:\s*/i, '').toUpperCase();
      correctAnswer = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
    }
  }
  
  // Save last question
  if (currentQuestion && options.length === 4 && correctAnswer !== null) {
    questions.push({
      question_text: currentQuestion,
      options: JSON.stringify(options),
      correct_answer: correctAnswer
    });
  }
  
  return questions;
}

// Update exam
router.put('/:examId', async (req, res) => {
  const examId = req.params.examId;
  const { 
    exam_name, 
    exam_date, 
    exam_time, 
    duration_minutes, 
    exam_status,
    exam_type,
    target_batch_name,
    target_admission_year,
    reassign
  } = req.body;
  
  try {
    await db.query(
      `UPDATE exams SET 
        exam_name = ?, 
        exam_date = ?, 
        exam_time = ?, 
        duration_minutes = ?,
        exam_status = ?,
        exam_type = ?,
        target_batch_name = ?,
        target_admission_year = ?
      WHERE exam_id = ?`,
      [exam_name, exam_date, exam_time, duration_minutes, exam_status, exam_type, target_batch_name, target_admission_year, examId]
    );
    
    // Auto-assign students when exam is updated (unless explicitly disabled)
    const doReassign = reassign !== false;
    if (doReassign) {
      // Clear existing assignments and reassign based on new criteria
      await db.query('DELETE FROM exam_students WHERE exam_id = ?', [examId]);
      
      const assignmentConfig = {
        examType: exam_type,
        targetBatchName: target_batch_name,
        targetAdmissionYear: target_admission_year
      };
      
      const assignedStudents = await assignExamToEligibleStudents(examId, assignmentConfig);
      console.log(`Reassigned ${assignedStudents} students after exam update`);
    }
    
    res.json({ message: "Exam updated successfully" });
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
