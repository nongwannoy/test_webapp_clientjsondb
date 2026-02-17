// Firebase SDK (ต้องเพิ่ม <script> firebasejs ใน index.html ด้วย)
const firebaseConfig = {
  apiKey: "AIzaSyBwD_p0kYhQflyNP0s_Ujp2i_8WEF0eEME",
  authDomain: "sample-firebase-ai-app-1de37.firebaseapp.com",
  projectId: "sample-firebase-ai-app-1de37",
  storageBucket: "sample-firebase-ai-app-1de37.firebasestorage.app",
  messagingSenderId: "750968294743",
  appId: "1:750968294743:web:a2e78b7420c6cb0b36c212"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Data Storage
let products = [];
let incoming = [];
let inventory = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    await loadData();
    renderProducts();
    renderIncoming();
    renderInventory();
    updateStats();
    document.getElementById('incomingDate').valueAsDate = new Date();
});

// Load data from Firestore
async function loadData() {
    products = [];
    incoming = [];
    inventory = [];

    // Products
    const productsSnap = await db.collection('products').get();
    productsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    // Incoming
    const incomingSnap = await db.collection('incoming').get();
    incomingSnap.forEach(doc => incoming.push({ id: doc.id, ...doc.data() }));

    // Inventory
    const inventorySnap = await db.collection('inventory').get();
    inventorySnap.forEach(doc => inventory.push({ id: doc.id, ...doc.data() }));
}

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

    // Check duplicate
    const exist = await db.collection('products').where('code', '==', code).get();
    if (!exist.empty) {
        alert('รหัสสินค้านี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
        return;
    }

    await db.collection('products').add({ code, name, category: category || 'ทั่วไป', price });
    await db.collection('inventory').add({ code, name, quantity: 0, costPrice: 0, salePrice: price });

    await loadData();
    renderProducts();
    renderInventory();
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

    // Find product
    const productSnap = await db.collection('products').where('code', '==', productCode).get();
    if (productSnap.empty) {
        alert('ไม่พบสินค้า');
        return;
    }
    const product = productSnap.docs[0].data();

    const incomingRecord = {
        date,
        code: productCode,
        name: product.name,
        quantity,
        cost,
        total: quantity * cost
    };

    await db.collection('incoming').add(incomingRecord);

    // Update inventory
    const inventorySnap = await db.collection('inventory').where('code', '==', productCode).get();
    if (!inventorySnap.empty) {
        const doc = inventorySnap.docs[0];
        const inventoryItem = doc.data();
        const totalCost = (inventoryItem.quantity * inventoryItem.costPrice) + (quantity * cost);
        const totalQuantity = inventoryItem.quantity + quantity;
        await db.collection('inventory').doc(doc.id).update({
            quantity: totalQuantity,
            costPrice: totalQuantity > 0 ? totalCost / totalQuantity : 0
        });
    }

    await loadData();
    renderIncoming();
    renderInventory();
    closeModal('addIncomingModal');
    alert('บันทึกการนำเข้าเรียบร้อยแล้ว!');
}

// Delete Product
async function deleteProduct(code) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) return;

    // ลบ products
    const productsSnap = await db.collection('products').where('code', '==', code).get();
    productsSnap.forEach(doc => doc.ref.delete());

    // ลบ inventory
    const inventorySnap = await db.collection('inventory').where('code', '==', code).get();
    inventorySnap.forEach(doc => doc.ref.delete());

    // ลบ incoming
    const incomingSnap = await db.collection('incoming').where('code', '==', code).get();
    incomingSnap.forEach(doc => doc.ref.delete());

    await loadData();
    renderProducts();
    renderInventory();
    renderIncoming();
    alert('ลบสินค้าเรียบร้อยแล้ว!');
}

// Delete Incoming
async function deleteIncoming(id) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) return;

    // หา record
    const doc = await db.collection('incoming').doc(id).get();
    if (!doc.exists) return;
    const record = doc.data();

    // อัปเดต inventory
    const inventorySnap = await db.collection('inventory').where('code', '==', record.code).get();
    if (!inventorySnap.empty) {
        const invDoc = inventorySnap.docs[0];
        const inventoryItem = invDoc.data();
        let newQty = inventoryItem.quantity - record.quantity;
        if (newQty < 0) newQty = 0;
        await db.collection('inventory').doc(invDoc.id).update({ quantity: newQty });
    }

    await db.collection('incoming').doc(id).delete();

    await loadData();
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
                <button class="btn btn-danger" onclick="deleteIncoming('${record.id}')">🗑️ ลบ</button>
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
                <button class="btn btn-danger" onclick="deleteIncoming('${record.id}')">🗑️ ลบ</button>
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