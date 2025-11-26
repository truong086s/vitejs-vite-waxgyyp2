import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  User,
  DollarSign,
  Coffee,
  Utensils,
  ChefHat,
  Send,
  X,
  CheckCircle,
  Settings,
  Edit2,
  Copy,
  AlertCircle,
  Database,
  Save,
  ArrowRightCircle,
  LayoutGrid,
  List,
  PlusCircle,
  RefreshCcw,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
// Import the functions you need from the SDKs you need
import { getAnalytics } from 'firebase/analytics';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDLJANlUzGEJoQErILQFWx_ZQmZ21ZoCSw",
  authDomain: "app-inve-88bf7.firebaseapp.com",
  projectId: "app-inve-88bf7",
  storageBucket: "app-inve-88bf7.firebasestorage.app",
  messagingSenderId: "838030359693",
  appId: "1:838030359693:web:8ad8c77d5f58bd239c76c4",
  measurementId: "G-190F3GC71L"
};

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// --- Firebase Configuration ---
// const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Icon Helper ---
const getIcon = (type, className = 'w-6 h-6') => {
  switch (type) {
    case 'coffee':
      return <Coffee className={`${className} text-blue-500`} />;
    case 'chef':
      return <ChefHat className={`${className} text-orange-600`} />;
    case 'utensils':
    default:
      return <Utensils className={`${className} text-orange-500`} />;
  }
};

