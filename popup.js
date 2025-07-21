document.addEventListener('DOMContentLoaded', function() {
    // --- Element References ---
    const profileSelector = document.getElementById('profileSelector');
    const newProfileNameInput = document.getElementById('newProfileName');
    const addProfileButton = document.getElementById('addProfileButton');
    const deleteProfileButton = document.getElementById('deleteProfileButton');
    const listHeader = document.getElementById('listHeader');
    
    const companyNameInput = document.getElementById('companyName');
    const applicationLinkInput = document.getElementById('applicationLink');
    const applicationDateInput = document.getElementById('applicationDate');
    const applicationStatusInput = document.getElementById('applicationStatus');
    const applicationNotesInput = document.getElementById('applicationNotes');
    const saveButton = document.getElementById('saveButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const editingIdInput = document.getElementById('editingId');
    const applicationsList = document.getElementById('applicationsList');

    // --- Color mapping for status badges ---
    const statusColors = {
        "Applied": "#3b82f6", "Aptitude Test": "#eab308", "DSA Round": "#f97316",
        "Technical Interview": "#8b5cf6", "HR Interview": "#ec4899", "Group Discussion": "#14b8a6",
        "Offer": "#22c55e", "Rejected": "#ef4444"
    };

    // --- Data Keys for chrome.storage ---
    const DATA_KEY = 'jobTrackerData';
    const PROFILE_KEY = 'jobTrackerCurrentProfile';

    // --- App Initialization ---
    initializeApp();

    // --- Event Listeners ---
    profileSelector.addEventListener('change', handleProfileChange);
    addProfileButton.addEventListener('click', handleAddProfile);
    deleteProfileButton.addEventListener('click', handleDeleteProfile);
    saveButton.addEventListener('click', handleSaveApplication);
    cancelEditButton.addEventListener('click', exitEditMode);

    // --- Functions ---

    function initializeApp() {
        chrome.storage.local.get([DATA_KEY, PROFILE_KEY], function(data) {
            let allData = data[DATA_KEY] || {};
            let currentProfile = data[PROFILE_KEY];

            // If no data exists, create a default profile
            if (Object.keys(allData).length === 0) {
                allData = { 'Default': [] };
                currentProfile = 'Default';
                chrome.storage.local.set({ [DATA_KEY]: allData, [PROFILE_KEY]: currentProfile });
            } else if (!currentProfile || !allData[currentProfile]) {
                // If current profile is invalid, switch to the first available one
                currentProfile = Object.keys(allData)[0];
                chrome.storage.local.set({ [PROFILE_KEY]: currentProfile });
            }
            
            populateProfileSelector(allData, currentProfile);
            loadApplicationsForProfile(currentProfile, allData);
            setInitialValues();
        });
    }

    function populateProfileSelector(allData, currentProfile) {
        profileSelector.innerHTML = '';
        for (const profileName in allData) {
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            if (profileName === currentProfile) {
                option.selected = true;
            }
            profileSelector.appendChild(option);
        }
    }

    function handleProfileChange() {
        const newProfile = profileSelector.value;
        chrome.storage.local.set({ [PROFILE_KEY]: newProfile }, () => {
             chrome.storage.local.get(DATA_KEY, (data) => {
                loadApplicationsForProfile(newProfile, data[DATA_KEY]);
             });
        });
    }
    
    function handleAddProfile() {
        const newProfileName = newProfileNameInput.value.trim();
        if (!newProfileName) return;

        chrome.storage.local.get([DATA_KEY], function(data) {
            let allData = data[DATA_KEY] || {};
            if (allData[newProfileName]) {
                alert('Profile with this name already exists.');
                return;
            }
            allData[newProfileName] = [];
            chrome.storage.local.set({ [DATA_KEY]: allData, [PROFILE_KEY]: newProfileName }, () => {
                newProfileNameInput.value = '';
                initializeApp();
            });
        });
    }

    function handleDeleteProfile() {
        const profileToDelete = profileSelector.value;
        if (Object.keys(profileSelector.options).length <= 1) {
            alert("Cannot delete the last profile.");
            return;
        }
        
        if (confirm(`Are you sure you want to delete the profile "${profileToDelete}" and all its data? This cannot be undone.`)) {
            chrome.storage.local.get(DATA_KEY, function(data) {
                let allData = data[DATA_KEY];
                delete allData[profileToDelete];
                const newCurrentProfile = Object.keys(allData)[0];
                chrome.storage.local.set({ [DATA_KEY]: allData, [PROFILE_KEY]: newCurrentProfile }, initializeApp);
            });
        }
    }

    function loadApplicationsForProfile(profileName, allData) {
        listHeader.textContent = `Applications for ${profileName}`;
        const applications = allData[profileName] || [];
        applicationsList.innerHTML = '';
        if (applications.length === 0) {
            applicationsList.innerHTML = '<li style="text-align: center; color: #9ca3af; padding: 16px;">No applications saved for this profile.</li>';
            return;
        }
        applications.forEach(createApplicationListItem);
    }
    
    function handleSaveApplication() {
        const idToUpdate = editingIdInput.value;
        if (idToUpdate) {
            updateApplication(parseInt(idToUpdate));
        } else {
            saveNewApplication();
        }
    }

    function saveNewApplication() {
        const appData = getFormData();
        if (!appData.company || !appData.link || !appData.date) return;
        
        const currentProfile = profileSelector.value;
        appData.id = Date.now();

        chrome.storage.local.get(DATA_KEY, function(data) {
            let allData = data[DATA_KEY];
            allData[currentProfile].unshift(appData);
            chrome.storage.local.set({ [DATA_KEY]: allData }, () => {
                resetForm();
                loadApplicationsForProfile(currentProfile, allData);
            });
        });
    }
    
    function updateApplication(id) {
        const updatedData = getFormData();
        const currentProfile = profileSelector.value;

        chrome.storage.local.get(DATA_KEY, function(data) {
            let allData = data[DATA_KEY];
            allData[currentProfile] = allData[currentProfile].map(app => 
                app.id === id ? { ...app, ...updatedData } : app
            );
            chrome.storage.local.set({ [DATA_KEY]: allData }, () => {
                exitEditMode();
                loadApplicationsForProfile(currentProfile, allData);
            });
        });
    }

    function deleteApplication(id) {
        const currentProfile = profileSelector.value;
        chrome.storage.local.get(DATA_KEY, function(data) {
            let allData = data[DATA_KEY];
            allData[currentProfile] = allData[currentProfile].filter(app => app.id !== id);
             chrome.storage.local.set({ [DATA_KEY]: allData }, () => {
                loadApplicationsForProfile(currentProfile, allData);
            });
        });
    }
    
    // --- UI Helper Functions (Edit Mode, Form Reset, etc.) ---

    function getFormData() {
        return {
            company: companyNameInput.value.trim(), link: applicationLinkInput.value.trim(),
            date: applicationDateInput.value, status: applicationStatusInput.value,
            notes: applicationNotesInput.value.trim(),
        };
    }

    function enterEditMode(app) {
        editingIdInput.value = app.id;
        companyNameInput.value = app.company;
        applicationLinkInput.value = app.link;
        applicationDateInput.value = app.date;
        applicationStatusInput.value = app.status;
        applicationNotesInput.value = app.notes || '';
        saveButton.textContent = 'Update Application';
        cancelEditButton.style.display = 'block';
        saveButton.parentElement.style.gridTemplateColumns = '1fr 1fr';
        companyNameInput.focus();
    }

    function exitEditMode() {
        editingIdInput.value = '';
        saveButton.textContent = 'Save Application';
        cancelEditButton.style.display = 'none';
        saveButton.parentElement.style.gridTemplateColumns = '1fr';
        resetForm();
    }
    
    function resetForm() {
        companyNameInput.value = '';
        applicationLinkInput.value = '';
        applicationNotesInput.value = '';
        setInitialValues();
    }

    function setInitialValues() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].url) {
                let title = tabs[0].title || "";
                companyNameInput.value = title.split(' - ')[0].split(' | ')[0].split(' at ')[0];
                applicationLinkInput.value = tabs[0].url;
            }
        });
        const today = new Date().toISOString().split('T')[0];
        applicationDateInput.value = today;
    }

    function createApplicationListItem(app) {
        const listItem = document.createElement('li');
        listItem.className = 'job-item';

        const appDetails = document.createElement('div');
        appDetails.className = 'job-item-details';

        const appInfo = document.createElement('div');
        appInfo.className = 'job-item-info';
        appInfo.innerHTML = `
            <a href="${app.link}" target="_blank">${app.company}</a>
            <p>Applied on: ${new Date(app.date).toLocaleDateString()}</p>
            <span class="status-badge" style="background-color: ${statusColors[app.status] || '#6b7280'};">${app.status}</span>
        `;
        appDetails.appendChild(appInfo);

        if (app.notes) {
            const notesElement = document.createElement('p');
            notesElement.className = 'job-item-notes';
            notesElement.textContent = app.notes;
            appDetails.appendChild(notesElement);
        }

        const actions = document.createElement('div');
        actions.className = 'job-item-actions';
        
        const editButton = document.createElement('button');
        editButton.className = 'action-icon-button edit-btn';
        editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/></svg>`;
        editButton.addEventListener('click', () => enterEditMode(app));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-icon-button';
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>`;
        deleteButton.addEventListener('click', () => deleteApplication(app.id));
        
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        listItem.appendChild(appDetails);
        listItem.appendChild(actions);
        applicationsList.appendChild(listItem);
    }
});
