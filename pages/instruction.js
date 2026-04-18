import React, { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Login.module.css";

export default function Instruction() {
  const [agree, setAgree] = useState(false);
  const router = useRouter();

  const startExam = () => {
    if (agree) {
      // ✅ Redirect to exam page with examId (assuming exam 1 for now)
      router.push("/exam?examId=1");
    } else {
      alert("Please accept instructions");
    }
  };

  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <h2>Vijeta Foundation</h2>
        <div className={styles.profile}></div>
      </div>

      {/* Instruction Box */}
      <div className={styles.loginBox}>
        <h3>Exam Instructions</h3>

        <ul style={{ textAlign: "left", marginTop: "10px" }}>
          <li>Read all questions carefully.</li>
          <li>Do not refresh the page during exam.</li>
          <li>Each question has only one correct answer.</li>
          <li>Time is limited, manage your time properly.</li>
          <li>Once submitted, you cannot change answers.</li>
        </ul>

        <div style={{ marginTop: "15px" }}>
          <input
            type="checkbox"
            checked={agree}
            onChange={() => setAgree(!agree)}
          />
          <span style={{ marginLeft: "8px" }}>
            I agree to all instructions
          </span>
        </div>

        <button
          className={styles.button}
          onClick={startExam}
          style={{ marginTop: "15px" }}
        >
          Start Exam
        </button>
      </div>

    </div>
  );
}