// script.js

// --- 0. DOM Elements & Utility Functions ---
const navButtons = document.querySelectorAll('.nav-button');
const pages = document.querySelectorAll('.page');
const errorMessageElements = document.querySelectorAll('.error-message');

function showPage(pageId) {
    pages.forEach(page => {
        if (page.id === pageId) {
            page.classList.add('active');
            page.classList.remove('hidden');
        } else {
            page.classList.add('hidden');
            page.classList.remove('active');
        }
    });

    navButtons.forEach(button => {
        if (button.dataset.page === pageId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    hideAllErrors(); // Clear errors when switching pages
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
}

function hideAllErrors() {
    errorMessageElements.forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
}

// Initial page load
document.addEventListener('DOMContentLoaded', () => {
    showPage('subnet-calculator'); // Show default page
    
    // Add event listeners to nav buttons
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            showPage(button.dataset.page);
        });
    });
});

// --- Helper Functions for IP Calculations ---
function ipToBytes(ipAddress) {
    return ipAddress.split('.').map(Number);
}

function bytesToIp(bytes) {
    return bytes.join('.');
}

function getSubnetMask(cidr) {
    const maskBytes = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        const bits = Math.min(cidr, 8);
        maskBytes[i] = (2 ** 8 - 1) ^ (2 ** (8 - bits) - 1); // (255) ^ (2^(8-bits)-1)
        cidr -= bits;
    }
    return bytesToIp(maskBytes);
}

function getNetworkAddress(ipBytes, maskBytes) {
    const networkBytes = ipBytes.map((byte, i) => byte & maskBytes[i]);
    return bytesToIp(networkBytes);
}

function getBroadcastAddress(networkBytes, maskBytes) {
    const broadcastBytes = networkBytes.map((byte, i) => byte | (~maskBytes[i] & 255));
    return bytesToIp(broadcastBytes);
}

function isValidIp(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
        const num = parseInt(part);
        return num >= 0 && num <= 255 && String(num) === part; // String(num) === part handles leading zeros like "01"
    });
}

// --- 1. Subnet Calculator ---
const ipAddressInput = document.getElementById('ipAddress');
const cidrInput = document.getElementById('cidr');
const calculateSubnetBtn = document.getElementById('calculateSubnet');

const resIpAddress = document.getElementById('resIpAddress');
const resSubnetMask = document.getElementById('resSubnetMask');
const resCidr = document.getElementById('resCidr');
const resNetworkId = document.getElementById('resNetworkId');
const resBroadcastId = document.getElementById('resBroadcastId');
const resHostRange = document.getElementById('resHostRange');
const resAvailableHosts = document.getElementById('resAvailableHosts');

calculateSubnetBtn.addEventListener('click', calculateSubnet);
ipAddressInput.addEventListener('input', hideError.bind(null, 'dataConverterError')); // Re-use ID for simplicity
cidrInput.addEventListener('input', hideError.bind(null, 'dataConverterError'));

function calculateSubnet() {
    hideError('dataConverterError'); // Clear previous error
    const ip = ipAddressInput.value.trim();
    const cidr = parseInt(cidrInput.value);

    if (!isValidIp(ip)) {
        showError('dataConverterError', 'Alamat IP tidak valid. Gunakan format XXX.XXX.XXX.XXX.');
        clearSubnetResults();
        return;
    }
    if (isNaN(cidr) || cidr < 0 || cidr > 32) {
        showError('dataConverterError', 'CIDR tidak valid. Masukkan angka antara 0 dan 32.');
        clearSubnetResults();
        return;
    }

    const ipBytes = ipToBytes(ip);
    const subnetMask = getSubnetMask(cidr);
    const maskBytes = ipToBytes(subnetMask);
    const networkAddress = getNetworkAddress(ipBytes, maskBytes);
    const broadcastAddress = getBroadcastAddress(ipToBytes(networkAddress), maskBytes);

    const numHosts = (2 ** (32 - cidr)) - 2; // -2 for network and broadcast

    // Get first and last host
    const networkBytes = ipToBytes(networkAddress);
    const broadcastBytes = ipToBytes(broadcastAddress);
    
    let firstHostBytes = [...networkBytes];
    firstHostBytes[3]++; // Increment last octet for first host
    
    let lastHostBytes = [...broadcastBytes];
    lastHostBytes[3]--; // Decrement last octet for last host

    const firstHost = bytesToIp(firstHostBytes);
    const lastHost = bytesToIp(lastHostBytes);

    resIpAddress.textContent = ip;
    resSubnetMask.textContent = subnetMask;
    resCidr.textContent = `/${cidr}`;
    resNetworkId.textContent = networkAddress;
    resBroadcastId.textContent = broadcastAddress;
    resHostRange.textContent = `${firstHost} - ${lastHost}`;
    resAvailableHosts.textContent = numHosts < 0 ? 'Tidak Tersedia' : numHosts.toLocaleString(); // handle /31, /32

    document.getElementById('subnetResults').style.display = 'block'; // Show results
}

