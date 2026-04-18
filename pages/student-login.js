import React, { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Login.module.css";

export default function StudentLogin() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {

    if (!username || !password) {
      alert("Please fill all fields!");
      return;
    }

    try {
      const res = await fetch("https://vijeta-api.onrender.com/api/students/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: username,   // username = email
          password: password
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("Login Successful");
        // Store student data in localStorage
        localStorage.setItem('student', JSON.stringify(data.student));
        router.push("/student-dashboard"); // redirect to student dashboard
      } else {
        alert(data.message || "Invalid Credentials");
      }

    } catch (err) {
      console.log(err);
      alert("Server Error");
    }
  };

  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <h2>Vijeta Foundation</h2>
        <div className={styles.profile}></div>
      </div>

      {/* Login Box */}
      <div className={styles.loginBox}>
        <h3>Student Login</h3>

        <input
          type="text"
          placeholder="Enter Email"
          className={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter Password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className={styles.button} onClick={handleLogin}>
          Login
        </button>

        <button 
          className={styles.button} 
          onClick={() => router.push('/')}
          style={{ 
            marginTop: '10px', 
            backgroundColor: '#6c757d',
            border: 'none'
          }}
        >
          Back to Home
        </button>
      </div>

    </div>
  );
}

