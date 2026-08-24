const settingsModal = document.getElementById("settingsModal");
const settingsButton = document.getElementById("settingsButton");
const welcomeSettingsButton = document.getElementById("welcomeSettingsButton");
const closeSettingsButton = document.getElementById("closeSettingsButton");
const addSourceButton = document.getElementById("addSourceButton");
const refreshButton = document.getElementById("refreshButton");
const sourcesContainer = document.getElementById("sourcesContainer");
const sourcesStatus = document.getElementById("sourcesStatus");
const toolbarStatus = document.getElementById("toolbarStatus");
const statusText = document.getElementById("statusText");
const projectCount = document.getElementById("projectCount");
const welcome = document.getElementById("welcome");
const projectGrid = document.getElementById("projectGrid");
const viewModeButton = document.getElementById("viewModeButton");


const filterButton = document.getElementById("filterButton");
const filterPopup = document.getElementById("filterPopup");
const filterSources = document.getElementById("filterSources");
const filterSortDirection = document.getElementById("filterSortDirection");

const elevateActiveProjectsCheckbox = document.getElementById("elevateActiveProjects");
const hideFinishedProjectsCheckbox = document.getElementById("hideFinishedProjects");

const filterDeprecatedLast = document.getElementById("filterDeprecatedLast");




const projectEditModal = document.getElementById("projectEditModal");
const closeProjectEditModalButton = document.getElementById("closeProjectEditModal");
const cancelProjectEditButton = document.getElementById("cancelProjectEdit");
const saveProjectEditButton = document.getElementById("saveProjectEdit");
const projectEditName = document.getElementById("projectEditName");
const projectEditIcon = document.getElementById("projectEditIcon");
const projectEditIconColor = document.getElementById("projectEditIconColor");
const projectEditDeprecated = document.getElementById("projectEditDeprecated");
const projectEditState = document.getElementById("projectEditState");

const exportSourcesButton = document.getElementById("saveSourcesButton");
const importSourcesButton = document.getElementById("loadSourcesButton");


/* =========================================================
   STATE
========================================================= */

let editingProject = null;

let sources = [];

let projects = [];

let projectView =
    localStorage.getItem(
        "projectView"
    ) || "grid";

let currentDirectory = null;

let currentDirectoryName = "";

let directoryHistory = [];

let createMode = null;







let deprecatedLast =
    localStorage.getItem(
        "deprecatedLast"
    ) === "true";



console.log(
    "SAVED FILTERS:",
    localStorage.getItem(
        "projectFilterSources"
    )
);

let projectFilterSources =
    JSON.parse(
        localStorage.getItem(
            "projectFilterSources"
        ) || "null"
    );

let projectSort =
    localStorage.getItem(
        "projectSort"
    ) || "name";

let projectSortAscending =
    localStorage.getItem(
        "projectSortAscending"
    ) !== "false";

const projectSizes = new Map();





filterDeprecatedLast.checked =
    deprecatedLast;








// More state loading projects
let elevateActiveProjects =
    localStorage.getItem(
        "elevateActiveProjects"
    ) === "true";

let hideFinishedProjects =
    localStorage.getItem(
        "hideFinishedProjects"
    ) === "true";


elevateActiveProjectsCheckbox.checked =
    elevateActiveProjects;

hideFinishedProjectsCheckbox.checked =
    hideFinishedProjects;


elevateActiveProjectsCheckbox.addEventListener(
    "change",
    () => {

        elevateActiveProjects =
            elevateActiveProjectsCheckbox.checked;

        localStorage.setItem(
            "elevateActiveProjects",
            elevateActiveProjects
        );

        renderProjectItems();
    }
);


hideFinishedProjectsCheckbox.addEventListener(
    "change",
    () => {

        hideFinishedProjects =
            hideFinishedProjectsCheckbox.checked;

        localStorage.setItem(
            "hideFinishedProjects",
            hideFinishedProjects
        );

        renderProjectItems();
    }
);










/* =========================================================
   PROJECT EDIT MODAL
========================================================= */

function openProjectEditModal(project) {

    editingProject = project;

    const config =
        project.config ||
        createDefaultProjectConfig();


    projectEditName.textContent =
        project.name;


    /*
        The config stores icon names like:

            "folder"
            "code"
            "rocket"

        The select uses those same values.
    */

    let icon =
        config.icon || "folder";

    /*
        Support configs that may contain
        "ph-folder" as well as "folder".
    */

    if (
        icon.startsWith("ph-")
    ) {

        icon =
            icon.substring(3);

    }

    projectEditIcon.value =
        icon;

    projectEditState.value =
        config.state || "";


    /*
        If an old/custom icon isn't in the
        select, fall back to folder.
    */




    projectEditIconColor.value =
        config.iconColor ||
        "#000001";


    projectEditDeprecated.checked =
        config.deprecated === true;


    projectEditModal.classList.add(
        "open"
    );

}


function closeProjectEditModal() {

    projectEditModal.classList.remove(
        "open"
    );

    editingProject = null;

}


async function saveProjectEdit() {

    if (
        !editingProject
    ) {

        return;

    }


    const project =
        editingProject;


    const config = {

        version: 1,

        icon:
            projectEditIcon.value,

        iconColor:
            projectEditIconColor.value === "#000001"
                ? null
                : projectEditIconColor.value,

        deprecated:
            projectEditDeprecated.checked,

        state:
            projectEditState.value

    };


    try {

        const permission =
            await project.handle.requestPermission(
                {
                    mode: "readwrite"
                }
            );


        if (
            permission !== "granted"
        ) {

            setStatus(
                "Write permission was not granted."
            );

            return;

        }


        const savedConfig =
            await writeProjectConfig(
                project.handle,
                config
            );


        project.config =
            savedConfig;


        closeProjectEditModal();


        await renderProjectItems();


        setStatus(
            `Updated ${project.name}`
        );

    }

    catch (error) {

        console.error(
            "Could not save project configuration:",
            error
        );

        setStatus(
            "Could not save project configuration."
        );

    }

}


closeProjectEditModalButton.addEventListener(
    "click",
    closeProjectEditModal
);

cancelProjectEditButton.addEventListener(
    "click",
    closeProjectEditModal
);

saveProjectEditButton.addEventListener(
    "click",
    saveProjectEdit
);


/*
    Clicking the dark area outside the dialog
    closes the modal.
*/

projectEditModal.addEventListener(
    "click",
    event => {

        if (
            event.target === projectEditModal
        ) {

            closeProjectEditModal();

        }

    }
);






/* =========================================================
   PROJECT CONFIG
========================================================= */

const PROJECT_CONFIG_FILENAME =
    ".mcvs-project-config";

