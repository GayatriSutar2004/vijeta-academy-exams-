import React from "react";
import { useRouter } from "next/router";
import styles from "../styles/Login.module.css";

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <h2>Vijeta Foundation</h2>
        <div className={styles.profile}></div>
      </div>

      {/* Selection Box */}
      <div className={styles.loginBox}>
        <h3>Select Login Type</h3>

        <button
          className={styles.button}
          onClick={() => router.push("/admin-login")}
        >
          Admin Login
        </button>

        <button
          className={styles.button}
          onClick={() => router.push("/student-login")}
        >
          Student Login
        </button>
      </div>

    </div>
  );
}