// --- Modal Component ---
const Modal = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default function LunchOrderApp() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  // Data States
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [cart, setCart] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'database'

  // Modal States
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: '',
    data: null,
  });
  const [inputValue, setInputValue] = useState('');
  // 新增：儲存範本時的類型選擇 ('main' | 'drink')
  const [templateType, setTemplateType] = useState('main');

  // Admin Form States
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: '便當',
    iconType: 'utensils',
  });

  // --- 1. Authentication ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const savedName = localStorage.getItem('lunch_app_username');
      if (savedName) {
        setUserName(savedName);
        setHasJoined(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Data Sync ---
  useEffect(() => {
    if (!user) return;
    const ordersRef = collection(
      db,
      'artifacts',
      firebaseConfig.appId,
      'public',
      'data',
      'lunch_orders'
    );
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const loadedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      loadedOrders.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setOrders(loadedOrders);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const menuRef = collection(
      db,
      'artifacts',
      firebaseConfig.appId,
      'public',
      'data',
      'lunch_menu'
    );
    const unsubscribe = onSnapshot(menuRef, (snapshot) => {
      const loadedMenu = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      loadedMenu.sort((a, b) => {
        if (a.category === b.category) return a.price - b.price;
        return a.category === '飲料' ? 1 : -1;
      });
      setMenuItems(loadedMenu);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const restRef = collection(
      db,
      'artifacts',
      firebaseConfig.appId,
      'public',
      'data',
      'restaurants'
    );
    const unsubscribe = onSnapshot(restRef, (snapshot) => {
      const loadedRest = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRestaurants(loadedRest);
    });
    return () => unsubscribe();
  }, [user]);

  // --- Modal Helpers ---
  const showMessage = (title, message) => {
    setModalConfig({ isOpen: true, type: 'message', title, message });
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
  };

  // 新增：儲存餐廳的專用 Modal 觸發器
  const openSaveTemplateModal = () => {
    setInputValue('');
    setTemplateType('main'); // default
    setModalConfig({
      isOpen: true,
      type: 'save_restaurant',
      title: '另存為餐廳範本',
    });
  };

  const closeModals = () => {
    setModalConfig({ isOpen: false, type: '', data: null });
    setInputValue('');
  };

  // --- Actions ---
  const handleJoin = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('lunch_app_username', userName);
      setHasJoined(true);
    }
  };

  const addToCart = (item) => {
    setCart([...cart, { ...item, tempId: Date.now() + Math.random() }]);
  };

  const removeFromCart = (tempId) => {
    setCart(cart.filter((item) => item.tempId !== tempId));
  };

  const submitOrder = async () => {
    if (!user || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const ordersRef = collection(
        db,
        'artifacts',
        firebaseConfig.appId,
        'public',
        'data',
        'lunch_orders'
      );
      const promises = cart.map((item) =>
        addDoc(ordersRef, {
          userId: user.uid,
          userName: userName,
          itemId: item.id,
          itemName: item.name,
          price: Number(item.price),
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(promises);
      setCart([]);
      showMessage('成功', '訂單已送出！');
    } catch (error) {
      console.error('Order error', error);
      showMessage('錯誤', '送出失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (orderId, orderUserId) => {
    if (!user || (!isAdmin && user.uid !== orderUserId)) return;
    try {
      await deleteDoc(
        doc(db, 'artifacts', firebaseConfig.appId, 'public', 'data', 'lunch_orders', orderId)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    // console.log("Data appId: ", firebaseConfig.appId)
    try {
      await addDoc(
        collection(db, 'artifacts', firebaseConfig.appId, 'public', 'data', 'lunch_menu'),
        {
          ...newItem,
          price: Number(newItem.price),
        }
      );
      setNewItem({
        name: '',
        price: '',
        category: '便當',
        iconType: 'utensils',
      });
      setIsEditingMenu(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMenuItem = async (id) => {
    showConfirm('刪除餐點', '確定要刪除這個餐點嗎？', async () => {
      try {
        await deleteDoc(
          doc(db, 'artifacts', firebaseConfig.appId, 'public', 'data', 'lunch_menu', id)
        );
        closeModals();
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleClearAllOrders = async () => {
    showConfirm(
      '清空訂單',
      '確定要清空所有訂單嗎？這將無法復原。',
      async () => {
        try {
          const batch = writeBatch(db);
          orders.forEach((order) => {
            const ref = doc(
              db,
              'artifacts',
              firebaseConfig.appId,
              'public',
              'data',
              'lunch_orders',
              order.id
            );
            batch.delete(ref);
          });
          await batch.commit();
          closeModals();
          showMessage('成功', '今日訂單已清空！');
        } catch (e) {
          console.error(e);
          showMessage('錯誤', '清空失敗');
        }
      }
    );
  };

  // --- Database Actions ---

  // 1. Save Template (Modified to include type)
  const handleSaveAsTemplate = () => {
    if (menuItems.length === 0) {
      showMessage('提示', '目前菜單是空的，無法儲存。');
      return;
    }
    openSaveTemplateModal();
  };

  const confirmSaveTemplate = async () => {
    if (!inputValue.trim()) return;
    try {
      await addDoc(
        collection(db, 'artifacts', firebaseConfig.appId, 'public', 'data', 'restaurants'),
        {
          name: inputValue,
          type: templateType, // 'main' or 'drink'
          items: menuItems.map((item) => ({
            name: item.name,
            price: item.price,
            category: item.category,
            iconType: item.iconType || 'utensils',
          })),
          createdAt: serverTimestamp(),
        }
      );
      closeModals();
      showMessage('成功', `已新增「${inputValue}」到資料庫！`);
      setActiveTab('database');
    } catch (e) {
      console.error(e);
      showMessage('錯誤', '儲存失敗');
    }
  };

  // 2. Apply Template (Modified for Overwrite vs Append)
  const handleApplyTemplate = (restaurant, mode = 'overwrite') => {
    const actionText = mode === 'overwrite' ? '覆蓋' : '加入';
    const confirmText =
      mode === 'overwrite'
        ? `確定要將今日菜單替換為「${restaurant.name}」嗎？\n(原本的菜單會被清空)`
        : `確定要將「${restaurant.name}」的品項加入今日菜單嗎？`;

    showConfirm('套用菜單', confirmText, async () => {
      try {
        setLoading(true);
        const batch = writeBatch(db);

        // Only delete existing menu if overwriting
        if (mode === 'overwrite') {
          menuItems.forEach((item) => {
            const ref = doc(
              db,
              'artifacts',
              firebaseConfig.appId,
              'public',
              'data',
              'lunch_menu',
              item.id
            );
            batch.delete(ref);
          });
        }

        // Add new items
        restaurant.items.forEach((item) => {
          const newRef = doc(
            collection(db, 'artifacts', firebaseConfig.appId, 'public', 'data', 'lunch_menu')
          );
          batch.set(newRef, item);
        });

        await batch.commit();
        closeModals();
        setLoading(false);
        setActiveTab('today');
        showMessage('成功', `已${actionText} ${restaurant.name}！`);
      } catch (e) {
        console.error(e);
        setLoading(false);
        showMessage('錯誤', '套用失敗');
      }
    });
  };

  const handleDeleteTemplate = (id, name) => {
    showConfirm('刪除餐廳', `確定要從資料庫刪除「${name}」嗎？`, async () => {
      try {
        await deleteDoc(
          doc(db, 'artifacts', firebaseConfig.appId, 'public', 'data', 'restaurants', id)
        );
        closeModals();
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleCopySummary = () => {
    let summary = `📅 今日午餐統計\n------------------\n`;
    Object.entries(groupedOrders).forEach(([name, stats]) => {
      summary += `${name} x${stats.count} ($${stats.price * stats.count})\n`;
    });
    summary += `------------------\n💰 總金額：$${totalAmount}\n📝 總份數：${orders.length}`;
    navigator.clipboard.writeText(summary);
    showMessage('已複製', '訂單摘要已複製到剪貼簿！');
  };

  // --- Computed Stats ---
  const totalAmount = useMemo(
    () => orders.reduce((sum, o) => sum + o.price, 0),
    [orders]
  );
  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price, 0),
    [cart]
  );
  const groupedOrders = useMemo(() => {
    const groups = {};
    orders.forEach((order) => {
      if (!groups[order.itemName])
        groups[order.itemName] = { count: 0, price: order.price };
      groups[order.itemName].count += 1;
    });
    return groups;
  }, [orders]);

  // Group Restaurants by Type
  const mainRestaurants = restaurants.filter((r) => r.type !== 'drink');
  const drinkRestaurants = restaurants.filter((r) => r.type === 'drink');

  // --- Initial Join Screen ---
  if (!hasJoined) {
    return (
       <div className="join-screen">
      <div className="join-card">
        <div className="join-header">
          <div className="join-icon">
            <ShoppingBag />
          </div>
          <h1>午餐點餐系統</h1>
          <p>請輸入您的名字</p>
        </div>
        <form onSubmit={handleJoin} className="join-form">
          <input
            type="text"
            required
            placeholder="例如：Alex"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button type="submit">開始使用</button>
        </form>
      </div>
    </div>
    );
  }

  // --- Main Render ---
  return (
    <div
      className={`min-h-screen flex flex-col ${
        isAdmin ? 'bg-slate-50' : 'bg-gray-50'
      }`}
    >
      {/* --- Global Modals --- */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        onClose={closeModals}
      >
        {/* Type: Message */}
        {modalConfig.type === 'message' && (
          <div className="space-y-4">
            <p className="text-gray-600">{modalConfig.message}</p>
            <button
              onClick={closeModals}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              確定
            </button>
          </div>
        )}

        {/* Type: Confirm */}
        {modalConfig.type === 'confirm' && (
          <div className="space-y-4">
            <p className="text-gray-600 whitespace-pre-line">
              {modalConfig.message}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={closeModals}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={modalConfig.onConfirm}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
              >
                確定
              </button>
            </div>
          </div>
        )}

        {/* Type: Save Restaurant (Custom Form) */}
        {modalConfig.type === 'save_restaurant' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                餐廳名稱
              </label>
              <input
                type="text"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="例如：八方雲集"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分類 (影響預設操作)
              </label>
              <div className="flex space-x-4">
                <label
                  className={`flex-1 cursor-pointer border rounded-lg p-3 flex items-center justify-center transition ${
                    templateType === 'main'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={templateType === 'main'}
                    onChange={() => setTemplateType('main')}
                  />
                  <Utensils className="w-4 h-4 mr-2" />
                  主食餐廳
                </label>
                <label
                  className={`flex-1 cursor-pointer border rounded-lg p-3 flex items-center justify-center transition ${
                    templateType === 'drink'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={templateType === 'drink'}
                    onChange={() => setTemplateType('drink')}
                  />
                  <Coffee className="w-4 h-4 mr-2" />
                  飲料店
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={closeModals}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={confirmSaveTemplate}
                disabled={!inputValue.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg disabled:bg-gray-300"
              >
                儲存
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Header */}
      <header
        className={`${
          isAdmin ? 'bg-slate-800 text-white' : 'bg-white text-gray-800'
        } shadow-sm sticky top-0 z-20 transition-colors duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag
              className={`w-6 h-6 ${
                isAdmin ? 'text-blue-400' : 'text-orange-600'
              }`}
            />
            <h1 className="text-xl font-bold hidden sm:block">
              {isAdmin ? '管理者後台' : '午餐點餐小幫手'}
            </h1>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                isAdmin
                  ? 'bg-slate-700 text-gray-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <User className="w-4 h-4 inline mr-1" />
              {userName}
            </span>
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`p-2 rounded-full transition ${
                isAdmin
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title="切換管理者模式"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('lunch_app_username');
                setHasJoined(false);
                setUserName('');
                setCart([]);
                setIsAdmin(false);
              }}
              className="text-sm opacity-60 hover:opacity-100"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="bg-white border-b border-gray-200 sticky top-16 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto flex">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition ${
                activeTab === 'today'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4 inline mr-2" />
              今日菜單管理
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition ${
                activeTab === 'database'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database className="w-4 h-4 inline mr-2" />
              餐廳資料庫 ({restaurants.length})
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 main">
        {/* === Left Column === */}
        <div className="lg:col-span-2 space-y-6 lg-col-span-2-space-y-6">
          {/* View: Restaurant Database (Admin Only) */}
          {isAdmin && activeTab === 'database' && (
            <div className="animate-fade-in space-y-8 fade-in-space-y-8">
              {/* Section 1: Main Course */}
              <div>
                <h3 className="flex items-center text-lg font-bold text-gray-800 mb-4 flex-items-center-text-lg-font-bold-text-gray-800-mb-4">
                  <span className="bg-blue-100 text-blue-800 p-2 rounded-lg mr-2 bg-blue-100-text-blue-800-p-2-rounded-lg-mr-2">
                    <Utensils className="w-5 h-5" />
                  </span>
                  主食餐廳 (點擊替換今日菜單)
                </h3>
                {mainRestaurants.length === 0 ? (
                  <div style={{
                      textAlign: 'center',            /* text-center */
                      paddingTop: '2rem',             /* py-8 → padding-top */
                      paddingBottom: '2rem',          /* py-8 → padding-bottom */
                      backgroundColor: '#ffffff',     /* bg-white */
                      borderRadius: '0.75rem',        /* rounded-xl */
                      borderWidth: '1px',             /* border */
                      borderStyle: 'dashed',          /* border-dashed */
                      borderColor: '#d1d5db',         /* border-gray-300 */
                      color: '#9ca3af',               /* text-gray-400 */
                    }} className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                    尚無主食餐廳，請先建立
                  </div>
                ) : (
                  <div style={{
  display: 'grid',                  /* grid */
  gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', /* grid-cols-1 */
  gap: '1rem',                      /* gap-4 → 1rem */

}} className="grid grid-cols-1 md:grid-cols-2 gap-4 grid-grid-cols-1-md-grid-cols-2-gap-4">
                    {mainRestaurants.map((rest) => (
                      <div
                        key={rest.id}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-400 transition group relative card"
                      >
                        <div className="flex justify-between items-start mb-3 flex-justify-between-items-start-mb-3">
                          <h3 className="font-bold text-lg text-gray-800 font-bold-text-lg-text-gray-800">
                            {rest.name}
                          </h3>
                          <button
                            onClick={() =>
                              handleDeleteTemplate(rest.id, rest.name)
                            }
                            className="text-gray-400 hover:text-red-500 p-1 text-gray-400-hover-text-red-500-p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 text-sm-text-gray-500-mb-4-line-clamp-2">
                          {rest.items.map((i) => i.name).join('、')}
                        </p>
                        <div className="flex gap-2 flex-gap-2">
                          <button
                            onClick={() =>
                              handleApplyTemplate(rest, 'overwrite')
                            }
                            className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg font-bold text-sm flex items-center justify-center transition border border-blue-200 flex-1-bg-blue-50-text-blue-700-hover-bg-blue-100-py-2-rounded-lg-font-bold-text-sm-flex-items-center-justify-center-transition-border-border-blue-200"
                            title="清空現有菜單並套用此餐廳"
                          >
                            <RefreshCcw className="w-4 h-4 mr-1" />
                            設為今日菜單
                          </button>
                          <button
                            onClick={() => handleApplyTemplate(rest, 'append')}
                            className="w-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 w-10-flex-items-center-justify-center-bg-gray-50-hover-bg-gray-100-text-gray-500-rounded-lg-border-border-gray-200"
                            title="加入至現有菜單 (不清除)"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Drinks */}
              <div>
                <h3 className="flex items-center text-lg font-bold text-gray-800 mb-4 flex-items-center-text-lg-font-bold-text-gray-800-mb-4">
                  <span className="bg-green-100 text-green-800 p-2 rounded-lg mr-2 bg-green-100-text-green-800-p-2-rounded-lg-mr-2">
                    <Coffee className="w-5 h-5" />
                  </span>
                  飲料店家 (點擊加入今日菜單)
                </h3>
                {drinkRestaurants.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400 text-center-py-8-bg-white-rounded-xl-border-border-dashed-border-gray-300-text-gray-400">
                    尚無飲料店家，請先建立
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 grid-grid-cols-1-md-grid-cols-2-gap-4">
                    {drinkRestaurants.map((rest) => (
                      <div
                        key={rest.id}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-green-400 transition group bg-white-p-5-rounded-2xl-shadow-sm-border-border-gray-200-hover-border-green-400-transition-group"
                      >
                        <div className="flex justify-between items-start mb-3 flex-justify-between-items-start-mb-3">
                          <h3 className="font-bold text-lg text-gray-800 font-bold-text-lg-text-gray-800">
                            {rest.name}
                          </h3>
                          <button
                            onClick={() =>
                              handleDeleteTemplate(rest.id, rest.name)
                            }
                            className="text-gray-400 hover:text-red-500 p-1 text-gray-400-hover-text-red-500-p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 text-sm-text-gray-500-mb-4-line-clamp-2">
                          {rest.items.map((i) => i.name).join('、')}
                        </p>
                        <div className="flex gap-2 flex-gap-2">
                          <button
                            onClick={() => handleApplyTemplate(rest, 'append')}
                            className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg font-bold text-sm flex items-center justify-center transition border border-green-200 flex-1-bg-green-50-text-green-700-hover-bg-green-100-py-2-rounded-lg-font-bold-text-sm-flex-items-center-justify-center-transition-border-border-green-200"
                            title="加入至現有菜單 (不清除)"
                          >
                            <PlusCircle className="w-4 h-4 mr-1" />
                            加入今日菜單
                          </button>
                          <button
                            onClick={() =>
                              handleApplyTemplate(rest, 'overwrite')
                            }
                            className="w-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 w-10-flex-items-center-justify-center-bg-gray-50-hover-bg-gray-100-text-gray-500-rounded-lg-border-border-gray-200"
                            title="清空現有菜單並套用此餐廳"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View: Today's Menu (Default for User & Admin) */}
          {(activeTab === 'today' || !isAdmin) && (
            <>
              {/* Admin Menu Tools */}
              {isAdmin && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-200 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center text-blue-800 font-bold">
                    <Edit2 className="w-5 h-5 mr-2" />
                    今日菜單編輯
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveAsTemplate}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      另存為餐廳
                    </button>
                    <button
                      onClick={() => setIsEditingMenu(!isEditingMenu)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      新增單品
                    </button>
                  </div>
                </div>
              )}

              {/* Add Item Form */}
              {isAdmin && isEditingMenu && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-fade-in">
                  <h3 className="font-bold text-gray-800 mb-4">新增今日單品</h3>
                  <form
                    onSubmit={handleAddMenuItem}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-4"
                  >
                    <input
                      type="text"
                      placeholder="餐點名稱"
                      required
                      className="border p-2 rounded sm:col-span-2"
                      value={newItem.name}
                      onChange={(e) =>
                        setNewItem({ ...newItem, name: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      placeholder="價格"
                      required
                      className="border p-2 rounded"
                      value={newItem.price}
                      onChange={(e) =>
                        setNewItem({ ...newItem, price: e.target.value })
                      }
                    />
                    <select
                      className="border p-2 rounded"
                      value={newItem.category}
                      onChange={(e) =>
                        setNewItem({ ...newItem, category: e.target.value })
                      }
                    >
                      <option value="便當">便當</option>
                      <option value="飲料">飲料</option>
                      <option value="點心">點心</option>
                    </select>
                    <div className="sm:col-span-4 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingMenu(false)}
                        className="px-4 py-2 text-gray-500"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg"
                      >
                        新增
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Menu Grid */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 min-h-[200px]">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Utensils className="w-5 h-5 mr-2 text-orange-500" />
                  {isAdmin ? '今日供應菜單' : '今日菜單'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-500 hover:shadow-md hover:bg-orange-50 transition group bg-white"
                    >
                      <button
                        onClick={() => !isAdmin && addToCart(item)}
                        className="flex-1 flex items-center justify-between text-left w-full"
                        disabled={isAdmin}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-white transition">
                            {getIcon(item.iconType)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {item.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {item.category}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 mr-2">
                          ${item.price}
                        </span>
                      </button>

                      {isAdmin ? (
                        <button
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="ml-2 p-2 text-red-400 hover:bg-red-50 rounded-full hover:text-red-600"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-orange-500 hover:text-white transition"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {menuItems.length === 0 && (
                    <div className="col-span-full text-center py-10">
                      <p className="text-gray-400 mb-2">今日菜單尚未建立</p>
                      {isAdmin && (
                        <button
                          onClick={() => setActiveTab('database')}
                          className="text-blue-600 hover:underline"
                        >
                          去資料庫選一家餐廳 &rarr;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Block */}
              <div className="hidden lg:block bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">統計總覽</h2>
                  {isAdmin && (
                    <button
                      onClick={handleCopySummary}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg flex items-center transition"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      複製摘要
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(groupedOrders).map(([name, stats]) => (
                    <div
                      key={name}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium text-gray-700">{name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          x{stats.count}
                        </span>
                        <span className="font-bold text-gray-900">
                          ${stats.price * stats.count}
                        </span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-gray-400 text-sm">尚無訂單</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* === Right Column: Cart & Live Orders === */}
        <div className="lg:col-span-1 space-y-6">
          {/* User: Cart */}
          {!isAdmin && cart.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-500 overflow-hidden animate-fade-in">
              <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                <h2 className="font-bold text-orange-800 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  準備下單
                </h2>
                <span className="text-orange-600 font-bold">${cartTotal}</span>
              </div>
              <div className="p-4 space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.tempId}
                    className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-gray-700">{item.name}</span>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">
                        ${item.price}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.tempId)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <span>處理中...</span>
                  ) : (
                    <>
                      <span>確認送出</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Admin: Global Controls */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow border border-red-100 p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-500" />
                訂單管理
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleCopySummary}
                  className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-lg font-medium text-sm flex items-center justify-center"
                >
                  <Copy className="w-4 h-4 mr-2" /> 複製訂單摘要 (給店家)
                </button>
                <button
                  onClick={handleClearAllOrders}
                  className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg font-medium text-sm flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> 清空今日所有訂單 (重置)
                </button>
              </div>
            </div>
          )}

          {/* Live Orders Feed */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col max-h-[60vh] lg:max-h-[calc(100vh-16rem)] sticky top-24">
            <div
              className={`p-4 ${
                isAdmin ? 'bg-slate-700' : 'bg-gray-800'
              } text-white flex justify-between items-center transition-colors`}
            >
              <h2 className="font-bold flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2" />
                訂單列表 ({orders.length})
              </h2>
              <div className="text-right">
                <p className="text-xs opacity-70">總金額</p>
                <p className="font-bold text-lg">${totalAmount}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>目前還沒有訂單</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      order.userId === user?.uid
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          order.userId === user?.uid
                            ? 'bg-orange-200 text-orange-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {order.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {order.itemName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.userName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-gray-700 text-sm">
                        ${order.price}
                      </span>
                      {(isAdmin || order.userId === user?.uid) && (
                        <button
                          onClick={() =>
                            handleDeleteOrder(order.id, order.userId)
                          }
                          className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition"
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