function clearSubnetResults() {
    resIpAddress.textContent = '';
    resSubnetMask.textContent = '';
    resCidr.textContent = '';
    resNetworkId.textContent = '';
    resBroadcastId.textContent = '';
    resHostRange.textContent = '';
    resAvailableHosts.textContent = '';
    document.getElementById('subnetResults').style.display = 'none';
}
clearSubnetResults(); // Hide results initially

// --- 2. Data Converter ---
const inputDataValue = document.getElementById('inputDataValue');
const inputDataUnit = document.getElementById('inputDataUnit');
const outputDataValue = document.getElementById('outputDataValue');
const outputDataUnit = document.getElementById('outputDataUnit');
const dataConverterError = document.getElementById('dataConverterError');

// Base unit: bit/s (b)
// Penting: Awalan SI (kilo, mega, giga) untuk 'bit' adalah basis 1000.
// Awalan biner (kibi, mebi, gibi) yang sering disingkat untuk 'Byte' adalah basis 1024.
const unitMultipliers = {
    'b': 1,           // bit
    'Kb': 1000,       // Kilobit
    'Mb': 1_000_000,  // Megabit
    'Gb': 1_000_000_000, // Gigabit

    'B': 8,           // Byte (8 bits)
    'KB': 8 * 1024,   // Kilobyte (kibibyte) = 1024 Byte = 8192 bits
    'MB': 8 * 1024 * 1024, // Megabyte (mebibyte) = 1024 KB = 8388608 bits
    'GB': 8 * 1024 * 1024 * 1024 // Gigabyte (gibibyte) = 1024 MB = 8589934592 bits
};

inputDataValue.addEventListener('input', convertDataSpeed);
inputDataUnit.addEventListener('change', convertDataSpeed);
outputDataUnit.addEventListener('change', convertDataSpeed);

function convertDataSpeed() {
    hideError('dataConverterError');
    const inputValue = parseFloat(inputDataValue.value);
    const inputUnit = inputDataUnit.value;
    const outputUnit = outputDataUnit.value;

    if (isNaN(inputValue)) {
        showError('dataConverterError', 'Masukkan nilai numerik yang valid.');
        outputDataValue.textContent = '';
        return;
    }
    if (inputValue < 0) {
        showError('dataConverterError', 'Nilai tidak boleh negatif.');
        outputDataValue.textContent = '';
        return;
    }

    // Convert input value to base unit (bits/second)
    const valueInBits = inputValue * unitMultipliers[inputUnit];

    // Convert from base unit (bits/second) to output unit
    let result = valueInBits / unitMultipliers[outputUnit];

    let formattedResult;

    // Periksa apakah hasilnya adalah bilangan bulat
    if (Number.isInteger(result)) {
        // Jika bulat, gunakan toString() untuk mendapatkan representasi angka penuh tanpa desimal
        formattedResult = result.toString();
    } else {
        // Jika bukan bilangan bulat, gunakan toFixed() dengan presisi tinggi
        // dan kemudian hapus angka nol di belakang koma jika tidak diperlukan.
        formattedResult = result.toFixed(10); // Contoh 10 desimal, bisa disesuaikan
        formattedResult = formattedResult.replace(/\.?0+$/, ''); // Hapus .000000 jika hasil bulat, atau .0+ jika angka di belakangnya 0 semua
    }
    
    outputDataValue.textContent = formattedResult;
}
convertDataSpeed(); // Perform initial conversion on load

// --- 3. Subnet Divider ---
const baseIpInput = document.getElementById('baseIp');
const numSubnetsInput = document.getElementById('numSubnets');
const divideSubnetsBtn = document.getElementById('divideSubnets');
const subnetTableBody = document.querySelector('#subnetTable tbody');
const subnetDividerError = document.getElementById('subnetDividerError');

