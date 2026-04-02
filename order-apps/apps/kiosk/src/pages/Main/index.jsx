import React, {useState, useEffect, useCallback} from 'react'
import styles from './index.module.scss'
import { IoSunny, IoMoon } from 'react-icons/io5'
import Tables from '../../components/Tables'
import Decr from '../../components/Decr'
import Popup from '../../components/Popup'
import BusinessLunch from '../../components/BusinessLunch'
import moment from 'moment'
import FullMenu from '../../components/FullMenu'
import FoodDetail from '../../components/FoodDetail'
import Cart from '../../components/Cart'
import Name from '../../components/Name'
import Timer from '../../components/Timer'
import useTouchScroll from '../../hooks/useTouchScroll'
import { API_BASE, RESTAURANT_ID } from '../../config'

const Index = () => {
  const BL_PRICE = 450;
  const [isActive,
        setIsActive] = useState(true);
  const [isActive_,
        setIsActive_] = useState(false);
    const [blList,
        setBlList] = useState([])
    const [fullMenuList,
        setFullMenuList] = useState([])
    const [blModalOpen,
        setBlModalOpen] = useState(null)
    const [detailItem,
        setDetailItem] = useState(null)
    const [request,
        setRequest] = useState([])
    const [token,
        setToken] = useState(null)
    const [tables,
        setTables] = useState(null)
    const [orderId,
        setOrderId] = useState(null)
    const [isOpenDecr,
        setIsOpenDecr] = useState(null)
    const [isOpenName,
        setIsOpenName] = useState(false)
    const [steps,
        setSteps] = useState({
            isActive: 1,
            guestСount: 1,
            table: null
        })
    const [guests,
        setGuests] = useState('')
    const [orderComment,
        setOrderComment] = useState('')
    const [darkMode,
        setDarkMode] = useState(() => {
            const saved = localStorage.getItem('kiosk-theme');
            const isDark = saved === 'dark';
            if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
            return isDark;
        })
    const [emenuSettings, setEmenuSettings] = useState(null)
    const menuScrollRef = useTouchScroll({ direction: 'vertical' })

    const toggleTheme = useCallback(() => {
        setDarkMode(prev => {
            const next = !prev;
            document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
            localStorage.setItem('kiosk-theme', next ? 'dark' : 'light');
            return next;
        });
    }, [])

    const blItems = request.filter(item => item?.category !== undefined && item?.category !== null)
    const mainMenuItems = request.filter(item => item?.category === undefined || item?.category === null)

    const getMenuList = () => { // бизнес-ланч пока не поддерживается в новом API
        setBlList([])
    }

    const getTables = () => { // получаем список столов
        fetch(`${API_BASE}/tables/restaurant/${RESTAURANT_ID}`)
        .then(response => response.json())
        .then(data => { setTables(data || null) })
        .catch(err => console.error('Tables error:', err))
    }

    const getMainMenuList = () => { // получаем полное меню из нашего бэкенда
        fetch(`${API_BASE}/restaurants/${RESTAURANT_ID}/menu?_t=${Date.now()}`)
        .then(response => response.json())
        .then(data => {
            // Адаптируем формат: наш API возвращает [{section_title, items}],
            // а FullMenu ожидает плоский массив с section_title на каждом элементе
            const flat = [];
            (data || []).forEach((section, sIdx) => {
                (section.items || []).forEach(item => {
                    flat.push({
                        id: item.id,
                        title_ru: item.name,
                        composition: item.description || '',
                        price: String(item.price || 0) + '.00',
                        weight: item.weight,
                        section_title: section.section_title,
                        section_id: sIdx,
                        image: item.photoUrl ? [{ Url: item.photoUrl }] : [],
                    });
                });
            });
            console.log('[Kiosk] Menu loaded:', flat.length, 'items, sections:', [...new Set(flat.map(f => f.section_title))]);
            setFullMenuList(flat);
        })
        .catch(err => console.error('Main menu error:', err))
    }

    async function fetchAuthToken() { // токен не нужен для публичного API
        setToken('kiosk-mode');
    }

    async function fetchAuthToken_() {
        setToken('kiosk-mode');
    }

    const handleGetAddDecription = (item) => {
        setIsOpenDecr(item.id)
    }

    const handleCancel = () => { // отменяем заказ
        if (!orderId) return;
        fetch(`${API_BASE}/orders/${orderId}/close`, { method: 'POST' })
            .then(() => setIsActive_(true))
            .catch(err => console.error('Cancel error:', err))
    }

    useEffect(() => {
        if (!token) {
            fetchAuthToken();
        }
    }, [token])

    useEffect(() => {
        getMenuList();
        // Fetch e-menu settings from backend
        fetch(`${API_BASE}/restaurants/${RESTAURANT_ID}/emenu-settings?_t=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
                setEmenuSettings(data);
                // Apply theme
                if (data.theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    setDarkMode(true);
                } else if (data.theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                    setDarkMode(false);
                }
                // Apply colors
                if (data.primaryColor) {
                    document.documentElement.style.setProperty('--primary-color', data.primaryColor);
                }
                if (data.accentColor) {
                    document.documentElement.style.setProperty('--accent-color', data.accentColor);
                }
            })
            .catch(() => {});
    }, [])

    useEffect(() => {
        if (token != null) {
            getMainMenuList();
            getTables();
            // Auto-refresh menu every 30 seconds
            const interval = setInterval(() => getMainMenuList(), 30000);
            return () => clearInterval(interval);
        }
    }, [token])

    const handleGetRequest = (item, type) => {
        const copy = [...request]
        if (type === 'add') {
            copy.push(item)
        } else {
            const index = copy.findIndex((element) => element.id == item.id);

            if (index !== -1) {
                copy.splice(index, 1);
            }
        }
        setRequest(copy)
    }

    const getUniqueArray = (array) => {
        return array.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id))
    }

    function groupOrdersByCategory(orders) {
        // Группируем заказы по категориям
        const grouped = {1: [], 2: [], 3: [], 4: [], 5: []};
        orders?.forEach(order => {
            if (order?.category) {
                grouped[order.category]?.push(order);
            }
        });

        // Находим максимальное количество заказов в каждой категории
        const maxLength = Math.max(grouped[1].length, grouped[2].length, grouped[3].length, grouped[4].length, grouped[5].length);

        // Массив для хранения результатов
        const result = [];

        // Собираем результат по "пакетам" заказов из разных категорий
        for (let i = 0; i < maxLength; i++) {
            const batch = [];

            for (let category = 1; category <= 5; category++) {
                if (grouped[category][i]) {
                    batch.push(grouped[category][i]);
                }
            }

            if (batch.length > 0) {
                result.push(batch);
            }
        }

        return result;
    }

    const getMainMenuItemsWithAmount = () => {
        const aggregated = {};
        mainMenuItems.forEach(item => {
            if (!aggregated[item.id]) {
                aggregated[item.id] = {...item, amount: 0};
            }
            aggregated[item.id].amount += 1;
        });
        return Object.values(aggregated);
    }

    const getBlSets = () => groupOrdersByCategory(blItems);

    const getTotalPrice = () => {
        const blTotal = getBlSets().length * BL_PRICE;
        const mainTotal = mainMenuItems.reduce((sum, item) => {
            const price = parseFloat(item?.price || 0);
            return sum + (isNaN(price) ? 0 : price);
        }, 0);
        return blTotal + mainTotal;
    }

    const getItemCount = (id) => request.filter(item => item.id === id).length;

    const handleOpenDetail = (item) => {
        setDetailItem(item);
    }

    const handleCartProceed = () => {
        setSteps({...steps, isActive: 2});
    }

    const handleSubmitRequest = (type) => {
        if (type === 'cancel') {
            handleCancel();
        }
        setRequest([])
        setSteps({
            isActive: 1,
            guestСount: 1,
            table: null
        })
    }


    const getGuestsErr = (guestСount) => {
        const guests_list = []
        for (let i = 0; i < guestСount; i++) {
            guests_list.push(guests)
        }
        return guests_list
    }

    const handleCreateGuests = async () => {
        try {
            // Собираем все блюда в один заказ
            const allItems = [];

            // Бизнес-ланчи
            const blSets = getBlSets();
            for (const set of blSets) {
                for (const item of set) {
                    allItems.push({
                        dishId: item.id,
                        quantity: 1,
                        comment: item.decr || null,
                    });
                }
            }

            // Основное меню
            const mainItemsWithAmount = getMainMenuItemsWithAmount();
            for (const item of mainItemsWithAmount) {
                allItems.push({
                    dishId: item.id,
                    quantity: item.amount,
                    comment: item.decr || null,
                });
            }

            if (allItems.length === 0) return;

            // Создаём заказ одним запросом
            const response = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: RESTAURANT_ID,
                    tableId: steps.table,
                    source: 'qr',
                    comment: orderComment || null,
                    items: allItems,
                })
            });
            const data = await response.json();
            setOrderId(data.id);
            setSteps({...steps, isActive: steps.isActive + 1});
            setIsOpenName(false);
            setGuests('');
        } catch (error) {
            console.error(error);
            return error
        }
    }

    const handleAddName = () => {
        // Имена гостей не используются в новом API
        handleCreateGuests();
    }

    return (
        <div className={styles.wrapper} id='no'>
            <Timer
                isActive={isActive}
                setIsActive={setIsActive}
                isActive_={isActive_}
                setIsActive_={setIsActive_}
                handleSubmitRequest={handleSubmitRequest}
                setIsOpenName={setIsOpenName}
                setGuests={setGuests} />

            <div className={styles.content}>
                {/* Theme toggle */}
                <div className={styles.themeToggle} onClick={toggleTheme}>
                    {darkMode ? <IoSunny /> : <IoMoon />}
                </div>
                <div className={styles.menu}>
                    <div className={styles.menuWrapper} ref={menuScrollRef}>
                        {steps.isActive === 3
                            ? <Popup orderId={orderId} count={getBlSets()} totalPrice={getTotalPrice()} steps={steps} setSteps={setSteps} request={request} getUniqueArray={getUniqueArray} handleSubmitRequest={handleSubmitRequest} />
                            : <></>}

                        {isOpenDecr &&
                            <Decr
                            setIsOpenDecr={setIsOpenDecr}
                            isOpenDecr={isOpenDecr}
                            setRequest={setRequest}
                            request={request}
                            handleGetRequest={handleGetRequest}
                            handleGetAddDecription={handleGetAddDecription} /> }
                        {steps.isActive === 2 && <Tables tables={tables} setSteps={setSteps} steps={steps} request={request} /> }

                        {steps.isActive === 2 && (
                            <div className={styles.step2Buttons}>
                                <div className={styles.backButton} onClick={() => setSteps({...steps, isActive: 1})}>
                                    Назад
                                </div>
                                <div
                                    className={`${styles.requestButton} ${(!request.length || !steps.table) ? styles.requestButtonDisabled : ''}`}
                                    onClick={() => { if (request.length && steps.table) setIsOpenName(true); }}
                                >
                                    Заказать
                                </div>
                            </div>
                        )}

                        {steps.isActive === 1 && (
                            <FullMenu
                                isActive={steps.isActive}
                                fullMenu={fullMenuList}
                                request={request}
                                handleGetRequest={handleGetRequest}
                                steps={steps}
                                setSteps={setSteps}
                                blData={blList}
                                onOpenBL={(idx) => setBlModalOpen(idx ?? 0)}
                                onOpenDetail={handleOpenDetail}
                                emenuSettings={emenuSettings}
                            />
                        )}

                        {blModalOpen !== null && blList[blModalOpen] && (
                            <BusinessLunch
                                data={[blList[blModalOpen]]}
                                request={request}
                                handleGetRequest={handleGetRequest}
                                onClose={() => setBlModalOpen(null)}
                                onOpenDetail={handleOpenDetail}
                                BL_PRICE={BL_PRICE}
                            />
                        )}

                        {
                            isOpenName &&
                            <Name
                            guests={guests}
                            setGuests={setGuests}
                            handleCreateGuests={handleCreateGuests}
                            onBack={() => setIsOpenName(false)}
                            />
                        }

                    </div>
                </div>
            </div>

            {/* Cart FAB + side panel */}
            {steps.isActive === 1 && (
                <Cart
                    request={request}
                    handleGetRequest={handleGetRequest}
                    blSetsCount={getBlSets().length}
                    totalPrice={getTotalPrice()}
                    onProceed={handleCartProceed}
                    BL_PRICE={BL_PRICE}
                    onOpenBL={() => setBlModalOpen(0)}
                    orderComment={orderComment}
                    setOrderComment={setOrderComment}
                />
            )}

            {/* Food detail modal */}
            {detailItem && (
                <FoodDetail
                    item={detailItem}
                    count={getItemCount(detailItem.id)}
                    onAdd={() => handleGetRequest(detailItem, 'add')}
                    onRemove={() => handleGetRequest(detailItem, 'remove')}
                    onClose={() => setDetailItem(null)}
                />
            )}
        </div>
    )
}

export default Index
