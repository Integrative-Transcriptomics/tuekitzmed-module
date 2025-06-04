// Helper function to fetch and parse CSV files
async function fetchAndParseCSV(filePath) {
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
    }
    const csvText = await response.text();
    return parseCSVText(csvText);
}

// CSV parser for semicolon-delimited files, handles RFC 4180 style quoting
function parseCSVText(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    const headers = lines[0].split(';').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines

        const values = [];
        let currentField = '';
        let inQuotes = false;

        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];

            if (char === '"') {
                if (inQuotes && j + 1 < lines[i].length && lines[i][j + 1] === '"') {
                    currentField += '"'; // Escaped double quote (e.g., "" becomes ")
                    j++; // Skip the next quote
                } else {
                    inQuotes = !inQuotes; // Toggle quoted state (these quotes are structural)
                }
            } else if (char === ';' && !inQuotes) { // Semicolon as delimiter
                values.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        values.push(currentField); // Add the last field for the line

        const entry = {};
        headers.forEach((header, index) => {
            // The currentField already has escaped quotes handled and structural quotes removed.
            // We just need to trim it.
            entry[header] = values[index] ? values[index].trim() : '';
        });
        data.push(entry);
    }
    return data;
}


// Process raw data from CSVs into a structured format
function processRawData(classesArray, modulesArray, unitsArray) {
    // Group units by ModuleID for easy lookup
    const unitsByModule = new Map();
    unitsArray.forEach(unit => {
        if (!unitsByModule.has(unit.ModuleID)) {
            unitsByModule.set(unit.ModuleID, []);
        }
        unitsByModule.get(unit.ModuleID).push(unit);
    });

    // Enrich modules with their units and prepare accordion data
    const processedModules = modulesArray.map(module => {
        const moduleUnits = unitsByModule.get(module.ModuleID) || [];
        const accordionDataString = moduleUnits
            .map(u => `${u.UnitName}:${u.UnitDescription || 'Details not available.'}`)
            .join('|');
        
        // MajorClassIDs is read as a single string, e.g., "TüKITZmed+TüKITZlife"
        // Then split here.
        const majorClassIDs = module.MajorClassIDs ? module.MajorClassIDs.split('+').map(id => id.trim()) : [];

        return {
            ...module, // Includes ModuleID, ModuleName, ModuleDescription, Category, Difficulty
            majorClassIDs: majorClassIDs,
            units: moduleUnits,
            accordionDataString: accordionDataString
        };
    });

    return {
        classes: classesArray, // For rendering filter buttons
        modules: processedModules,
    };
}

// Render major class filter buttons
function renderFilterButtons(classesData, headerElement) {
    const difficultyFilter = headerElement.querySelector('#difficulty-filter'); // Insert buttons before this
    
    classesData.forEach(classInfo => {
        const button = document.createElement('button');
        button.classList.add('study-button', classInfo.ClassID);
        button.textContent = classInfo.ButtonText;
        if (classInfo.Color) {
            button.style.backgroundColor = classInfo.Color;
        }
        button.dataset.filterClass = classInfo.ClassID; // Used for filtering logic
        headerElement.insertBefore(button, difficultyFilter);
    });
}

// Render course tiles into their respective topic containers
function renderCourseTiles(modulesData, classesData) {
    // Clear any placeholder content if necessary (though HTML is now empty)
    document.getElementById('math-container').innerHTML = '';
    document.getElementById('ml-container').innerHTML = '';
    document.getElementById('applications-container').innerHTML = '';

    const classColorMap = new Map(classesData.map(c => [c.ClassID, c.Color]));

    modulesData.forEach(module => {
        const tile = document.createElement('div');
        tile.classList.add('course-tile', module.Difficulty.toLowerCase());
        module.majorClassIDs.forEach(classId => tile.classList.add(classId));
        
        tile.dataset.topic = module.Category;
        tile.dataset.accordion = module.accordionDataString;
        tile.dataset.moduleId = module.ModuleID; // For easy data retrieval on click

        // Course Header
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('course-header');
        headerDiv.textContent = module.ModuleName;
        tile.appendChild(headerDiv);

        // Course Labels (Units)
        const labelsDiv = document.createElement('div');
        labelsDiv.classList.add('course-labels');
        module.units.forEach(unit => {
            const label = document.createElement('div');
            label.classList.add('label');
            label.textContent = unit.UnitName;
            labelsDiv.appendChild(label);
        });
        tile.appendChild(labelsDiv);

        // Membership Indicators
        const indicatorsDiv = document.createElement('div');
        indicatorsDiv.classList.add('membership-indicators');
        module.majorClassIDs.forEach(classId => {
            const indicator = document.createElement('div');
            indicator.classList.add('indicator', classId);
            const color = classColorMap.get(classId);
            if (color) {
                 indicator.style.backgroundColor = color; // Ensures color even if CSS is not specific enough
            }
            indicatorsDiv.appendChild(indicator);
        });
        tile.appendChild(indicatorsDiv);
        
        // Skill Level Bars
        const skillLevelDiv = document.createElement('div');
        skillLevelDiv.classList.add('skill-level');
        for (let i = 0; i < 3; i++) {
            const bar = document.createElement('div');
            bar.classList.add('bar');
            // CSS handles filling based on .beginner, .intermediate, .expert class on tile
            skillLevelDiv.appendChild(bar);
        }
        tile.appendChild(skillLevelDiv);

        // Append tile to the correct topic container
        let container;
        if (module.Category.toLowerCase() === 'mathematics') container = document.getElementById('math-container');
        else if (module.Category.toLowerCase() === 'machine learning') container = document.getElementById('ml-container');
        else if (module.Category.toLowerCase() === 'applications') container = document.getElementById('applications-container');
        
        if (container) {
            container.appendChild(tile);
        } else {
            console.warn(`No container found for category: ${module.Category} (Module: ${module.ModuleName})`);
        }
    });
}

