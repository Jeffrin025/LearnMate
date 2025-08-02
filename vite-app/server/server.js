// import express from 'express';
// import cors from 'cors';
// import pg from 'pg';
// import bcrypt from 'bcrypt';
// import multer from 'multer';

// const app = express();
// const port = 5000;
// let attend =""
// app.use(cors());
// app.use(express.json());


// const pool = new pg.Pool({
//     user: 'postgres', 
//     host: 'localhost',
//     database: 'jaff', 
//     password: 'root', 
//     port: 5432,
// });

// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// const lastUpdateTimes = {}; 

// const ONE_MINUTE = 15 * 1000;; 


// app.post("/api/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const result = await pool.query(
//       "SELECT * FROM userLogin WHERE email = $1",
//       [email]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     const user = result.rows[0];

//     // 🔐 Compare entered password with hashed password from DB
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Incorrect password" });
//     }

//     // ✅ Successful login
//     return res.status(200).json({ role: user.role, username: user.username });
//   } catch (err) {
//     console.error("Login error", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// app.post('/getStudentDetails', async (req, res) => {
//     const name = req.body.name.trim(); 
//     let names;
//     console.log(name);
    
//     if (name === "Jeffrin.") {
//         names = "jeffrin"; 
//     } else {
//         names = "Prrapti"; 
//     }
//     console.log(names);
//     console.log('Request body:', req.body);

//     const currentTime = Date.now(); 

//     try {
       
//         if (lastUpdateTimes[names]) {
//             const lastUpdateTime = lastUpdateTimes[names];
            

            
//             if (currentTime - lastUpdateTime < ONE_MINUTE) {
//                 console.log('Attendance count not updated; last update was within 1 minute');
//                 attend = "already marked"
//             } else {
                
//                 const updateQuery = 'UPDATE students SET attendance_count = attendance_count + 1 WHERE name = $1';
//                 attend = "attendace marked"
//                 await pool.query(updateQuery, [names]); 
//                 lastUpdateTimes[names] = currentTime; 
//                 console.log('Attendance count updated for', names);
//             }
//         } else {
            
//             const updateQuery = 'UPDATE students SET attendance_count = attendance_count + 1 WHERE name = $1';
//             attend = "attendace marked"
//             await pool.query(updateQuery, [names]); 
//             lastUpdateTimes[names] = currentTime; 
//             console.log('Attendance count updated for', names);
//         }

   
//         const selectQuery = 'SELECT * FROM students WHERE name = $1'; 
//         const result = await pool.query(selectQuery, [names]);
//         console.log('Query result:', result.rows);

//         if (result.rows.length > 0) {
//             console.log('Student found:', result.rows[0]);
//             console.log(attend)
//             res.json({
//                 student: result.rows[0],
//                 attend: attend
//             });
//         } else {
//             res.status(404).json({ error: 'Student not found' });
//         }
//     } catch (error) {
//         console.error('Database query error:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.listen(port, () => {
//     console.log(`Second backend is running on http://localhost:${port}`);
// });



import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import multer from 'multer';
import axios from 'axios';


const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
    user: 'postgres', 
    host: 'localhost',
    database: 'jaff', 
    password: 'root', 
    port: 5432,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usersLogin WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    return res.status(200).json({ 
      role: user.role, 
      username: user.username,
      userId: user.id 
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
});



app.get("/api/students/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;
    const result = await pool.query(
      "SELECT id, username, email FROM usersLogin WHERE staff_id = $1 AND role = 'student'",
      [staffId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching students", err);
    res.status(500).json({ message: "Server error" });
  }
});


