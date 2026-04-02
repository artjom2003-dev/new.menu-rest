import React from 'react'
import styles from './index.module.scss'
import { IoClose } from 'react-icons/io5'
import { FaMinus, FaPlus } from 'react-icons/fa'
import useTouchScroll from '../../hooks/useTouchScroll'

const Index = ({ item, count, onAdd, onRemove, onClose }) => {
    const detailScrollRef = useTouchScroll({ direction: 'vertical' })
    if (!item) return null;

    const imageUrl = item?.image?.[0]?.Url;
    const price = (item?.price || '0').slice(0, -3);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <div className={styles.closeBtn} onClick={onClose}>
                    <IoClose />
                </div>

                {/* Image */}
                <div
                    className={styles.image}
                    style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : {}}
                />

                {/* Content */}
                <div className={styles.content} ref={detailScrollRef}>
                    <div className={styles.title}>{item.title_ru}</div>

                    {item.composition && (
                        <div className={styles.composition}>{item.composition}</div>
                    )}

                    {item.description_ru && (
                        <div className={styles.description}>{item.description_ru}</div>
                    )}

                    {/* Nutritional info */}
                    <div className={styles.nutrition}>
                        <div className={styles.nutritionItem}>
                            <span className={styles.nutritionValue}>--</span>
                            <span className={styles.nutritionLabel}>ккал</span>
                        </div>
                        <div className={styles.nutritionItem}>
                            <span className={styles.nutritionValue}>--</span>
                            <span className={styles.nutritionLabel}>белки</span>
                        </div>
                        <div className={styles.nutritionItem}>
                            <span className={styles.nutritionValue}>--</span>
                            <span className={styles.nutritionLabel}>жиры</span>
                        </div>
                        <div className={styles.nutritionItem}>
                            <span className={styles.nutritionValue}>--</span>
                            <span className={styles.nutritionLabel}>углеводы</span>
                        </div>
                    </div>

                </div>

                {/* Footer with price + buttons */}
                <div className={styles.footer}>
                    <div className={styles.price}>
                        {count > 0 ? (price * count) : price} &#8381;
                    </div>
                    <div className={styles.footerButtons}>
                        <span
                            onClick={() => count > 0 && onRemove?.()}
                            className={`${styles.btn} ${count === 0 ? styles.btnDisabled : ''}`}
                        >
                            <FaMinus />
                        </span>
                        <span className={styles.count}>{count}</span>
                        <span
                            onClick={() => onAdd?.()}
                            className={styles.btn}
                        >
                            <FaPlus />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Index