divideSubnetsBtn.addEventListener('click', divideSubnets);
baseIpInput.addEventListener('input', hideError.bind(null, 'subnetDividerError'));
numSubnetsInput.addEventListener('input', hideError.bind(null, 'subnetDividerError'));


function divideSubnets() {
    hideError('subnetDividerError');
    subnetTableBody.innerHTML = ''; // Clear previous results

    const baseIpCidr = baseIpInput.value.trim();
    const parts = baseIpCidr.split('/');
    let baseIp = parts[0];
    let baseCidr = parseInt(parts[1]);
    const numSubnets = parseInt(numSubnetsInput.value);

    if (!isValidIp(baseIp)) {
        showError('subnetDividerError', 'Alamat IP dasar tidak valid. Gunakan format XXX.XXX.XXX.XXX/YY.');
        return;
    }
    if (isNaN(baseCidr) || baseCidr < 0 || baseCidr > 32) {
        showError('subnetDividerError', 'CIDR dasar tidak valid. Masukkan angka antara 0 dan 32.');
        return;
    }
    if (isNaN(numSubnets) || numSubnets < 1) {
        showError('subnetDividerError', 'Jumlah subnet yang dibutuhkan harus angka positif.');
        return;
    }

    // Calculate new CIDR for subnets
    let bitsNeeded = Math.ceil(Math.log2(numSubnets));
    let newCidr = baseCidr + bitsNeeded;

    if (newCidr > 32) {
        showError('subnetDividerError', `Tidak dapat membagi ${baseIpCidr} menjadi ${numSubnets} subnet. CIDR baru akan melebihi /32.`);
        return;
    }

    const baseIpBytes = ipToBytes(baseIp);
    const baseMaskBytes = ipToBytes(getSubnetMask(baseCidr));
    const baseNetworkId = getNetworkAddress(baseIpBytes, baseMaskBytes); // Ensure base network ID is used

    let currentNetworkIpBytes = ipToBytes(baseNetworkId);
    let currentNetworkInt = 0; // Integer representation of currentNetworkIpBytes for iteration

    // Convert base network IP to a single 32-bit integer for easier arithmetic
    for(let i = 0; i < 4; i++) {
        currentNetworkInt = (currentNetworkInt << 8) | currentNetworkIpBytes[i];
    }
    
    // Calculate subnet block size (number of IPs in each new subnet)
    const blockSize = 2 ** (32 - newCidr);

    for (let i = 0; i < numSubnets; i++) {
        const subnetIpInt = currentNetworkInt + (i * blockSize);
        
        // Convert integer back to IP bytes
        const subnetIpBytes = [
            (subnetIpInt >> 24) & 255,
            (subnetIpInt >> 16) & 255,
            (subnetIpInt >> 8) & 255,
            subnetIpInt & 255
        ];
        
        const subnetNetworkAddress = bytesToIp(subnetIpBytes);
        const subnetMask = getSubnetMask(newCidr);
        const subnetMaskBytes = ipToBytes(subnetMask);
        const subnetBroadcastAddress = getBroadcastAddress(subnetIpBytes, subnetMaskBytes);

        // Calculate host range
        const firstHostBytes = [...subnetIpBytes];
        firstHostBytes[3]++; // Increment last octet
        const firstHost = bytesToIp(firstHostBytes);

        const broadcastIpBytes = ipToBytes(subnetBroadcastAddress);
        const lastHostBytes = [...broadcastIpBytes];
        lastHostBytes[3]--; // Decrement last octet
        const lastHost = bytesToIp(lastHostBytes);

        const availableHosts = (blockSize - 2); // For /31, /32, this might be negative or 0

        const row = subnetTableBody.insertRow();
        row.insertCell().textContent = i + 1;
        row.insertCell().textContent = `${subnetNetworkAddress}/${newCidr}`;
        row.insertCell().textContent = subnetMask;
        row.insertCell().textContent = `${firstHost} - ${lastHost}`;
        row.insertCell().textContent = subnetBroadcastAddress;
        row.insertCell().textContent = availableHosts < 0 ? 'N/A' : availableHosts.toLocaleString(); // handle /31, /32
    }
}