app.post("/api/assignments", upload.single('pdf'), async (req, res) => {
  try {
    const { title, description, staffId } = req.body;
    const pdfData = req.file.buffer;
    const pdfName = req.file.originalname;

    const staffCheck = await pool.query(
      "SELECT id FROM userslogin WHERE id = $1 AND role = 'staff'",
      [staffId]
    );
    
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid staff member" });
    }

    const assignmentResult = await pool.query(
      "INSERT INTO assignments (title, description, pdf_data, pdf_name, staff_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [title, description, pdfData, pdfName, staffId]
    );
    
    const assignmentId = assignmentResult.rows[0].id;

    // Get ONLY students assigned to this specific staff
    const students = await pool.query(
      "SELECT id FROM userslogin WHERE staff_id = $1 AND role = 'student'",
      [staffId]
    );

    // Assign to each of these students
    for (const student of students.rows) {
      await pool.query(
        "INSERT INTO student_assignments (assignment_id, student_id) VALUES ($1, $2)",
        [assignmentId, student.id]
      );
    }

    res.status(201).json({ 
      message: "Assignment created and distributed successfully",
      assignedStudents: students.rows.length
    });
  } catch (err) {
    console.error("Error creating assignment", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Get assignments for staff
app.get("/api/assignments/staff/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;
    const result = await pool.query(
      "SELECT id, title, description, created_at FROM assignments WHERE staff_id = $1 ORDER BY created_at DESC",
      [staffId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching assignments", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get assignments for student
// In your Node.js backend (server.js or similar)
app.get("/api/assignments/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT a.id, a.title, a.description, a.created_at, 
       sa.submitted, sa.grade, sa.feedback, sa.submitted_at,
       sa.submission_name
       FROM assignments a
       JOIN student_assignments sa ON a.id = sa.assignment_id
       WHERE sa.student_id = $1
       ORDER BY a.created_at DESC`,
      [studentId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching student assignments", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit assignment to Flask endpoint for grading
app.post("/api/assignments/:id/submit-grade", async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, grade, feedback } = req.body;

    // Update the grade in our database
    await pool.query(
      `UPDATE student_assignments 
       SET grade = $1, feedback = $2, graded_at = NOW()
       WHERE assignment_id = $3 AND student_id = $4`,
      [grade, feedback, id, studentId]
    );

    res.status(200).json({ message: "Grade updated successfully" });
  } catch (err) {
    console.error("Error updating grade", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Download assignment PDF
app.get("/api/assignments/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT pdf_data, pdf_name FROM assignments WHERE id = $1",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const { pdf_data, pdf_name } = result.rows[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${pdf_name}`);
    res.send(pdf_data);
  } catch (err) {
    console.error("Error downloading assignment", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/assignments/:id/submit", upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const pdfData = req.file.buffer;
    const pdfName = req.file.originalname;

    await pool.query(
      `UPDATE student_assignments 
       SET submitted = TRUE, 
           submission_data = $1, 
           submission_name = $2, 
           submitted_at = NOW()
       WHERE assignment_id = $3 AND student_id = $4`,
      [pdfData, pdfName, id, studentId]
    );

    res.status(200).json({ message: "Assignment submitted successfully" });
  } catch (err) {
    console.error("Error submitting assignment", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/assignments/:id/submissions", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id as student_id, u.username, u.email, 
       sa.submitted, sa.submitted_at, sa.grade, sa.feedback
       FROM student_assignments sa
       JOIN usersLogin u ON sa.student_id = u.id
       WHERE sa.assignment_id = $1`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching submissions", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Grade assignment (staff)
app.post("/api/assignments/:id/grade", async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, grade, feedback } = req.body;

    await pool.query(
      `UPDATE student_assignments 
       SET grade = $1, feedback = $2
       WHERE assignment_id = $3 AND student_id = $4`,
      [grade, feedback, id, studentId]
    );

    res.status(200).json({ message: "Grade submitted successfully" });
  } catch (err) {
    console.error("Error grading assignment", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/submissions/:assignmentId/:studentId/pdf", async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;
    const result = await pool.query(
      "SELECT submission_data, submission_name FROM student_assignments WHERE assignment_id = $1 AND student_id = $2",
      [assignmentId, studentId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].submission_data) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const { submission_data, submission_name } = result.rows[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${submission_name}`);
    res.send(submission_data);
  } catch (err) {
    console.error("Error downloading submission", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get assignment metadata (title, description) without the PDF data
app.get("/api/assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id, title, description, created_at FROM assignments WHERE id = $1", // Added created_at for consistency
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching assignment", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Test Creation and Management
app.post("/api/tests", async (req, res) => {
  try {
    const { title, description, testType, topic, totalMarks, durationMinutes, deadline, staffId } = req.body;

    const result = await pool.query(
      `INSERT INTO tests 
       (title, description, test_type, topic, total_marks, duration_minutes, deadline, staff_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [title, description, testType, topic, totalMarks, durationMinutes, deadline, staffId]
    );

    res.status(201).json({ 
      message: "Test created successfully",
      testId: result.rows[0].id
    });
  } catch (err) {
    console.error("Error creating test", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate questions using AI
app.post("/api/tests/:id/generate-questions", async (req, res) => {
  try {
    const { id } = req.params;
    const { numQuestions, difficulty } = req.body;

    // Get test details
    const testResult = await pool.query(
      "SELECT topic, test_type FROM tests WHERE id = $1",
      [id]
    );
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    const { topic, test_type } = testResult.rows[0];

    // Call Flask service to generate questions
    const flaskResponse = await axios.post(
      "http://localhost:5001/generate-questions",
      {
        topic,
        testType: test_type,
        numQuestions,
        difficulty
      }
    );

    // Save generated questions
    for (const question of flaskResponse.data.questions) {
      await pool.query(
        `INSERT INTO test_questions 
         (test_id, question_text, question_type, marks, options, correct_answer)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, question.question_text, question.question_type, question.marks, 
         question.options, question.correct_answer]
      );
    }

    res.status(201).json({ 
      message: "Questions generated successfully",
      count: flaskResponse.data.questions.length
    });
  } catch (err) {
    console.error("Error generating questions", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Publish test
app.post("/api/tests/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    // Verify staff owns the test
    const checkResult = await pool.query(
      "SELECT id FROM tests WHERE id = $1 AND staff_id = $2",
      [id, staffId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await pool.query(
      "UPDATE tests SET is_published = TRUE WHERE id = $1",
      [id]
    );

    // Assign to students
    const students = await pool.query(
      "SELECT id FROM userslogin WHERE staff_id = $1 AND role = 'student'",
      [staffId]
    );

    for (const student of students.rows) {
      await pool.query(
        "INSERT INTO student_test_attempts (test_id, student_id) VALUES ($1, $2)",
        [id, student.id]
      );
    }

    res.status(200).json({ 
      message: "Test published successfully",
      assignedStudents: students.rows.length
    });
  } catch (err) {
    console.error("Error publishing test", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get tests for staff
app.get("/api/tests/staff/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;
    const result = await pool.query(
      "SELECT id, title, topic, test_type, total_marks, deadline, is_published FROM tests WHERE staff_id = $1 ORDER BY created_at DESC",
      [staffId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching tests", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get test details
app.get("/api/tests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const testResult = await pool.query(
      "SELECT * FROM tests WHERE id = $1",
      [id]
    );
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    const questionsResult = await pool.query(
      "SELECT id, question_text, question_type, marks, options FROM test_questions WHERE test_id = $1",
      [id]
    );

    res.status(200).json({
      test: testResult.rows[0],
      questions: questionsResult.rows
    });
  } catch (err) {
    console.error("Error fetching test", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get tests for student
app.get("/api/tests/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT t.id, t.title, t.topic, t.test_type, t.total_marks, t.duration_minutes, t.deadline,
       sta.started_at, sta.submitted_at, sta.is_submitted, sta.total_marks_obtained
       FROM tests t
       JOIN student_test_attempts sta ON t.id = sta.test_id
       WHERE sta.student_id = $1
       ORDER BY t.deadline ASC`,
      [studentId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching student tests", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start test attempt
// Start test attempt
app.post("/api/test-attempts/:id/start", async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    
    // Check if attempt already exists
    const existingAttempt = await pool.query(
      `SELECT id FROM student_test_attempts 
       WHERE test_id = $1 AND student_id = $2`,
      [id, studentId]
    );
    
    let attemptId;
    if (existingAttempt.rows.length > 0) {
      attemptId = existingAttempt.rows[0].id;
    } else {
      // Create new attempt
      const result = await pool.query(
        `INSERT INTO student_test_attempts (test_id, student_id)
         VALUES ($1, $2) RETURNING id`,
        [id, studentId]
      );
      attemptId = result.rows[0].id;
    }
    
    res.status(200).json({ 
      message: "Test started",
      attemptId
    });
  } catch (err) {
    console.error("Error starting test", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get test with questions
app.get("/api/tests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const testResult = await pool.query(
      "SELECT * FROM tests WHERE id = $1",
      [id]
    );
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    const questionsResult = await pool.query(
      "SELECT id, question_text, question_type, marks, options, correct_answer FROM test_questions WHERE test_id = $1",
      [id]
    );

    res.status(200).json({
      test: testResult.rows[0],
      questions: questionsResult.rows
    });
  } catch (err) {
    console.error("Error fetching test", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Submit test answers
// Modify your existing test submission endpoint
// Update your test submission endpoint in server.js
app.post("/api/test-attempts/:id/submit", async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, answers } = req.body;

    // Start transaction
    await pool.query('BEGIN');

    // 1. Save all answers
    for (const answer of answers) {
      await pool.query(
        `INSERT INTO student_answers 
         (attempt_id, question_id, answer_text)
         VALUES ($1, $2, $3)`,
        [id, answer.questionId, answer.answerText]
      );
    }

    // 2. Mark attempt as submitted
    await pool.query(
      `UPDATE student_test_attempts 
       SET submitted_at = NOW(), is_submitted = TRUE
       WHERE id = $1`,
      [id]
    );

    // 3. Get test type and questions
    const testResult = await pool.query(
      `SELECT t.test_type, 
       (SELECT COUNT(*) FROM test_questions tq 
        JOIN student_answers sa ON tq.id = sa.question_id
        WHERE sa.attempt_id = $1 AND tq.question_type = 'written') AS written_count
       FROM tests t
       JOIN student_test_attempts sta ON t.id = sta.test_id
       WHERE sta.id = $1`,
      [id]
    );

    if (testResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: "Test attempt not found" });
    }

    const testType = testResult.rows[0].test_type;
    const hasWrittenQuestions = testResult.rows[0].written_count > 0;

    // 4. For MCQ tests, grade immediately
    if (testType === 'mcq' || !hasWrittenQuestions) {
      // Grade MCQ answers
      await pool.query(
        `UPDATE student_answers sa
         SET marks_awarded = tq.marks * (CASE WHEN sa.answer_text = tq.correct_answer THEN 1 ELSE 0 END),
             feedback = CASE WHEN sa.answer_text = tq.correct_answer THEN 'Correct' ELSE 'Incorrect' END
         FROM test_questions tq
         WHERE sa.attempt_id = $1 AND sa.question_id = tq.id`,
        [id]
      );

      // Calculate total marks
      const totalResult = await pool.query(
        `SELECT COALESCE(SUM(marks_awarded), 0) AS total
         FROM student_answers
         WHERE attempt_id = $1`,
        [id]
      );

      await pool.query(
        `UPDATE student_test_attempts
         SET total_marks_obtained = $1
         WHERE id = $2`,
        [parseFloat(totalResult.rows[0].total), id]
      );
    }

    // Commit transaction
    await pool.query('COMMIT');

    // 5. For written tests, initiate async grading
    if (hasWrittenQuestions) {
      // Call Flask grading service asynchronously
      axios.post("http://localhost:5001/grade-written-test", {
        attemptId: id
      }).catch(err => {
        console.error("Error calling grading service:", err);
      });
    }

    res.status(200).json({ 
      message: "Test submitted successfully",
      requiresGrading: hasWrittenQuestions
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Error submitting test", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Get test results
app.get("/api/test-attempts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const attemptResult = await pool.query(
      `SELECT sta.*, t.title, t.topic, t.total_marks
       FROM student_test_attempts sta
       JOIN tests t ON sta.test_id = t.id
       WHERE sta.id = $1`,
      [id]
    );
    
    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ message: "Test attempt not found" });
    }

    const answersResult = await pool.query(
      `SELECT sa.*, tq.question_text, tq.question_type, tq.marks
       FROM student_answers sa
       JOIN test_questions tq ON sa.question_id = tq.id
       WHERE sa.attempt_id = $1`,
      [id]
    );

    res.status(200).json({
      attempt: attemptResult.rows[0],
      answers: answersResult.rows
    });
  } catch (err) {
    console.error("Error fetching test results", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get questions for grading
app.get("/api/test-attempts/:id/questions-for-grading", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        tq.id AS question_id,
        tq.question_text,
        tq.question_type,
        tq.marks AS max_marks,
        sa.answer_text,
        t.title AS test_title
       FROM student_answers sa
       JOIN test_questions tq ON sa.question_id = tq.id
       JOIN tests t ON tq.test_id = t.id
       JOIN student_test_attempts sta ON sa.attempt_id = sta.id
       WHERE sa.attempt_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No answers found for this attempt" });
    }

    res.status(200).json({
      test_title: result.rows[0].test_title,
      answers: result.rows.map(row => ({
        question_id: row.question_id,
        question_text: row.question_text,
        question_type: row.question_type,
        answer_text: row.answer_text,
        max_marks: row.max_marks
      }))
    });
  } catch (err) {
    console.error("Error fetching answers for grading", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update grades after grading
app.post("/api/test-attempts/:id/update-grades", async (req, res) => {
  try {
    const { id } = req.params;
    const { grades } = req.body;

    await pool.query('BEGIN');

    // Update each answer
    for (const grade of grades) {
      await pool.query(
        `UPDATE student_answers
         SET marks_awarded = $1, feedback = $2
         WHERE attempt_id = $3 AND question_id = $4`,
        [grade.marks_awarded, grade.feedback, id, grade.question_id]
      );
    }

    // Calculate total marks
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(marks_awarded), 0) AS total
       FROM student_answers
       WHERE attempt_id = $1`,
      [id]
    );

    // Update attempt with total marks
    await pool.query(
      `UPDATE student_test_attempts
       SET total_marks_obtained = $1
       WHERE id = $2`,
      [parseFloat(totalResult.rows[0].total), id]
    );

    await pool.query('COMMIT');

    res.status(200).json({ 
      message: "Grades updated successfully",
      total_marks: parseFloat(totalResult.rows[0].total)
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Error updating grades", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get test questions for grading
app.get("/api/test-attempts/:id/questions-for-grading", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        tq.id AS question_id,
        tq.question_text,
        tq.question_type,
        tq.marks AS max_marks,
        sa.answer_text,
        t.title AS test_title
       FROM student_answers sa
       JOIN test_questions tq ON sa.question_id = tq.id
       JOIN tests t ON tq.test_id = t.id
       WHERE sa.attempt_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No answers found for this attempt" });
    }

    res.status(200).json({
      test_title: result.rows[0].test_title,
      answers: result.rows.map(row => ({
        question_id: row.question_id,
        question_text: row.question_text,
        question_type: row.question_type,
        answer_text: row.answer_text,
        max_marks: row.max_marks
      }))
    });
  } catch (err) {
    console.error("Error fetching answers for grading", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update test grades after grading
app.post("/api/test-attempts/:id/update-grades", async (req, res) => {
  try {
    const { id } = req.params;
    const { grades } = req.body;

    // Start transaction
    await pool.query('BEGIN');

    // Update each answer
    for (const grade of grades) {
      await pool.query(
        `UPDATE student_answers
         SET marks_awarded = $1, feedback = $2
         WHERE attempt_id = $3 AND question_id = $4`,
        [grade.marks_awarded, grade.feedback, id, grade.question_id]
      );
    }

    // Calculate total marks
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(marks_awarded), 0) AS total
       FROM student_answers
       WHERE attempt_id = $1`,
      [id]
    );

    const totalMarks = parseFloat(totalResult.rows[0].total);

  
    await pool.query(
      `UPDATE student_test_attempts
       SET total_marks_obtained = $1
       WHERE id = $2`,
      [totalMarks, id]
    );

  
    await pool.query('COMMIT');

    res.status(200).json({ 
      message: "Grades updated successfully",
      total_marks: totalMarks
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Error updating grades", err);
    res.status(500).json({ message: "Server error" });
  }
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