const DEFAULT_PROJECT_CONFIG = {
    version: 1,
    icon: "folder",
    iconColor: "",
    deprecated: false,
    state: ""
};



function createDefaultProjectConfig() {

    return {
        ...DEFAULT_PROJECT_CONFIG
    };

}


function normalizeProjectConfig(config) {

    return {
        version:
            typeof config?.version === "number"
                ? config.version
                : 1,

        icon:
            typeof config?.icon === "string"
                ? config.icon
                : "folder",

        iconColor:
            typeof config?.iconColor === "string"
                ? config.iconColor
                : "",

        deprecated:
            typeof config?.deprecated === "boolean"
                ? config.deprecated
                : false,

        state:
            typeof config?.state === "string"
                ? config.state
                : null,

        tags:
            typeof config?.tags === "string"
                ? config.tags
                : null
    };

}





/* =========================================================
   DATABASE
========================================================= */

const DATABASE_NAME =
    "project-manager";

const DATABASE_VERSION =
    1;

const STORE_NAME =
    "sources";




function openDatabase() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const request =
                indexedDB.open(
                    DATABASE_NAME,
                    DATABASE_VERSION
                );


            request.onupgradeneeded =
                event => {

                    const database =
                        event.target.result;


                    if (
                        !database.objectStoreNames.contains(
                            STORE_NAME
                        )
                    ) {

                        database.createObjectStore(
                            STORE_NAME,
                            {
                                keyPath: "id"
                            }
                        );

                    }

                };


            request.onsuccess =
                event => {

                    resolve(
                        event.target.result
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}







async function saveSources() {

    const database =
        await openDatabase();


    const transaction =
        database.transaction(
            STORE_NAME,
            "readwrite"
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    store.clear();


    for (
        const source of sources
    ) {

        store.put(
            source
        );

    }


    return new Promise(
        (
            resolve,
            reject
        ) => {

            transaction.oncomplete =
                () => {

                    resolve();

                };


            transaction.onerror =
                () => {

                    reject(
                        transaction.error
                    );

                };

        }
    );

}


async function loadSources() {

    const database =
        await openDatabase();


    const transaction =
        database.transaction(
            STORE_NAME,
            "readonly"
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    const request =
        store.getAll();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            request.onsuccess =
                () => {

                    const loadedSources =
                        request.result.map(
                            source => ({

                                ...source,

                                icon:
                                    source.icon ||
                                    "ph-folder",

                                color:
                                    source.color ||
                                    "#8b8b8b"

                            })
                        );


                    resolve(
                        loadedSources
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}







/* =========================================================
   PERMISSIONS
========================================================= */

async function verifyPermission(
    handle,
    mode = "read",
    request = false
) {

    const options = {
        mode: mode
    };


    let permission =
        await handle.queryPermission(
            options
        );


    console.log(
        "Permission:",
        handle.name,
        permission
    );


    if (
        permission === "granted"
    ) {

        return true;

    }


    if (
        request &&
        permission === "prompt"
    ) {

        permission =
            await handle.requestPermission(
                options
            );


        console.log(
            "Permission after request:",
            handle.name,
            permission
        );

    }


    return (
        permission === "granted"
    );

}



/* =========================================================
   SOURCES
========================================================= */

async function addSource() {

    try {

        const handle =
            await window.showDirectoryPicker(
                {
                    mode: "readwrite"
                }
            );




        if (
            await sourceAlreadyExists(handle)
        ) {

            setStatus(
                "That source is already added"
            );

            return;

        }


        const source = {

            id:
                crypto.randomUUID(),

            name:
                handle.name,

            handle:
                handle,

            icon:
                "ph-folder",

            color:
                "#8b8b8b"

        };


        sources.push(
            source
        );


        await saveSources();


        renderSources();


        await refreshProjects(true);


        setStatus(
            "Source added"
        );

    }

    catch (
    error
    ) {

        if (
            error.name ===
            "AbortError"
        ) {

            return;

        }


        console.error(
            error
        );


        setStatus(
            "Could not add source"
        );

    }

}



async function removeSource(
    id
) {

    sources =
        sources.filter(
            source =>
                source.id !== id
        );


    await saveSources();


    renderSources();


    await refreshProjects();

}








/* =========================================================
   PROJECT CONFIG FILE
========================================================= */

async function readProjectConfig(
    projectHandle
) {

    try {

        const configFile =
            await projectHandle.getFileHandle(
                PROJECT_CONFIG_FILENAME,
                {
                    create: false
                }
            );

        const file =
            await configFile.getFile();

        const text =
            await file.text();

        const parsed =
            JSON.parse(text);

        return normalizeProjectConfig(
            parsed
        );

    }

    catch (error) {

        /*
            Missing, malformed, or unreadable config
            gets the default configuration.
        */

        return createDefaultProjectConfig();

    }

}


async function writeProjectConfig(
    projectHandle,
    config
) {

    const normalized =
        normalizeProjectConfig(
            config
        );

    const configFile =
        await projectHandle.getFileHandle(
            PROJECT_CONFIG_FILENAME,
            {
                create: true
            }
        );

    const writable =
        await configFile.createWritable();

    await writable.write(
        JSON.stringify(
            normalized,
            null,
            4
        )
    );

    await writable.close();

    return normalized;

}


async function ensureProjectConfig(
    projectHandle
) {

    try {

        const existingConfig =
            await projectHandle.getFileHandle(
                PROJECT_CONFIG_FILENAME,
                {
                    create: false
                }
            );

        const file =
            await existingConfig.getFile();

        const text =
            await file.text();

        const parsed =
            JSON.parse(text);

        return normalizeProjectConfig(
            parsed
        );

    }

    catch (error) {

        /*
            The config doesn't exist yet.

            Try to create it. This may fail if the
            source was opened read-only. That's okay;
            the project can still use the defaults
            in memory.
        */

        const defaultConfig =
            createDefaultProjectConfig();

        try {

            await writeProjectConfig(
                projectHandle,
                defaultConfig
            );

        }

        catch (writeError) {

            console.warn(
                `Could not create ${PROJECT_CONFIG_FILENAME}:`,
                writeError
            );

        }

        return defaultConfig;

    }

}



function getProjectIconClass(icon) {

    if (
        typeof icon !== "string" ||
        !icon.trim()
    ) {

        return "ph-folder";

    }

    return icon.startsWith("ph-")
        ? icon
        : `ph-${icon}`;

}
















/* =========================================================
   PROJECT SCANNING
========================================================= */

async function refreshProjects(
    requestAccess = false
) {

    projects = [];


    setStatus(
        "Scanning sources..."
    );


    console.log(
        "Sources loaded:",
        sources
    );


    for (
        const source of sources
    ) {

        console.log(
            "Checking source:",
            source.name,
            source.handle
        );


        if (
            !source.handle
        ) {

            console.error(
                "SOURCE HAS NO HANDLE:",
                source
            );

            continue;

        }


        try {

            const hasAccess =
                await verifyPermission(
                    source.handle,
                    "readwrite",
                    requestAccess
                );


            if (
                !hasAccess
            ) {

                console.warn(
                    "NO ACCESS TO SOURCE:",
                    source.name
                );

                continue;

            }


            console.log(
                "Scanning source:",
                source.name
            );


            for await (
                const [
                    name,
                    handle
                ]
                of source.handle.entries()
            ) {

                console.log(
                    "Found:",
                    name,
                    handle.kind
                );


                if (
                    handle.kind !==
                    "directory"
                ) {

                    continue;

                }


                const config =
                    await ensureProjectConfig(
                        handle
                    );


                projects.push(
                    {

                        id:
                            `${source.id}:${name}`,

                        name:
                            name,

                        handle:
                            handle,

                        sourceId:
                            source.id,

                        sourceName:
                            source.name,

                        config:
                            config

                    }
                );

            }

        }

        catch (
        error
        ) {

            console.error(
                `FAILED TO SCAN "${source.name}":`,
                error
            );

        }

    }


    projects.sort(
        (
            a,
            b
        ) =>
            a.name.localeCompare(
                b.name
            )
    );


    console.log(
        "FINAL PROJECTS:",
        projects
    );


    renderProjects();


    setStatus(
        projects.length > 0
            ? `${projects.length} projects`
            : "No accessible projects"
    );

}




/* =========================================================
   RENDER SOURCES
========================================================= */



function renderSources() {

    sourcesContainer.innerHTML = "";


    /* Update source counts everywhere */

    if (
        sources.length === 0 &&
        projects.length === 0
    ) {

        sourcesStatus.textContent =
            "No sources added";

        toolbarStatus.textContent =
            "No sources";

    }

    else {

        const label =
            `${sources.length} ${sources.length === 1
                ? "source"
                : "sources"
            }`;


        sourcesStatus.textContent =
            label;

        toolbarStatus.textContent =
            label;

    }


    /* No sources in Settings */

    if (
        sources.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "settings-description";

        empty.textContent =
            "No sources added yet.";

        sourcesContainer.appendChild(
            empty
        );

        return;

    }


    /* Render sources */

    for (
        const source of sources
    ) {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            "settings-row source-settings-row";


        const information =
            document.createElement(
                "div"
            );

        information.className =
            "source-settings-information";


        /* Source icon */

        const icon =
            document.createElement(
                "div"
            );

        icon.className =
            "source-settings-icon";

        icon.style.color =
            source.color ||
            "#8b8b8b";

        icon.innerHTML =
            `<i class="ph ${source.icon ||
            "ph-folder"
            }"></i>`;


        /* Source text */

        const text =
            document.createElement(
                "div"
            );


        const label =
            document.createElement(
                "div"
            );

        label.className =
            "settings-label";

        label.textContent =
            source.name;


        const description =
            document.createElement(
                "div"
            );

        description.className =
            "settings-description";

        description.textContent =
            "Project source";


        text.append(
            label,
            description
        );


        information.append(
            icon,
            text
        );


        /* Customization */

        const customization =
            document.createElement(
                "div"
            );

        customization.className =
            "source-customization";


        /* Icon */

        const iconGroup =
            document.createElement(
                "div"
            );

        iconGroup.className =
            "source-setting-control";


        const iconLabel =
            document.createElement(
                "span"
            );

        iconLabel.textContent =
            "Icon";


        const iconSelect =
            document.createElement(
                "select"
            );

        iconSelect.className =
            "source-icon-select";


        const iconOptions = [

            ["ph-folder", "Folder"],
            ["ph-folder-open", "Folder Open"],
            ["ph-cloud", "Cloud"],
            ["ph-code", "Code"],
            ["ph-monitor", "Monitor"],
            ["ph-terminal", "Terminal"],
            ["ph-file-code", "Code File"],
            ["ph-globe", "Web"],
            ["ph-game-controller", "Game"],
            ["ph-brain", "AI"],
            ["ph-database", "Database"],
            ["ph-image", "Images"],
            ["ph-music-notes", "Music"],
            ["ph-video-camera", "Video"],
            ["ph-book", "Book"],
            ["ph-notebook", "Notebook"],
            ["ph-rocket", "Rocket"],
            ["ph-star", "Star"],
            ["ph-heart", "Heart"],
            ["ph-lightning", "Lightning"],
            ["ph-wrench", "Tools"],
            ["ph-package", "Package"],
            ["ph-archive", "Archive"]

        ];


        for (
            const [
                iconClass,
                iconName
            ]
            of iconOptions
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                iconClass;

            option.textContent =
                iconName;

            iconSelect.appendChild(
                option
            );

        }


        iconSelect.value =
            source.icon ||
            "ph-folder";


        iconSelect.addEventListener(
            "change",
            async () => {

                source.icon =
                    iconSelect.value;

                await saveSources();

                renderSources();

                renderProjects();

            }
        );


        iconGroup.append(
            iconLabel,
            iconSelect
        );


        /* Color */

        const colorGroup =
            document.createElement(
                "div"
            );

        colorGroup.className =
            "source-setting-control";


        const colorLabel =
            document.createElement(
                "span"
            );

        colorLabel.textContent =
            "Color";


        const colorInput =
            document.createElement(
                "input"
            );

        colorInput.type =
            "color";

        colorInput.className =
            "source-color-input";

        colorInput.value =
            source.color ||
            "#8b8b8b";


        colorInput.addEventListener(
            "input",
            () => {

                source.color =
                    colorInput.value;

                icon.style.color =
                    source.color;

            }
        );


        colorInput.addEventListener(
            "change",
            async () => {

                source.color =
                    colorInput.value;

                await saveSources();

                renderSources();

                renderProjects();

            }
        );


        colorGroup.append(
            colorLabel,
            colorInput
        );


        customization.append(
            iconGroup,
            colorGroup
        );


        /* Remove */

        const removeButton =
            document.createElement(
                "button"
            );

        removeButton.className =
            "settings-danger";

        removeButton.innerHTML =
            `
                <i class="ph ph-trash"></i>
                Remove
            `;


        removeButton.addEventListener(
            "click",
            () => {

                removeSource(
                    source.id
                );

            }
        );


        row.append(
            information,
            customization,
            removeButton
        );


        sourcesContainer.appendChild(
            row
        );

    }

}


/* =========================================================
   RENDER PROJECTS
========================================================= */


function renderProjects() {

    projectGrid.innerHTML = "";


    projectCount.textContent =
        `${projects.length} ${projects.length === 1
            ? "project"
            : "projects"
        }`;


    /* -----------------------------------------
       NO SOURCES
    ----------------------------------------- */

    if (
        sources.length === 0 &&
        projects.length === 0
    ) {

        welcome.hidden = false;
        projectGrid.hidden = true;

        welcome.querySelector("h1").textContent =
            "No sources";

        welcome.querySelector("p").textContent =
            "Add a source folder in Settings. Every folder directly inside a source will appear here as a project.";

        welcomeSettingsButton.hidden = false;

        return;

    }


    /* -----------------------------------------
       NO PROJECTS
    ----------------------------------------- */

    if (
        projects.length === 0 &&
        currentDirectory === null
    ) {

        welcome.hidden = false;
        projectGrid.hidden = true;

        welcome.querySelector("h1").textContent =
            "No projects yet";

        welcome.querySelector("p").textContent =
            "Create a project folder inside one of your sources to get started.";

        welcomeSettingsButton.hidden = true;

        return;

    }


    /* -----------------------------------------
       SHOW FILE SYSTEM
    ----------------------------------------- */

    welcome.hidden = true;
    projectGrid.hidden = false;


    /*
        At the top level, show projects.

        Inside a directory, show that
        directory's contents.
    */

    if (
        currentDirectory === null
    ) {

        renderProjectItems();

    } else {

        renderDirectoryContents();

    }

    updateCreationButtons();

}


/* =========================================================
   OPEN PROJECT
========================================================= */

async function openProject(
    project
) {

    currentDirectory =
        project.handle;

    currentDirectoryName =
        project.name;

    directoryHistory = [];


    setStatus(
        `Opening ${project.name}`
    );


    await renderDirectoryContents();

    updateCreationButtons();

}



async function renderDirectoryContents() {

    if (
        !currentDirectory
    ) {

        renderProjects();

        return;

    }


    projectGrid.innerHTML = "";


    /*
        Back button
    */

    const backElement =
        document.createElement(
            "button"
        );

    backElement.className =
        "project-item project-back";

    backElement.innerHTML =
        `
            <div class="project-item-icon">
                <i class="ph ph-arrow-left"></i>
            </div>

            <div class="project-item-content">

                <div class="project-item-name">
                    Back
                </div>

            </div>
        `;


    backElement.addEventListener(
        "click",
        goBack
    );


    projectGrid.appendChild(
        backElement
    );


    const entries = [];


    try {

        for await (
            const [
                name,
                handle
            ]
            of currentDirectory.entries()
        ) {

            if (
                name === PROJECT_CONFIG_FILENAME
            ) {

                continue;

            }


            entries.push(
                {
                    name,
                    handle
                }
            );

        }

    }

    catch (
    error
    ) {

        console.error(
            error
        );

        setStatus(
            "Could not read directory"
        );

        return;

    }


    /*
        Folders first, files second.
    */

    entries.sort(
        (
            a,
            b
        ) => {

            if (
                a.handle.kind !==
                b.handle.kind
            ) {

                return (
                    a.handle.kind ===
                        "directory"
                        ? -1
                        : 1
                );

            }


            return a.name.localeCompare(
                b.name,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            );

        }
    );


    for (
        const entry of entries
    ) {

        const element =
            createFileSystemItem(
                entry.name,
                entry.handle
            );


        projectGrid.appendChild(
            element
        );

    }


    setStatus(
        `${entries.length} ${entries.length === 1
            ? "item"
            : "items"
        }`
    );

}









function createFileSystemItem(
    name,
    handle
) {

    const element =
        document.createElement(
            "button"
        );

    element.className =
        "project-item";


    const isDirectory =
        handle.kind ===
        "directory";


    element.innerHTML =
        `
            <div class="project-item-icon">

                <i class="ph ${isDirectory
            ? "ph-folder"
            : getFileIcon(name)
        }"></i>

            </div>

            <div class="project-item-content">

                <div class="project-item-name">
                    ${escapeHtml(name)}
                </div>

            </div>
        `;


    if (
        isDirectory
    ) {

        element.addEventListener(
            "click",
            () => {

                openDirectory(
                    handle,
                    name
                );

            }
        );

    } else {

        element.addEventListener(
            "click",
            () => {

                openFile(
                    handle,
                    name
                );

            }
        );

    }


    return element;

}







/* =========================================================
   FILTER / SORT
========================================================= */

function initializeProjectFilters() {

    /*
        If this is the first time using filters,
        enable every source.
    */

    if (
        !Array.isArray(
            projectFilterSources
        )
    ) {

        projectFilterSources =
            sources.map(
                source =>
                    source.id
            );

    }


    /*
        Add newly-created sources automatically.
    */

    for (
        const source of sources
    ) {

        if (
            !projectFilterSources.includes(
                source.id
            )
        ) {

            projectFilterSources.push(
                source.id
            );

        }

    }


    /*
        Remove sources that no longer exist.
    */

    projectFilterSources =
        projectFilterSources.filter(
            id =>
                sources.some(
                    source =>
                        source.id === id
                )
        );


    saveProjectFilters();

    renderFilterSources();

    updateSortControls();

}


function saveProjectFilters() {

    localStorage.setItem(
        "projectFilterSources",
        JSON.stringify(
            projectFilterSources
        )
    );

    localStorage.setItem(
        "projectSort",
        projectSort
    );

    localStorage.setItem(
        "projectSortAscending",
        projectSortAscending
    );

}


function renderFilterSources() {

    filterSources.innerHTML = "";


    if (
        sources.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "settings-description";

        empty.textContent =
            "No sources added.";

        filterSources.appendChild(
            empty
        );

        return;

    }


    for (
        const source of sources
    ) {

        const label =
            document.createElement(
                "label"
            );

        label.className =
            "filter-source-option";


        const checkbox =
            document.createElement(
                "input"
            );

        checkbox.type =
            "checkbox";

        checkbox.dataset.sourceId =
            source.id;

        console.log(
            source.id,
            projectFilterSources,
            projectFilterSources.includes(
                source.id
            )
        );

        checkbox.checked =
            projectFilterSources.includes(
                source.id
            );




        checkbox.addEventListener(
            "change",
            () => {

                if (
                    checkbox.checked
                ) {

                    if (
                        !projectFilterSources.includes(
                            source.id
                        )
                    ) {

                        projectFilterSources.push(
                            source.id
                        );

                    }

                }

                else {

                    projectFilterSources =
                        projectFilterSources.filter(
                            id =>
                                id !== source.id
                        );

                }


                saveProjectFilters();

                renderProjectItems();

            }
        );


        const icon =
            document.createElement(
                "span"
            );

        icon.className =
            "filter-source-icon";

        icon.style.color =
            source.color ||
            "#8b8b8b";

        icon.innerHTML =
            `<i class="ph ${source.icon ||
            "ph-folder"
            }"></i>`;


        const name =
            document.createElement(
                "span"
            );

        name.className =
            "filter-source-name";

        name.textContent =
            source.name;


        label.append(
            checkbox,
            icon,
            name
        );

        filterSources.appendChild(
            label
        );

    }

}


function updateSortControls() {

    const radio =
        document.querySelector(
            `input[name="projectSort"][value="${projectSort}"]`
        );


    if (radio) {

        radio.checked =
            true;

    }


    const icon =
        filterSortDirection.querySelector(
            "i"
        );

    const text =
        filterSortDirection.querySelector(
            "span"
        );


    if (
        projectSortAscending
    ) {

        icon.className =
            "ph ph-sort-ascending";

        text.textContent =
            "Ascending";

    }

    else {

        icon.className =
            "ph ph-sort-descending";

        text.textContent =
            "Descending";

    }

}





async function getProjectSize(
    project
) {

    if (
        projectSizes.has(
            project.id
        )
    ) {

        return projectSizes.get(
            project.id
        );

    }


    let total =
        0;


    async function calculateDirectorySize(
        directory
    ) {

        for await (
            const [
                name,
                handle
            ]
            of directory.entries()
        ) {

            /*
                Don't count the project manager
                configuration file.
            */

            if (
                name ===
                PROJECT_CONFIG_FILENAME
            ) {

                continue;

            }


            if (
                handle.kind ===
                "file"
            ) {

                try {

                    const file =
                        await handle.getFile();

                    total +=
                        file.size;

                }

                catch (error) {

                    console.warn(
                        "Could not read file size:",
                        name,
                        error
                    );

                }

            }

            else if (
                handle.kind ===
                "directory"
            ) {

                await calculateDirectorySize(
                    handle
                );

            }

        }

    }


    try {

        await calculateDirectorySize(
            project.handle
        );

    }

    catch (error) {

        console.warn(
            "Could not calculate project size:",
            project.name,
            error
        );

    }


    projectSizes.set(
        project.id,
        total
    );


    return total;

}


function formatProjectSize(
    bytes
) {

    if (
        bytes < 1024
    ) {

        return `${bytes} B`;

    }


    if (
        bytes < 1024 * 1024
    ) {

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;

    }


    if (
        bytes < 1024 * 1024 * 1024
    ) {

        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(1)} MB`;

    }


    return `${(
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;

}



async function sortProjects(
    projectList
) {

    let sorted =
        [...projectList];


    /*
        Optionally hide projects
        marked as finished.
    */

    if (
        hideFinishedProjects
    ) {

        sorted =
            sorted.filter(
                project =>
                    project.config?.state !==
                    "finished"
            );

    }


    if (
        projectSort ===
        "size"
    ) {

        /*
            Size has to be calculated before
            we can sort by it.
        */

        await Promise.all(
            sorted.map(
                project =>
                    getProjectSize(
                        project
                    )
            )
        );

    }


    sorted.sort(
        (
            a,
            b
        ) => {

            let comparison = 0;


            if (
                projectSort ===
                "name"
            ) {

                comparison =
                    a.name.localeCompare(
                        b.name,
                        undefined,
                        {
                            numeric: true,
                            sensitivity: "base"
                        }
                    );

            }


            else if (
                projectSort ===
                "source"
            ) {

                comparison =
                    a.sourceName.localeCompare(
                        b.sourceName,
                        undefined,
                        {
                            sensitivity: "base"
                        }
                    );


                /*
                    Projects within the same source
                    are still sorted by name.
                */

                if (
                    comparison === 0
                ) {

                    comparison =
                        a.name.localeCompare(
                            b.name,
                            undefined,
                            {
                                numeric: true,
                                sensitivity: "base"
                            }
                        );

                }

            }


            else if (
                projectSort ===
                "size"
            ) {

                comparison =
                    getProjectSizeValue(
                        a
                    ) -
                    getProjectSizeValue(
                        b
                    );

            }


            return projectSortAscending
                ? comparison
                : -comparison;

        }
    );


    /*
        Move active projects to the
        beginning while preserving
        their existing sort order.
    */

    if (
        elevateActiveProjects
    ) {

        sorted.sort(
            (
                a,
                b
            ) => {

                const aActive =
                    a.config?.state ===
                    "active";

                const bActive =
                    b.config?.state ===
                    "active";


                if (
                    aActive ===
                    bActive
                ) {

                    return 0;

                }


                return aActive
                    ? -1
                    : 1;

            }
        );

    }


    if (
        deprecatedLast
    ) {

        sorted.sort(
            (
                a,
                b
            ) => {

                const aDeprecated =
                    a.config?.deprecated ===
                    true;

                const bDeprecated =
                    b.config?.deprecated ===
                    true;


                if (
                    aDeprecated ===
                    bDeprecated
                ) {

                    return 0;

                }


                return aDeprecated
                    ? 1
                    : -1;

            }
        );

    }


    return sorted;

}



function getProjectSizeValue(
    project
) {

    return (
        projectSizes.get(
            project.id
        ) || 0
    );

}










function getProjectSource(project) {

    return sources.find(
        source =>
            source.id === project.sourceId
    ) || null;

}









async function renderProjectItems() {
    sortProjects();

    projectGrid.innerHTML = "";


    /*
        Only show projects whose source
        is currently enabled.
    */

    const filteredProjects =
        projects.filter(
            project =>
                projectFilterSources.includes(
                    project.sourceId
                )
        );


    /*
        Sort the filtered projects.
    */

    const sortedProjects =
        await sortProjects(
            filteredProjects
        );


    /*
        The count should represent what
        the user is actually seeing.
    */

    projectCount.textContent =
        `${sortedProjects.length} ${sortedProjects.length === 1
            ? "project"
            : "projects"
        }`;




    let previousProjectWasActive = false;
    let previousProjectWasAbandoned = false;


    for (
        const project of sortedProjects
    ) {

        const isActive = project.config?.state === "active";
        const isAbandoned = project.config?.deprecated;







        /*
            Add a visual separator when
            transitioning from active
            projects to other projects,
            
            or from/to deprecated/abandoned projects
        */

        if (
            elevateActiveProjects &&
            previousProjectWasActive &&
            !isActive
        ) {

            const separator = document.createElement("div");
            separator.className = "projects-separator";
            projectGrid.appendChild(separator);


        }



        // Seperator between current + abandoned projects

        if (
            elevateActiveProjects &&
            !previousProjectWasAbandoned &&
            isAbandoned
        ) {

            const separator = document.createElement("div");
            separator.className = "projects-separator";
            projectGrid.appendChild(separator);


        }













        const source =
            getProjectSource(
                project
            );


        const projectElement =
            document.createElement(
                "button"
            );

        projectElement.className =
            "project-item";


        const config =
            project.config ||
            createDefaultProjectConfig();


        const iconClass =
            getProjectIconClass(
                config.icon
            );


        const iconColor =
            config.iconColor ||
            "var(--text)";


        if (
            config.deprecated
        ) {

            projectElement.style.opacity =
                "0.25";

        }


        projectElement.innerHTML =
            `
                <div 
                    class="project-item-icon"
                    style="color: ${escapeHtml(iconColor)}"
                >
                    <i class="ph ${iconClass} project-icon"></i>
                    <i class="ph ph-dots-three project-edit-icon"></i>
                </div>


                ${source
                ? `
                            <div
                                class="project-source-icon"
                                style="color: ${source.color ||
                "#8b8b8b"
                }"
                                title="${escapeHtml(
                    source.name
                )}"
                            >
                                <i class="ph ${source.icon ||
                "ph-folder"
                }"></i>
                            </div>
                        `
                : ""
            }


                <div class="project-item-content">

                    <div class="project-item-name">
                        ${escapeHtml(
                project.name
            )}
                    </div>

                </div>
            `;


        const editIcon =
            projectElement.querySelector(
                ".project-edit-icon"
            );


        editIcon.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();


                openProjectEditModal(
                    project
                );

            }
        );


        projectElement.addEventListener(
            "click",
            event => {

                /*
                    If the pencil was clicked,
                    do not open the project.
                */

                if (
                    event.target.closest(
                        ".project-edit-icon"
                    )
                ) {

                    return;

                }


                openProject(
                    project
                );

            }
        );


        projectGrid.appendChild(
            projectElement
        );


        previousProjectWasActive = isActive;
        previousProjectWasAbandoned = isAbandoned;

    }

}




async function openDirectory(
    directory,
    name
) {

    directoryHistory.push(
        {
            directory:
                currentDirectory,

            name:
                currentDirectoryName
        }
    );


    currentDirectory =
        directory;

    currentDirectoryName =
        name;


    await renderDirectoryContents();


    updateCreationButtons();
}




async function goBack() {

    if (
        directoryHistory.length === 0
    ) {

        currentDirectory = null;

        currentDirectoryName = "";

        renderProjects();

        setStatus(
            "Ready"
        );

        return;

    }


    const previous =
        directoryHistory.pop();


    currentDirectory =
        previous.directory;

    currentDirectoryName =
        previous.name;


    await renderDirectoryContents();

    updateCreationButtons();


}


async function openFile(
    handle,
    name
) {

}

function getFileIcon(
    name
) {

    const extension =
        name
            .split(".")
            .pop()
            .toLowerCase();


    const icons = {

        html:
            "ph-file-html",

        htm:
            "ph-file-html",

        css:
            "ph-file-css",

        js:
            "ph-file-js",

        json:
            "ph-file-code",

        ts:
            "ph-file-ts",

        tsx:
            "ph-file-ts",

        jsx:
            "ph-file-js",

        cpp:
            "ph-file-code",

        hpp:
            "ph-file-code",

        c:
            "ph-file-code",

        h:
            "ph-file-code",

        cs:
            "ph-file-csharp",

        py:
            "ph-file-py",

        java:
            "ph-file-code",

        md:
            "ph-file-text",

        txt:
            "ph-file-text",

        pdf:
            "ph-file-pdf",

        svg:
            "ph-file-svg",

        png:
            "ph-file-image",

        jpg:
            "ph-file-image",

        jpeg:
            "ph-file-image",

        gif:
            "ph-file-image",

        webp:
            "ph-file-image",

        mp3:
            "ph-file-audio",

        wav:
            "ph-file-audio",

        mp4:
            "ph-file-video",

        webm:
            "ph-file-video"

    };


    return (
        icons[extension] ||
        "ph-file"
    );

}






async function createFile() {

    if (!currentDirectory) {

        return;

    }


    const name =
        createNameInput.value.trim();


    if (!name) {

        showCreateError(
            "Enter a file name."
        );

        return;

    }


    if (name.includes("/") || name.includes("\\")) {

        showCreateError(
            "File names cannot contain / or \\."
        );

        return;

    }


    try {

        const permission =
            await currentDirectory.requestPermission(
                {
                    mode: "readwrite"
                }
            );


        if (
            permission !== "granted"
        ) {

            showCreateError(
                "Write permission was not granted."
            );

            return;

        }


        await currentDirectory.getFileHandle(
            name,
            {
                create: true
            }
        );


        closeCreateModal();

        await renderDirectoryContents();

        setStatus(
            `Created ${name}`
        );

    }

    catch (error) {

        console.error(
            error
        );


        if (
            error.name === "NotAllowedError"
        ) {

            showCreateError(
                "Write permission was denied."
            );

            return;

        }


        if (
            error.name === "TypeMismatchError"
        ) {

            showCreateError(
                "An item with that name already exists."
            );

            return;

        }


        showCreateError(
            "Could not create the file."
        );

    }

}


async function createFolder() {

    if (!currentDirectory) {

        return;

    }


    const name =
        createNameInput.value.trim();


    if (!name) {

        showCreateError(
            "Enter a folder name."
        );

        return;

    }


    if (name.includes("/") || name.includes("\\")) {

        showCreateError(
            "Folder names cannot contain / or \\."
        );

        return;

    }


    try {

        const permission =
            await currentDirectory.requestPermission(
                {
                    mode: "readwrite"
                }
            );


        if (
            permission !== "granted"
        ) {

            showCreateError(
                "Write permission was not granted."
            );

            return;

        }


        await currentDirectory.getDirectoryHandle(
            name,
            {
                create: true
            }
        );


        closeCreateModal();

        await renderDirectoryContents();

        setStatus(
            `Created folder ${name}`
        );

    }

    catch (error) {

        console.error(
            error
        );


        if (
            error.name === "NotAllowedError"
        ) {

            showCreateError(
                "Write permission was denied."
            );

            return;

        }


        showCreateError(
            "Could not create the folder."
        );

    }

}

async function createProject() {

    const name =
        createNameInput.value.trim();


    if (!name) {

        showCreateError(
            "Enter a project name."
        );

        return;

    }


    if (name.includes("/") || name.includes("\\")) {

        showCreateError(
            "Project names cannot contain / or \\."
        );

        return;

    }


    const sourceId =
        projectSourceSelect.value;


    const source =
        sources.find(
            source =>
                source.id === sourceId
        );


    if (!source) {

        showCreateError(
            "Choose a project source."
        );

        return;

    }


    try {

        const permission =
            await source.handle.requestPermission(
                {
                    mode: "readwrite"
                }
            );


        if (
            permission !== "granted"
        ) {

            showCreateError(
                "Write permission was not granted for this source."
            );

            return;

        }


        const projectHandle =
            await source.handle.getDirectoryHandle(
                name,
                {
                    create: true
                }
            );


        await writeProjectConfig(
            projectHandle,
            createDefaultProjectConfig()
        );


        closeCreateModal();

        await refreshProjects();

        setStatus(
            `Created project ${name}`
        );

    }

    catch (error) {

        console.error(
            error
        );


        if (
            error.name === "NotAllowedError"
        ) {

            showCreateError(
                "Write permission was denied."
            );

            return;

        }


        showCreateError(
            "Could not create the project."
        );

    }

}









/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

    renderSources();


    settingsModal.classList.add(
        "open"
    );

}



