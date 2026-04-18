
import React, { useState, useEffect } from "react";
import styles from "../styles/Admin.module.css";

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState("create");
  const [editMode, setEditMode] = useState(false);
  const [createView, setCreateView] = useState("exam");

  const [profileView, setProfileView] = useState("view");
  const [adminData, setAdminData] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [students, setStudents] = useState([]); // FIX: added missing state
  const [editStudent, setEditStudent] = useState(null);
  const [exams, setExams] = useState([]); // Add exams state
  const [results, setResults] = useState([]); // Add results state

  const [examName, setExamName] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [date, setDate] = useState("");
  const [editingExam, setEditingExam] = useState(null);
  const [editDuration, setEditDuration] = useState("");
  const [editExamType, setEditExamType] = useState("");
  const [editTargetBatch, setEditTargetBatch] = useState("");
  const [editTargetYear, setEditTargetYear] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editReassign, setEditReassign] = useState(true);

  // Student form state
  const [sName, setSName] = useState("");
  const [sBatch, setSBatch] = useState("");
  const [sYear, setSYear] = useState("");
  const [sRoll, setSRoll] = useState("");
  const [sMobile, setSMobile] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sConfirmPassword, setSConfirmPassword] = useState("");
  const [sExamType, setSExamType] = useState("NDA");

  // Exam creation state
  const [cExamName, setCExamName] = useState("");
  const [cHour, setCHour] = useState("");
  const [cMinute, setCMinute] = useState("");
  const [cQuestions, setCQuestions] = useState("");
  const [cExamType, setCExamType] = useState("");
  const [cExamDate, setCExamDate] = useState("");
  const [cExamTime, setCExamTime] = useState("09:00");
  const [cTimePeriod, setTimePeriod] = useState("AM");
  const [cTargetBatch, setCTargetBatch] = useState("");
  const [cTargetYear, setCTargetYear] = useState("");
  const [cFile, setCFile] = useState(null);

  // Result hierarchy state
  const [resultViewLevel, setResultViewLevel] = useState("batch"); // batch, year, exam, student_list, student_detail
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedExamName, setSelectedExamName] = useState(null);
  const [selectedStudentResult, setSelectedStudentResult] = useState(null);

  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const storedAdmin = typeof window !== 'undefined' ? localStorage.getItem('admin') : null;
        if (storedAdmin) {
          const parsedAdmin = JSON.parse(storedAdmin);
          setAdminData(parsedAdmin);
          setEditName(parsedAdmin.admin_name);
          setEditEmail(parsedAdmin.email);
          setEditMobile(parsedAdmin.mobile_no);
        }

        const res = await fetch("https://vijeta-api.onrender.com/api/admin/");
        const data = await res.json();
        if (data.length > 0) {
          const matchedAdmin = storedAdmin
            ? data.find((admin) => admin.admin_id === JSON.parse(storedAdmin).admin_id) || data[0]
            : data[0];

          setAdminData(matchedAdmin);
          setEditName(matchedAdmin.admin_name);
          setEditEmail(matchedAdmin.email);
          setEditMobile(matchedAdmin.mobile_no);
        }
      } catch (err) {
        console.log(err);
      }
    };
    fetchAdminData();
  }, []);

  // Update admin profile
  const updateAdminProfile = async () => {
    if(!editName || !editEmail || !editMobile){
      alert("Please fill all fields!");
      return;
    }

    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/admin/update/${adminData.admin_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_name: editName,
          email: editEmail,
          mobile_no: editMobile
        })
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) {
        // Refresh admin data
        const adminRes = await fetch("https://vijeta-api.onrender.com/api/admin/");
        const adminData = await adminRes.json();
        if (adminData.length > 0) {
          setAdminData(adminData[0]);
        }
        setProfileView("view");
      }
    } catch (err) {
      console.log(err);
      alert("Error updating profile");
    }
  };

  // Change admin password
  const changePassword = async () => {
    if(!oldPass || !newPass || !confirmPass){
      alert("Please fill all fields!");
      return;
    }

    if(newPass !== confirmPass){
      alert("Password does not match!");
      return;
    }

    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/admin/password/${adminData.admin_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: oldPass,
          newPassword: newPass
        })
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) {
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
        setProfileView("view");
      }
    } catch (err) {
      console.log(err);
      alert("Error changing password");
    }
  };

  // Logout function
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem('admin');
      window.location.href = "/";
    }
  };

  // Fetch next roll number
  // Auto-generate email based on name and roll number
  useEffect(() => {
    if (sName && sRoll) {
      const cleanName = sName.replace(/\s+/g, '').toLowerCase();
      setSEmail(`${cleanName}${sRoll}@vijeta.com`);
    }
  }, [sName, sRoll]);

  const fetchNextRollNo = async () => {
    try {
      const res = await fetch("https://vijeta-api.onrender.com/api/students/next-roll-no");
      const data = await res.json();
      if (data.next_roll_no) {
        setSRoll(data.next_roll_no);
      }
    } catch (err) {
      console.log("Error fetching next roll number:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("https://vijeta-api.onrender.com/api/students/with-results");
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
      } else {
        console.error("Fetched students is not an array:", data);
        setStudents([]);
      }
    } catch (err) {
      console.log(err);
      alert("Error fetching students");
    }
  };

  // Load initial roll number when switching to student view
  useEffect(() => {
    if (activeMenu === "create" && createView === "student") {
      fetchNextRollNo();
    }
  }, [activeMenu, createView]);

  const fetchExams = async () => {
    try {
      const res = await fetch("https://vijeta-api.onrender.com/api/exams");
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.log(err);
      alert("Error fetching exams");
    }
  };

  const handleEditExam = (exam) => {
    setEditingExam(exam);
    setExamName(exam.exam_name);
    setDate(exam.exam_date || "");
    const timeParts = (exam.exam_time || "09:00:00").split(":");
    setHour(timeParts[0] || "09");
    setMinute(timeParts[1] || "00");
    setEditDuration(exam.duration_minutes || "");
    setEditExamType(exam.exam_type || "");
    setEditTargetBatch(exam.target_batch_name || "");
    setEditTargetYear(exam.target_admission_year || "");
    setEditStatus(exam.exam_status || "Available");
    setEditMode(true);
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this exam? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/exams/${examId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Exam deleted successfully");
        fetchExams();
        setEditMode(false);
        setEditingExam(null);
      } else {
        const error = await res.json();
        alert("Error deleting exam: " + (error.message || error.error));
      }
    } catch (err) {
      console.log("Error deleting exam:", err);
      alert("Error deleting exam");
    }
  };

  const handleUpdateExam = async () => {
    if (!editingExam) return;
    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/exams/${editingExam.exam_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_name: examName,
          exam_date: date,
          exam_time: `${hour}:${minute}:00`,
          duration_minutes: parseInt(editDuration) || 30,
          exam_status: editStatus,
          exam_type: editExamType,
          target_batch_name: editTargetBatch,
          target_admission_year: parseInt(editTargetYear) || null,
          reassign: editReassign
        })
      });
      if (res.ok) {
        alert("Exam updated successfully");
        fetchExams();
        setEditMode(false);
        setEditingExam(null);
      } else {
        const error = await res.json();
        alert("Error updating exam: " + (error.message || error.error));
      }
    } catch (err) {
      console.log("Error updating exam:", err);
      alert("Error updating exam");
    }
  };

  const fetchResults = async () => {
    try {
      const res = await fetch("https://vijeta-api.onrender.com/api/admin-results");
      const data = await res.json();
      if (Array.isArray(data)) {
        setResults(data);
      } else {
        console.error("Fetched results is not an array:", data);
        setResults([]);
      }
    } catch (err) {
      console.log(err);
      alert("Error fetching results");
    }
  };

  const fetchResultsByExamType = async (examType) => {
    try {
      const url = examType === 'all' 
        ? "https://vijeta-api.onrender.com/api/admin-results"
        : `https://vijeta-api.onrender.com/api/admin-results/by-exam-type/${examType}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setResults(data);
      } else {
        console.error("Fetched results by type is not an array:", data);
        setResults([]);
      }
    } catch (err) {
      console.log(err);
      alert("Error fetching results");
    }
  };

  const viewResultDetails = async (attemptId) => {
    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/admin-results/${attemptId}`);
      const data = await res.json();
      
      setSelectedStudentResult(data);
      setResultViewLevel("student_detail");
    } catch (err) {
      console.error('Error fetching result details:', err);
      alert('Error fetching result details');
    }
  };

  const deleteResult = async (attemptId) => {
    if (!window.confirm("Are you sure you want to delete this result? This action cannot be undone.")) {
      return;
    }
    
    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/admin-results/${attemptId}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchResults(); // Refresh the results list
      } else {
        alert(data.error || 'Error deleting result');
      }
    } catch (err) {
      console.error('Error deleting result:', err);
      alert('Error deleting result');
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchExams();
    fetchResults();
  }, []);

  const resetPassword = async (id) => {
    const newPassword = window.prompt("Enter new password:");
    if (!newPassword) return;

    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/students/reset-password/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword })
      });

      const data = await res.json();
      alert(data.message || data.error);
    } catch (err) {
      console.log(err);
      alert("Error resetting password");
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm("Delete this student?")) return;

    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/students/delete/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();
      alert(data.message);
      fetchStudents();
    } catch (err) {
      console.log(err);
      alert("Error deleting student");
    }
  };

  const updateStudent = async () => {
    // FIX: ensure all required fields exist
    const { student_name, batch_name, mobile_no, email } = editStudent;
    if(!student_name || !batch_name || !mobile_no || !email){
      alert("All fields required!");
      return;
    }

    try {
      const res = await fetch(`https://vijeta-api.onrender.com/api/students/update/${editStudent.student_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editStudent)
      });

      const data = await res.json();
      alert(data.message);
      setEditStudent(null);
      fetchStudents();
    } catch (err) {
      console.log(err);
      alert("Error updating student");
    }
  };

  // ================= ADD STUDENT =================
  const addStudent = async () => {
    if(!sName || !sBatch || !sYear || !sRoll || !sMobile || !sEmail || !sPassword){
      alert("Please fill all required fields");
      return;
    }

    if(sPassword !== sConfirmPassword){
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("https://vijeta-api.onrender.com/api/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: sName,
          batch_name: sBatch,
          admission_year: sYear,
          roll_no: sRoll,
          mobile_no: sMobile,
          email: sEmail,
          password_hash: sPassword,
          exam_type: sExamType,
          city: "Ashta",
          state: "MH",
          college_name: "ADCET"
        })
      });

      const data = await res.json();
      alert(data.message || data.error);
      if (res.ok) {
        // Reset form and fetch next roll number
        setSName(""); setSBatch(""); setSYear("");
        setSMobile(""); setSPassword(""); setSConfirmPassword("");
        setSExamType("NDA");
        fetchStudents();
        fetchNextRollNo(); // Auto-generate next roll number
      }
    } catch (err) {
      console.log(err);
      alert("Error adding student");
    }
  };

  // ================= EXAM =================
  const createExam = async () => {
    console.log("=== EXAM CREATION STARTED ===");
    console.log("Exam creation values:", {
      cExamName,
      cHour,
      cMinute,
      cQuestions,
      cExamType,
      cFile,
      cFileName: cFile?.name,
      cFileSize: cFile?.size,
      cFileType: cFile?.type
    });

    // Validation with detailed logging
    if(!cExamName || cExamName.trim() === ""){
      console.log("Validation failed: Missing exam name");
      alert("Please enter exam name!");
      return;
    }
    if(!cHour || cHour.trim() === ""){
      console.log("Validation failed: Missing hours");
      alert("Please enter hours!");
      return;
    }
    if(!cMinute || cMinute.trim() === ""){
      console.log("Validation failed: Missing minutes");
      alert("Please enter minutes!");
      return;
    }
    if(!cQuestions || cQuestions.trim() === ""){
      console.log("Validation failed: Missing total questions");
      alert("Please enter total questions!");
      return;
    }
    if(!cExamType || cExamType.trim() === ""){
      console.log("Validation failed: Missing exam type");
      alert("Please select exam type!");
      return;
    }
    if(!cFile){
      console.log("Validation failed: Missing file");
      alert("Please select a file!");
      return;
    }

    console.log("Validation passed, creating FormData...");
    const formData = new FormData();
    
    try {
      formData.append('exam_name', cExamName);
      formData.append('duration_minutes', parseInt(cHour)*60 + parseInt(cMinute));
      formData.append('total_questions', cQuestions);
      formData.append('exam_type', cExamType);
      formData.append('target_batch_name', cTargetBatch);
      formData.append('target_admission_year', cTargetYear);
      formData.append('exam_date', cExamDate);
      // Convert 12-hour format to 24-hour format for MySQL
      let time24Hour = cExamTime;
      if (cTimePeriod === 'PM' && cExamTime !== '12:00') {
        const [hours, minutes] = cExamTime.split(':');
        time24Hour = `${parseInt(hours) + 12}:${minutes}`;
      } else if (cTimePeriod === 'AM' && cExamTime === '12:00') {
        time24Hour = '00:00';
      }
      formData.append('exam_time', time24Hour);
      formData.append('created_by', adminData?.admin_id || 1);
      formData.append('file', cFile);
      
      console.log("FormData created successfully");
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value instanceof File ? `${value.name} (${value.size} bytes)` : value);
      }
    } catch (formError) {
      console.error("Error creating FormData:", formError);
      alert("Error creating form data: " + formError.message);
      return;
    }

    try {
      console.log("Starting API call to https://vijeta-api.onrender.com/api/exams/add");
      console.log("Request method: POST");
      console.log("Request body type: FormData");
      
      const res = await fetch("https://vijeta-api.onrender.com/api/exams/add", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header when using FormData - browser sets it automatically with boundary
      });

      console.log("Response received:");
      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Response error text:", errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log("Response data:", data);
      
      if (data.message) {
        const assignmentMessage = data.students_assigned !== undefined
          ? ` Assigned to ${data.students_assigned} student(s).`
          : "";
        alert(`${data.message}${assignmentMessage}`);
      } else {
        alert("Exam created successfully!");
      }
      
      // Reset form
      setCExamName(""); setCHour(""); setCMinute(""); setCQuestions(""); setCExamType(""); setCTargetBatch(""); setCTargetYear(""); setCFile(null);
      console.log("Form reset completed");
      // Refresh exams list
      fetchExams();
      
    } catch (err) {
      console.error("=== UPLOAD ERROR ===");
      console.error("Error type:", err.constructor.name);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      
      // More detailed error message
      let errorMessage = "Error creating exam: ";
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage += "Network error - unable to connect to server. Please check if backend is running.";
      } else if (err.message.includes('HTTP')) {
        errorMessage += "Server error: " + err.message;
      } else {
        errorMessage += err.message;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2>Vijeta Foundation</h2>
        <div className={styles.profile}></div>
      </div>

      <div className={styles.main}>
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <p className={activeMenu==="create"?styles.active:""} onClick={()=>{setActiveMenu("create");setEditMode(false);}}>Create</p>
          <p className={activeMenu==="students"?styles.active:""} onClick={()=>setActiveMenu("students")}>Students</p>
          <p className={activeMenu==="result"?styles.active:""} onClick={()=>{
            setActiveMenu("result");
            setEditMode(false);
            setResultViewLevel("batch");
            fetchResults();
          }}>Result</p>
          <p className={activeMenu==="settings"?styles.active:""} onClick={()=>{setActiveMenu("settings");setEditMode(false);}}>Settings</p>
          <p className={activeMenu==="profile"?styles.active:""} onClick={()=>{setActiveMenu("profile");setEditMode(false);}}>Profile</p>
        </div>

        <div className={styles.content}>

          {/* CREATE */}
          {activeMenu === "create" && (
            <>
              <h2 style={{ textAlign: "center" }}>Welcome Admin..!</h2>

              <div className={styles.tabs}>
                <button onClick={()=>setCreateView("exam")}>Create Exam</button>
                <button onClick={()=>setCreateView("student")}>Add Student</button>
              </div>

              {/* CREATE EXAM */}
              {createView === "exam" && (
                <div className={styles.card}>
                  <h3 style={{ textAlign: "center" }}>Add Exam</h3>

                  <input value={cExamName} onChange={(e)=>setCExamName(e.target.value)} placeholder="Exam Name"/>

                  <div className={styles.row}>
                    <input 
                      type="date" 
                      value={cExamDate} 
                      onChange={(e)=>setCExamDate(e.target.value)} 
                      placeholder="Exam Date"
                    />
                    <input 
                      type="time" 
                      value={cExamTime} 
                      onChange={(e)=>setCExamTime(e.target.value)} 
                      placeholder="Exam Time"
                    />
                    <select value={cTimePeriod} onChange={(e)=>setTimePeriod(e.target.value)}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>

                  <div className={styles.row}>
                    <input value={cHour} onChange={(e)=>setCHour(e.target.value)} placeholder="Exam Duration (Hours)"/>
                    <input value={cMinute} onChange={(e)=>setCMinute(e.target.value)} placeholder="Exam Duration (Minutes)"/>
                    <select onChange={(e)=>setCExamType(e.target.value)}>
                      <option value="">Select Type</option>
                      <option value="NDA">NDA</option>
                      <option value="NEET">NEET</option>
                      <option value="JEE">JEE</option>
                      <option value="SSB">SSB</option>
                      <option value="SSC">SSC</option>
                      <option value="Police">Police</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={styles.row}>
                    <input value={cTargetBatch} onChange={(e)=>setCTargetBatch(e.target.value)} placeholder="Target Batch (e.g. NDA-A)"/>
                    <input value={cTargetYear} onChange={(e)=>setCTargetYear(e.target.value)} placeholder="Target Admission Year (e.g. 2024)"/>
                  </div>

                  <input value={cQuestions} onChange={(e)=>setCQuestions(e.target.value)} placeholder="Total Questions"/>

                  <input 
                    type="file" 
                    accept=".docx,.doc,.txt" 
                    onChange={(e)=>{
                      console.log("File selected:", e.target.files[0]);
                      setCFile(e.target.files[0]);
                    }}
                  />
                  {cFile && <p style={{color: "green", fontWeight: "bold"}}>Selected: {cFile.name}</p>}

                  <button 
                    className={styles.btn} 
                    onClick={createExam}
                    disabled={!cExamName || !cHour || !cMinute || !cQuestions || !cExamType || !cFile}
                    style={{
                      backgroundColor: (!cExamName || !cHour || !cMinute || !cQuestions || !cExamType || !cFile) ? "#ccc" : "",
                      cursor: (!cExamName || !cHour || !cMinute || !cQuestions || !cExamType || !cFile) ? "not-allowed" : "pointer"
                    }}
                  >
                    Upload Test Document (.docx)
                  </button>
                </div>
              )}

              {/* ADD STUDENT */}
              {createView === "student" && (
                <div className={styles.card}>
                  <h3>Add Student</h3>

                  <input value={sName} onChange={(e)=>setSName(e.target.value)} placeholder="Student Name"/>
                  <input value={sBatch} onChange={(e)=>setSBatch(e.target.value)} placeholder="Batch (e.g. NDA-A)"/>
                  <input value={sYear} onChange={(e)=>setSYear(e.target.value)} placeholder="Admission Year (e.g. 2024)"/>
                  <input value={sRoll} readOnly style={{backgroundColor: "#e8f0fe", cursor: "not-allowed"}} placeholder="Roll No (Auto-generated)"/>
                  <input value={sMobile} onChange={(e)=>setSMobile(e.target.value)} placeholder="Mobile Number"/>
                  <input value={sEmail} readOnly style={{backgroundColor: "#e8f0fe", cursor: "not-allowed"}} placeholder="Email (Auto-generated)"/>
                  <select value={sExamType} onChange={(e)=>setSExamType(e.target.value)}>
                    <option value="">Select Exam Type</option>
                    <option value="NDA">NDA</option>
                    <option value="NEET">NEET</option>
                    <option value="JEE">JEE</option>
                    <option value="SSB">SSB</option>
                    <option value="SSC">SSC</option>
                    <option value="Police">Police</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="password" value={sPassword} onChange={(e)=>setSPassword(e.target.value)} placeholder="Password"/>
                  <input type="password" value={sConfirmPassword} onChange={(e)=>setSConfirmPassword(e.target.value)} placeholder="Confirm Password"/>

                  <button className={styles.btn} onClick={addStudent}>
                    Add Student
                  </button>
                </div>
              )}
            </>
          )}

          {/* STUDENTS */}
          {activeMenu === "students" && (
            <>
              <h2>Student Management - Comprehensive View</h2>

              {/* Student Overview Stats */}
              <div className={styles.resultStats}>
                <div className={styles.statCard}>
                  <h4>Total Students</h4>
                  <p>{students.length}</p>
                </div>
                <div className={styles.statCard}>
                  <h4>Active Students</h4>
                  <p>{students.filter(s => s.performance_summary?.exams_attempted > 0).length}</p>
                </div>
                <div className={styles.statCard}>
                  <h4>Average Pass Rate</h4>
                  <p>
                    {(() => {
                      const studentsWithAttempts = students.filter(s => s.performance_summary?.exams_attempted > 0);
                      if (studentsWithAttempts.length === 0) return '0%';
                      const passCount = studentsWithAttempts.filter(s => 
                        s.performance_summary?.latest_result_status === 'Pass'
                      ).length;
                      return `${((passCount / studentsWithAttempts.length) * 100).toFixed(1)}%`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Student Table */}
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Batch</th>
                    <th>Exam Type</th>
                    <th>Mobile</th>
                    <th>Exams Assigned</th>
                    <th>Exams Attempted</th>
                    <th>Average Score</th>
                    <th>Highest Score</th>
                    <th>Latest Result</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? students.map((s)=>(
                    <tr key={s.student_id}>
                      <td><strong>{s.roll_no}</strong></td>
                      <td>{s.student_name}</td>
                      <td>{s.email}</td>
                      <td>{s.batch_name}</td>
                      <td><span className={styles.examTypeBadge}>{s.exam_type}</span></td>
                      <td>{s.mobile_no}</td>
                      <td>{s.performance_summary?.total_exams_available || 0}</td>
                      <td>{s.performance_summary?.exams_attempted || 0}</td>
                      <td>
                        {s.performance_summary?.average_score ? (
                          <span className={`${parseFloat(s.performance_summary.average_score) >= 40 ? styles.pass : styles.fail}`}>
                            {parseFloat(s.performance_summary.average_score).toFixed(1)}%
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td>
                        {s.performance_summary?.highest_score ? (
                          <span className={styles.pass}>
                            {parseFloat(s.performance_summary.highest_score).toFixed(1)}%
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td>
                        {s.performance_summary?.latest_result_status ? (
                          <span className={s.performance_summary.latest_result_status === 'Pass' ? styles.pass : styles.fail}>
                            {s.performance_summary.latest_result_status}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td>
                        <button className={styles.viewButton} onClick={()=>setEditStudent(s)}>View Details</button>
                        <button onClick={()=>resetPassword(s.student_id)} style={{background: "#f0ad4e", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", marginLeft: "5px"}}>Reset Pwd</button>
                        <button onClick={()=>deleteStudent(s.student_id)}>Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="12">No students found</td></tr>
                  )}
                </tbody>
              </table>

              {/* Student Detail Modal */}
              {editStudent && (
                <div className={styles.card} style={{width: "90%", maxWidth: "900px", marginTop: "20px"}}>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
                    <h3>Student Details - {editStudent.student_name}</h3>
                    <button onClick={()=>setEditStudent(null)} style={{background: "red", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer"}}>Close</button>
                  </div>

                  {/* Student Basic Info */}
                  <div style={{background: "white", color: "black", padding: "15px", borderRadius: "8px", marginBottom: "20px"}}>
                    <h4 style={{marginBottom: "10px", color: "#1e5bbf"}}>Basic Information</h4>
                    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
                      <p><strong>Roll No:</strong> {editStudent.roll_no}</p>
                      <p><strong>Name:</strong> {editStudent.student_name}</p>
                      <p><strong>Email:</strong> {editStudent.email}</p>
                      <p><strong>Mobile:</strong> {editStudent.mobile_no}</p>
                      <p><strong>Batch:</strong> {editStudent.batch_name}</p>
                      <p><strong>Admission Year:</strong> {editStudent.admission_year}</p>
                      <p><strong>Exam Type:</strong> {editStudent.exam_type}</p>
                      <p><strong>City:</strong> {editStudent.city || 'N/A'}</p>
                      <p><strong>State:</strong> {editStudent.state || 'N/A'}</p>
                      <p><strong>College:</strong> {editStudent.college_name || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div style={{background: "white", color: "black", padding: "15px", borderRadius: "8px", marginBottom: "20px"}}>
                    <h4 style={{marginBottom: "10px", color: "#1e5bbf"}}>Performance Summary</h4>
                    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px"}}>
                      <div style={{textAlign: "center", padding: "10px", background: "#f5f5f5", borderRadius: "4px"}}>
                        <p style={{fontSize: "24px", fontWeight: "bold", color: "#1e5bbf"}}>{editStudent.performance_summary?.total_exams_available || 0}</p>
                        <p style={{fontSize: "12px"}}>Exams Assigned</p>
                      </div>
                      <div style={{textAlign: "center", padding: "10px", background: "#f5f5f5", borderRadius: "4px"}}>
                        <p style={{fontSize: "24px", fontWeight: "bold", color: "#1e5bbf"}}>{editStudent.performance_summary?.exams_attempted || 0}</p>
                        <p style={{fontSize: "12px"}}>Exams Attempted</p>
                      </div>
                      <div style={{textAlign: "center", padding: "10px", background: "#f5f5f5", borderRadius: "4px"}}>
                        <p style={{fontSize: "24px", fontWeight: "bold", color: editStudent.performance_summary?.average_score >= 40 ? "green" : "red"}}>{editStudent.performance_summary?.average_score ? `${parseFloat(editStudent.performance_summary.average_score).toFixed(1)}%` : 'N/A'}</p>
                        <p style={{fontSize: "12px"}}>Average Score</p>
                      </div>
                      <div style={{textAlign: "center", padding: "10px", background: "#f5f5f5", borderRadius: "4px"}}>
                        <p style={{fontSize: "24px", fontWeight: "bold", color: "green"}}>{editStudent.performance_summary?.highest_score ? `${parseFloat(editStudent.performance_summary.highest_score).toFixed(1)}%` : 'N/A'}</p>
                        <p style={{fontSize: "12px"}}>Highest Score</p>
                      </div>
                    </div>
                    <p style={{marginTop: "10px", textAlign: "center"}}>
                      <strong>Latest Result Status:</strong> 
                      <span className={editStudent.performance_summary?.latest_result_status === 'Pass' ? styles.pass : styles.fail}>
                        {' '}{editStudent.performance_summary?.latest_result_status || 'N/A'}
                      </span>
                    </p>
                  </div>

                  {/* Exam Attempts History */}
                  {editStudent.attempts && editStudent.attempts.length > 0 && (
                    <div style={{background: "white", color: "black", padding: "15px", borderRadius: "8px", marginBottom: "20px"}}>
                      <h4 style={{marginBottom: "10px", color: "#1e5bbf"}}>Exam Attempts History</h4>
                      <table className={styles.table} style={{marginTop: "10px"}}>
                        <thead>
                          <tr>
                            <th>Attempt ID</th>
                            <th>Exam Name</th>
                            <th>Exam Type</th>
                            <th>Date</th>
                            <th>Questions</th>
                            <th>Correct</th>
                            <th>Percentage</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editStudent.attempts.map((attempt) => (
                            <tr key={attempt.attempt_id}>
                              <td>{attempt.attempt_id}</td>
                              <td>{attempt.exam_name}</td>
                              <td><span className={styles.examTypeBadge}>{attempt.exam_type}</span></td>
                              <td>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : 'N/A'}</td>
                              <td>{attempt.answered_questions || 0}</td>
                              <td>{attempt.correct_answers || 0}</td>
                              <td>
                                <span className={`${attempt.percentage >= 40 ? styles.pass : styles.fail}`}>
                                  {parseFloat(attempt.percentage).toFixed(1)}%
                                </span>
                              </td>
                              <td>
                                <span className={attempt.result_status === 'Pass' ? styles.pass : styles.fail}>
                                  {attempt.result_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Assigned Exams */}
                  {editStudent.assigned_exams && editStudent.assigned_exams.length > 0 && (
                    <div style={{background: "white", color: "black", padding: "15px", borderRadius: "8px"}}>
                      <h4 style={{marginBottom: "10px", color: "#1e5bbf"}}>Assigned Exams</h4>
                      <table className={styles.table} style={{marginTop: "10px"}}>
                        <thead>
                          <tr>
                            <th>Exam Name</th>
                            <th>Exam Type</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Duration</th>
                            <th>Questions</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editStudent.assigned_exams.map((exam) => (
                            <tr key={exam.exam_id}>
                              <td>{exam.exam_name}</td>
                              <td><span className={styles.examTypeBadge}>{exam.exam_type}</span></td>
                              <td>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'N/A'}</td>
                              <td>{exam.exam_time || 'N/A'}</td>
                              <td>{exam.duration_minutes} min</td>
                              <td>{exam.total_questions}</td>
                              <td><span className={styles.upcoming}>{exam.exam_status || 'Available'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {(!editStudent.attempts || editStudent.attempts.length === 0) && (
                    <div style={{background: "white", color: "black", padding: "15px", borderRadius: "8px", textAlign: "center"}}>
                      <p>No exam attempts yet. Student hasn't taken any exams.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

  {/* RESULT */}
          {activeMenu === "result" && (
            <div className={styles.resultContainer}>
              <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Result Management</h2>

              {/* Breadcrumbs for navigation */}
              <div className={styles.breadcrumbs} style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <span 
                  onClick={() => {
                    setResultViewLevel("batch");
                    setSelectedBatch(null);
                    setSelectedYear(null);
                    setSelectedExamId(null);
                    setSelectedExamName(null);
                    setSelectedStudentResult(null);
                  }} 
                  style={{ cursor: "pointer", color: resultViewLevel === "batch" ? "black" : "#1e5bbf", fontWeight: "bold" }}
                >
                  All Batches
                </span>
                
                {selectedBatch && (
                  <>
                    <span style={{ color: "#ccc" }}>/</span>
                    <span 
                      onClick={() => setResultViewLevel("year")} 
                      style={{ cursor: "pointer", color: resultViewLevel === "year" ? "black" : "#1e5bbf", fontWeight: "bold" }}
                    >
                      {selectedBatch}
                    </span>
                  </>
                )}

                {selectedYear && (
                  <>
                    <span style={{ color: "#ccc" }}>/</span>
                    <span 
                      onClick={() => setResultViewLevel("exam")} 
                      style={{ cursor: "pointer", color: resultViewLevel === "exam" ? "black" : "#1e5bbf", fontWeight: "bold" }}
                    >
                      Year {selectedYear}
                    </span>
                  </>
                )}

                {selectedExamName && (
                  <>
                    <span style={{ color: "#ccc" }}>/</span>
                    <span 
                      onClick={() => setResultViewLevel("student_list")} 
                      style={{ cursor: "pointer", color: resultViewLevel === "student_list" ? "black" : "#1e5bbf", fontWeight: "bold" }}
                    >
                      {selectedExamName}
                    </span>
                  </>
                )}

                {selectedStudentResult && (
                  <>
                    <span style={{ color: "#ccc" }}>/</span>
                    <span style={{ fontWeight: "bold" }}>
                      {selectedStudentResult.result?.student_name}
                    </span>
                  </>
                )}
              </div>

              {/* BATCH VIEW */}
              {resultViewLevel === "batch" && (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
                    <button 
                      onClick={() => downloadResultsCSV(results, `all_results_${new Date().toISOString().split('T')[0]}.csv`)}
                      style={{ 
                        background: "#28a745", 
                        color: "white", 
                        border: "none", 
                        padding: "10px 20px", 
                        borderRadius: "5px", 
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      Download All Results (CSV)
                    </button>
                  </div>
                  <div className={styles.grid}>
                    {[...new Set(results.map(r => r.target_batch_name || 'Other'))].filter(b => b && b !== 'Other' || results.filter(r => !r.target_batch_name).length > 0).map(batch => {
                      const batchResults = results.filter(r => (r.target_batch_name || 'Other') === batch);
                      const uniqueExams = [...new Set(batchResults.map(r => r.exam_id))].length;
                      const uniqueYears = [...new Set(batchResults.map(r => r.target_admission_year || 'N/A'))];
                      const avgScore = batchResults.length > 0 
                        ? (batchResults.reduce((sum, r) => sum + r.percentage, 0) / batchResults.length).toFixed(1)
                        : 0;
                      return (
                        <div 
                          key={batch} 
                          className={styles.card} 
                          style={{ cursor: "pointer", textAlign: "center", padding: "25px" }}
                          onClick={() => {
                            setSelectedBatch(batch);
                            setResultViewLevel("year");
                          }}
                        >
                          <div style={{ fontSize: "48px", marginBottom: "10px" }}>
                            {batch === 'NDA' ? '🎖️' : batch === 'SSC' ? '📋' : batch === 'Police' ? '👮' : batch === 'NEET' ? '🏥' : '📚'}
                          </div>
                          <h3 style={{ margin: "0 0 10px 0", color: "#1e5bbf" }}>{batch}</h3>
                          <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "10px", fontSize: "12px", color: "#666" }}>
                            <span>{uniqueYears.length} Year{uniqueYears.length !== 1 ? 's' : ''}</span>
                            <span>|</span>
                            <span>{uniqueExams} Test{uniqueExams !== 1 ? 's' : ''}</span>
                            <span>|</span>
                            <span>{batchResults.length} Result{batchResults.length !== 1 ? 's' : ''}</span>
                          </div>
                          <p style={{ margin: "0", fontWeight: "bold", color: avgScore >= 40 ? "#28a745" : "#dc3545" }}>
                            Avg: {avgScore}%
                          </p>
                        </div>
                      );
                    })}
                    {results.length === 0 && (
                      <div style={{ textAlign: "center", width: "100%", padding: "50px" }}>
                        <p style={{ color: "#666", fontSize: "18px" }}>No results available yet.</p>
                        <p style={{ color: "#999" }}>Results will appear here after students complete exams.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* YEAR VIEW */}
              {resultViewLevel === "year" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                    <h3 style={{ margin: 0 }}>{selectedBatch} - Select Year</h3>
                    <button 
                      onClick={() => {
                        const yearResults = results.filter(r => (r.target_batch_name || 'Other') === selectedBatch);
                        downloadResultsCSV(yearResults, `${selectedBatch}_all_years_${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      style={{ 
                        background: "#28a745", 
                        color: "white", 
                        border: "none", 
                        padding: "8px 16px", 
                        borderRadius: "5px", 
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Download {selectedBatch} Results (CSV)
                    </button>
                  </div>
                  <div className={styles.grid}>
                    {[...new Set(results
                      .filter(r => (r.target_batch_name || 'Other') === selectedBatch)
                      .map(r => r.target_admission_year || 'N/A'))].sort((a, b) => b - a).map(year => {
                      const yearResults = results.filter(r => (r.target_batch_name || 'Other') === selectedBatch && String(r.target_admission_year || 'N/A') === String(year));
                      const uniqueExams = [...new Set(yearResults.map(r => r.exam_id))].length;
                      const avgScore = yearResults.length > 0 
                        ? (yearResults.reduce((sum, r) => sum + r.percentage, 0) / yearResults.length).toFixed(1)
                        : 0;
                      const passCount = yearResults.filter(r => r.result_status === 'Pass').length;
                      
                      return (
                        <div 
                          key={year} 
                          className={styles.card} 
                          style={{ cursor: "pointer", textAlign: "center", padding: "25px" }}
                          onClick={() => {
                            setSelectedYear(year);
                            setResultViewLevel("exam");
                          }}
                        >
                          <div style={{ fontSize: "48px", marginBottom: "10px" }}>📅</div>
                          <h3 style={{ margin: "0 0 10px 0", color: "#1e5bbf" }}>Year {year}</h3>
                          <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "10px", fontSize: "12px", color: "#666" }}>
                            <span>{uniqueExams} Test{uniqueExams !== 1 ? 's' : ''}</span>
                            <span>|</span>
                            <span>{yearResults.length} Result{yearResults.length !== 1 ? 's' : ''}</span>
                          </div>
                          <p style={{ margin: "0 0 5px 0", color: "#28a745", fontWeight: "bold" }}>
                            {passCount} Pass
                          </p>
                          <p style={{ margin: 0, fontWeight: "bold", color: avgScore >= 40 ? "#28a745" : "#dc3545" }}>
                            Avg: {avgScore}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* EXAM VIEW */}
              {resultViewLevel === "exam" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                    <h3 style={{ margin: 0 }}>{selectedBatch} - Year {selectedYear}</h3>
                    <button 
                      onClick={() => {
                        const examYearResults = results.filter(r => 
                          (r.target_batch_name || 'Other') === selectedBatch && 
                          String(r.target_admission_year || 'N/A') === String(selectedYear)
                        );
                        downloadResultsCSV(examYearResults, `${selectedBatch}_Year${selectedYear}_all_tests_${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      style={{ 
                        background: "#28a745", 
                        color: "white", 
                        border: "none", 
                        padding: "8px 16px", 
                        borderRadius: "5px", 
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Download All {selectedYear} Tests (CSV)
                    </button>
                  </div>
                  <div className={styles.grid}>
                    {[...new Set(results
                      .filter(r => (r.target_batch_name || 'Other') === selectedBatch && String(r.target_admission_year || 'N/A') === String(selectedYear))
                      .map(r => JSON.stringify({ id: r.exam_id, name: r.exam_name, exam_type: r.exam_type })))].map(examStr => {
                      const exam = JSON.parse(examStr);
                      const examResults = results.filter(r => 
                        r.exam_id === exam.id && 
                        (r.target_batch_name || 'Other') === selectedBatch && 
                        String(r.target_admission_year || 'N/A') === String(selectedYear)
                      );
                      const avgScore = examResults.length > 0 
                        ? (examResults.reduce((sum, r) => sum + r.percentage, 0) / examResults.length).toFixed(1)
                        : 0;
                      const passCount = examResults.filter(r => r.result_status === 'Pass').length;
                      
                      return (
                        <div 
                          key={exam.id} 
                          className={styles.card} 
                          style={{ cursor: "pointer", textAlign: "center", padding: "25px" }}
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setSelectedExamName(exam.name);
                            setResultViewLevel("student_list");
                          }}
                        >
                          <div style={{ fontSize: "48px", marginBottom: "10px" }}>📝</div>
                          <h3 style={{ margin: "0 0 10px 0", color: "#1e5bbf", fontSize: "16px" }}>{exam.name}</h3>
                          <p style={{ margin: "0 0 5px 0", color: "#666", fontSize: "12px" }}>{exam.exam_type || 'General'}</p>
                          <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "10px", fontSize: "12px", color: "#666" }}>
                            <span>{examResults.length} Student{examResults.length !== 1 ? 's' : ''}</span>
                            <span>|</span>
                            <span>{passCount} Pass</span>
                          </div>
                          <p style={{ margin: 0, fontWeight: "bold", color: avgScore >= 40 ? "#28a745" : "#dc3545" }}>
                            Avg: {avgScore}%
                          </p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadResultsCSV(examResults, `${selectedBatch}_Year${selectedYear}_${exam.name}_results.csv`);
                            }}
                            style={{ 
                              marginTop: "10px",
                              background: "#007bff", 
                              color: "white", 
                              border: "none", 
                              padding: "6px 12px", 
                              borderRadius: "4px", 
                              cursor: "pointer",
                              fontSize: "11px"
                            }}
                          >
                            Download Results
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* STUDENT LIST VIEW */}
              {resultViewLevel === "student_list" && (
                <>
                  <div className={styles.resultStats} style={{ marginBottom: "20px" }}>
                    <div className={styles.statCard}>
                      <h4>Total Appeared</h4>
                      <p>{results.filter(r => r.exam_id === selectedExamId && (r.target_batch_name || 'Other') === selectedBatch).length}</p>
                    </div>
                    <div className={styles.statCard}>
                      <h4>Passed</h4>
                      <p style={{ color: "#28a745" }}>{results.filter(r => r.exam_id === selectedExamId && (r.target_batch_name || 'Other') === selectedBatch && r.result_status === 'Pass').length}</p>
                    </div>
                    <div className={styles.statCard}>
                      <h4>Failed</h4>
                      <p style={{ color: "#dc3545" }}>{results.filter(r => r.exam_id === selectedExamId && (r.target_batch_name || 'Other') === selectedBatch && r.result_status === 'Fail').length}</p>
                    </div>
                    <div className={styles.statCard}>
                      <h4>Average Score</h4>
                      <p>
                        {(() => {
                          const examResults = results.filter(r => r.exam_id === selectedExamId && (r.target_batch_name || 'Other') === selectedBatch);
                          if (examResults.length === 0) return '0%';
                          const avg = examResults.reduce((sum, r) => sum + r.percentage, 0) / examResults.length;
                          return `${avg.toFixed(1)}%`;
                        })()}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        const examResults = results.filter(r => 
                          r.exam_id === selectedExamId && 
                          (r.target_batch_name || 'Other') === selectedBatch
                        );
                        downloadResultsCSV(examResults, `${selectedBatch}_Year${selectedYear}_${selectedExamName}_results.csv`);
                      }}
                      style={{ 
                        background: "#28a745", 
                        color: "white", 
                        border: "none", 
                        padding: "10px 20px", 
                        borderRadius: "5px", 
                        cursor: "pointer",
                        fontWeight: "bold",
                        marginLeft: "auto"
                      }}
                    >
                      Download Results (CSV)
                    </button>
                  </div>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Mobile</th>
                        <th>Percentage</th>
                        <th>Correct/Total</th>
                        <th>Status</th>
                        <th>Time Taken</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results
                        .filter(r => r.exam_id === selectedExamId && (r.target_batch_name || 'Other') === selectedBatch)
                        .sort((a, b) => b.percentage - a.percentage)
                        .map((result, idx) => (
                          <tr key={result.attempt_id} style={{ background: idx === 0 && result.percentage >= 40 ? '#e8f5e9' : '' }}>
                            <td><strong>{result.roll_no}</strong></td>
                            <td>{result.student_name}</td>
                            <td>{result.mobile_no || 'N/A'}</td>
                            <td>
                              <span className={result.percentage >= 40 ? styles.pass : styles.fail} style={{ fontWeight: "bold", fontSize: "16px" }}>
                                {result.percentage}%
                              </span>
                            </td>
                            <td>{result.correct_answers || 0}/{result.total_questions || 0}</td>
                            <td>
                              <span className={result.result_status === 'Pass' ? styles.pass : styles.fail} style={{ padding: "4px 8px", borderRadius: "4px" }}>
                                {result.result_status}
                              </span>
                            </td>
                            <td>{Math.floor((result.time_taken_seconds || 0) / 60)}m {(result.time_taken_seconds || 0) % 60}s</td>
                            <td>{new Date(result.submitted_at || result.start_time).toLocaleDateString()}</td>
                            <td>
                              <button className={styles.viewButton} onClick={() => viewResultDetails(result.attempt_id)}>View</button>
                              <button className={styles.deleteButton} onClick={() => deleteResult(result.attempt_id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      {results.filter(r => r.exam_id === selectedExamId && (r.target_batch_name || 'Other') === selectedBatch).length === 0 && (
                        <tr><td colSpan="9" style={{ textAlign: "center", color: "#666" }}>No students have appeared for this exam yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {/* STUDENT DETAIL VIEW */}
              {resultViewLevel === "student_detail" && selectedStudentResult && (
                <div className={styles.card} style={{ width: "100%", maxWidth: "1000px", margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
                    <h3>Detailed Report: {selectedStudentResult.result?.student_name}</h3>
                    <button onClick={() => setResultViewLevel("student_list")} style={{ background: "#666", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }}>Back to List</button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
                    <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}>
                      <h4 style={{ color: "#1e5bbf", marginBottom: "15px" }}>Student Information</h4>
                      <p><strong>Name:</strong> {selectedStudentResult.result?.student_name}</p>
                      <p><strong>Roll No:</strong> {selectedStudentResult.result?.roll_no}</p>
                      <p><strong>Email:</strong> {selectedStudentResult.result?.email}</p>
                      <p><strong>Batch:</strong> {selectedStudentResult.result?.batch_name}</p>
                      <p><strong>Mobile:</strong> {selectedStudentResult.result?.mobile_no}</p>
                    </div>
                    <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}>
                      <h4 style={{ color: "#1e5bbf", marginBottom: "15px" }}>Exam Performance</h4>
                      <p><strong>Exam Name:</strong> {selectedStudentResult.result?.exam_name}</p>
                      <p><strong>Exam Type:</strong> {selectedStudentResult.result?.exam_type}</p>
                      <p><strong>Score:</strong> <span className={selectedStudentResult.result?.percentage >= 40 ? styles.pass : styles.fail}>{selectedStudentResult.result?.percentage}%</span></p>
                      <p><strong>Status:</strong> <span className={selectedStudentResult.result?.result_status === 'Pass' ? styles.pass : styles.fail}>{selectedStudentResult.result?.result_status}</span></p>
                      <p><strong>Questions Attempted:</strong> {selectedStudentResult.result?.attempted_questions} / {selectedStudentResult.result?.total_questions}</p>
                      <p><strong>Correct Answers:</strong> {selectedStudentResult.result?.correct_answers}</p>
                      <p><strong>Time Taken:</strong> {Math.floor(selectedStudentResult.result?.time_taken_seconds / 60)}m {selectedStudentResult.result?.time_taken_seconds % 60}s</p>
                    </div>
                  </div>

                  <h4 style={{ color: "#1e5bbf", marginBottom: "15px" }}>Question-wise Analysis</h4>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Q.No</th>
                        <th>Question</th>
                        <th>Your Answer</th>
                        <th>Correct Answer</th>
                        <th>Status</th>
                        <th>Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudentResult.responses.map((resp, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ maxWidth: "300px", textAlign: "left" }}>{resp.question_text}</td>
                          <td>{resp.selected_answer || 'N/A'}</td>
                          <td>{resp.correct_option_label}</td>
                          <td>
                            <span style={{ color: resp.is_correct ? "green" : "red", fontWeight: "bold" }}>
                              {resp.is_correct ? "Correct" : "Incorrect"}
                            </span>
                          </td>
                          <td>{resp.is_correct ? resp.marks : 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeMenu === "settings" && (
            <>
              {!editMode ? (
                <>
                  <h2 style={{ textAlign: "center" }}>Exam Settings</h2>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Exam Name</th>
                        <th>Exam Type</th>
                        <th>Target Batch</th>
                        <th>Target Year</th>
                        <th>Assigned Students</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Duration</th>
                        <th>Questions</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {exams.length > 0 ? exams.map((exam) => (
                        <tr key={exam.exam_id}>
                          <td>{exam.exam_name}</td>
                          <td>{exam.exam_type}</td>
                          <td>{exam.target_batch_name || 'All'}</td>
                          <td>{exam.target_admission_year || 'All'}</td>
                          <td>{exam.assigned_students || 0}</td>
                          <td><span className={styles.upcoming}>{exam.exam_status || 'Available'}</span></td>
                          <td>{exam.exam_date}</td>
                          <td>{exam.exam_time}</td>
                          <td>{exam.duration_minutes} min</td>
                          <td>{exam.total_questions}</td>
                          <td>
                            <button onClick={() => handleEditExam(exam)}>Edit</button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="13">No exams created yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className={styles.card}>
                  <h2>Edit Exam</h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Exam Name</label>
                      <input 
                        value={examName} 
                        onChange={(e)=>setExamName(e.target.value)} 
                        placeholder="Exam Name"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Exam Type</label>
                      <select 
                        value={editExamType} 
                        onChange={(e)=>setEditExamType(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      >
                        <option value="">Select Type</option>
                        <option value="NDA">NDA</option>
                        <option value="SSC">SSC</option>
                        <option value="CET">CET</option>
                        <option value="NEET">NEET</option>
                        <option value="JEE">JEE</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Target Batch</label>
                      <input 
                        value={editTargetBatch} 
                        onChange={(e)=>setEditTargetBatch(e.target.value)} 
                        placeholder="e.g., SSC-A"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Target Year</label>
                      <input 
                        type="number"
                        value={editTargetYear} 
                        onChange={(e)=>setEditTargetYear(e.target.value)} 
                        placeholder="e.g., 2024"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date</label>
                      <input 
                        type="date" 
                        value={date} 
                        onChange={(e)=>setDate(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Time</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input 
                          value={hour} 
                          onChange={(e)=>setHour(e.target.value)} 
                          placeholder="HH"
                          style={{ width: '50%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <input 
                          value={minute} 
                          onChange={(e)=>setMinute(e.target.value)} 
                          placeholder="MM"
                          style={{ width: '50%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Duration (minutes)</label>
                      <input 
                        type="number"
                        value={editDuration} 
                        onChange={(e)=>setEditDuration(e.target.value)} 
                        placeholder="e.g., 30"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
                      <select 
                        value={editStatus} 
                        onChange={(e)=>setEditStatus(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      >
                        <option value="Available">Available</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Expired">Expired</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={editReassign} 
                        onChange={(e) => setEditReassign(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontWeight: 'bold', color: '#1e5bbf' }}>
                        Re-assign students based on new criteria
                      </span>
                    </label>
                    {editReassign && (
                      <p style={{ margin: '5px 0 0 26px', fontSize: '12px', color: '#666' }}>
                        Students matching the exam type, batch and year will be assigned automatically
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className={styles.btn} onClick={handleUpdateExam}>Save Changes</button>
                    <button className={`${styles.btn} ${styles.logoutBtn}`} onClick={() => handleDeleteExam(editingExam.exam_id)}>Delete</button>
                    <button className={styles.btn} onClick={() => { setEditMode(false); setEditingExam(null); }}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
          {/* ================= PROFILE ================= */}
          
          {activeMenu === "profile" && (

            <div className={styles.profileContainer}>

              {profileView === "view" && (
                <>
                  <div className={styles.profileHeader}>
                    <div>
                      <h2>Admin Profile</h2>
                      <p>Vijeeta Foundation</p>
                    </div>

                    <div className={styles.profileRight}>
                      <span>{adminData?.admin_name || 'Admin'}</span>
                      <div className={styles.profileImg}></div>
                    </div>
                  </div>

                  <div className={styles.topCard}>

                    <div className={styles.profileGrid}>

                      <div className={styles.profileBox}>
                        <h3>Personal Details</h3>
                        <p><b>Name:</b> {adminData?.admin_name || 'N/A'}</p>
                        <p><b>Admin ID:</b> VF-ADM-C01</p>
                        <p><b>Email:</b> {adminData?.email || 'N/A'}</p>
                        <p><b>Mobile:</b> {adminData?.mobile_no || 'N/A'}</p>
                        <p><b>Role:</b>Super Admin </p>
                      </div>

                      <div className={styles.profileBox}>
                        <h3>Academy Details</h3>
                        <p><b>Academy:</b> {adminData?.academy_name || 'Vijeeta Foundation'}</p>
                        <p><b>Branch:</b> Main Branch</p>
                        <p><b>Address:</b> {adminData?.city || 'Ashta'}, {adminData?.state || 'MH'}</p>
                        <p><b> Total Students:</b> {students.length}</p>
                        <p><b>Exams Conducted:</b> 25+</p>
                       
                      </div>

                    </div>

                    <div className={styles.securityBox}>
                      <h3>Security</h3>
                      <p><b>Last Login:</b> 25 July 2026</p>
                      <p><b>Status:</b> <span className={styles.activeStatus}>Active</span></p>
                      <p><b>Password Changed:</b> 20 July 2026</p>
                    </div>

                    <div className={styles.profileFooter}>
                      <button className={styles.commonBtn} onClick={()=>setProfileView("edit")}>Edit Profile</button>
                      <button className={styles.commonBtn} onClick={()=>setProfileView("password")}>Change Password</button>
                     <button className={`${styles.commonBtn} ${styles.logoutBtn}`} onClick={handleLogout}>Logout</button>
                    </div>

                  </div>
                </>
              )}

              {profileView === "edit" && (
                <div className={styles.card}>
                  <h2>Edit Profile</h2>

                  <input value={editName} onChange={(e)=>setEditName(e.target.value)} placeholder="Name"/>
                  <input value={editEmail} onChange={(e)=>setEditEmail(e.target.value)} placeholder="Email"/>
                  <input value={editMobile} onChange={(e)=>setEditMobile(e.target.value)} placeholder="Mobile"/>

                  <button className={styles.btn} onClick={updateAdminProfile}>Update</button>

                  <button className={styles.btn} onClick={()=>setProfileView("view")}>Back</button>
                </div>
              )}

              {profileView === "password" && (
                <div className={styles.card}>
                  <h2>Change Password</h2>

                  <input type="password" value={oldPass} onChange={(e)=>setOldPass(e.target.value)} placeholder="Old Password"/>
                  <input type="password" value={newPass} onChange={(e)=>setNewPass(e.target.value)} placeholder="New Password"/>
                  <input type="password" value={confirmPass} onChange={(e)=>setConfirmPass(e.target.value)} placeholder="Confirm Password"/>

                  <button className={styles.btn} onClick={changePassword}>Update Password</button>

                  <button className={styles.btn} onClick={()=>setProfileView("view")}>Back</button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
   }
  
                
                
          
                


