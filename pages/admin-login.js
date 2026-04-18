import React, { useState } from "react";
import styles from "../styles/Login.module.css";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vijeta-api.onrender.com';
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.message === "Login successful") {
        localStorage.setItem('admin', JSON.stringify(data.admin));
        alert("Login Successful");
        router.push("/admin-dashboard");
      } else {
        alert("Invalid Credentials");
      }
    } catch (err) {
      console.log(err);
      alert("Error logging in");
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
        <h3>Admin Login</h3>

        <input
          className={styles.input}
          type="text"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className={styles.input}
          type="password"
          placeholder="Password"
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