function closeSettings() {

    settingsModal.classList.remove(
        "open"
    );

}










/* =========================================================
   SOURCE IMPORT / EXPORT
========================================================= */

const SOURCE_EXPORT_VERSION = 1;


/* ---------------------------------------------------------
   EXPORT SOURCES
--------------------------------------------------------- */

async function exportSources() {

    if (sources.length === 0) {

        setStatus("No sources to export");

        return;

    }


    /*
        FileSystemDirectoryHandle objects cannot be
        serialized into JSON.

        Therefore we export the portable configuration
        for each source and leave the actual folder
        handles out of the export.
    */

    const exportData = {

        version: SOURCE_EXPORT_VERSION,

        type: "project-manager-sources",

        sources: sources.map(
            source => ({

                name:
                    source.name,

                icon:
                    source.icon ||
                    "ph-folder",

                color:
                    source.color ||
                    "#8b8b8b"

            })
        )

    };


    const json = JSON.stringify(
        exportData,
        null,
        4
    );


    const blob = new Blob(
        [json],
        {
            type: "application/json"
        }
    );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");

    link.href =
        url;

    link.download =
        "project-manager-sources.json";

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
        url
    );


    setStatus(
        `Exported ${sources.length} ${sources.length === 1
            ? "source"
            : "sources"
        }`
    );

}


