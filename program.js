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



/* =========================================================
   STATE
========================================================= */

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





/* =========================================================
   PROJECT CONFIG
========================================================= */

const PROJECT_CONFIG_FILENAME =
    ".mcvs-project-config";

const DEFAULT_PROJECT_CONFIG = {
    version: 1,
    icon: "folder",
    iconColor: "",
    deprecated: false
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
                : "#808080",

        deprecated:
            typeof config?.deprecated === "boolean"
                ? config.deprecated
                : false
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


function getProjectIconClass(
    icon
) {

    const icons = {

        folder:
            "ph-folder",

        "folder-open":
            "ph-folder-open",

        cloud:
            "ph-cloud",

        code:
            "ph-code",

        terminal:
            "ph-terminal",

        "file-code":
            "ph-file-code",

        globe:
            "ph-globe",

        game:
            "ph-game-controller",

        brain:
            "ph-brain",

        database:
            "ph-database",

        image:
            "ph-image",

        music:
            "ph-music-notes",

        video:
            "ph-video-camera",

        book:
            "ph-book",

        notebook:
            "ph-notebook",

        rocket:
            "ph-rocket",

        star:
            "ph-star",

        heart:
            "ph-heart",

        lightning:
            "ph-lightning",

        wrench:
            "ph-wrench",

        package:
            "ph-package",

        archive:
            "ph-archive"

    };


    return (
        icons[icon] ||
        "ph-folder"
    );

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






function getProjectSource(project) {

    return sources.find(
        source =>
            source.id === project.sourceId
    ) || null;

}




function renderProjectItems() {

    projectGrid.innerHTML = "";

    for (
        const project of projects
    ) {

        const source =
            getProjectSource(project);

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


        projectElement.innerHTML =
            `
            <div
    class="project-item-icon"
    style="color: ${escapeHtml(iconColor)}"
>
    <i class="ph ${iconClass}"></i>
</div>

                ${source
                ? `
                            <div
                                class="project-source-icon"
                                style="color: ${source.color || "#8b8b8b"}"
                                title="${escapeHtml(source.name)}"
                            >
                                <i class="ph ${source.icon || "ph-folder"
                }"></i>
                            </div>
                        `
                : ""
            }

                <div class="project-item-content">

                    <div class="project-item-name">
                        ${escapeHtml(project.name)}
                    </div>

                </div>
            `;

        projectElement.addEventListener(
            "click",
            () => {

                openProject(
                    project
                );

            }
        );

        projectGrid.appendChild(
            projectElement
        );

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
