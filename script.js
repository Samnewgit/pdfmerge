// Import the pdf-lib library
document.write('<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>');

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const fileListContainer = document.getElementById('file-list-container');
const mergeBtn = document.getElementById('merge-btn');
const clearBtn = document.getElementById('clear-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');

// Store uploaded files
let pdfFiles = [];

// Initialize Sortable.js for drag-and-drop reordering
const sortable = new Sortable(fileList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onUpdate: (evt) => {
        const movedItem = pdfFiles.splice(evt.oldIndex, 1)[0];
        pdfFiles.splice(evt.newIndex, 0, movedItem);
    },
    // Improve mobile touch handling
    delayOnTouchOnly: true,
    delay: 100,
    touchStartThreshold: 5
});

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
clearBtn.addEventListener('click', clearFiles);
mergeBtn.addEventListener('click', mergePDFs);

// Drag and Drop Events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// Handle file selection
function handleFileSelect(e) {
    handleFiles(e.target.files);
    // Reset the input to allow selecting the same file again
    fileInput.value = '';
}

// Process selected files
function handleFiles(files) {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    const MAX_FILES = 30; // Maximum number of PDF files allowed
    
    const newFiles = Array.from(files).filter(file => {
        // Only accept PDF files
        if (file.type !== 'application/pdf') {
            alert(`${file.name} is not a PDF file. Only PDF files are accepted.`);
            return false;
        }
        
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            alert(`${file.name} exceeds the maximum file size limit of 100MB.`);
            return false;
        }
        
        return true;
    });
    
    if (newFiles.length === 0) return;
    
    // Check if adding these files would exceed the maximum limit
    if (pdfFiles.length + newFiles.length > MAX_FILES) {
        alert(`You can only add up to ${MAX_FILES} PDF files. Currently ${pdfFiles.length} files are added.`);
        // Only add files up to the limit
        const remainingSlots = MAX_FILES - pdfFiles.length;
        if (remainingSlots > 0) {
            pdfFiles = [...pdfFiles, ...newFiles.slice(0, remainingSlots)];
        }
    } else {
        // Add new files to our array
        pdfFiles = [...pdfFiles, ...newFiles];
    }
    
    // Update the UI
    renderFileList();
    
    // Show the file list container if it was hidden
    if (fileListContainer.classList.contains('hidden')) {
        fileListContainer.classList.remove('hidden');
    }
}

// Render the list of files
function renderFileList() {
    // Clear the current list
    fileList.innerHTML = '';
    
    // Add each file to the list
    pdfFiles.forEach((file, index) => {
        const fileItem = document.createElement('li');
        fileItem.className = 'file-item';
        
        // Format file size
        const fileSize = formatFileSize(file.size);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${fileSize}</span>
            </div>
            <button class="remove-file" data-index="${index}">&times;</button>
        `;
        
        fileList.appendChild(fileItem);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-file').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            removeFile(index);
        });
    });
    
    // Update merge button state
    mergeBtn.disabled = pdfFiles.length < 2;
}

// Remove a file from the list
function removeFile(index) {
    pdfFiles.splice(index, 1);
    renderFileList();
    
    // Hide the file list container if no files are left
    if (pdfFiles.length === 0) {
        fileListContainer.classList.add('hidden');
    }
}

// Clear all files
function clearFiles() {
    pdfFiles = [];
    renderFileList();
    fileListContainer.classList.add('hidden');
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Merge PDFs using pdf-lib
async function mergePDFs() {
    if (pdfFiles.length < 2) {
        alert('Please add at least 2 PDF files to merge.');
        return;
    }
    
    try {
        // Show progress container
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        
        // Create a new PDF document
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        // Process each PDF file
        for (let i = 0; i < pdfFiles.length; i++) {
            const file = pdfFiles[i];
            
            // Update progress
            const progress = Math.round(((i) / pdfFiles.length) * 100);
            progressBar.style.width = `${progress}%`;
            
            // Load the PDF file
            const fileArrayBuffer = await readFileAsArrayBuffer(file);
            const pdf = await PDFLib.PDFDocument.load(fileArrayBuffer);
            
            // Copy all pages from the current PDF to the merged PDF
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        
        // Final progress update
        progressBar.style.width = '100%';
        
        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        
        // Create a download link for the merged PDF
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Create download tab
        const downloadContainer = document.createElement('div');
        downloadContainer.id = 'download-container';
        downloadContainer.className = 'download-container';
        downloadContainer.innerHTML = `
            <h2>Merge Complete!</h2>
            <p>Your PDF has been successfully merged.</p>
            <button id="download-btn" class="btn primary">Download PDF</button>
        `;
        
        // Replace progress container with download container
        progressContainer.parentNode.insertBefore(downloadContainer, progressContainer.nextSibling);
        progressContainer.classList.add('hidden');
        
        // Add event listener to download button
        document.getElementById('download-btn').addEventListener('click', () => {
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'merged.pdf';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        });
        
        // Clean up the URL object when the page is unloaded
        window.addEventListener('unload', () => URL.revokeObjectURL(url));
        
        // Clear the file list to avoid confusion
        clearFiles();
        
    } catch (error) {
        console.error('Error merging PDFs:', error);
        alert('An error occurred while merging the PDFs. Please try again.');
        progressContainer.classList.add('hidden');
    }
}

// Helper function to read a file as ArrayBuffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}