/* ---------------------------------------------------------
   IMPORT SOURCES
--------------------------------------------------------- */

async function importSources() {

    try {

        if (
            typeof showOpenFilePicker !==
            "function"
        ) {

            setStatus(
                "File importing is not supported by this browser"
            );

            return;

        }


        const [
            fileHandle
        ] = await showOpenFilePicker({

            multiple: false,

            types: [

                {
                    description:
                        "Project Manager Sources",

                    accept: {

                        "application/json":
                            [".json"]

                    }

                }

            ]

        });


        const file =
            await fileHandle.getFile();


        const text =
            await file.text();


        let data;

        try {

            data =
                JSON.parse(text);

        }
        catch (error) {

            alert(
                "The selected file is not valid JSON."
            );

            return;

        }


        if (
            !data ||
            data.type !==
            "project-manager-sources" ||
            data.version !==
            SOURCE_EXPORT_VERSION ||
            !Array.isArray(
                data.sources
            )
        ) {

            alert(
                "This is not a valid Project Manager sources export."
            );

            return;

        }


        if (
            data.sources.length === 0
        ) {

            alert(
                "The imported file contains no sources."
            );

            return;

        }


        /* -------------------------------------------------
           BUILD IMPORTED SOURCES
        ------------------------------------------------- */

        const importedSources = [];


        for (
            const exportedSource
            of data.sources
        ) {

            if (
                !exportedSource ||
                typeof exportedSource.name !==
                "string"
            ) {

                continue;

            }


            /*
                Tell the user exactly which source
                they are reconnecting.
            */

            const shouldSelect =
                confirm(
                    `Select the folder for the source "${exportedSource.name}".\n\n` +
                    `The folder you select will become the "${exportedSource.name}" source.`
                );


            if (
                !shouldSelect
            ) {

                /*
                    If the user skips this source,
                    don't import it.
                */

                continue;

            }


            const sourceHandle =
                await showDirectoryPicker({

                    mode:
                        "readwrite"

                });


            importedSources.push({

                id:
                    crypto.randomUUID(),

                name:
                    exportedSource.name,

                handle:
                    sourceHandle,

                icon:
                    typeof exportedSource.icon ===
                        "string"
                        ? exportedSource.icon
                        : "ph-folder",

                color:
                    typeof exportedSource.color ===
                        "string"
                        ? exportedSource.color
                        : "#8b8b8b"

            });

        }


        if (
            importedSources.length === 0
        ) {

            setStatus(
                "No valid sources were imported"
            );

            return;

        }


        /* -------------------------------------------------
           ADD IMPORTED SOURCES
        ------------------------------------------------- */

        sources.push(
            ...importedSources
        );


        await saveSources();


        /*
            Re-check permissions and reload
            the projects using the newly imported
            sources.
        */

        await loadSources();


        renderSources();

        renderProjects();

        renderFilterSources();


        setStatus(
            `Imported ${importedSources.length} ${importedSources.length === 1
                ? "source"
                : "sources"
            }`
        );


    }
    catch (error) {

        /*
            User cancelling a picker throws an
            AbortError. That isn't an actual error.
        */

        if (
            error?.name ===
            "AbortError"
        ) {

            return;

        }


        console.error(
            "Failed to import sources:",
            error
        );


        setStatus(
            "Could not import sources"
        );

    }

}



