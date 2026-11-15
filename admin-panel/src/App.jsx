import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Package, Barcode, Gavel, Users, ShoppingBag,
  Truck, Printer, ShieldCheck, ClipboardCheck, History, Settings,
  Plus, Search, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  DollarSign, Download, ArrowUpRight, LogOut, ChevronRight, Menu, X,
  FileSpreadsheet, FileText, Check, Layers, ScanLine, Eye, Ban, UserCheck, TrendingUp, Lock, UserPlus, Key,
  Upload, Image as ImageIcon, Camera, Trash2, ExternalLink, Bot, Sliders, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Html5Qrcode } from 'html5-qrcode';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

const API_ENTERPRISE = '/api/enterprise';
const API_ADMIN = '/api/admin';
const API_UPLOADS = '/api/uploads';

export default function App() {
  // --- AUTHENTICATION & RBAC STATE ---
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('iraqbid_admin_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('iraqbid_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Configure Axios default header and Token Expiry Interceptor
  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }

    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          const msg = error.response.data?.message || '';
          if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('unauthorized')) {
            alert('Your session has expired. Please sign in again.');
            handleLogout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [authToken]);

  const userRole = (currentUser?.role || '').toLowerCase().trim();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState(() => {
    if (userRole === 'editor') return 'inventory';
    return 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- BANNERS & SLIDESHOW MANAGEMENT STATE ---
  const [bannersList, setBannersList] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [newBanner, setNewBanner] = useState({ title: '', link: '', displayOrder: '1', isActive: true });
  const [bannerImageFile, setBannerImageFile] = useState(null);

  // --- 1. EXECUTIVE DASHBOARD KPI STATE ---
  const [kpiData, setKpiData] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  // --- 2. INVENTORY STATE ---
  const [inventory, setInventory] = useState([]);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const fileInputRef = useRef(null);

  const [newProduct, setNewProduct] = useState({
    barcode: '',
    product_name: '',
    category_id: '',
    description: '',
    images: [],
    original_retail_price: '',
    starting_bid_price: '',
    buy_now_price: '',
    min_acceptable_price: '',
    actual_acquisition_cost: '',
    auto_bid_increment: '1.00',
    condition: 'New',
    defect_alert: false,
    defect_details: '',
    warehouse_location: 'Main Warehouse Slot A',
    notes: ''
  });

  // --- 3. BARCODES HUB STATE ---
  const [barcodes, setBarcodes] = useState([]);
  const [barcodeQty, setBarcodeQty] = useState(100);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeStatusFilter, setBarcodeStatusFilter] = useState('all');
  const [scannerActive, setScannerActive] = useState(false);
  const html5QrCodeRef = useRef(null);

  // Range Barcode Generation & Printing State
  const [fromBarcodeNum, setFromBarcodeNum] = useState('');
  const [toBarcodeNum, setToBarcodeNum] = useState('');
  const [rangeLoading, setRangeLoading] = useState(false);
  const [selectedBarcodeIds, setSelectedBarcodeIds] = useState(new Set());
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);
  const [labelsPerPage, setLabelsPerPage] = useState(24); // 24, 30, or custom
  const [stickerPaperSize, setStickerPaperSize] = useState('A4'); // 'A4' or 'Thermal'

  // --- 4. PHYSICAL STOCK AUDIT STATE ---
  const [auditInput, setAuditInput] = useState('');
  const [auditList, setAuditList] = useState([]);
  const [auditSummary, setAuditSummary] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  // --- 5. ORDERS & SHIPPING & LABEL STATE ---
  const [allAppOrders, setAllAppOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [refusalReason, setRefusalReason] = useState('Customer uncontactable or refused delivery at door');

  // --- 6. 3-STRIKE REFUSAL CRM STATE ---
  const [refusalRecords, setRefusalRecords] = useState([]);

  // --- 7. STAFF & CUSTOM PERMISSIONS STATE ---
  const [staffList, setStaffList] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', phone: '', role: 'editor' });
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedEmployeePerms, setSelectedEmployeePerms] = useState(null);
  const [showPermsModal, setShowPermsModal] = useState(false);

  // --- 8. MOBILE USERS & PRODUCT APPROVALS & AUCTIONS ---
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [pendingProducts, setPendingProducts] = useState([]);
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [referralsList, setReferralsList] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);

  // --- 9. SYSTEM SETTINGS & AUTO-BIDDER BOT STATE ---
  const [systemSettings, setSystemSettings] = useState({
    exchange_rate_usd_iqd: '1520',
    auto_bidder_enabled: 'true',
    auto_bidder_window_minutes: '10',
    default_shipping_cost_usd: '5.00'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [autoBidsHistory, setAutoBidsHistory] = useState([]);

  // --- 10. AUDIT TRAIL LOGS ---
  const [logs, setLogs] = useState([]);

  // --- LOGIN SUBMIT ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await axios.post(`${API_ADMIN}/login`, {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword
      });

      if (res.data.token && res.data.admin) {
        const token = res.data.token;
        const adminUser = res.data.admin;
        setAuthToken(token);
        setCurrentUser(adminUser);
        localStorage.setItem('iraqbid_admin_token', token);
        localStorage.setItem('iraqbid_admin_user', JSON.stringify(adminUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        if (adminUser.role === 'editor') {
          setActiveTab('inventory');
        } else {
          setActiveTab('dashboard');
        }
      } else {
        setLoginError(res.data.message || 'Login failed. Invalid response.');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
    localStorage.removeItem('iraqbid_admin_token');
    localStorage.removeItem('iraqbid_admin_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  // --- DATA FETCHERS ---
  const fetchKPI = async () => {
    if (!authToken || userRole === 'editor') return;
    setKpiLoading(true);
    try {
      const res = await axios.get(`${API_ENTERPRISE}/dashboard/kpi`);
      if (res.data.success) setKpiData(res.data.data);
    } catch (err) {
      console.error('KPI error:', err);
    } finally {
      setKpiLoading(false);
    }
  };

  const fetchInventory = async () => {
    if (!authToken) return;
    setInventoryLoading(true);
    try {
      const res = await axios.get(`${API_ENTERPRISE}/inventory?status=${inventoryFilter}&search=${encodeURIComponent(inventorySearch)}`);
      if (res.data.success) setInventory(res.data.data);
    } catch (err) {
      console.error('Inventory error:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      if (res.data.success && res.data.data) {
        setCategoriesList(res.data.data);
      }
    } catch (err) {
      console.error('Categories fetch error:', err);
    }
  };

  const fetchBarcodes = async () => {
    if (!authToken) return;
    setBarcodeLoading(true);
    try {
      const statusParam = barcodeStatusFilter && barcodeStatusFilter !== 'all' ? `&status=${barcodeStatusFilter}` : '';
      const res = await axios.get(`${API_ENTERPRISE}/barcodes?search=${encodeURIComponent(barcodeSearch)}${statusParam}&limit=200`);
      if (res.data.success) setBarcodes(res.data.data);
    } catch (err) {
      console.error('Barcodes error:', err);
    } finally {
      setBarcodeLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!authToken || userRole === 'editor') return;
    try {
      const res = await axios.get(`${API_ADMIN}/staff`);
      if (res.data.success) setStaffList(res.data.staff);
    } catch (err) {
      console.error('Staff error:', err);
    }
  };

  const fetchOrders = async () => {
    if (!authToken || userRole === 'editor') return;
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_ADMIN}/orders`);
      setAllAppOrders(res.data.orders || []);
    } catch (err) {
      console.error('Orders error:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchRefusals = async () => {
    if (!authToken || !['superadmin', 'admin'].includes(userRole)) return;
    try {
      const res = await axios.get(`${API_ENTERPRISE}/customers/refusals`);
      if (res.data.success) setRefusalRecords(res.data.data || []);
    } catch (err) {
      console.error('Refusals error:', err);
    }
  };

  const fetchLiveAuctions = async () => {
    if (!authToken || userRole === 'editor') return;
    try {
      const res = await axios.get(`${API_ADMIN}/auctions/active`);
      if (res.data.success && res.data.data) {
        setLiveAuctions(res.data.data);
      } else if (Array.isArray(res.data)) {
        setLiveAuctions(res.data);
      }
    } catch (err) {
      console.error('Live auctions error:', err);
    }
  };

  const fetchSettings = async () => {
    if (!authToken || !['superadmin', 'admin'].includes(userRole)) return;
    try {
      const res = await axios.get(`${API_ENTERPRISE}/settings`);
      if (res.data.success && res.data.settings) {
        setSystemSettings(prev => ({ ...prev, ...res.data.settings }));
      }
    } catch (err) {
      console.error('Settings error:', err);
    }
  };

  const fetchAutoBids = async () => {
    if (!authToken || !['superadmin', 'admin'].includes(userRole)) return;
    try {
      const res = await axios.get(`${API_ENTERPRISE}/autobids/history`);
      if (res.data.success) setAutoBidsHistory(res.data.data || []);
    } catch (err) {
      console.error('Auto bids history error:', err);
    }
  };

  const fetchUsers = async () => {
    if (!authToken || !['superadmin', 'admin'].includes(userRole)) return;
    try {
      const res = await axios.get(`${API_ADMIN}/users?search=${encodeURIComponent(userSearch)}&role=${userRoleFilter}`);
      if (res.data.users) setUsersList(res.data.users);
    } catch (err) {
      console.error('Users error:', err);
    }
  };

  const fetchPendingProducts = async () => {
    if (!authToken || !['superadmin', 'admin'].includes(userRole)) return;
    try {
      const res = await axios.get(`${API_ADMIN}/products/pending`);
      setPendingProducts(Array.isArray(res.data) ? res.data : (res.data.products || []));
    } catch (err) {
      console.error('Pending products error:', err);
    }
  };

  const fetchReferrals = async () => {
    if (!authToken || !['superadmin', 'admin'].includes(userRole)) return;
    try {
      const res = await axios.get(`${API_ADMIN}/referrals`);
      if (res.data.success) setReferralsList(res.data.data || []);
    } catch (err) {
      console.error('Referrals error:', err);
    }
  };

  const fetchLogs = async () => {
    if (!authToken || !['superadmin', 'admin'].includes(userRole)) return;
    try {
      const res = await axios.get(`${API_ENTERPRISE}/logs/activity`);
      if (res.data.success) setLogs(res.data.data || []);
    } catch (err) {
      console.error('Logs error:', err);
    }
  };

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const res = await axios.get('/api/banners');
      if (res.data.success) {
        setBannersList(res.data.data || []);
      }
    } catch (err) {
      console.error('Banners fetch error:', err);
    } finally {
      setBannersLoading(false);
    }
  };

  const handleCreateBanner = async (e) => {
    e.preventDefault();
    if (!bannerImageFile) return alert('Please choose an image file for the banner slideshow.');
    const formData = new FormData();
    formData.append('image', bannerImageFile);
    formData.append('title', newBanner.title || 'Featured Slide');
    formData.append('link', newBanner.link || '');
    formData.append('displayOrder', newBanner.displayOrder || '1');
    formData.append('isActive', newBanner.isActive ? 'true' : 'false');

    try {
      const res = await axios.post('/api/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        alert('Slideshow Banner successfully uploaded & published to mobile app!');
        setNewBanner({ title: '', link: '', displayOrder: '1', isActive: true });
        setBannerImageFile(null);
        fetchBanners();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Are you sure you want to delete this slideshow banner from the mobile app?')) return;
    try {
      const res = await axios.delete(`/api/banners/${id}`);
      if (res.data.success) {
        fetchBanners();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // Initial Fetching
  useEffect(() => {
    if (authToken) {
      fetchKPI();
      fetchInventory();
      fetchBarcodes();
      fetchCategories();
      fetchStaff();
      fetchOrders();
      fetchRefusals();
      fetchLiveAuctions();
      fetchSettings();
      fetchAutoBids();
      fetchUsers();
      fetchPendingProducts();
      fetchReferrals();
      fetchLogs();
      fetchBanners();
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) fetchInventory();
  }, [inventoryFilter, inventorySearch]);

  useEffect(() => {
    if (authToken) fetchBarcodes();
  }, [barcodeSearch, barcodeStatusFilter]);

  // --- CAMERA BARCODE SCANNER HANDLER ---
  const toggleCameraScanner = () => {
    if (scannerActive) {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
          setScannerActive(false);
        }).catch(err => console.error(err));
      }
    } else {
      setScannerActive(true);
      setTimeout(() => {
        try {
          const html5QrCode = new Html5Qrcode("camera-scanner-reader");
          html5QrCodeRef.current = html5QrCode;
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              const code = decodedText.trim().toUpperCase();
              if (activeTab === 'audit') {
                if (!auditList.includes(code)) setAuditList(prev => [...prev, code]);
              } else if (showRegisterModal) {
                setNewProduct(prev => ({ ...prev, barcode: code }));
              } else {
                setBarcodeSearch(code);
              }
            },
            (error) => {}
          );
        } catch (err) {
          alert("Camera access denied or unavailable: " + err.message);
          setScannerActive(false);
        }
      }, 300);
    }
  };

  // --- IMAGE UPLOAD (CLOUDINARY / LOCAL) ---
  const handleImageFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingImages(true);
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    try {
      const res = await axios.post(`${API_UPLOADS}/admin/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.data) {
        const uploadedUrls = res.data.data.map(item => item.url);
        setNewProduct(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Image upload failed');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // --- PRODUCT REGISTRATION ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const safeNum = (v, def = null) => {
        if (v === null || v === undefined || v === '') return def;
        const n = parseFloat(v);
        return isNaN(n) ? def : n;
      };

      const payload = {
        barcode: newProduct.barcode?.trim(),
        product_name: newProduct.product_name?.trim(),
        category_id: newProduct.category_id ? parseInt(newProduct.category_id) : null,
        description: newProduct.description || '',
        images: newProduct.images || [],
        original_retail_price: safeNum(newProduct.original_retail_price, 0),
        starting_bid_price: safeNum(newProduct.starting_bid_price, 0),
        buy_now_price: safeNum(newProduct.buy_now_price, 0),
        min_acceptable_price: safeNum(newProduct.min_acceptable_price, null),
        actual_acquisition_cost: safeNum(newProduct.actual_acquisition_cost, null),
        auto_bid_increment: safeNum(newProduct.auto_bid_increment, 1.00),
        condition: newProduct.condition || 'New',
        defect_alert: Boolean(newProduct.defect_alert),
        defect_details: newProduct.defect_details || '',
        warehouse_location: newProduct.warehouse_location || 'Main Warehouse Slot A',
        notes: newProduct.notes || ''
      };

      if (!payload.barcode) return alert('Barcode number is required.');
      if (!payload.product_name) return alert('Product name is required.');
      if (!payload.category_id) return alert('Please select a Category. Category is mandatory for IRAQ BID application.');
      if (!payload.buy_now_price) return alert('Buy Now Price is mandatory.');

      const res = await axios.post(`${API_ENTERPRISE}/inventory/register`, payload);
      if (res.data.success) {
        alert(res.data.message || 'Physical product successfully registered in warehouse!');
        setShowRegisterModal(false);
        fetchInventory();
        fetchKPI();
        fetchBarcodes();
        setNewProduct({
          barcode: '',
          product_name: '',
          category_id: '',
          description: '',
          images: [],
          original_retail_price: '',
          starting_bid_price: '',
          buy_now_price: '',
          min_acceptable_price: '',
          actual_acquisition_cost: '',
          auto_bid_increment: '1.00',
          condition: 'New',
          defect_alert: false,
          defect_details: '',
          warehouse_location: 'Main Warehouse Slot A',
          notes: ''
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // --- PUBLISH PRODUCT TO LIVE AUCTION ---
  const handlePublishAuction = async (item) => {
    const hours = prompt("Enter Auction Duration in Hours for IRAQ BID Mobile App:", "24");
    if (!hours) return;
    try {
      const res = await axios.post(`${API_ENTERPRISE}/auctions/publish`, {
        inventory_id: item.id,
        duration_hours: parseInt(hours)
      });
      if (res.data.success) {
        alert(res.data.message || 'Published to live mobile auctions successfully!');
        fetchInventory();
        fetchKPI();
        fetchLiveAuctions();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // --- SEQUENTIAL BARCODE GENERATION ---
  const handleGenerateBarcodes = async (qty = barcodeQty) => {
    setBarcodeLoading(true);
    try {
      const res = await axios.post(`${API_ENTERPRISE}/barcodes/generate`, { quantity: qty });
      if (res.data.success) {
        alert(res.data.message);
        fetchBarcodes();
        if (res.data.barcodes && res.data.barcodes.length > 0) {
          setNewProduct(prev => ({ ...prev, barcode: res.data.barcodes[0] }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setBarcodeLoading(false);
    }
  };

  // --- CUSTOM BARCODE RANGE GENERATION (FROM ... TO ...) ---
  const handleGenerateBarcodeRange = async (e) => {
    e?.preventDefault();
    const fromNum = parseInt(fromBarcodeNum);
    const toNum = parseInt(toBarcodeNum);

    if (isNaN(fromNum) || isNaN(toNum)) {
      return alert("Please enter valid positive numbers for both From and To.");
    }
    if (fromNum > toNum) {
      return alert("'From Barcode Number' cannot be greater than 'To Barcode Number'.");
    }
    if (toNum - fromNum + 1 > 2000) {
      return alert("Maximum 2,000 barcodes can be generated in a single range.");
    }

    setRangeLoading(true);
    try {
      const res = await axios.post(`${API_ENTERPRISE}/barcodes/generate-range`, {
        from_number: fromNum,
        to_number: toNum
      });
      if (res.data.success) {
        alert(res.data.message || 'Barcode range processed successfully!');
        fetchBarcodes();
        // Auto select newly generated barcodes if any
        if (res.data.barcodes && res.data.barcodes.length > 0) {
          const newCodes = new Set(res.data.barcodes);
          setSelectedBarcodeIds(prev => new Set([...prev, ...newCodes]));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setRangeLoading(false);
    }
  };

  // Toggle selection for printing
  const toggleBarcodeSelection = (code) => {
    setSelectedBarcodeIds(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSelectAllBarcodes = () => {
    if (selectedBarcodeIds.size === barcodes.length) {
      setSelectedBarcodeIds(new Set());
    } else {
      setSelectedBarcodeIds(new Set(barcodes.map(b => b.barcode_number)));
    }
  };

  // Download Print-Ready PDF
  const handleDownloadBarcodePDF = () => {
    const selectedList = barcodes.filter(b => selectedBarcodeIds.has(b.barcode_number));
    if (selectedList.length === 0) {
      return alert("Please select at least one barcode to print.");
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 24 labels per page: 3 columns x 8 rows
    const cols = 3;
    const rows = 8;
    const perPage = cols * rows;
    const marginX = 10;
    const marginY = 12;
    const labelWidth = (210 - (marginX * 2)) / cols - 4; // ~59mm
    const labelHeight = (297 - (marginY * 2)) / rows - 4; // ~30mm

    selectedList.forEach((item, index) => {
      const pageIndex = Math.floor(index / perPage);
      const indexOnPage = index % perPage;
      const col = indexOnPage % cols;
      const row = Math.floor(indexOnPage / cols);

      if (index > 0 && indexOnPage === 0) {
        doc.addPage();
      }

      const x = marginX + col * (labelWidth + 4);
      const y = marginY + row * (labelHeight + 4);

      // Label Outer Border
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(x, y, labelWidth, labelHeight, 2, 2);

      // IRAQ BID Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("IRAQ BID", x + labelWidth / 2, y + 4.5, { align: "center" });

      // Render Code 128 to hidden canvas
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, item.barcode_number, {
          format: "CODE128",
          width: 1.5,
          height: 36,
          displayValue: false,
          margin: 0
        });
        const imgData = canvas.toDataURL("image/png");
        doc.addImage(imgData, 'PNG', x + 5, y + 6, labelWidth - 10, 13);
      } catch (err) {
        doc.setFontSize(7);
        doc.text("BARCODE: " + item.barcode_number, x + labelWidth / 2, y + 13, { align: "center" });
      }

      // Human Readable Number below barcode
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(item.barcode_number, x + labelWidth / 2, y + 23, { align: "center" });

      // Secondary micro text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("Official Inventory Asset", x + labelWidth / 2, y + 27, { align: "center" });
    });

    doc.save(`IRAQ_BID_Barcodes_${selectedList.length}_labels.pdf`);
  };

  // --- PHYSICAL AUDIT RECONCILIATION ---
  const handleAuditScan = (e) => {
    e.preventDefault();
    if (!auditInput.trim()) return;
    const code = auditInput.trim().toUpperCase();
    if (!auditList.includes(code)) {
      setAuditList([...auditList, code]);
    }
    setAuditInput('');
  };

  const handleRunReconciliation = async () => {
    if (auditList.length === 0) return alert('Scan at least 1 barcode before running reconciliation.');
    setReconciling(true);
    try {
      const res = await axios.post(`${API_ENTERPRISE}/audit/reconcile`, { scanned_barcodes: auditList });
      if (res.data.success) {
        setAuditSummary(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setReconciling(false);
    }
  };

  // --- SYSTEM SETTINGS SAVE ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await axios.put(`${API_ENTERPRISE}/settings`, { settings: systemSettings });
      if (res.data.success) {
        alert(res.data.message || 'System settings saved successfully!');
        fetchSettings();
        fetchLogs();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // --- SINGLE THERMAL SHIPPING LABEL TRIGGER ---
  const handleOpenLabel = async (order) => {
    try {
      const res = await axios.get(`${API_ENTERPRISE}/orders/${order.id}/label`);
      if (res.data.success && res.data.data) {
        setSelectedOrder(res.data.data);
        setShowLabelModal(true);
      } else {
        const usdTotal = parseFloat(order.amount || 0);
        setSelectedOrder({
          id: order.id,
          order_number: order.order_number || `#${order.id}`,
          customer_name: order.buyer_name || 'Customer',
          customer_phone: order.buyer_phone || '+9647701234567',
          governorate: 'Baghdad',
          area: 'Al-Mansour',
          full_address: 'Street 14, Central District',
          product_name: order.product_name || order.title || 'Auction Won Item',
          item_barcode: order.item_barcode || 'IQB-000001',
          amount: usdTotal.toFixed(2),
          shipping_cost: '5.00',
          usd_total: (usdTotal + 5).toFixed(2),
          iqd_total: Math.round((usdTotal + 5) * 1520).toLocaleString(),
          exchange_rate: 1520
        });
        setShowLabelModal(true);
      }
    } catch {
      const usdTotal = parseFloat(order.amount || 0);
      setSelectedOrder({
        id: order.id,
        order_number: order.order_number || `#${order.id}`,
        customer_name: order.buyer_name || 'Customer',
        customer_phone: order.buyer_phone || '+9647701234567',
        governorate: 'Baghdad',
        area: 'Al-Mansour',
        full_address: 'Street 14, Central District',
        product_name: order.product_name || order.title || 'Auction Won Item',
        item_barcode: order.item_barcode || 'IQB-000001',
        amount: usdTotal.toFixed(2),
        shipping_cost: '5.00',
        usd_total: (usdTotal + 5).toFixed(2),
        iqd_total: Math.round((usdTotal + 5) * 1520).toLocaleString(),
        exchange_rate: 1520
      });
      setShowLabelModal(true);
    }
  };

  // --- EXCEL EXPORT ---
  const exportToExcel = () => {
    if (inventory.length === 0) return alert('No inventory data to export');
    const ws = XLSX.utils.json_to_sheet(inventory.map(item => ({
      Barcode: item.barcode,
      ProductName: item.product_name,
      OriginalRetailPrice: item.original_retail_price,
      StartingBidPrice: item.starting_bid_price,
      BuyNowPrice: item.buy_now_price,
      Condition: item.condition,
      Status: item.status,
      Defect: item.defect_alert ? 'Yes: ' + item.defect_details : 'No',
      WarehouseLocation: item.warehouse_location
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WarehouseInventory");
    XLSX.writeFile(wb, "IRAQ_BID_Warehouse_Stock.xlsx");
  };

  // Role Badge Helper
  const getRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'SUPERADMIN' };
      case 'admin':
        return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', label: 'OPERATIONS ADMIN' };
      case 'manager':
        return { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', label: 'SHIFT MANAGER' };
      case 'editor':
        return { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', label: 'INVENTORY EDITOR' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: (role || '').toUpperCase() };
    }
  };

  // =========================================================================
  // VIEW: AUTHENTICATION LOGIN
  // =========================================================================
  if (!authToken || !currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#060913',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-15%', left: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(129, 140, 248, 0.15) 0%, transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />

        <div style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '44px 36px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(56, 189, 248, 0.2)'
            }}>
              <Lock size={32} color="#38bdf8" />
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px',
              marginBottom: '6px'
            }}>
              IRAQ BID ENTERPRISE
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Inventory, Auctions, Orders & Logistics ERP</p>
          </div>

          {loginError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertTriangle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Admin Email Address
              </label>
              <input
                type="email"
                required
                placeholder="superadmin@iraqbid.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Secure Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                opacity: loginLoading ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loginLoading ? <RefreshCw size={18} className="animate-spin" /> : <Lock size={18} />}
              {loginLoading ? 'Authenticating...' : 'Authenticate & Enter Portal'}
            </button>
          </form>

          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: '#64748b', textAlign: 'center', lineHeight: '1.6' }}>
            <span style={{ color: '#10b981', fontWeight: '600' }}>High-Security Active:</span> 15-minute lockout enforced on repeated failures.
          </div>
        </div>
      </div>
    );
  }

  // Permissions Helpers
  const badge = getRoleBadge(userRole);
  const canAccessStaff = ['superadmin', 'admin', 'manager'].includes(userRole);
  const canAccessOps = ['superadmin', 'admin', 'manager'].includes(userRole);
  const canAccessCRM = ['superadmin', 'admin'].includes(userRole);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#060913', color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <div 
        className={`sidebar-container ${!sidebarOpen ? 'closed' : ''}`}
        style={{
          width: sidebarOpen ? '280px' : '76px',
          minWidth: sidebarOpen ? '280px' : '76px',
          backgroundColor: '#0a0f1d',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '20px 12px',
          boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
          zIndex: 50
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.5px' }}>
                IRAQ BID
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>Enterprise Operations ERP</div>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* 13 Complete Navigation Links */}
        <div style={{ flex: 1, marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          
          {sidebarOpen && <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Core Operations</div>}

          {[
            ...(canAccessOps ? [{ id: 'dashboard', label: '1. Dashboard', icon: <LayoutDashboard size={18} /> }] : []),
            { id: 'inventory', label: '2. Inventory Management', icon: <Package size={18} /> },
            { id: 'barcodes', label: '3. Barcode Management', icon: <Barcode size={18} /> },
            ...(canAccessOps ? [{ id: 'live_auctions', label: '4. Auction Management', icon: <Gavel size={18} /> }] : []),
            ...(canAccessCRM ? [{ id: 'users', label: '5. Customers', icon: <Users size={18} /> }] : []),
            ...(canAccessOps ? [{ id: 'orders', label: '6. Winners & Orders', icon: <ShoppingBag size={18} /> }] : []),
            ...(canAccessOps ? [{ id: 'shipping', label: '7. Shipping Management', icon: <Truck size={18} /> }] : []),
            ...(canAccessOps ? [{ id: 'labels', label: '8. Customer Order Labels', icon: <Printer size={18} /> }] : []),
            ...(canAccessOps ? [{ id: 'audit', label: '9. Stock Audit', icon: <ClipboardCheck size={18} /> }] : []),
            ...(canAccessStaff ? [{ id: 'staff', label: '10. Employees & Permissions', icon: <Key size={18} /> }] : []),
            ...(canAccessCRM ? [{ id: 'reports', label: '11. Reports Hub', icon: <FileSpreadsheet size={18} /> }] : []),
            ...(canAccessCRM ? [{ id: 'logs', label: '12. Activity Log', icon: <History size={18} /> }] : []),
            ...(canAccessCRM ? [{ id: 'banners', label: '13. Mobile Slideshow & Banners', icon: <ImageIcon size={18} /> }] : []),
            ...(canAccessCRM ? [{ id: 'settings', label: '14. System Settings', icon: <Settings size={18} /> }] : [])
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                backgroundColor: activeTab === item.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: activeTab === item.id ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === item.id ? '600' : '500',
                fontSize: '13px',
                borderLeft: activeTab === item.id ? '3px solid #38bdf8' : '3px solid transparent'
              }}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* User Card */}
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {sidebarOpen ? (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {currentUser?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '11px', color: badge.color, fontWeight: '600', marginTop: '2px' }}>
                {badge.label}
              </div>
            </div>
          ) : (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: badge.color }} />
          )}

          <button
            onClick={handleLogout}
            title="Secure Logout"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* HEADER BAR */}
        <header style={{
          height: '64px',
          backgroundColor: 'rgba(10, 15, 29, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Toggle Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <span style={{ fontSize: '17px', fontWeight: '800', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {activeTab.replace('_', ' ')}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 10px',
              borderRadius: '20px',
              backgroundColor: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.color}40`
            }}>
              {badge.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              Live DB Synced (1 USD = {systemSettings.exchange_rate_usd_iqd || '1,520'} IQD)
            </div>
          </div>
        </header>

        {/* =====================================================================
            MODULE 1: MAIN ADMIN DASHBOARD (15 CLICKABLE DRILL-DOWN METRICS)
           ===================================================================== */}
        {activeTab === 'dashboard' && canAccessOps && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>Executive Operations Dashboard</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Every metric is clickable and opens its corresponding detailed management section.</p>
              </div>
              <button
                onClick={fetchKPI}
                disabled={kpiLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                <RefreshCw size={14} className={kpiLoading ? 'animate-spin' : ''} /> Refresh Dashboard
              </button>
            </div>

            {/* 15 Mandatory Clickable KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '18px', marginBottom: '32px' }}>
              {[
                { label: 'Total Registered Products', val: kpiData?.total_registered_products ?? '0', color: '#38bdf8', icon: <Package size={22} />, tab: 'inventory', filter: 'all' },
                { label: 'Available Warehouse Products', val: kpiData?.available_warehouse_products ?? '0', color: '#22c55e', icon: <CheckCircle size={22} />, tab: 'inventory', filter: 'available' },
                { label: 'Products in Auctions', val: kpiData?.in_auction_products ?? '0', color: '#eab308', icon: <Gavel size={22} />, tab: 'inventory', filter: 'in_auction' },
                { label: 'Sold Products', val: kpiData?.sold_products ?? '0', color: '#10b981', icon: <ShoppingBag size={22} />, tab: 'inventory', filter: 'sold' },
                { label: 'Delivered Products', val: kpiData?.delivered_products ?? '0', color: '#06b6d4', icon: <Truck size={22} />, tab: 'inventory', filter: 'delivered' },
                { label: 'Unsold Products', val: kpiData?.unsold_products ?? '0', color: '#94a3b8', icon: <Package size={22} />, tab: 'inventory', filter: 'unsold' },
                { label: 'Damaged Products', val: kpiData?.damaged_products ?? '0', color: '#ef4444', icon: <AlertTriangle size={22} />, tab: 'inventory', filter: 'damaged' },
                { label: 'Missing Products', val: kpiData?.missing_products ?? '0', color: '#f43f5e', icon: <XCircle size={22} />, tab: 'inventory', filter: 'missing' },
                { label: 'Active Auctions', val: kpiData?.active_auctions ?? '0', color: '#818cf8', icon: <Gavel size={22} />, tab: 'live_auctions' },
                { label: 'Completed Auctions', val: kpiData?.completed_auctions ?? '0', color: '#6366f1', icon: <CheckCircle size={22} />, tab: 'live_auctions' },
                { label: 'Pending Orders', val: kpiData?.pending_orders ?? '0', color: '#f59e0b', icon: <Truck size={22} />, tab: 'orders' },
                { label: 'Shipped Orders', val: kpiData?.shipped_orders ?? '0', color: '#3b82f6', icon: <Truck size={22} />, tab: 'shipping' },
                { label: 'Delivered Orders', val: kpiData?.delivered_orders ?? '0', color: '#10b981', icon: <CheckCircle size={22} />, tab: 'shipping' },
                { label: 'Banned Customers', val: kpiData?.banned_customers ?? '0', color: '#ef4444', icon: <Ban size={22} />, tab: 'users' },
                { label: 'Total Employees', val: kpiData?.total_employees ?? '0', color: '#a855f7', icon: <Users size={22} />, tab: 'staff' }
              ].map((kpi, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (kpi.filter) setInventoryFilter(kpi.filter);
                    setActiveTab(kpi.tab);
                  }}
                  className="glass-panel-hover"
                  style={{
                    backgroundColor: '#0f172a',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ backgroundColor: `${kpi.color}15`, color: kpi.color, padding: '12px', borderRadius: '12px' }}>
                    {kpi.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{kpi.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#f8fafc' }}>{kpi.val}</div>
                  </div>
                  <ChevronRight size={16} color="#475569" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 2: INVENTORY MANAGEMENT (8 CATEGORIES + COMPLETE FIELDS)
           ===================================================================== */}
        {activeTab === 'inventory' && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>Warehouse Inventory Management</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Every physical product maintains its own permanent record with Code 128 barcode, retail prices, and defect flags.</p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={exportToExcel}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  <FileSpreadsheet size={16} /> Export Excel
                </button>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0284c7', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)' }}>
                  <Plus size={16} /> Register Physical Product
                </button>
              </div>
            </div>

            {/* 8 Required Inventory Categories Filter */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search by Barcode, Product Name, or Warehouse Location..."
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '11px 14px 11px 42px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <select
                value={inventoryFilter}
                onChange={e => setInventoryFilter(e.target.value)}
                style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '11px 16px', color: '#fff', fontSize: '13px' }}>
                <option value="all">All Inventory</option>
                <option value="available">Available Products</option>
                <option value="in_auction">Auction Inventory</option>
                <option value="sold">Sold Products</option>
                <option value="delivered">Delivered Products</option>
                <option value="unsold">Unsold Products</option>
                <option value="damaged">Damaged Products</option>
                <option value="missing">Missing Products</option>
              </select>
            </div>

            {/* Inventory Table */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '16px 20px' }}>Photo</th>
                    <th style={{ padding: '16px 20px' }}>Barcode</th>
                    <th style={{ padding: '16px 20px' }}>Product Title</th>
                    <th style={{ padding: '16px 20px' }}>Original Retail</th>
                    <th style={{ padding: '16px 20px' }}>Start Bid</th>
                    <th style={{ padding: '16px 20px' }}>Buy Now</th>
                    {canAccessCRM && <th style={{ padding: '16px 20px' }}>Acquisition Cost</th>}
                    <th style={{ padding: '16px 20px' }}>Condition</th>
                    <th style={{ padding: '16px 20px' }}>Defect Alert</th>
                    <th style={{ padding: '16px 20px' }}>Status</th>
                    <th style={{ padding: '16px 20px' }}>Location</th>
                    {canAccessOps && <th style={{ padding: '16px 20px' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        {inventoryLoading ? 'Loading warehouse stock...' : 'No warehouse inventory found matching query'}
                      </td>
                    </tr>
                  ) : (
                    inventory.map(item => {
                      const photo = item.images && item.images.length > 0 ? item.images[0] : null;
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 20px' }}>
                            {photo ? (
                              <img
                                src={photo}
                                alt={item.product_name}
                                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                              />
                            ) : (
                              <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold' }}>{item.barcode}</td>
                          <td style={{ padding: '14px 20px', fontWeight: '600', maxWidth: '240px' }}>
                            <div>{item.product_name}</div>
                            {item.images?.length > 1 && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>+{item.images.length - 1} photos</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#94a3b8' }}>${parseFloat(item.original_retail_price || 0).toFixed(2)}</td>
                          <td style={{ padding: '14px 20px', color: '#38bdf8', fontWeight: '600' }}>${parseFloat(item.starting_bid_price || 0).toFixed(2)}</td>
                          <td style={{ padding: '14px 20px', color: '#22c55e', fontWeight: 'bold' }}>${parseFloat(item.buy_now_price || 0).toFixed(2)}</td>
                          {canAccessCRM && (
                            <td style={{ padding: '14px 20px', color: '#eab308', fontStyle: 'italic' }}>
                              {item.actual_acquisition_cost ? `$${parseFloat(item.actual_acquisition_cost).toFixed(2)}` : 'Private'}
                            </td>
                          )}
                          <td style={{ padding: '14px 20px' }}>{item.condition}</td>
                          <td style={{ padding: '14px 20px' }}>
                            {item.defect_alert ? (
                              <span style={{ fontSize: '11px', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                Alert: {item.defect_details || 'Defect reported'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#22c55e' }}>Clear</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: item.status === 'in_auction' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.06)',
                              color: item.status === 'in_auction' ? '#eab308' : '#f1f5f9'
                            }}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#94a3b8' }}>{item.warehouse_location || 'Slot A-01'}</td>
                          {canAccessOps && (
                            <td style={{ padding: '14px 20px' }}>
                              {item.status === 'available' ? (
                                <button
                                  onClick={() => handlePublishAuction(item)}
                                  style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                                  Publish Auction
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Published #{item.published_product_id}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 3: BARCODE MANAGEMENT (BULK 100/500/1000 + CAMERA SCANNER)
           ===================================================================== */}
        {activeTab === 'barcodes' && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Code 128 Barcodes Hub & Scanner</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Generates sequential Code 128 barcodes (IQB-000001). Supports smartphone camera, USB, Bluetooth, and continuous scanning.
                </p>
              </div>

              <button
                onClick={toggleCameraScanner}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: scannerActive ? '#dc2626' : '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '11px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px'
                }}
              >
                <Camera size={16} /> {scannerActive ? 'Stop Camera Scanner' : 'Open Live Camera Scanner'}
              </button>
            </div>

            {/* Live Camera Scanner Box */}
            {scannerActive && (
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #16a34a', marginBottom: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: '700', marginBottom: '12px' }}>
                  Camera Scanner Active: Point iPhone, Android, or Webcam at Code 128 Barcode
                </div>
                <div id="camera-scanner-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }} />
              </div>
            )}

            {/* Barcode Generation Controls (Batch & Custom Range) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              
              {/* 1. Custom Barcode Range Generation */}
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Barcode size={18} color="#38bdf8" />
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>Custom Barcode Range Generation</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                  Generates sequential Code 128 barcodes (e.g. From 100 to 150 = 51 barcodes). Automatically skips existing/assigned numbers.
                </p>
                <form onSubmit={handleGenerateBarcodeRange}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#cbd5e1', marginBottom: '4px' }}>From Barcode Number *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 100"
                        value={fromBarcodeNum}
                        onChange={e => setFromBarcodeNum(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#cbd5e1', marginBottom: '4px' }}>To Barcode Number *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 150"
                        value={toBarcodeNum}
                        onChange={e => setToBarcodeNum(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  {fromBarcodeNum && toBarcodeNum && parseInt(toBarcodeNum) >= parseInt(fromBarcodeNum) && (
                    <div style={{ fontSize: '11px', color: '#38bdf8', marginBottom: '12px' }}>
                      Range: IQB-{String(fromBarcodeNum).padStart(6, '0')} to IQB-{String(toBarcodeNum).padStart(6, '0')} ({parseInt(toBarcodeNum) - parseInt(fromBarcodeNum) + 1} barcodes)
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={rangeLoading}
                    style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '11px 16px', borderRadius: '8px', cursor: rangeLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {rangeLoading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    {rangeLoading ? 'Generating Range...' : 'Generate Range Barcodes'}
                  </button>
                </form>
              </div>

              {/* 2. Quick Sequential Batch */}
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Quick Sequential Batch</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>Add next sequential barcodes automatically from global sequence counter.</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {[10, 50, 100, 500].map(qty => (
                    <button
                      key={qty}
                      onClick={() => handleGenerateBarcodes(qty)}
                      disabled={barcodeLoading}
                      style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}>
                      +{qty}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={barcodeQty}
                    onChange={e => setBarcodeQty(parseInt(e.target.value) || 1)}
                    style={{ width: '100px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px' }}
                  />
                  <button
                    onClick={() => handleGenerateBarcodes(barcodeQty)}
                    disabled={barcodeLoading}
                    style={{ flex: 1, backgroundColor: '#334155', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: barcodeLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '12px' }}>
                    {barcodeLoading ? 'Generating...' : `Generate +${barcodeQty}`}
                  </button>
                </div>
              </div>

              {/* 3. Search Barcode Pool */}
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Search & Filter Barcodes</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>Find by barcode number or attached product name.</p>
                <input
                  type="text"
                  placeholder="e.g. IQB-000100..."
                  value={barcodeSearch}
                  onChange={e => setBarcodeSearch(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', marginBottom: '10px' }}
                />
                <select
                  value={barcodeStatusFilter}
                  onChange={e => setBarcodeStatusFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
                  <option value="all">All Statuses (Unused & Assigned)</option>
                  <option value="unused">Unused Only (Available for stickers)</option>
                  <option value="assigned">Assigned to Products</option>
                </select>
              </div>
            </div>

            {/* Barcode Pool Registry Header & Print Barcodes Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                  Barcode Pool Registry ({barcodes.length} Barcodes Loaded)
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Selected for Printing: <strong style={{ color: '#38bdf8' }}>{selectedBarcodeIds.size}</strong> barcodes
                  <span style={{ marginLeft: '12px', color: '#f59e0b', fontSize: '11px' }}>
                    Note: Printing barcodes does NOT assign them; they remain unlinked until registered to a product.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={handleSelectAllBarcodes}
                  style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  {selectedBarcodeIds.size === barcodes.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={() => {
                    if (selectedBarcodeIds.size === 0) return alert("Please select at least one barcode to print.");
                    setShowBarcodePrintModal(true);
                  }}
                  disabled={selectedBarcodeIds.size === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: selectedBarcodeIds.size > 0 ? '#16a34a' : '#334155', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: selectedBarcodeIds.size > 0 ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '12px' }}>
                  <Printer size={14} /> Print Barcodes ({selectedBarcodeIds.size})
                </button>
              </div>
            </div>

            {/* Barcode Pool Registry Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '14px' }}>
              {barcodes.map((b, idx) => {
                const isSelected = selectedBarcodeIds.has(b.barcode_number);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleBarcodeSelection(b.barcode_number)}
                    style={{
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#0f172a',
                      padding: '14px',
                      borderRadius: '12px',
                      border: isSelected
                        ? '2px solid #38bdf8'
                        : b.status === 'assigned'
                        ? '1px solid rgba(34, 197, 94, 0.3)'
                        : '1px solid rgba(255,255,255,0.08)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ position: 'absolute', top: '10px', left: '10px', cursor: 'pointer' }}
                    />
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>
                      {b.barcode_number}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      marginTop: '6px',
                      textTransform: 'uppercase',
                      color: b.status === 'assigned' ? '#22c55e' : '#94a3b8'
                    }}>
                      Status: {b.status}
                    </div>
                    {b.product_name ? (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.product_name}
                      </div>
                    ) : (
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>Unassigned Sticker</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 4: AUCTION MANAGEMENT & LIVE BIDDING
           ===================================================================== */}
        {activeTab === 'live_auctions' && canAccessOps && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Auction Management & Live Feed</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>Real-time mobile app auctions synchronized with database. 10-minute automated reserve bidder active.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {liveAuctions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
                  No active live auctions running right now. Publish items from Warehouse Stock.
                </div>
              ) : (
                liveAuctions.map(a => (
                  <div key={a.product_id || a.id} style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
                      {a.image_url && (
                        <img src={a.image_url} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px' }} />
                      )}
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>{a.title}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Auction ID #{a.product_id || a.id}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                      <span>Current Highest Bid:</span>
                      <strong style={{ color: '#22c55e', fontSize: '16px' }}>${a.current_bid || a.starting_bid}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                      <span>Highest Bidder:</span>
                      <span style={{ color: '#38bdf8' }}>{a.highest_bidder_name || 'System / None'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8' }}>
                      <span>Time Remaining:</span>
                      <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{parseFloat(a.hours_left || 24).toFixed(1)} hrs</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 5: CUSTOMER MANAGEMENT & 3-STRIKE CRM
           ===================================================================== */}
        {activeTab === 'users' && canAccessCRM && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Customers CRM & 3-Strike Audit</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Complete customer profile, bidding logs, delivery history, and automated 3-strike refusal ban management.</p>

            <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Search customers by name, phone, or Customer ID..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '11px 16px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto', marginBottom: '32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '16px 20px' }}>Customer ID</th>
                    <th style={{ padding: '16px 20px' }}>Full Name</th>
                    <th style={{ padding: '16px 20px' }}>Phone / Email</th>
                    <th style={{ padding: '16px 20px' }}>Refusal Strikes</th>
                    <th style={{ padding: '16px 20px' }}>Account Status</th>
                    <th style={{ padding: '16px 20px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace' }}>#{u.id}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{u.name}</td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{u.phone || u.email}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: u.refusal_count >= 3 ? '#ef4444' : '#eab308' }}>
                          {u.refusal_count || 0} / 3 Strikes
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '11px', color: (u.is_banned || u.status === 'blocked') ? '#ef4444' : '#22c55e', backgroundColor: (u.is_banned || u.status === 'blocked') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                          {(u.is_banned || u.status === 'blocked') ? 'PERMANENTLY BANNED' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={async () => {
                            const action = (u.is_banned || u.status === 'blocked') ? 'approve' : 'block';
                            if (confirm(`Confirm ${action} for customer ${u.name}?`)) {
                              await axios.patch(`${API_ADMIN}/users/${action}/${u.id}`);
                              fetchUsers();
                              fetchKPI();
                            }
                          }}
                          style={{ backgroundColor: (u.is_banned || u.status === 'blocked') ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                          {(u.is_banned || u.status === 'blocked') ? 'Unban Customer' : 'Ban Customer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 6 & 7: WINNERS, ORDERS & SHIPPING MANAGEMENT
           ===================================================================== */}
        {(activeTab === 'orders' || activeTab === 'shipping') && canAccessOps && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Winners, Orders & Shipping Management</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
              Tracks customer orders from auction win to delivery and receipt confirmation. Supports single thermal shipping label generation.
            </p>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '16px 20px' }}>Order #</th>
                    <th style={{ padding: '16px 20px' }}>Product Title</th>
                    <th style={{ padding: '16px 20px' }}>Customer Name</th>
                    <th style={{ padding: '16px 20px' }}>Phone</th>
                    <th style={{ padding: '16px 20px' }}>Total (USD)</th>
                    <th style={{ padding: '16px 20px' }}>Total (IQD 1,520)</th>
                    <th style={{ padding: '16px 20px' }}>Shipping Status</th>
                    <th style={{ padding: '16px 20px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allAppOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        {ordersLoading ? 'Loading orders...' : 'No customer orders placed yet'}
                      </td>
                    </tr>
                  ) : (
                    allAppOrders.map(o => {
                      const usdTotal = parseFloat(o.amount || o.final_price || 0);
                      const iqdTotal = Math.round(usdTotal * 1520).toLocaleString();
                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{o.order_number || `#${o.id}`}</td>
                          <td style={{ padding: '16px 20px', fontWeight: '600' }}>{o.product_name || o.title || 'Won Item'}</td>
                          <td style={{ padding: '16px 20px' }}>{o.buyer_name || 'Customer'}</td>
                          <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{o.buyer_phone || o.buyer_email}</td>
                          <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#10b981' }}>${usdTotal.toFixed(2)}</td>
                          <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#38bdf8' }}>{iqdTotal} IQD</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontWeight: '700' }}>
                              {o.delivery_status || 'Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenLabel(o)}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                              <Printer size={14} /> Thermal Label
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrder(o);
                                setShowRefusalModal(true);
                              }}
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                              Refusal Strike
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 8: CUSTOMER ORDER LABELS (1 USD = 1,520 IQD)
           ===================================================================== */}
        {activeTab === 'labels' && canAccessOps && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Customer Order Labels Hub</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
              Only ONE official label is generated per customer order (grouping multiple products onto the same label). Exchange rate: 1 USD = 1,520 IQD.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {allAppOrders.map(o => (
                <div key={o.id} style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '6px' }}>Order {o.order_number || `#${o.id}`}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Customer: {o.buyer_name || 'Customer'}</div>
                  <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '16px' }}>
                    ${parseFloat(o.amount || 0).toFixed(2)} USD ({Math.round(parseFloat(o.amount || 0) * 1520).toLocaleString()} IQD)
                  </div>
                  <button
                    onClick={() => handleOpenLabel(o)}
                    style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Printer size={14} /> Print Single Thermal / A4 Label
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 9: STOCK AUDIT RECONCILIATION
           ===================================================================== */}
        {activeTab === 'audit' && canAccessOps && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Physical Stock Audit Reconciliation</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Scan physical shelf barcodes using camera or USB scanner to match against active system records. Highlights missing or unexpected items.
                </p>
              </div>

              <button
                onClick={toggleCameraScanner}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: scannerActive ? '#dc2626' : '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '11px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px'
                }}
              >
                <Camera size={16} /> {scannerActive ? 'Stop Scanner' : 'Open Camera Scanner'}
              </button>
            </div>

            {scannerActive && (
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #16a34a', marginBottom: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: '700', marginBottom: '12px' }}>
                  Continuous Shelf Audit Scanner: Aim at each physical box barcode
                </div>
                <div id="camera-scanner-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }} />
              </div>
            )}

            <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
              <form onSubmit={handleAuditScan} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Scan or enter Barcode (e.g. IQB-000001)..."
                  value={auditInput}
                  onChange={e => setAuditInput(e.target.value)}
                  style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px' }}
                />
                <button
                  type="submit"
                  style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
                  Record Scan
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>
                Scanned Shelf Items: <span style={{ color: '#38bdf8' }}>{auditList.length}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {auditList.length > 0 && (
                  <>
                    <button
                      onClick={() => setAuditList([])}
                      style={{ backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      Clear List
                    </button>
                    <button
                      onClick={handleRunReconciliation}
                      disabled={reconciling}
                      style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                      {reconciling ? 'Reconciling...' : 'Run Stock Reconciliation Audit'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Reconciliation Report Result */}
            {auditSummary && (
              <div style={{
                backgroundColor: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#38bdf8' }}>
                  Reconciliation Audit Report
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>System Warehouse Available</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc' }}>{auditSummary.summary.total_system_available}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Physically Scanned</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8' }}>{auditSummary.summary.total_scanned}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Verified Matches</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#22c55e' }}>{auditSummary.summary.matched_count}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Missing from Shelf</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{auditSummary.summary.missing_count}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unexpected Barcodes</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{auditSummary.summary.unexpected_count}</div>
                  </div>
                </div>

                {auditSummary.missing.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ color: '#ef4444', fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>Missing Products (Expected in warehouse but not scanned):</div>
                    {auditSummary.missing.map((m, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: '#f87171' }}>• {m.barcode} - {m.product_name} ({m.warehouse_location})</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {auditList.map((code, idx) => (
                <div key={idx} style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '12px', borderRadius: '10px', fontFamily: 'monospace', color: '#38bdf8', fontSize: '13px' }}>
                  Checked: {code}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 10: EMPLOYEES & CUSTOM GRANULAR PERMISSIONS
           ===================================================================== */}
        {activeTab === 'staff' && canAccessStaff && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Employees & Custom Granular Permissions</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Define custom permissions individually per employee across Inventory, Auctions, Customers, Orders, and System settings.
                </p>
              </div>

              <button
                onClick={() => setShowStaffModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                <UserPlus size={16} /> Add Staff Member
              </button>
            </div>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '16px 20px' }}>Staff Name</th>
                    <th style={{ padding: '16px 20px' }}>Email Address</th>
                    <th style={{ padding: '16px 20px' }}>Base Role</th>
                    <th style={{ padding: '16px 20px' }}>Status</th>
                    <th style={{ padding: '16px 20px' }}>Custom Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => {
                    const sb = getRoleBadge(s.role);
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{s.name}</td>
                        <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{s.email}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', backgroundColor: sb.bg, color: sb.color }}>
                            {sb.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '11px', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                            {s.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <button
                            onClick={async () => {
                              const res = await axios.get(`${API_ENTERPRISE}/employees/${s.id}/permissions`);
                              setSelectedEmployeePerms({ staff: s, perms: res.data.data || [] });
                              setShowPermsModal(true);
                            }}
                            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', color: '#38bdf8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            Configure Permissions
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 11: REPORTS HUB
           ===================================================================== */}
        {activeTab === 'reports' && canAccessCRM && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Reports & Intelligence Hub</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>Export comprehensive audits across inventory, orders, customer refusals, and financial summaries.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {[
                { title: 'Warehouse Stock Report', desc: 'All registered physical stock, retail value, and condition.', action: exportToExcel },
                { title: 'Customer Refusal Strikes Report', desc: 'Doorstep refusals and 3-strike automatic ban log.', action: () => alert('Generating Refusal CRM Report...') },
                { title: 'Orders & Shipping Dispatches', desc: 'Historical customer orders with applied exchange rates.', action: () => alert('Exporting Orders Report...') },
                { title: 'Staff Activity & Security Audit', desc: 'Every administrative action and status modification.', action: () => alert('Exporting Security Trail Report...') }
              ].map((rep, idx) => (
                <div key={idx} style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '6px' }}>{rep.title}</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '18px' }}>{rep.desc}</p>
                  <button
                    onClick={rep.action}
                    style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={14} /> Download Report (.xlsx)
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 12: ACTIVITY & SECURITY AUDIT TRAIL
           ===================================================================== */}
        {activeTab === 'logs' && canAccessCRM && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Activity & Security Audit Trail</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>Immutable ledger of every staff action, product modification, auto-bid bot run, and status change.</p>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '16px 20px' }}>Timestamp</th>
                    <th style={{ padding: '16px 20px' }}>Staff / Engine</th>
                    <th style={{ padding: '16px 20px' }}>Action Type</th>
                    <th style={{ padding: '16px 20px' }}>Entity</th>
                    <th style={{ padding: '16px 20px' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px 20px', color: '#64748b' }}>{new Date(l.created_at).toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{l.employee_name || 'Admin'}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#38bdf8' }}>{l.action_type || l.action}</td>
                      <td style={{ padding: '16px 20px', textTransform: 'uppercase', fontSize: '11px' }}>{l.entity_type}</td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8' }}>{JSON.stringify(l.details || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 13: MOBILE SLIDESHOW & BANNERS MANAGEMENT
           ===================================================================== */}
        {activeTab === 'banners' && canAccessCRM && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Mobile App Slideshow & Banner Management</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Upload, reorder, or replace home screen 3D carousel banners. Changes appear instantly in the mobile application.
                </p>
              </div>
              <button
                onClick={fetchBanners}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                <RefreshCw size={16} className={bannersLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Create Banner Form */}
            <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px', marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#38bdf8" /> Add New Slideshow Banner
              </h3>
              <form onSubmit={handleCreateBanner} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Banner Title / Campaign Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Special Deals 50% Off"
                    value={newBanner.title}
                    onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Target Link or Category (Optional)</label>
                  <input
                    type="text"
                    placeholder="/category/Electronics"
                    value={newBanner.link}
                    onChange={e => setNewBanner({ ...newBanner, link: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Display Order (1 = First)</label>
                  <input
                    type="number"
                    min="1"
                    value={newBanner.displayOrder}
                    onChange={e => setNewBanner({ ...newBanner, displayOrder: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Banner Graphic Image *</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={e => setBannerImageFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '11px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Upload size={16} /> Upload & Publish
                  </button>
                </div>
              </form>
            </div>

            {/* Active Slideshow Banners List */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: '700', fontSize: '14px', color: '#e2e8f0' }}>
                Active App Banners ({bannersList.length})
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 18px' }}>Slide #</th>
                      <th style={{ padding: '12px 18px' }}>Preview</th>
                      <th style={{ padding: '12px 18px' }}>Title & Description</th>
                      <th style={{ padding: '12px 18px' }}>Target Link</th>
                      <th style={{ padding: '12px 18px' }}>Status</th>
                      <th style={{ padding: '12px 18px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bannersList.map((banner, idx) => (
                      <tr key={banner.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 18px', fontWeight: '700', color: '#38bdf8' }}>{banner.displayOrder || idx + 1}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <img
                            src={banner.imageUrl || banner.image_url}
                            alt="Banner Preview"
                            style={{ width: '120px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: '600', color: '#f8fafc' }}>
                          {banner.title}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '12px' }}>
                          {banner.link || 'Home Highlight'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                            Live on App
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteBanner(banner.id)}
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {bannersList.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                          No custom banners uploaded yet. The mobile app is currently displaying the 5 default high-converting 3D luxury slides.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 14: SYSTEM SETTINGS (1 USD = 1,520 IQD & AUTO-BIDDER BOT)
           ===================================================================== */}
        {activeTab === 'settings' && canAccessCRM && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>System Settings & Operational Configurations</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
              Configure official exchange rate, auto-bidder timing window, and global warehouse defaults. All changes recorded in audit log.
            </p>

            <div style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '640px' }}>
              <form onSubmit={handleSaveSettings}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    USD to IQD Official Exchange Rate
                  </label>
                  <input
                    type="number"
                    required
                    value={systemSettings.exchange_rate_usd_iqd}
                    onChange={e => setSystemSettings({ ...systemSettings, exchange_rate_usd_iqd: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Standard requirement: 1 USD = 1,520 IQD for all order thermal labels.</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    System Automated Bidder Master Switch
                  </label>
                  <select
                    value={systemSettings.auto_bidder_enabled}
                    onChange={e => setSystemSettings({ ...systemSettings, auto_bidder_enabled: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="true">Enabled (Protects Reserve Selling Thresholds)</option>
                    <option value="false">Disabled (No Automated System Bids)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Auto-Bidder Activation Window (Minutes Before End)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="60"
                    value={systemSettings.auto_bidder_window_minutes}
                    onChange={e => setSystemSettings({ ...systemSettings, auto_bidder_window_minutes: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Requirement specifies activation during the last 10 minutes of the auction.</div>
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Default Customer Shipping Fee ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={systemSettings.default_shipping_cost_usd}
                    onChange={e => setSystemSettings({ ...systemSettings, default_shipping_cost_usd: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={settingsLoading}
                  style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', cursor: settingsLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '13px' }}>
                  {settingsLoading ? 'Saving...' : 'Save System Settings'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* =====================================================================
          MODAL: PRODUCT REGISTRATION WITH MULTI-IMAGE UPLOADER
         ===================================================================== */}
      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#0f172a', width: '100%', maxWidth: '680px', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Register Physical Product & Photos</h3>
              <button onClick={() => setShowRegisterModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: '20px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1' }}>Product Photo Gallery (Cloud Upload)</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: uploadingImages ? 'not-allowed' : 'pointer' }}>
                    <Upload size={14} /> {uploadingImages ? 'Uploading Photos...' : 'Upload Photos'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {newProduct.images.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '12px' }}>
                    No photos uploaded yet. Click "Upload Photos" to add product images.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                    {newProduct.images.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', height: '90px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(239, 68, 68, 0.85)', color: '#fff', border: 'none', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Barcode (Sequential IQB-XXXXXX) *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IQB-000001"
                    value={newProduct.barcode}
                    onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await axios.post(`${API_ENTERPRISE}/barcodes/generate`, { quantity: 1 });
                      if (res.data.success && res.data.barcodes?.length > 0) {
                        setNewProduct({ ...newProduct, barcode: res.data.barcodes[0] });
                      }
                    }}
                    style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', color: '#38bdf8', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    + Next Free
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Official Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Official Brand Product Name"
                  value={newProduct.product_name}
                  onChange={e => setNewProduct({ ...newProduct, product_name: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Mandatory Category Selection for Application Sync */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Product Category * (Mandatory for IRAQ BID App)
                </label>
                <select
                  required
                  value={newProduct.category_id}
                  onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '10px', padding: '11px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Product Category (Required) --</option>
                  {categoriesList.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.slug || `ID ${cat.id}`})
                    </option>
                  ))}
                  {categoriesList.length === 0 && (
                    <>
                      <option value="5">Electronics</option>
                      <option value="9">Mobiles</option>
                      <option value="10">Laptops</option>
                      <option value="4">Watches</option>
                      <option value="2">Fashion</option>
                      <option value="7">Furniture</option>
                      <option value="13">Home Appliances</option>
                      <option value="11">Vehicles</option>
                      <option value="8">Collectibles</option>
                      <option value="3">Art</option>
                      <option value="12">Property</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Original Retail Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1200.00"
                    value={newProduct.original_retail_price}
                    onChange={e => setNewProduct({ ...newProduct, original_retail_price: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Buy Now Price ($) * [Mandatory]</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="950.00"
                    value={newProduct.buy_now_price}
                    onChange={e => setNewProduct({ ...newProduct, buy_now_price: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Starting Bid Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="200.00"
                    value={newProduct.starting_bid_price}
                    onChange={e => setNewProduct({ ...newProduct, starting_bid_price: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Minimum Acceptable Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Automated Bot Reserve Threshold"
                    value={newProduct.min_acceptable_price}
                    onChange={e => setNewProduct({ ...newProduct, min_acceptable_price: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Actual Acquisition Cost ($) [Internal]</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Warehouse Internal Cost"
                    value={newProduct.actual_acquisition_cost}
                    onChange={e => setNewProduct({ ...newProduct, actual_acquisition_cost: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Condition *</label>
                  <select
                    value={newProduct.condition}
                    onChange={e => setNewProduct({ ...newProduct, condition: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Used">Used</option>
                    <option value="For Parts / Defective">For Parts / Defective</option>
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 'bold', color: '#f87171', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newProduct.defect_alert}
                    onChange={e => setNewProduct({ ...newProduct, defect_alert: e.target.checked })}
                  />
                  Item has defect, flaw, or scratch (Will alert mobile buyers)
                </label>
                {newProduct.defect_alert && (
                  <textarea
                    placeholder="Describe specific defect / scratch in detail..."
                    value={newProduct.defect_details}
                    onChange={e => setNewProduct({ ...newProduct, defect_details: e.target.value })}
                    style={{ width: '100%', marginTop: '10px', height: '65px', backgroundColor: '#1e293b', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ backgroundColor: '#334155', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#0284c7', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                  Save & Register Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CUSTOMER ORDER LABEL PRINT (1 USD = 1,520 IQD)
         ===================================================================== */}
      {showLabelModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', color: '#000', width: '380px', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', fontFamily: 'sans-serif' }}>
            
            <div id="thermal-label-print">
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>IRAQ BID – CUSTOMER SHIPPING</div>
                <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '2px' }}>CUSTOMER ORDER SHIPPING LABEL</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Order {selectedOrder.order_number} • {new Date().toLocaleDateString()}</div>
              </div>

              <div style={{ padding: '14px 0', borderBottom: '1px dashed #000', fontSize: '13px', lineHeight: '1.6' }}>
                <div><strong>Customer:</strong> {selectedOrder.customer_name}</div>
                <div><strong>Phone:</strong> {selectedOrder.customer_phone}</div>
                <div><strong>Governorate:</strong> {selectedOrder.governorate}</div>
                <div><strong>Area:</strong> {selectedOrder.area}</div>
                <div><strong>Address:</strong> {selectedOrder.full_address}</div>
              </div>

              <div style={{ padding: '14px 0', borderBottom: '2px solid #000', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>PRODUCTS IN ORDER:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>• {selectedOrder.product_name}</span>
                  <strong>${selectedOrder.amount}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#555' }}>Item Barcode: {selectedOrder.item_barcode}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px' }}>
                  <span>Shipping Fee:</span>
                  <span>${selectedOrder.shipping_cost}</span>
                </div>
              </div>

              <div style={{ padding: '14px 0', borderBottom: '2px solid #000', textAlign: 'right' }}>
                <div style={{ fontSize: '13px' }}>Total (USD): <strong>${selectedOrder.usd_total}</strong></div>
                <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>Applied Rate: 1 USD = 1,520 IQD</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px', color: '#000' }}>
                  Total (IQD): {selectedOrder.iqd_total} IQD
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '18px' }}>
                <div style={{ fontFamily: 'monospace', letterSpacing: '4px', fontSize: '20px', fontWeight: 'bold' }}>
                  ||| |||| || ||||| ||| ||
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', marginTop: '4px' }}>*{selectedOrder.item_barcode}*</div>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setShowLabelModal(false)}
                style={{ flex: 1, backgroundColor: '#e2e8f0', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                Close
              </button>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                Print Label (Thermal / A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CUSTOMER REFUSAL STRIKE CONFIRMATION
         ===================================================================== */}
      {showRefusalModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#0f172a', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '28px', border: '1px solid #ef4444' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444', marginBottom: '12px' }}>
              Confirm Customer Delivery Refusal
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '18px' }}>
              Did the customer refuse delivery for Order #{selectedOrder.id}? 3 confirmed doorstep refusals will trigger an automatic account ban.
            </p>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Refusal Reason:</label>
              <textarea
                value={refusalReason}
                onChange={e => setRefusalReason(e.target.value)}
                style={{ width: '100%', height: '75px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowRefusalModal(false)}
                style={{ backgroundColor: '#334155', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await axios.post(`${API_ENTERPRISE}/customers/refusal`, {
                      order_id: selectedOrder.id,
                      reason: refusalReason
                    });
                    alert(res.data.message);
                    setShowRefusalModal(false);
                    fetchKPI();
                    fetchOrders();
                    fetchRefusals();
                    fetchLogs();
                  } catch (err) {
                    alert(err.response?.data?.message || err.message);
                  }
                }}
                style={{ backgroundColor: '#dc2626', border: 'none', color: '#fff', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Confirm Strike & Refusal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD NEW STAFF MEMBER
         ===================================================================== */}
      {showStaffModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#0f172a', width: '100%', maxWidth: '520px', borderRadius: '18px', padding: '28px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Add Staff Member</h3>
              <button onClick={() => setShowStaffModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setStaffLoading(true);
              try {
                const res = await axios.post(`${API_ADMIN}/staff`, newStaff);
                if (res.data.success) {
                  alert(res.data.message || 'Staff created successfully');
                  setShowStaffModal(false);
                  setNewStaff({ name: '', email: '', password: '', phone: '', role: 'editor' });
                  fetchStaff();
                }
              } catch (err) {
                alert(err.response?.data?.error || err.message || 'Failed to create staff');
              } finally {
                setStaffLoading(false);
              }
            }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Staff Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Hassan"
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ali@iraqbid.com"
                  value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Strong password"
                  value={newStaff.password}
                  onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Assigned Administrative Role *</label>
                <select
                  value={newStaff.role}
                  onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  {userRole === 'superadmin' && <option value="admin">Operations Admin</option>}
                  {['superadmin', 'admin'].includes(userRole) && <option value="manager">Shift Manager</option>}
                  <option value="editor">Inventory Product Editor (Restricted)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  style={{ backgroundColor: '#334155', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffLoading}
                  style={{ backgroundColor: '#0284c7', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '8px', cursor: staffLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  {staffLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: BARCODE STICKER SHEET PRINT & PDF GENERATOR
         ===================================================================== */}
      {showBarcodePrintModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#0f172a', width: '100%', maxWidth: '850px', maxHeight: '90vh', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc' }}>Barcode Labels Printing & PDF Generator</h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Total Selected: <strong style={{ color: '#38bdf8' }}>{selectedBarcodeIds.size} barcodes</strong> • Code 128 Standard • IRAQ BID Brand Header
                </div>
              </div>
              <button onClick={() => setShowBarcodePrintModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            {/* Print Settings Toolbar */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>Paper & Layout</label>
                <select
                  value={stickerPaperSize}
                  onChange={e => setStickerPaperSize(e.target.value)}
                  style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="A4">Standard A4 Sheet (Sticker Paper)</option>
                  <option value="Thermal">Continuous Thermal Roll</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>Labels Per Page</label>
                <select
                  value={labelsPerPage}
                  onChange={e => setLabelsPerPage(parseInt(e.target.value))}
                  style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                >
                  <option value={24}>24 Labels (3 columns × 8 rows)</option>
                  <option value={30}>30 Labels (3 columns × 10 rows)</option>
                  <option value={18}>18 Labels (Large 3 × 6)</option>
                </select>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleDownloadBarcodePDF}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                >
                  <Download size={14} /> Download Ready PDF
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                >
                  <Printer size={14} /> Direct Browser Print
                </button>
              </div>
            </div>

            {/* Print Sticker Preview Sheet */}
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff', color: '#000000', borderRadius: '12px', padding: '20px' }}>
              <div id="barcode-stickers-sheet" style={{
                display: 'grid',
                gridTemplateColumns: stickerPaperSize === 'A4' ? 'repeat(3, 1fr)' : '1fr',
                gap: '12px'
              }}>
                {barcodes.filter(b => selectedBarcodeIds.has(b.barcode_number)).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      minHeight: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '1px', color: '#0f172a', marginBottom: '4px' }}>
                      IRAQ BID
                    </div>

                    {/* SVG / Barcode Lines Representation */}
                    <svg
                      ref={el => {
                        if (el) {
                          try {
                            JsBarcode(el, item.barcode_number, {
                              format: "CODE128",
                              width: 1.4,
                              height: 38,
                              displayValue: false,
                              margin: 0
                            });
                          } catch (e) {}
                        }
                      }}
                      style={{ maxWidth: '100%', height: '38px', margin: '2px 0' }}
                    />

                    <div style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'monospace', color: '#1e293b', marginTop: '2px' }}>
                      {item.barcode_number}
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                      {item.product_name ? item.product_name.slice(0, 24) : 'Inventory Asset'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setShowBarcodePrintModal(false)}
                style={{ backgroundColor: '#334155', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
