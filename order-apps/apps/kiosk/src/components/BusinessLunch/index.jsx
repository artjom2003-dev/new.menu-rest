import React, {useState} from 'react'
import styles from './index.module.scss'
import { PiBowlFoodLight } from "react-icons/pi"
import { FaMinus, FaPlus } from "react-icons/fa"
import { IoClose } from "react-icons/io5"
import useTouchScroll from '../../hooks/useTouchScroll'

const Index = ({data = [], request, handleGetRequest, onClose, onOpenDetail, BL_PRICE = 450}) => {
    const contentScrollRef = useTouchScroll({ direction: 'vertical' })
    const [activeBLIndex, setActiveBLIndex] = useState(0)

    const getItemCount = (id) => request.filter(item => item.id === id).length;

    const activeBL = data[activeBLIndex] || data[0]

    // Count BL sets from request for the active BL
    const blItems = request.filter(item => item?.category !== undefined && item?.category !== null && item?.bid === activeBL?.bid);
    const grouped = {};
    blItems.forEach(item => {
        const cat = item.category;
        if (!grouped[cat]) grouped[cat] = 0;
        grouped[cat]++;
    });
    const setsCount = Object.values(grouped).length > 0 ? Math.max(...Object.values(grouped)) : 0;

    // Total across ALL BLs
    const allBlItems = request.filter(item => item?.category !== undefined && item?.category !== null);
    const allGrouped = {};
    allBlItems.forEach(item => {
        const key = `${item.bid}_${item.category}`;
        if (!allGrouped[key]) allGrouped[key] = 0;
        allGrouped[key]++;
    });
    // Group by bid to count sets per BL
    const bidSets = {};
    allBlItems.forEach(item => {
        if (!bidSets[item.bid]) bidSets[item.bid] = {};
        if (!bidSets[item.bid][item.category]) bidSets[item.bid][item.category] = 0;
        bidSets[item.bid][item.category]++;
    });
    let totalSets = 0;
    Object.values(bidSets).forEach(cats => {
        const max = Math.max(...Object.values(cats));
        totalSets += max;
    });
    const totalBLPrice = totalSets * BL_PRICE;

    const handleAdd = (item) => {
        handleGetRequest({...item, bid: activeBL?.bid}, 'add')
    }

    const handleRemove = (item) => {
        handleGetRequest({...item, bid: activeBL?.bid}, 'remove')
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.closeBtn} onClick={onClose}>
                    <IoClose />
                </div>
                <div className={styles.modalTitle}>Бизнес-ланч</div>

                {data.length > 1 && (
                    <div className={styles.blTabs}>
                        {data.map((bl, idx) => (
                            <div
                                key={bl.bid || idx}
                                className={`${styles.blTab} ${idx === activeBLIndex ? styles.blTabActive : ''}`}
                                onClick={() => setActiveBLIndex(idx)}
                            >
                                {bl.title || `Бизнес-ланч ${idx + 1}`}
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.modalContent} ref={contentScrollRef}>
                    {activeBL?.categories?.map((item) => (
                        <div className={styles.menu_wrapper} key={item.id || item.category}>
                            <h2 className={styles.menu_category}>{item.category}</h2>
                            <div className={styles.menu_row_wrapper}>
                                {item.menu.map((item_) => {
                                    const count = getItemCount(item_.id);
                                    return (
                                        <div key={item_.id} className={styles.menuBlock}>
                                            <div
                                                className={styles.menuBlockImage}
                                                style={{
                                                    backgroundImage: item_.image?.[0]?.Url
                                                        ? `url(${item_.image[0].Url})`
                                                        : 'none'
                                                }}
                                                onClick={() => onOpenDetail?.(item_)}
                                            >
                                                {item_.image?.length === 0 && (
                                                    <i className={styles.foodicon}><PiBowlFoodLight/></i>
                                                )}
                                                <div className={styles.menu_text}>
                                                    <p className={styles.menu_title}>{item_.title_ru}</p>
                                                    <p className={styles.menu_description}>{item_.description_ru}</p>
                                                </div>
                                            </div>
                                            <div className={styles.itemButtons}>
                                                <span
                                                    onClick={() => count > 0 && handleRemove(item_)}
                                                    className={`${styles.count_minus} ${count === 0 ? styles.count_disabled : ''}`}
                                                ><FaMinus/></span>
                                                <span className={styles.count}>{count}</span>
                                                <span
                                                    onClick={() => handleAdd(item_)}
                                                    className={styles.count_plus}
                                                ><FaPlus/></span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className={styles.modalButtons}>
                    <div className={styles.totalPrice}>
                        {totalBLPrice > 0 ? totalBLPrice : BL_PRICE} &#8381;
                    </div>
                    <div className={styles.closeButton} onClick={onClose}>Готово</div>
                </div>
            </div>
        </div>
    )
}

export default Index
