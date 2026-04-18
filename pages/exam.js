import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function ExamPage() {
  const router = useRouter();
  const { examId } = router.query;

  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(7200); // 2 hours for CET
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examDetails, setExamDetails] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    if (!examId) return;

    const fetchExamData = async () => {
      try {
        // Fetch exam details
        const examRes = await fetch(`https://vijeta-api.onrender.com/api/exams/${examId}`);
        const examData = await examRes.json();
        setExamDetails(examData);

        // Fetch questions
        const res = await fetch(`https://vijeta-api.onrender.com/api/exams/${examId}/questions`);
        const data = await res.json();
        setQuestions(data);
        setAnswers(Array(data.length).fill(null));
        setTimeLeft(examData.duration_minutes * 60 || 7200);
        setLoading(false);
      } catch (err) {
        console.log(err);
        alert("Error loading exam");
      }
    };

    fetchExamData();
  }, [examId]);

  // TIMER
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (t) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOption = (index) => {
    const newAns = [...answers];
    newAns[currentQ] = index;
    setAnswers(newAns);
  };

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    
    // Get student data from localStorage
    const storedStudentData = localStorage.getItem('student');
    if (!storedStudentData) {
      alert("Session expired. Please login again.");
      router.push('/student-login');
      return;
    }
    
    const student = JSON.parse(storedStudentData);
    const studentId = student.student_id;
    
    // Convert array of answers to object format expected by backend
    const answersObj = {};
    questions.forEach((q, i) => {
      if (answers[i] !== null) {
        // Map index back to option label (A, B, C, D)
        const labels = ['A', 'B', 'C', 'D'];
        answersObj[q.question_id] = labels[answers[i]];
      }
    });

    try {
      setLoading(true);
      const totalDuration = examDetails.duration_minutes * 60;
      const timeTaken = totalDuration - timeLeft;

      const res = await fetch("https://vijeta-api.onrender.com/api/exam-attempts", {
        method: "POST",
        headers: { 
          "Accept": "application/json",
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          student_id: studentId,
          exam_id: examId,
          answers: answersObj,
          time_taken: Math.max(0, timeTaken)
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit exam");
      }

      const result = await res.json();
      setSubmitted(true);
      setLoading(false);
      
      // Redirect to result page
      router.push(`/exam-result?attemptId=${result.attempt_id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setLoading(false);
      alert("Error submitting exam: " + err.message);
    }
  };

  const getAnsweredCount = () => {
    return answers.filter(ans => ans !== null).length;
  };

  const getNotAnsweredCount = () => {
    return answers.filter(ans => ans === null).length;
  };

  const getQuestionButtonStyle = (index) => {
    const isAnswered = answers[index] !== null;
    const isCurrent = index === currentQ;
    const isMarked = false; // Can add marked for review feature
    
    let backgroundColor = "#f8f9fa";
    let border = "2px solid #dee2e6";
    
    if (isCurrent) {
      backgroundColor = "#007bff";
      border = "2px solid #0056b3";
    } else if (isAnswered) {
      backgroundColor = "#28a745";
      border = "2px solid #1e7e34";
    } else if (isMarked) {
      backgroundColor = "#ffc107";
      border = "2px solid #d39e00";
    }
    
    return {
      padding: "8px",
      margin: "2px",
      backgroundColor,
      border,
      color: isCurrent ? "white" : (isAnswered ? "white" : "#212529"),
      cursor: "pointer",
      borderRadius: "4px",
      fontWeight: isCurrent ? "bold" : "normal",
      minWidth: "35px",
      textAlign: "center"
    };
  };

  if (loading) return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ fontSize: "24px", marginBottom: "20px" }}>Loading Exam...</div>
      <div style={{ 
        width: "50px", 
        height: "50px", 
        border: "5px solid #f3f3f3", 
        borderTop: "5px solid #007bff", 
        borderRadius: "50%", 
        animation: "spin 1s linear infinite" 
      }}></div>
    </div>
  );

  if (questions.length === 0) return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <h2>No questions found for this exam</h2>
        <button 
          onClick={() => router.push("/")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "20px"
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ 
      display: "flex", 
      height: "100vh", 
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f8f9fa"
    }}>
      {/* LEFT SIDE - Question Area */}
      <div style={{ 
        flex: 3, 
        padding: "20px", 
        backgroundColor: "white",
        boxShadow: "2px 0 5px rgba(0,0,0,0.1)"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "10px",
          borderBottom: "2px solid #dee2e6"
        }}>
          <div>
            <h2 style={{ margin: 0, color: "#212529" }}>
              {examDetails?.exam_name || "Mock Test"}
            </h2>
            <p style={{ margin: "5px 0", color: "#6c757d" }}>
              Question {currentQ + 1} of {questions.length}
            </p>
          </div>
          <div style={{
            backgroundColor: timeLeft < 600 ? "#dc3545" : "#28a745",
            color: "white",
            padding: "10px 20px",
            borderRadius: "20px",
            fontSize: "18px",
            fontWeight: "bold",
            minWidth: "120px",
            textAlign: "center"
          }}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Question */}
        <div style={{
          backgroundColor: "#f8f9fa",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #dee2e6"
        }}>
          <h3 style={{ 
            margin: "0 0 15px 0", 
            color: "#212529",
            fontSize: "18px"
          }}>
            Q{currentQ + 1}. {questions[currentQ].question_text}
          </h3>
          {questions[currentQ].image_path && (
            <div style={{ marginTop: "15px", textAlign: "center" }}>
              <img 
                src={questions[currentQ].image_path} 
                alt="Question illustration" 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "400px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }} 
              />
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ marginBottom: "30px" }}>
          {JSON.parse(questions[currentQ].options).map((opt, i) => (
            <div 
              key={i} 
              style={{
                backgroundColor: answers[currentQ] === i ? "#e3f2fd" : "white",
                border: answers[currentQ] === i ? "2px solid #2196f3" : "1px solid #dee2e6",
                borderRadius: "8px",
                padding: "15px",
                margin: "10px 0",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onClick={() => handleOption(i)}
              onMouseEnter={(e) => {
                if (answers[currentQ] !== i) {
                  e.target.style.backgroundColor = "#f8f9fa";
                }
              }}
              onMouseLeave={(e) => {
                if (answers[currentQ] !== i) {
                  e.target.style.backgroundColor = "white";
                }
              }}
            >
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                cursor: "pointer",
                margin: 0,
                fontSize: "16px"
              }}>
                <input
                  type="radio"
                  checked={answers[currentQ] === i}
                  onChange={() => handleOption(i)}
                  style={{ marginRight: "12px", transform: "scale(1.2)" }}
                />
                <span style={{ flex: 1 }}>
                  <strong>{String.fromCharCode(65 + i)}.</strong> {opt}
                </span>
              </label>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "20px",
          borderTop: "1px solid #dee2e6"
        }}>
          <button
            onClick={() => setCurrentQ(currentQ - 1)}
            disabled={currentQ === 0}
            style={{
              padding: "10px 20px",
              backgroundColor: currentQ === 0 ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: currentQ === 0 ? "not-allowed" : "pointer",
              fontSize: "16px"
            }}
          >
            Previous
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ 
              padding: "5px 10px", 
              backgroundColor: "#28a745", 
              color: "white", 
              borderRadius: "15px",
              fontSize: "14px"
            }}>
              Answered: {getAnsweredCount()}
            </span>
            <span style={{ 
              padding: "5px 10px", 
              backgroundColor: "#dc3545", 
              color: "white", 
              borderRadius: "15px",
              fontSize: "14px"
            }}>
              Not Answered: {getNotAnsweredCount()}
            </span>
          </div>

          {currentQ === questions.length - 1 ? (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold"
              }}
            >
              Submit Test
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ(currentQ + 1)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Question Palette */}
      <div style={{
        flex: 1,
        backgroundColor: "#f8f9fa",
        padding: "20px",
        borderLeft: "1px solid #dee2e6",
        overflowY: "auto"
      }}>
        <h3 style={{ margin: "0 0 20px 0", color: "#212529", textAlign: "center" }}>
          Question Palette
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "5px",
          marginBottom: "30px"
        }}>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              style={getQuestionButtonStyle(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{
          backgroundColor: "white",
          padding: "15px",
          borderRadius: "8px",
          border: "1px solid #dee2e6"
        }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#212529" }}>Legend</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "20px",
                height: "20px",
                backgroundColor: "#007bff",
                border: "2px solid #0056b3",
                borderRadius: "4px"
              }}></div>
              <span style={{ fontSize: "14px" }}>Current Question</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "20px",
                height: "20px",
                backgroundColor: "#28a745",
                border: "2px solid #1e7e34",
                borderRadius: "4px"
              }}></div>
              <span style={{ fontSize: "14px" }}>Answered</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "20px",
                height: "20px",
                backgroundColor: "#f8f9fa",
                border: "2px solid #dee2e6",
                borderRadius: "4px"
              }}></div>
              <span style={{ fontSize: "14px" }}>Not Answered</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          backgroundColor: "white",
          padding: "15px",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          marginTop: "20px"
        }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#212529" }}>Instructions</h4>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#6c757d" }}>
            <li>Click on question number to navigate</li>
            <li>Select option to mark answer</li>
            <li>Blue indicates current question</li>
            <li>Green indicates answered</li>
            <li>Gray indicates not answered</li>
            <li>Submit when you have completed all questions</li>
          </ul>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "8px",
            textAlign: "center",
            maxWidth: "400px",
            border: "1px solid #dee2e6"
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#212529" }}>
              Submit Test Confirmation
            </h3>
            <p style={{ margin: "0 0 10px 0", color: "#6c757d" }}>
              Answered: {getAnsweredCount()}/{questions.length}
            </p>
            <p style={{ margin: "0 0 20px 0", color: "#dc3545" }}>
              Not Answered: {getNotAnsweredCount()}
            </p>
            <p style={{ margin: "0 0 20px 0", color: "#6c757d" }}>
              Are you sure you want to submit the test? You cannot change your answers after submission.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {submitted && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "8px",
            textAlign: "center",
            maxWidth: "400px",
            border: "1px solid #dee2e6"
          }}>
            <div style={{
              width: "60px",
              height: "60px",
              backgroundColor: "#28a745",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 20px auto"
            }}>
              <span style={{ color: "white", fontSize: "30px" }}>?</span>
            </div>
            <h3 style={{ margin: "0 0 15px 0", color: "#212529" }}>
              Test Submitted Successfully!
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "#6c757d" }}>
              Your test has been submitted. Contact the administrator for results.
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                padding: "12px 30px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

