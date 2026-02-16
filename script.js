// Data Storage
let products = [];
let incoming = [];
let inventory = [];

// URL ของ Apps Script (เปลี่ยนเป็นของคุณ)
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzWGADAfCY6u0ZyaXGvwToREtEg3qO82ai1-s_4qzIjXoWJYo5Gfs5OqkjibUXhIhX3/exec';

// โหลดข้อมูลจาก Google Sheets
async function loadSheetData(sheetName) {
    const res = await fetch(`${SHEET_API_URL}?sheet=${sheetName}`);
    const data = await res.json();
    return data.length > 1 ? data.slice(1) : [];
}

// โหลดข้อมูลทั้งหมด
async function loadAllData() {
    products = (await loadSheetData('products')).map(row => ({
        code: row[0],
        name: row[1],
        category: row[2],
        price: parseFloat(row[3])
    }));
    incoming = (await loadSheetData('incoming')).map(row => ({
        id: Number(row[0]),
        date: row[1],
        code: row[2],
        name: row[3],
        quantity: Number(row[4]),
        cost: parseFloat(row[5]),
        total: parseFloat(row[6])
    }));
    inventory = (await loadSheetData('inventory')).map(row => ({
        code: row[0],
        name: row[1],
        quantity: Number(row[2]),
        costPrice: parseFloat(row[3]),
        salePrice: parseFloat(row[4])
    }));
    renderProducts();
    renderIncoming();
    renderInventory();
    updateStats();
}

// เพิ่มข้อมูล
async function addProductToSheet(product) {
    await fetch(`${SHEET_API_URL}?sheet=products`, {
        method: 'POST',
        body: JSON.stringify([product.code, product.name, product.category, product.price]),
        headers: { 'Content-Type': 'application/json' }
    });
    // เพิ่ม inventory ด้วย
    await fetch(`${SHEET_API_URL}?sheet=inventory`, {
        method: 'POST',
        body: JSON.stringify([product.code, product.name, 0, 0, product.price]),
        headers: { 'Content-Type': 'application/json' }
    });
    await loadAllData();
}

async function addIncomingToSheet(record) {
    await fetch(`${SHEET_API_URL}?sheet=incoming`, {
        method: 'POST',
        body: JSON.stringify([
            record.id, record.date, record.code, record.name, record.quantity, record.cost, record.total
        ]),
        headers: { 'Content-Type': 'application/json' }
    });
    // อัปเดต inventory ฝั่ง Google Sheets (ควรมีฟังก์ชันใน Apps Script หรือโหลดมาแล้วคำนวณใหม่)
    await loadAllData();
}

// ลบข้อมูล (ต้องเพิ่มฟังก์ชัน doDelete ใน Apps Script)
async function deleteProductFromSheet(code) {
    await fetch(`${SHEET_API_URL}?sheet=products&code=${code}`, { method: 'DELETE' });
    await fetch(`${SHEET_API_URL}?sheet=inventory&code=${code}`, { method: 'DELETE' });
    await fetch(`${SHEET_API_URL}?sheet=incoming&code=${code}`, { method: 'DELETE' });
    await loadAllData();
}

async function deleteIncomingFromSheet(id) {
    await fetch(`${SHEET_API_URL}?sheet=incoming&id=${id}`, { method: 'DELETE' });
    await loadAllData();
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    document.getElementById('incomingDate').valueAsDate = new Date();
});

// Tab Navigation
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    if (tabName === 'products') renderProducts();
    if (tabName === 'incoming') renderIncoming();
    if (tabName === 'inventory') {
        renderInventory();
        updateStats();
    }
}

// Modal Functions
function showAddProductModal() {
    document.getElementById('addProductModal').style.display = 'block';
    document.getElementById('addProductForm').reset();
}

function showAddIncomingModal() {
    const select = document.getElementById('incomingProduct');
    select.innerHTML = '<option value="">-- เลือกสินค้า --</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.code;
        option.textContent = `${product.code} - ${product.name}`;
        select.appendChild(option);
    });
    document.getElementById('addIncomingModal').style.display = 'block';
    document.getElementById('addIncomingForm').reset();
    document.getElementById('incomingDate').valueAsDate = new Date();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Add Product
async function addProduct(event) {
    event.preventDefault();
    const code = document.getElementById('productCode').value.trim();
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    if (products.some(p => p.code === code)) {
        alert('รหัสสินค้านี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
        return;
    }
    const product = { code, name, category: category || 'ทั่วไป', price };
    await addProductToSheet(product);
    closeModal('addProductModal');
    alert('เพิ่มสินค้าเรียบร้อยแล้ว!');
}

// Add Incoming
async function addIncoming(event) {
    event.preventDefault();
    const date = document.getElementById('incomingDate').value;
    const productCode = document.getElementById('incomingProduct').value;
    const quantity = parseInt(document.getElementById('incomingQuantity').value);
    const cost = parseFloat(document.getElementById('incomingCost').value);
    const product = products.find(p => p.code === productCode);
    if (!product) {
        alert('ไม่พบสินค้า');
        return;
    }
    const incomingRecord = {
        id: Date.now(),
        date,
        code: productCode,
        name: product.name,
        quantity,
        cost,
        total: quantity * cost
    };
    await addIncomingToSheet(incomingRecord);
    closeModal('addIncomingModal');
    alert('บันทึกการนำเข้าเรียบร้อยแล้ว!');
}

// Delete Product
async function deleteProduct(code) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) return;
    await deleteProductFromSheet(code);
    alert('ลบสินค้าเรียบร้อยแล้ว!');
}

