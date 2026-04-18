// Comprehensive fix for upload button issue
console.log("=== UPLOAD BUTTON DIAGNOSTIC ===");

// Test 1: Check if backend is working
async function testBackend() {
    try {
        const response = await fetch('http://localhost:3001/test');
        console.log("Backend test:", await response.text());
        return true;
    } catch (error) {
        console.error("Backend not accessible:", error);
        return false;
    }
}

// Test 2: Check CORS
async function testCORS() {
    try {
        const response = await fetch('http://localhost:3001/api/exams/add', {
            method: 'OPTIONS'
        });
        console.log("CORS test:", response.status);
        return response.status === 204;
    } catch (error) {
        console.error("CORS issue:", error);
        return false;
    }
}

// Test 3: Check actual upload
async function testUpload() {
    try {
        const formData = new FormData();
        formData.append('exam_name', 'Diagnostic Test');
        formData.append('duration_minutes', '60');
        formData.append('total_questions', '3');
        formData.append('exam_type', 'NDA');
        
        // Create a simple test file
        const testFile = new Blob(['Question 1: Test?\nA) A\nB) B\nC) C\nD) D\nCorrect: A'], 
            { type: 'text/plain' });
        formData.append('file', testFile, 'test.txt');
        
        const response = await fetch('http://localhost:3001/api/exams/add', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log("Upload test:", response.status, data);
        return response.status === 200;
    } catch (error) {
        console.error("Upload test failed:", error);
        return false;
    }
}

// Run all tests
async function runDiagnostics() {
    console.log("1. Testing backend connectivity...");
    const backendOk = await testBackend();
    
    console.log("2. Testing CORS...");
    const corsOk = await testCORS();
    
    console.log("3. Testing upload...");
    const uploadOk = await testUpload();
    
    console.log("=== DIAGNOSTIC RESULTS ===");
    console.log("Backend:", backendOk ? "OK" : "FAILED");
    console.log("CORS:", corsOk ? "OK" : "FAILED");
    console.log("Upload:", uploadOk ? "OK" : "FAILED");
    
    if (backendOk && corsOk && uploadOk) {
        console.log("All backend tests passed - issue is likely in frontend React component");
    } else {
        console.log("Backend issue detected - fix backend first");
    }
}

runDiagnostics();
