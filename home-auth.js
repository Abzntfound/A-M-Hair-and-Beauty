// A&M Hair and Beauty - MINIMAL TEST VERSION
// This version does the absolute minimum to diagnose the issue

console.log('🟢 TEST VERSION LOADING...');

// Check if script is even loading
window.addEventListener('DOMContentLoaded', function() {
    console.log('🟢 DOM LOADED - Starting test...');
    
    // Test 1: Can we access localStorage?
    console.log('TEST 1: localStorage access');
    try {
        const testData = localStorage.getItem('amUserData');
        console.log('✅ localStorage works. Data:', testData ? 'EXISTS' : 'EMPTY');
        
        if (testData) {
            const parsed = JSON.parse(testData);
            console.log('✅ Data parsed:', parsed);
            console.log('   - Name:', parsed.name);
            console.log('   - Email:', parsed.email);
            console.log('   - darkMode:', parsed.darkMode);
        } else {
            console.log('❌ NO USER DATA IN LOCALSTORAGE');
            console.log('❌ This is why you see "logged out state"');
        }
    } catch (e) {
        console.error('❌ localStorage error:', e);
    }
    
    // Test 2: Can we find the UI element?
    console.log('TEST 2: Finding UI element');
    const userDisplayName = document.getElementById('user-display-name');
    console.log('Element found:', userDisplayName);
    console.log('Current text:', userDisplayName ? userDisplayName.textContent : 'NOT FOUND');
    
    // Test 3: Can we update it?
    console.log('TEST 3: Updating UI');
    if (userDisplayName) {
        userDisplayName.textContent = 'TEST SUCCESSFUL';
        console.log('✅ UI updated to "TEST SUCCESSFUL"');
        console.log('   If you see "TEST SUCCESSFUL" in the header, the script works!');
    } else {
        console.error('❌ Cannot find user-display-name element');
    }
    
    // Test 4: Check what's in localStorage RIGHT NOW
    console.log('TEST 4: All localStorage items:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('am') || key.includes('Am')) {
            console.log(`   ${key}:`, localStorage.getItem(key).substring(0, 100));
        }
    }
    
    console.log('🟢 TEST COMPLETE - Check the logs above');
});

console.log('🟢 TEST VERSION LOADED');
