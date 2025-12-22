// Frontend Service - JavaScript with Authentication
// Location: services/frontend/src/app.js

// API base URLs
const API_URL = 'http://localhost:3000';
const AUTH_URL = 'http://localhost:4000';

// SimpleWebAuthn functions from CDN
const { startRegistration, startAuthentication } = SimpleWebAuthnBrowser;

// State
let users = [];
let roasteries = [];
let currentUser = null;

// ============== AUTHENTICATION ==============

// Check if user is already logged in
async function checkSession() {
    try {
        const response = await fetch(`${AUTH_URL}/session`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            showMainContent();
            updateAuthUI();
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showAuthModal();
    }
}

// Show/hide UI elements based on auth state
function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
}

function showMainContent() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

function updateAuthUI() {
    if (currentUser) {
        document.getElementById('user-info').textContent = `👤 ${currentUser.username}`;
        document.getElementById('logout-btn').style.display = 'block';
    } else {
        document.getElementById('user-info').textContent = '';
        document.getElementById('logout-btn').style.display = 'none';
    }
}

// Show auth message
function showAuthMessage(message, type = 'error') {
    const messageDiv = document.getElementById('auth-message');
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// ============== REGISTRATION FLOW ==============

async function registerWithPasskey(username, email) {
    try {
        showAuthMessage('Starting registration...', 'info');
        
        // Step 1: Get registration options from server
        const optionsResponse = await fetch(`${AUTH_URL}/register/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email })
        });
        
        if (!optionsResponse.ok) {
            const error = await optionsResponse.json();
            throw new Error(error.error || 'Registration failed');
        }
        
        const options = await optionsResponse.json();
        
        showAuthMessage('Please use your device to create a passkey...', 'info');
        
        // Step 2: Use device to create credential
        let credential;
        try {
            credential = await startRegistration(options);
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Registration cancelled or timed out');
            }
            throw error;
        }
        
        showAuthMessage('Verifying your passkey...', 'info');
        
        // Step 3: Send credential to server for verification
        const verifyResponse = await fetch(`${AUTH_URL}/register/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ credential })
        });
        
        if (!verifyResponse.ok) {
            const error = await verifyResponse.json();
            throw new Error(error.error || 'Verification failed');
        }
        
        const result = await verifyResponse.json();
        
        if (result.verified) {
            showAuthMessage('Registration successful! Welcome!', 'success');
            currentUser = result.user;
            setTimeout(() => {
                showMainContent();
                updateAuthUI();
                fetchUsers();
                fetchRoasteries();
            }, 1000);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAuthMessage(error.message || 'Registration failed', 'error');
    }
}

// ============== AUTHENTICATION FLOW ==============

async function loginWithPasskey(username) {
    try {
        showAuthMessage('Starting login...', 'info');
        
        // Step 1: Get authentication options from server
        const optionsResponse = await fetch(`${AUTH_URL}/login/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: username || undefined })
        });
        
        if (!optionsResponse.ok) {
            const error = await optionsResponse.json();
            throw new Error(error.error || 'Login failed');
        }
        
        const options = await optionsResponse.json();
        
        showAuthMessage('Please authenticate with your device...', 'info');
        
        // Step 2: Use device to authenticate
        let credential;
        try {
            credential = await startAuthentication(options);
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Authentication cancelled or timed out');
            }
            throw error;
        }
        
        showAuthMessage('Verifying...', 'info');
        
        // Step 3: Send credential to server for verification
        const verifyResponse = await fetch(`${AUTH_URL}/login/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ credential })
        });
        
        if (!verifyResponse.ok) {
            const error = await verifyResponse.json();
            throw new Error(error.error || 'Verification failed');
        }
        
        const result = await verifyResponse.json();
        
        if (result.verified) {
            showAuthMessage('Login successful! Welcome back!', 'success');
            currentUser = result.user;
            setTimeout(() => {
                showMainContent();
                updateAuthUI();
                fetchUsers();
                fetchRoasteries();
            }, 1000);
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage(error.message || 'Login failed', 'error');
    }
}

