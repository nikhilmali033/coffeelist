// Frontend Service - JavaScript
// Location: services/frontend/src/app.js

// API base URL - Express backend service
const API_URL = 'http://localhost:3000';

// State
let users = [];
let roasteries = [];

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

// ============== FETCH DATA ==============

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

// ============== RENDER DATA ==============

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
        container.innerHTML = '<p class="loading">No users yet. Add one above!</p>';
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

// ============== CREATE DATA ==============

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
        
        await fetchRoasteries(); // Refresh the list
        showMessage('roasteries-list', 'Roastery added successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error creating roastery:', error);
        showMessage('roasteries-list', error.message);
        return false;
    }
}

async function createUser(username, email) {
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }
        
        await fetchUsers(); // Refresh the list
        showMessage('users-list', 'User added successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error creating user:', error);
        showMessage('users-list', error.message);
        return false;
    }
}

// ============== FORM HANDLERS ==============

document.getElementById('roastery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('roastery-name').value.trim();
    const location = document.getElementById('roastery-location').value.trim();
    const description = document.getElementById('roastery-description').value.trim();
    const ownerId = document.getElementById('roastery-owner').value;
    
    const success = await createRoastery(name, location, description, ownerId);
    
    if (success) {
        // Clear form
        e.target.reset();
    }
});

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('user-username').value.trim();
    const email = document.getElementById('user-email').value.trim();
    
    const success = await createUser(username, email);
    
    if (success) {
        // Clear form
        e.target.reset();
    }
});

// ============== INITIALIZATION ==============

// Load data when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Coffelist Frontend Service loaded!');
    console.log('Connecting to API Service at:', API_URL);
    
    fetchUsers();
    fetchRoasteries();
});