exportSourcesButton.addEventListener(
    "click",
    exportSources
);

importSourcesButton.addEventListener(
    "click",
    importSources
);










/* =========================================================
   STATUS
========================================================= */

function setStatus(
    message
) {

    statusText.textContent =
        message;

}






function setProjectView(
    view
) {

    projectView =
        view;

    localStorage.setItem(
        "projectView",
        view
    );


    projectGrid.classList.toggle(
        "list-view",
        view === "list"
    );

    projectGrid.classList.toggle(
        "grid-view",
        view === "grid"
    );


    const icon =
        viewModeButton.querySelector(
            "i"
        );


    if (view === "grid") {

        icon.className =
            "ph ph-list";

        viewModeButton.title =
            "List view";

    } else {

        icon.className =
            "ph ph-squares-four";

        viewModeButton.title =
            "Grid view";

    }

}







/* =========================================================
   HELPERS
========================================================= */


async function sourceAlreadyExists(
    handle
) {

    for (
        const source of sources
    ) {

        if (
            await source.handle.isSameEntry(
                handle
            )
        ) {

            return true;

        }

    }

    return false;

}



function escapeHtml(
    value
) {

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        value;


    return element.innerHTML;

}

function showCreateError(
    message
) {

    createError.textContent =
        message;

    createError.hidden =
        false;

}


