// Delete Incoming
async function deleteIncoming(id) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) return;
    await deleteIncomingFromSheet(id);
    alert('ลบรายการเรียบร้อยแล้ว!');
}

// Render Products Table
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <h3>ยังไม่มีสินค้า</h3>
                    <p>คลิก "เพิ่มสินค้าใหม่" เพื่อเริ่มต้น</p>
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteProduct('${product.code}')">🗑️ ลบ</button>
            </td>
        </tr>
    `).join('');
}

// Render Incoming Table
function renderIncoming() {
    const tbody = document.getElementById('incomingTableBody');
    if (incoming.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <h3>ยังไม่มีรายการนำเข้า</h3>
                    <p>คลิก "บันทึกการนำเข้า" เพื่อเริ่มต้น</p>
                </td>
            </tr>
        `;
        return;
    }
    const sortedIncoming = [...incoming].sort((a, b) => new Date(b.date) - new Date(a.date));
    tbody.innerHTML = sortedIncoming.map(record => `
        <tr>
            <td>${formatDate(record.date)}</td>
            <td>${record.code}</td>
            <td>${record.name}</td>
            <td>${record.quantity}</td>
            <td>${formatCurrency(record.cost)}</td>
            <td>${formatCurrency(record.total)}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteIncoming(${record.id})">🗑️ ลบ</button>
            </td>
        </tr>
    `).join('');
}

// Render Inventory Table
function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if (inventory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <h3>ยังไม่มีสินค้าในคลัง</h3>
                    <p>เพิ่มสินค้าและบันทึกการนำเข้าเพื่อเริ่มต้น</p>
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = inventory.map(item => {
        const totalValue = item.quantity * item.costPrice;
        const status = getStockStatus(item.quantity);
        return `
            <tr>
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.costPrice)}</td>
                <td>${formatCurrency(item.salePrice)}</td>
                <td>${formatCurrency(totalValue)}</td>
                <td><span class="status-badge status-${status.class}">${status.text}</span></td>
            </tr>
        `;
    }).join('');
}

// Update Statistics
function updateStats() {
    const totalProducts = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    const lowStock = inventory.filter(item => item.quantity < 10 && item.quantity > 0).length;
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('lowStock').textContent = lowStock;
}

// Refresh Inventory
function refreshInventory() {
    renderInventory();
    updateStats();
    alert('รีเฟรชข้อมูลเรียบร้อยแล้ว!');
}

// Search Functions
function searchProducts() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
    const tbody = document.getElementById('productsTableBody');
    const filtered = products.filter(p => 
        p.code.toLowerCase().includes(searchTerm) ||
        p.name.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
    );
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <h3>ไม่พบสินค้าที่ค้นหา</h3>
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = filtered.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteProduct('${product.code}')">🗑️ ลบ</button>
            </td>
        </tr>
    `).join('');
}

function searchIncoming() {
    const searchTerm = document.getElementById('searchIncoming').value.toLowerCase();
    const tbody = document.getElementById('incomingTableBody');
    const filtered = incoming.filter(i => 
        i.code.toLowerCase().includes(searchTerm) ||
        i.name.toLowerCase().includes(searchTerm) ||
        i.date.includes(searchTerm)
    );
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <h3>ไม่พบรายการที่ค้นหา</h3>
                </td>
            </tr>
        `;
        return;
    }
    const sortedFiltered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    tbody.innerHTML = sortedFiltered.map(record => `
        <tr>
            <td>${formatDate(record.date)}</td>
            <td>${record.code}</td>
            <td>${record.name}</td>
            <td>${record.quantity}</td>
            <td>${formatCurrency(record.cost)}</td>
            <td>${formatCurrency(record.total)}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteIncoming(${record.id})">🗑️ ลบ</button>
            </td>
        </tr>
    `).join('');
}

function searchInventory() {
    const searchTerm = document.getElementById('searchInventory').value.toLowerCase();
    const tbody = document.getElementById('inventoryTableBody');
    const filtered = inventory.filter(i => 
        i.code.toLowerCase().includes(searchTerm) ||
        i.name.toLowerCase().includes(searchTerm)
    );
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <h3>ไม่พบสินค้าที่ค้นหา</h3>
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = filtered.map(item => {
        const totalValue = item.quantity * item.costPrice;
        const status = getStockStatus(item.quantity);
        return `
            <tr>
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.costPrice)}</td>
                <td>${formatCurrency(item.salePrice)}</td>
                <td>${formatCurrency(totalValue)}</td>
                <td><span class="status-badge status-${status.class}">${status.text}</span></td>
            </tr>
        `;
    }).join('');
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function getStockStatus(quantity) {
    if (quantity === 0) {
        return { text: 'สินค้าหมด', class: 'out' };
    } else if (quantity < 10) {
        return { text: 'ใกล้หมด', class: 'low' };
    } else {
        return { text: 'ปกติ', class: 'normal' };
    }
}