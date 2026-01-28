import styles from './PrivacyPolicy.module.css'

const LAST_UPDATED = 'January 22, 2026'

export default function PrivacyPolicy() {
  return (
    <main className={styles.page} id="main">
      <header className={styles.header}>
        <h1>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>
      </header>

      <section className={styles.section}>
        <h2>Overview</h2>
        <p>
          This Privacy Policy explains how the YO3 Platform frontend handles information
          when you use the application. We are committed to minimizing data collection,
          securing data in transit, and giving you control over your information.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Information We Collect</h2>
        <ul>
          <li>
            <strong>Account information:</strong> If you sign in, we process your username
            and authentication tokens to establish your session.
          </li>
          <li>
            <strong>Usage telemetry:</strong> We may collect aggregated, non-identifying
            analytics to improve reliability and performance.
          </li>
          <li>
            <strong>Device and browser data:</strong> Basic technical details (e.g., browser
            type, language, or screen size) may be processed to ensure compatibility.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>How We Use Information</h2>
        <ul>
          <li>Provide and secure access to the platform.</li>
          <li>Maintain system reliability, detect abuse, and prevent fraud.</li>
          <li>Improve user experience and feature quality.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Data Minimization & Security</h2>
        <ul>
          <li>We store the minimum data required for operation.</li>
          <li>Sensitive data is encrypted in transit using TLS where supported.</li>
          <li>Access to operational data is restricted to authorized personnel.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Sharing & Disclosure</h2>
        <p>
          We do not sell personal data. We only share information when required to
          provide the service, comply with law, or protect the platform from abuse.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Data Retention</h2>
        <p>
          We retain data only as long as necessary for the purposes described above or as
          required by law. You can request deletion where applicable.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Your Choices</h2>
        <ul>
          <li>Contact us to request access, correction, or deletion of your data.</li>
          <li>Control cookies or local storage through your browser settings.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Contact</h2>
        <p>
          For privacy questions or requests, contact us at{' '}
          <a href="mailto:privacy@yo3-platform.com">privacy@yo3-platform.com</a>.
        </p>
      </section>
    </main>
  )
}