/* =========================================================
   CREATE FILE / FOLDER / PROJECT
========================================================= */

function updateCreationButtons() {

    const atTopLevel =
        currentDirectory === null;


    /*
        Files and folders can only be created
        inside a project/directory.
    */

    addFileButton.hidden =
        atTopLevel;

    addFolderButton.hidden =
        atTopLevel;


    /*
        Projects can only be created
        at the top level.
    */

    newProjectButton.hidden =
        !atTopLevel;

}


function openCreateModal(
    mode
) {

    createMode = mode;

    createError.hidden = true;
    createError.textContent = "";

    createNameInput.value = "";


    if (mode === "file") {

        createModalIcon.innerHTML =
            `<i class="ph ph-file-plus"></i>`;

        createModalTitle.textContent =
            "Add File";

        createModalDescription.textContent =
            "Create a new file in the current folder.";

        createNameLabel.textContent =
            "File name";

        createNameInput.placeholder =
            "example.html";

        confirmCreateText.textContent =
            "Create File";

        projectSourceField.hidden =
            true;

    }


    else if (mode === "folder") {

        createModalIcon.innerHTML =
            `<i class="ph ph-folder-plus"></i>`;

        createModalTitle.textContent =
            "Add Folder";

        createModalDescription.textContent =
            "Create a new folder in the current folder.";

        createNameLabel.textContent =
            "Folder name";

        createNameInput.placeholder =
            "My Folder";

        confirmCreateText.textContent =
            "Create Folder";

        projectSourceField.hidden =
            true;

    }


    else if (mode === "project") {



        createModalIcon.innerHTML =
            `<i class="ph ph-plus"></i>`;

        createModalTitle.textContent =
            "Create Project";

        createModalDescription.textContent =
            "Create a new project inside a source.";

        createNameLabel.textContent =
            "Project name";

        createNameInput.placeholder =
            "My Project";

        confirmCreateText.textContent =
            "Create Project";

        projectSourceField.hidden =
            false;

        populateProjectSources();

    }


    createModal.classList.add(
        "open"
    );


    requestAnimationFrame(
        () => {

            createNameInput.focus();

        }
    );

}


