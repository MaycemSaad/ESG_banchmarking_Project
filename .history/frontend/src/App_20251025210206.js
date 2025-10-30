/* Variables CSS pour les thèmes */
:root {
  --primary-color: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #8b5cf6;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  
  /* Light theme */
  --light-bg: #ffffff;
  --light-surface: #f8fafc;
  --light-surface-alt: #e2e8f0;
  --light-text: #1e293b;
  --light-text-secondary: #64748b;
  --light-border: #e2e8f0;
  
  /* Dark theme */
  --dark-bg: #0f172a;
  --dark-surface: #1e293b;
  --dark-surface-alt: #334155;
  --dark-text: #f1f5f9;
  --dark-text-secondary: #cbd5e1;
  --dark-border: #334155;
  
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --gradient-primary: linear-gradient(135deg, var(--primary-color), var(--primary-light));
}

/* Application des thèmes */
.App.dark {
  --bg-color: var(--dark-bg);
  --surface-color: var(--dark-surface);
  --surface-alt: var(--dark-surface-alt);
  --text-primary: var(--dark-text);
  --text-secondary: var(--dark-text-secondary);
  --border-color: var(--dark-border);
}

.App.light {
  --bg-color: var(--light-bg);
  --surface-color: var(--light-surface);
  --surface-alt: var(--light-surface-alt);
  --text-primary: var(--light-text);
  --text-secondary: var(--light-text-secondary);
  --border-color: var(--light-border);
}

body.dark-mode {
  background-color: var(--dark-bg);
  color: var(--dark-text);
}

body.light-mode {
  background-color: var(--light-bg);
  color: var(--light-text);
}

/* Reset et base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.App {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

/* Navigation principale */
.main-nav {
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  background: var(--gradient-primary);
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.quick-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--surface-alt);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.stat-icon {
  color: var(--primary-color);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.theme-toggle {
  background: var(--surface-alt);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  background: var(--primary-color);
  color: white;
  transform: rotate(15deg);
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Navigation par onglets */
.tab-nav {
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 0;
}

.tab-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  gap: 0.5rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  font-weight: 500;
  border-bottom: 3px solid transparent;
}

.tab-button:hover {
  color: var(--primary-color);
  background: var(--surface-alt);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-button:disabled:hover {
  color: var(--text-secondary);
  background: none;
}

.active-indicator {
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: var(--primary-color);
  border-radius: 50%;
}

/* Contenu principal */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.results-container {
  flex: 1;
  padding: 2rem;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Page d'accueil pleine écran */
.home-fullscreen {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

/* Notifications */
.process-result {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
  border-left: 4px solid;
  position: relative;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
}

.process-result.success {
  border-left-color: var(--success-color);
}

.process-result.error {
  border-left-color: var(--error-color);
}

.result-content {
  flex: 1;
}

.result-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.result-icon {
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.result-text h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.result-text p {
  color: var(--text-secondary);
}

.result-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: var(--primary-color);
  color: white;
}

.action-btn.primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: var(--surface-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  background: var(--surface-alt);
  transform: translateY(-1px);
}

.close-result {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-result:hover {
  background: var(--surface-alt);
  color: var(--text-primary);
}

/* Footer */
.app-footer {
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.footer-brand p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.footer-tech {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tech-badge {
  background: var(--gradient-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }

  .nav-controls {
    width: 100%;
    justify-content: space-between;
  }

  .quick-stats {
    display: none;
  }

  .tab-container {
    padding: 0 1rem;
    overflow-x: auto;
  }

  .tab-button {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .results-container {
    padding: 1rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .home-fullscreen {
    min-height: calc(100vh - 120px);
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .brand-name {
    font-size: 1.25rem;
  }

  .logo {
    padding: 0.5rem;
  }

  .logo svg {
    width: 24px;
    height: 24px;
  }

  .result-actions {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }
}/* Variables CSS pour les thèmes */
:root {
  --primary-color: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #8b5cf6;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  
  /* Light theme */
  --light-bg: #ffffff;
  --light-surface: #f8fafc;
  --light-surface-alt: #e2e8f0;
  --light-text: #1e293b;
  --light-text-secondary: #64748b;
  --light-border: #e2e8f0;
  
  /* Dark theme */
  --dark-bg: #0f172a;
  --dark-surface: #1e293b;
  --dark-surface-alt: #334155;
  --dark-text: #f1f5f9;
  --dark-text-secondary: #cbd5e1;
  --dark-border: #334155;
  
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --gradient-primary: linear-gradient(135deg, var(--primary-color), var(--primary-light));
}

/* Application des thèmes */
.App.dark {
  --bg-color: var(--dark-bg);
  --surface-color: var(--dark-surface);
  --surface-alt: var(--dark-surface-alt);
  --text-primary: var(--dark-text);
  --text-secondary: var(--dark-text-secondary);
  --border-color: var(--dark-border);
}

.App.light {
  --bg-color: var(--light-bg);
  --surface-color: var(--light-surface);
  --surface-alt: var(--light-surface-alt);
  --text-primary: var(--light-text);
  --text-secondary: var(--light-text-secondary);
  --border-color: var(--light-border);
}

body.dark-mode {
  background-color: var(--dark-bg);
  color: var(--dark-text);
}

body.light-mode {
  background-color: var(--light-bg);
  color: var(--light-text);
}

/* Reset et base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.App {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

/* Navigation principale */
.main-nav {
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  background: var(--gradient-primary);
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.quick-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--surface-alt);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.stat-icon {
  color: var(--primary-color);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.theme-toggle {
  background: var(--surface-alt);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  background: var(--primary-color);
  color: white;
  transform: rotate(15deg);
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Navigation par onglets */
.tab-nav {
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 0;
}

.tab-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  gap: 0.5rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  font-weight: 500;
  border-bottom: 3px solid transparent;
}

.tab-button:hover {
  color: var(--primary-color);
  background: var(--surface-alt);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-button:disabled:hover {
  color: var(--text-secondary);
  background: none;
}

.active-indicator {
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: var(--primary-color);
  border-radius: 50%;
}

/* Contenu principal */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.results-container {
  flex: 1;
  padding: 2rem;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Page d'accueil pleine écran */
.home-fullscreen {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

/* Notifications */
.process-result {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
  border-left: 4px solid;
  position: relative;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
}

.process-result.success {
  border-left-color: var(--success-color);
}

.process-result.error {
  border-left-color: var(--error-color);
}

.result-content {
  flex: 1;
}

.result-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.result-icon {
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.result-text h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.result-text p {
  color: var(--text-secondary);
}

.result-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: var(--primary-color);
  color: white;
}

.action-btn.primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: var(--surface-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  background: var(--surface-alt);
  transform: translateY(-1px);
}

.close-result {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-result:hover {
  background: var(--surface-alt);
  color: var(--text-primary);
}

/* Footer */
.app-footer {
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.footer-brand p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.footer-tech {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tech-badge {
  background: var(--gradient-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }

  .nav-controls {
    width: 100%;
    justify-content: space-between;
  }

  .quick-stats {
    display: none;
  }

  .tab-container {
    padding: 0 1rem;
    overflow-x: auto;
  }

  .tab-button {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .results-container {
    padding: 1rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .home-fullscreen {
    min-height: calc(100vh - 120px);
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .brand-name {
    font-size: 1.25rem;
  }

  .logo {
    padding: 0.5rem;
  }

  .logo svg {
    width: 24px;
    height: 24px;
  }

  .result-actions {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }
}