// Initialize all event listeners and interactivity
function initializePageInteractivity(appData) {
    const modulesMap = new Map(appData.modules.map(m => [m.ModuleID, m]));

    const studyButtons = document.querySelectorAll('.study-button'); // Includes "Show All" and generated buttons
    const difficultyFilter = document.getElementById('difficulty-filter');
    const allTiles = document.querySelectorAll('.course-tile'); // Tiles generated in renderCourseTiles
    const downloadButton = document.getElementById('download-button');

    function filterTiles() {
        const activeStudyButton = document.querySelector('.study-button.active');
        const selectedDifficulty = difficultyFilter.value;
        
        allTiles.forEach(tile => {
            let hasStudyFilter = true; // Default to true for "Show All"
            if (activeStudyButton && !activeStudyButton.classList.contains('all')) {
                const filterClass = activeStudyButton.dataset.filterClass;
                hasStudyFilter = tile.classList.contains(filterClass);
            }
            
            const hasDifficultyFilter = selectedDifficulty === 'all' || tile.classList.contains(selectedDifficulty);
            
            tile.style.display = (hasStudyFilter && hasDifficultyFilter) ? 'flex' : 'none';
        });
    }

    studyButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('active') && !this.classList.contains('all')) {
                this.classList.remove('active');
                document.querySelector('.study-button.all').classList.add('active');
            } else {
                studyButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            }
            filterTiles();
        });
    });
    
    const showAllButton = document.querySelector('.study-button.all');
    if (showAllButton) showAllButton.classList.add('active');


    difficultyFilter.addEventListener('change', filterTiles);

    allTiles.forEach(tile => {
        tile.addEventListener('click', function() {
            const popup = document.getElementById('popup');
            const moduleId = this.dataset.moduleId;
            const moduleData = modulesMap.get(moduleId);

            if (!moduleData) {
                console.error("Module data not found for tile:", this);
                return;
            }

            popup.style.display = 'block';
            document.getElementById('course-name').textContent = moduleData.ModuleName;
            document.getElementById('popup-course-description').textContent = moduleData.ModuleDescription || 'No general description available.';

            const accordionContainer = popup.querySelector('.accordion');
            accordionContainer.innerHTML = ''; 

            if (moduleData.accordionDataString) {
                const accordionItems = moduleData.accordionDataString.split('|');
                accordionItems.forEach(item => {
                    const [sectionName, ...sectionDetailsParts] = item.split(':');
                    const sectionDetails = sectionDetailsParts.join(':'); 
                    
                    if (sectionName.trim()) { 
                        const accButton = document.createElement('button');
                        accButton.classList.add('accordion-button');
                        accButton.textContent = sectionName;
                        
                        const panel = document.createElement('div');
                        panel.classList.add('panel');
                        panel.innerHTML = `<p>${sectionDetails}</p>`;
                        
                        accordionContainer.appendChild(accButton);
                        accordionContainer.appendChild(panel);

                        accButton.addEventListener('click', function() {
                            this.classList.toggle('active');
                            const currentPanel = this.nextElementSibling;
                            currentPanel.style.display = (currentPanel.style.display === 'block') ? 'none' : 'block';
                        });
                    }
                });
            }
        });
    });

    downloadButton.addEventListener('click', () => {
        const currentlyVisibleTiles = Array.from(allTiles)
            .filter(tile => tile.style.display !== 'none');
        
        if (currentlyVisibleTiles.length === 0) {
            alert('No courses selected for download.');
            return;
        }

        const selectedCourseNames = currentlyVisibleTiles
            .map(tile => {
                const moduleId = tile.dataset.moduleId;
                const moduleData = modulesMap.get(moduleId);
                return moduleData ? moduleData.ModuleName : "Unknown Course";
            });
        
        const csvContent = 'data:text/csv;charset=utf-8,' + 
            'Course Name\n' + 
            selectedCourseNames.join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'selected_courses.txt'); // Note: saving as .txt but content is CSV-like
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    filterTiles();
}

window.closePopup = function() {
    document.getElementById('popup').style.display = 'none';
    const accordionContainer = document.querySelector('#popup .accordion');
    if (accordionContainer) {
        accordionContainer.querySelectorAll('.panel').forEach(panel => {
            panel.style.display = 'none';
        });
        accordionContainer.querySelectorAll('.accordion-button').forEach(button => {
            button.classList.remove('active');
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [classesArray, modulesArray, unitsArray] = await Promise.all([
            fetchAndParseCSV('classes.csv'),
            fetchAndParseCSV('modules.csv'),
            fetchAndParseCSV('units.csv')
        ]);

        const appData = processRawData(classesArray, modulesArray, unitsArray);
        
        renderFilterButtons(appData.classes, document.querySelector('.header'));
        renderCourseTiles(appData.modules, appData.classes); 
        
        initializePageInteractivity(appData);

    } catch (error) {
        console.error("Failed to initialize the page:", error);
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Error loading course data. Please check the CSV files for correct formatting (semicolon-separated, quotes around fields containing semicolons or double quotes) and ensure the files are accessible. Details: ${error.message}</p>`;
        }
    }
});