function closeCreateModal() {

    createModal.classList.remove(
        "open"
    );

    createMode = null;

}


function populateProjectSources() {

    projectSourceSelect.innerHTML = "";


    for (
        const source of sources
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            source.id;

        option.textContent =
            source.name;

        projectSourceSelect.appendChild(
            option
        );

    }

}


















/* =========================================================
   EVENTS
========================================================= */







// View mode toggle


viewModeButton.addEventListener(
    "click",
    () => {

        setProjectView(
            projectView === "grid"
                ? "list"
                : "grid"
        );

    }
);




filterDeprecatedLast.addEventListener(
    "change",
    async () => {

        deprecatedLast =
            filterDeprecatedLast.checked;

        localStorage.setItem(
            "deprecatedLast",
            deprecatedLast
        );

        await renderProjectItems();

    }
);








addFileButton.addEventListener(
    "click",
    () => {

        openCreateModal(
            "file"
        );

    }
);


addFolderButton.addEventListener(
    "click",
    () => {

        openCreateModal(
            "folder"
        );

    }
);


newProjectButton.addEventListener(
    "click",
    () => {

        openCreateModal(
            "project"
        );

    }
);


confirmCreateButton.addEventListener(
    "click",
    async () => {

        if (
            createMode === "file"
        ) {

            await createFile();

        }

        else if (
            createMode === "folder"
        ) {

            await createFolder();

        }

        else if (
            createMode === "project"
        ) {

            await createProject();

        }

    }
);


