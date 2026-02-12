// Data Storage
let products = [];
let incoming = [];
let inventory = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderProducts();
    renderIncoming();
    renderInventory();
    updateStats();
    
    // Set today's date as default for incoming
    document.getElementById('incomingDate').valueAsDate = new Date();
});

// Load data from localStorage
function loadData() {
    const savedProducts = localStorage.getItem('products');
    const savedIncoming = localStorage.getItem('incoming');
    const savedInventory = localStorage.getItem('inventory');
    
    if (savedProducts) products = JSON.parse(savedProducts);
    if (savedIncoming) incoming = JSON.parse(savedIncoming);
    if (savedInventory) inventory = JSON.parse(savedInventory);
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('incoming', JSON.stringify(incoming));
    localStorage.setItem('inventory', JSON.stringify(inventory));
}

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Refresh data based on tab
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
    // Populate product dropdown
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

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Add Product
function addProduct(event) {
    event.preventDefault();
    
    const code = document.getElementById('productCode').value.trim();
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    
    // Check if product code already exists
    if (products.some(p => p.code === code)) {
        alert('รหัสสินค้านี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
        return;
    }
    
    const product = {
        code: code,
        name: name,
        category: category || 'ทั่วไป',
        price: price
    };
    
    products.push(product);
    
    // Initialize inventory for this product
    inventory.push({
        code: code,
        name: name,
        quantity: 0,
        costPrice: 0,
        salePrice: price
    });
    
    saveData();
    renderProducts();
    closeModal('addProductModal');
    
    alert('เพิ่มสินค้าเรียบร้อยแล้ว!');
}

// Add Incoming
function addIncoming(event) {
    event.preventDefault();
    
    const date = document.getElementById('incomingDate').value;
    const productCode = document.getElementById('incomingProduct').value;
    const quantity = parseInt(document.getElementById('incomingQuantity').value);
    const cost = parseFloat(document.getElementById('incomingCost').value);
    
    // Find product
    const product = products.find(p => p.code === productCode);
    if (!product) {
        alert('ไม่พบสินค้า');
        return;
    }
    
    const incomingRecord = {
        id: Date.now(),
        date: date,
        code: productCode,
        name: product.name,
        quantity: quantity,
        cost: cost,
        total: quantity * cost
    };
    
    incoming.push(incomingRecord);
    
    // Update inventory
    const inventoryItem = inventory.find(i => i.code === productCode);
    if (inventoryItem) {
        // Calculate weighted average cost
        const totalCost = (inventoryItem.quantity * inventoryItem.costPrice) + (quantity * cost);
        const totalQuantity = inventoryItem.quantity + quantity;
        
        inventoryItem.quantity = totalQuantity;
        inventoryItem.costPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    }
    
    saveData();
    renderIncoming();
    closeModal('addIncomingModal');
    
    alert('บันทึกการนำเข้าเรียบร้อยแล้ว!');
}

// Delete Product
function deleteProduct(code) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) return;
    
    products = products.filter(p => p.code !== code);
    inventory = inventory.filter(i => i.code !== code);
    incoming = incoming.filter(i => i.code !== code);
    
    saveData();
    renderProducts();
    renderInventory();
    renderIncoming();
    
    alert('ลบสินค้าเรียบร้อยแล้ว!');
}

// Delete Incoming
function deleteIncoming(id) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) return;
    
    const record = incoming.find(i => i.id === id);
    if (!record) return;
    
    // Update inventory
    const inventoryItem = inventory.find(i => i.code === record.code);
    if (inventoryItem) {
        inventoryItem.quantity -= record.quantity;
        if (inventoryItem.quantity < 0) inventoryItem.quantity = 0;
    }
    
    incoming = incoming.filter(i => i.id !== id);
    
    saveData();
    renderIncoming();
    renderInventory();
    
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
    
    // Sort by date descending
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