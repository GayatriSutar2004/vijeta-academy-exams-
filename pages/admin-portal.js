import styles from '../styles/Admin.module.css';

export default function AdminPortal() {
  return (
    <div className={styles.portalContainer}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.logo}>
          <h2>Vijeta Academy</h2>
        </div>
        
        <nav className={styles.navMenu}>
          <a href="/admin-dashboard" className={styles.navItem}>
            <span className={styles.navIcon}>📊</span>
            Dashboard
          </a>
          <a href="/admin-dashboard#exams" className={styles.navItem}>
            <span className={styles.navIcon}>📝</span>
            Exams  
          </a>
          <a href="/admin-dashboard#students" className={styles.navItem}>
            <span className={styles.navIcon}>👥</span>
            Students
          </a>
          <a href="/admin-dashboard#results" className={styles.navItem}>
            <span className={styles.navIcon}>📊</span>
            Results
          </a>
          <a href="/convert-document" className={styles.navItem}>
            <span className={styles.navIcon}>🔄</span>
            Convert Doc
          </a>
        </nav>
        
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>A</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>Admin</div>
            <div className={styles.userRole}>Administrator</div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <h1>Vijeta Academy Admin Portal</h1>
          <div className={styles.headerActions}>
            <button className={styles.primaryBtn}>Create Exam</button>
            <button className={styles.secondaryBtn}>Add Student</button>
          </div>
        </header>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📝</div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>24</div>
              <div className={styles.statLabel}>Active Exams</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>156</div>
              <div className={styles.statLabel}>Total Students</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>89</div>
              <div className={styles.statLabel}>Results Published</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statInfo}>
              <div className={styles.statNumber}>92%</div>
              <div className={styles.statLabel}>Pass Rate</div>
            </div>
          </div>
        </div>
        
        <div className={styles.contentGrid}>
          <div className={styles.card}>
            <h3>Recent Exams</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Date</th>
                  <th>Students</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>SSB-A test2</td>
                  <td>2026-04-19</td>
                  <td>45</td>
                  <td><span className={styles.published}>Published</span></td>
                </tr>
                <tr>
                  <td>Police-A test1</td>
                  <td>2026-04-18</td>
                  <td>38</td>
                  <td><span className={styles.draft}>Draft</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className={styles.card}>
            <h3>Quick Actions</h3>
            <div className={styles.actionList}>
              <button className={styles.actionBtn}>
                <span>📄</span> Convert Word to Exam
              </button>
              <button className={styles.actionBtn}>
                <span>📊</span> View Results
              </button>
              <button className={styles.actionBtn}>
                <span>👥</span> Manage Students
              </button>
              <button className={styles.actionBtn}>
                <span>⚙️</span> Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
