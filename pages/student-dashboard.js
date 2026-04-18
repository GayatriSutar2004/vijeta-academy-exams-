import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Login.module.css";

export default function StudentDashboard() {
  const router = useRouter();
  const [studentData, setStudentData] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [examTab, setExamTab] = useState("available"); // available, attempted, upcoming

  useEffect(() => {
    // Get student data from localStorage
    const student = JSON.parse(localStorage.getItem('student'));
    if (!student) {
      router.push('/student-login');
      return;
    }
    setStudentData(student);
    fetchExams(student.student_id);
  }, []);

  const fetchExams = async (studentId) => {
    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/student-exams/available/${studentId}`);
      const data = await res.json();
      
      // Fetch attempted exams to mark status
      const attemptRes = await fetch(`https://vijeta-api.onrender.com/api/exam-attempts/student/${studentId}`);
      const attemptData = await attemptRes.json();
      const attemptedExamIds = Array.isArray(attemptData) ? attemptData.map(a => a.exam_id) : [];

      const enrichedExams = (data.available_exams || []).map(exam => {
        if (attemptedExamIds.includes(exam.exam_id)) {
          return { ...exam, exam_status: 'Completed' };
        }
        // If the exam date is in the future, mark as Scheduled
        const examDate = new Date(exam.exam_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (examDate > today) {
          return { ...exam, exam_status: 'Scheduled' };
        }
        return { ...exam, exam_status: exam.exam_status || 'Available' };
      });

      setExams(enrichedExams);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching exams:', err);
      setLoading(false);
    }
  };

  const handleExamClick = (examId) => {
    router.push(`/student-exam?examId=${examId}`);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem('student');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loginBox}>
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2>Vijeta Foundation - Student Portal</h2>
        <div className={styles.profileInfo}>
          <span>{studentData?.student_name}</span>
          <button onClick={handleLogout} className={`${styles.button} ${styles.logoutBtn}`}>Logout</button>
        </div>
      </div>

      <div className={styles.main}>
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <p className={activeMenu==="dashboard"?styles.active:""} onClick={()=>setActiveMenu("dashboard")}>Dashboard</p>
          <p className={activeMenu==="exams"?styles.active:""} onClick={()=>setActiveMenu("exams")}>My Exams</p>
          <p className={activeMenu==="results"?styles.active:""} onClick={()=>setActiveMenu("results")}>Results</p>
          <p className={activeMenu==="profile"?styles.active:""} onClick={()=>setActiveMenu("profile")}>Profile</p>
        </div>

        <div className={styles.content}>
          {/* DASHBOARD */}
          {activeMenu === "dashboard" && (
            <>
              <h2 style={{ marginBottom: "25px" }}>Welcome, {studentData?.student_name}!</h2>
              
              <div className={styles.card}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <p><strong>Batch:</strong> {studentData?.batch_name}</p>
                    <p><strong>Roll No:</strong> {studentData?.roll_no}</p>
                  </div>
                  <div>
                    <p><strong>Exam Type:</strong> {studentData?.exam_type}</p>
                    <p><strong>Total Exams:</strong> {exams.length}</p>
                  </div>
                </div>
              </div>

              <div className={styles.tabs}>
                <div 
                  className={`${styles.tab} ${examTab === 'available' ? styles.activeTab : ''}`}
                  onClick={() => setExamTab('available')}
                >
                  Available
                </div>
                <div 
                  className={`${styles.tab} ${examTab === 'attempted' ? styles.activeTab : ''}`}
                  onClick={() => setExamTab('attempted')}
                >
                  Attempted
                </div>
                <div 
                  className={`${styles.tab} ${examTab === 'upcoming' ? styles.activeTab : ''}`}
                  onClick={() => setExamTab('upcoming')}
                >
                  Upcoming
                </div>
              </div>

              <div className={styles.examGrid}>
                {(() => {
                  const filteredExams = exams.filter(exam => {
                    const status = (exam.exam_status || 'Available').toLowerCase();
                    if (examTab === 'available') return status === 'available' || status === 'active';
                    if (examTab === 'attempted') return status === 'completed';
                    if (examTab === 'upcoming') return status === 'scheduled' || status === 'upcoming';
                    return true;
                  });

                  if (filteredExams.length === 0) {
                    return <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "#666" }}>
                      No {examTab} exams found for your batch.
                    </p>;
                  }

                  return filteredExams.map((exam) => (
                    <div key={exam.exam_id} className={styles.examCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <h4>{exam.exam_name}</h4>
                        <span className={`${styles.badge} ${styles[(exam.exam_status || 'Available').toLowerCase()] || styles.available}`}>
                          {exam.exam_status || 'Available'}
                        </span>
                      </div>
                      <p>📅 <strong>Date:</strong> {new Date(exam.exam_date).toLocaleDateString()}</p>
                      <p>⏰ <strong>Time:</strong> {exam.exam_time}</p>
                      <p>⌛ <strong>Duration:</strong> {exam.duration_minutes} minutes</p>
                      <p>📝 <strong>Questions:</strong> {exam.total_questions}</p>
                      
                      <button 
                        className={styles.button}
                        onClick={() => handleExamClick(exam.exam_id)}
                        disabled={examTab === 'attempted' || examTab === 'upcoming'}
                        style={{ 
                          marginTop: "auto",
                          opacity: (examTab === 'attempted' || examTab === 'upcoming') ? 0.6 : 1,
                          cursor: (examTab === 'attempted' || examTab === 'upcoming') ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {examTab === 'attempted' ? 'Already Attempted' : examTab === 'upcoming' ? 'Coming Soon' : 'Start Exam'}
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </>
          )}

          {/* MY EXAMS */}
          {activeMenu === "exams" && (
            <>
              <h2 style={{ marginBottom: "25px" }}>My {studentData?.exam_type} Exams</h2>
              
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.length > 0 ? exams.map((exam) => (
                    <tr key={exam.exam_id}>
                      <td><strong>{exam.exam_name}</strong></td>
                      <td>{new Date(exam.exam_date).toLocaleDateString()}</td>
                      <td>{exam.exam_time}</td>
                      <td>{exam.duration_minutes} min</td>
                      <td>
                        <span className={`${styles.badge} ${styles[(exam.exam_status || 'Available').toLowerCase()] || styles.available}`}>
                          {exam.exam_status || 'Available'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`${styles.button} ${styles.actionBtn}`}
                          onClick={() => handleExamClick(exam.exam_id)}
                          disabled={(exam.exam_status || 'Available').toLowerCase() === 'completed' || (exam.exam_status || 'Available').toLowerCase() === 'scheduled'}
                          style={{ 
                            padding: "8px 15px", 
                            fontSize: "14px", 
                            marginTop: 0,
                            opacity: ((exam.exam_status || 'Available').toLowerCase() === 'completed' || (exam.exam_status || 'Available').toLowerCase() === 'scheduled') ? 0.6 : 1
                          }}
                        >
                          {(exam.exam_status || 'Available').toLowerCase() === 'completed' ? 'Attempted' : 'Start'}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>No exams available</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* RESULTS */}
          {activeMenu === "results" && (
            <>
              <h2 style={{ marginBottom: "25px" }}>My Exam Results</h2>
              
              <div className={styles.examGrid}>
                {exams.filter(e => e.exam_status === 'Completed').length > 0 ? (
                  exams.filter(e => e.exam_status === 'Completed').map((exam) => (
                    <div key={exam.exam_id} className={styles.examCard}>
                      <h4>{exam.exam_name}</h4>
                      <p>📅 <strong>Date:</strong> {new Date(exam.exam_date).toLocaleDateString()}</p>
                      <p>⌛ <strong>Duration:</strong> {exam.duration_minutes} minutes</p>
                      <p>📝 <strong>Total Questions:</strong> {exam.total_questions}</p>
                      <span className={`${styles.badge} ${styles.attempted}`} style={{ marginTop: "15px", display: "inline-block", width: "fit-content" }}>
                        Completed
                      </span>
                      <button 
                        className={styles.button}
                        onClick={() => {
                          // Find attempt ID for this exam
                          fetch(`https://vijeta-api.onrender.com/api/exam-attempts/student/${studentData.student_id}`)
                            .then(res => res.json())
                            .then(attempts => {
                              const attempt = attempts.find(a => a.exam_id === exam.exam_id);
                              if (attempt) {
                                router.push(`/exam-result?attemptId=${attempt.attempt_id}`);
                              } else {
                                alert("Result details not found.");
                              }
                            });
                        }}
                        style={{ marginTop: "20px" }}
                      >
                        View Result
                      </button>
                    </div>
                  ))
                ) : (
                  <div className={styles.card} style={{ gridColumn: "1/-1", textAlign: "center" }}>
                    <p>No results available yet. Complete exams to see your results here.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* PROFILE */}
          {activeMenu === "profile" && (
            <>
              <h2 style={{ textAlign: "center" }}>Student Profile</h2>
              
              <div className={styles.card}>
                <h3>Personal Details</h3>
                <p><strong>Name:</strong> {studentData?.student_name}</p>
                <p><strong>Email:</strong> {studentData?.email}</p>
                <p><strong>Mobile:</strong> {studentData?.mobile_no}</p>
                <p><strong>Roll No:</strong> {studentData?.roll_no}</p>
                <p><strong>Batch:</strong> {studentData?.batch_name}</p>
                <p><strong>Exam Type:</strong> {studentData?.exam_type}</p>
                <p><strong>Admission Year:</strong> {studentData?.admission_year}</p>
                <p><strong>College:</strong> {studentData?.college_name}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