closeCreateModalButton.addEventListener(
    "click",
    closeCreateModal
);


cancelCreateButton.addEventListener(
    "click",
    closeCreateModal
);


createModal.addEventListener(
    "click",
    event => {

        if (
            event.target === createModal
        ) {

            closeCreateModal();

        }

    }
);


createNameInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            confirmCreateButton.click();

        }

        if (
            event.key === "Escape"
        ) {

            closeCreateModal();

        }

    }
);










/* =========================================================
   FILTER
========================================================= */

filterButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        const isOpen =
            filterPopup.classList.contains(
                "open"
            );


        if (isOpen) {

            closeFilterPopup();

        }

        else {

            openFilterPopup();

        }

    }
);


function openFilterPopup() {


    filterPopup.classList.add(
        "open"
    );

    filterButton.setAttribute(
        "aria-expanded",
        "true"
    );

}


function closeFilterPopup() {

    filterPopup.classList.remove(
        "open"
    );

    filterButton.setAttribute(
        "aria-expanded",
        "false"
    );

}









/*
    Clicking anywhere else closes the popup.
*/

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".filter-container"
            )
        ) {

            closeFilterPopup();

        }

    }
);


/*
    Sort selection.
*/

document
    .querySelectorAll(
        'input[name="projectSort"]'
    )
    .forEach(
        radio => {

            radio.addEventListener(
                "change",
                async () => {

                    projectSort =
                        radio.value;

                    saveProjectFilters();

                    await renderProjectItems();

                }
            );

        }
    );


/*
    Sort direction.
*/

filterSortDirection.addEventListener(
    "click",
    async () => {

        projectSortAscending =
            !projectSortAscending;

        saveProjectFilters();

        updateSortControls();

        await renderProjectItems();

    }
);














settingsButton.addEventListener(
    "click",
    openSettings
);


welcomeSettingsButton.addEventListener(
    "click",
    openSettings
);


closeSettingsButton.addEventListener(
    "click",
    closeSettings
);


addSourceButton.addEventListener(
    "click",
    addSource
);


refreshButton.addEventListener(
    "click",
    async () => {

        await refreshProjects(
            true
        );

    }
);




settingsModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            settingsModal
        ) {

            closeSettings();

        }

    }
);



/* =========================================================
   STARTUP
========================================================= */

async function initialize() {

    try {

        sources =
            await loadSources();

    }

    catch (
    error
    ) {

        console.error(
            error
        );


        sources = [];

    }


    renderSources();



    await refreshProjects();

    setProjectView(
        projectView
    );


    updateCreationButtons();


    projectFilterSources =
        JSON.parse(
            localStorage.getItem(
                "projectFilterSources"
            ) || "[]"
        );


    renderFilterSources();




}


initialize();














if (
    "serviceWorker" in navigator
) {

    navigator.serviceWorker.register(
        "./service-worker.js"
    )
        .catch(
            error => {

                console.error(
                    "Service worker registration failed:",
                    error
                );

            }
        );

}
