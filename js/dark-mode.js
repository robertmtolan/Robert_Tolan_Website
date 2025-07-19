// Dark Mode Toggle Functionality

class DarkModeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'system';
        this.systemTheme = this.getSystemTheme();
        this.init();
    }

    init() {
        // Set initial theme
        this.applyTheme();
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.systemTheme = e.matches ? 'dark' : 'light';
            if (this.theme === 'system') {
                this.applyTheme();
            }
        });

        // Add toggle button event listeners
        document.addEventListener('DOMContentLoaded', () => {
            this.setupToggleButtons();
        });
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    getCurrentTheme() {
        if (this.theme === 'system') {
            return this.systemTheme;
        }
        return this.theme;
    }

    applyTheme() {
        const currentTheme = this.getCurrentTheme();
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        // Update toggle button icons
        this.updateToggleIcons();
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
    }

    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setupToggleButtons() {
        const toggleButtons = document.querySelectorAll('.theme-toggle');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.toggleTheme();
            });
        });
    }

    updateToggleIcons() {
        const currentTheme = this.getCurrentTheme();
        const toggleButtons = document.querySelectorAll('.theme-toggle');
        
        toggleButtons.forEach(button => {
            const icon = button.querySelector('i');
            if (icon) {
                if (currentTheme === 'dark') {
                    icon.className = 'fas fa-sun';
                    icon.setAttribute('title', 'Switch to light mode');
                } else {
                    icon.className = 'fas fa-moon';
                    icon.setAttribute('title', 'Switch to dark mode');
                }
            }
        });
    }
}

// Initialize dark mode manager
const darkModeManager = new DarkModeManager(); 