// ============== LOGOUT ==============

async function logout() {
    try {
        await fetch(`${AUTH_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        updateAuthUI();
        showAuthModal();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ============== TAB SWITCHING ==============

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// ============== FORM HANDLERS ==============

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    await registerWithPasskey(username, email);
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    await loginWithPasskey(username);
});

document.getElementById('logout-btn').addEventListener('click', logout);

// ============== EXISTING FUNCTIONALITY ==============

// Helper function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Helper function to show messages
function showMessage(elementId, message, type = 'error') {
    const container = document.getElementById(elementId);
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => messageDiv.remove(), 5000);
}

// Fetch data
async function fetchRoasteries() {
    try {
        const response = await fetch(`${API_URL}/roasteries`);
        if (!response.ok) throw new Error('Failed to fetch roasteries');
        roasteries = await response.json();
        renderRoasteries();
    } catch (error) {
        console.error('Error fetching roasteries:', error);
        document.getElementById('roasteries-list').innerHTML = 
            '<p class="error">Failed to load roasteries. Make sure the API service is running!</p>';
    }
}

async function fetchUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        users = await response.json();
        renderUsers();
        updateOwnerDropdown();
    } catch (error) {
        console.error('Error fetching users:', error);
        document.getElementById('users-list').innerHTML = 
            '<p class="error">Failed to load users. Make sure the API service is running!</p>';
    }
}

// Render data
function renderRoasteries() {
    const container = document.getElementById('roasteries-list');
    
    if (roasteries.length === 0) {
        container.innerHTML = '<p class="loading">No roasteries yet. Add one above!</p>';
        return;
    }
    
    container.innerHTML = roasteries.map(roastery => `
        <div class="card">
            <h4>${roastery.name}</h4>
            <p><strong>📍 Location:</strong> ${roastery.location}</p>
            ${roastery.description ? `<p>${roastery.description}</p>` : ''}
            ${roastery.owner_username ? 
                `<p class="owner">👤 Owner: ${roastery.owner_username} (${roastery.owner_email})</p>` : 
                '<p class="owner">👤 No owner assigned</p>'
            }
            <p class="date">Added: ${formatDate(roastery.created_at)}</p>
        </div>
    `).join('');
}

function renderUsers() {
    const container = document.getElementById('users-list');
    
    if (users.length === 0) {
        container.innerHTML = '<p class="loading">No users yet.</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="card user-card">
            <h4>${user.username}</h4>
            <p class="email">✉️ ${user.email}</p>
            <p class="date">Joined: ${formatDate(user.created_at)}</p>
        </div>
    `).join('');
}

function updateOwnerDropdown() {
    const select = document.getElementById('roastery-owner');
    
    // Keep the "No owner" option
    select.innerHTML = '<option value="">No owner</option>';
    
    // Add user options
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.username} (${user.email})`;
        select.appendChild(option);
    });
}

// Create data
async function createRoastery(name, location, description, ownerId) {
    try {
        const response = await fetch(`${API_URL}/roasteries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                location,
                description,
                owner_id: ownerId || null
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create roastery');
        }
        
        await fetchRoasteries();
        showMessage('roasteries-list', 'Roastery added successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error creating roastery:', error);
        showMessage('roasteries-list', error.message);
        return false;
    }
}

document.getElementById('roastery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('roastery-name').value.trim();
    const location = document.getElementById('roastery-location').value.trim();
    const description = document.getElementById('roastery-description').value.trim();
    const ownerId = document.getElementById('roastery-owner').value;
    
    const success = await createRoastery(name, location, description, ownerId);
    
    if (success) {
        e.target.reset();
    }
});

// ============== INITIALIZATION ==============

window.addEventListener('DOMContentLoaded', () => {
    console.log('Coffelist Frontend Service loaded!');
    console.log('Connecting to API Service at:', API_URL);
    console.log('Connecting to Auth Service at:', AUTH_URL);
    
    setupTabs();
    checkSession();
});