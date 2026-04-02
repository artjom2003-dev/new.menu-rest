import React, { useState, useRef } from 'react'
import styles from './index.module.scss'
import { MdShoppingCart, MdEdit } from 'react-icons/md'
import { IoClose } from 'react-icons/io5'
import { FaMinus, FaPlus } from 'react-icons/fa'
import Keyboard from "react-simple-keyboard"
import "react-simple-keyboard/build/css/index.css"
import useTouchScroll from '../../hooks/useTouchScroll'

const Index = ({ request, handleGetRequest, blSetsCount, totalPrice, onProceed, BL_PRICE, onOpenBL, orderComment, setOrderComment }) => {
    const cartScrollRef = useTouchScroll({ direction: 'vertical' })
    const [open, setOpen] = useState(false);
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [prevComment, setPrevComment] = useState('');
    const [layoutName, setLayoutName] = useState("default");
    const shiftLocked = useRef(false);
    const lastShiftTime = useRef(0);

    const kbLayouts = {
        default: [
            "й ц у к е н г ш щ з х ъ",
            "ф ы в а п р о л д ж э",
            "я ч с м и т ь б ю .",
            "{lock} {space} {backspace}"
        ],
        shift: [
            "Й Ц У К Е Н Г Ш Щ З Х Ъ",
            "Ф Ы В А П Р О Л Д Ж Э",
            "Я Ч С М И Т Ь Б Ю .",
            "{lock} {space} {backspace}"
        ]
    };
    const kbDisplay = { '{backspace}': '←', '{lock}': '⇧', '{space}': ' ' };

    const onKbChange = (input) => {
        setOrderComment(input);
        if (layoutName === "shift" && !shiftLocked.current) {
            setLayoutName("default");
        }
    };

    const onKbKeyPress = (button) => {
        if (button === "{lock}") handleShift();
    };

    const handleShift = () => {
        const now = Date.now();
        if (now - lastShiftTime.current < 400) {
            shiftLocked.current = true;
            setLayoutName("shift");
        } else {
            if (shiftLocked.current) {
                shiftLocked.current = false;
                setLayoutName("default");
            } else {
                setLayoutName(prev => prev === "default" ? "shift" : "default");
            }
        }
        lastShiftTime.current = now;
    };

    const openComment = () => {
        setPrevComment(orderComment);
        setShowKeyboard(true);
    };

    const cancelComment = () => {
        setOrderComment(prevComment);
        setShowKeyboard(false);
    };

    // Aggregate main menu items (non-BL) with counts
    const mainMenuItems = request.filter(item => item?.category === undefined || item?.category === null);

    const getAggregatedItems = () => {
        const aggregated = {};
        mainMenuItems.forEach(item => {
            if (!aggregated[item.id]) {
                aggregated[item.id] = { ...item, amount: 0 };
            }
            aggregated[item.id].amount += 1;
        });
        return Object.values(aggregated);
    };


    const totalCount = request.length;

    return (
        <>
            {/* FAB button */}
            <div className={styles.fab} onClick={() => setOpen(true)}>
                <MdShoppingCart className={styles.fabIcon} />
                {totalCount > 0 && (
                    <span className={styles.badge}>{totalCount}</span>
                )}
            </div>

            {/* Cart panel */}
            {open && (
                <div className={styles.overlay} onClick={() => setOpen(false)}>
                    <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className={styles.header}>
                            <span className={styles.headerTitle}>Ваш заказ</span>
                            <div className={styles.headerClose} onClick={() => setOpen(false)}>
                                <IoClose />
                            </div>
                        </div>

                        {/* Items list */}
                        <div className={styles.list} ref={cartScrollRef}>
                            {totalCount === 0 && (
                                <div className={styles.empty}>Корзина пуста</div>
                            )}

                            {/* BL sets */}
                            {blSetsCount > 0 && (
                                <div className={styles.blSection}>
                                    <div className={styles.blRow}>
                                        <div className={styles.blInfo}>
                                            <span className={styles.blName}>Бизнес-ланч</span>
                                            <span className={styles.blDetails}>
                                                {blSetsCount} {blSetsCount === 1 ? 'набор' : blSetsCount < 5 ? 'набора' : 'наборов'} &times; {BL_PRICE} &#8381;
                                            </span>
                                        </div>
                                        <span className={styles.blPrice}>{blSetsCount * BL_PRICE} &#8381;</span>
                                    </div>
                                    <div
                                        className={styles.blEditBtn}
                                        onClick={() => { setOpen(false); onOpenBL?.(); }}
                                    >
                                        Изменить
                                    </div>
                                </div>
                            )}

                            {/* Main menu items */}
                            {getAggregatedItems().map(item => {
                                const itemPrice = (item?.price || '0').slice(0, -3);
                                return (
                                    <div key={item.id} className={styles.cartItem}>
                                        <div className={styles.cartItemInfo}>
                                            <span className={styles.cartItemName}>{item.title_ru}</span>
                                            <span className={styles.cartItemPrice}>{itemPrice} &#8381; &times; {item.amount}</span>
                                        </div>
                                        <div className={styles.cartItemActions}>
                                            <span
                                                onClick={() => item.amount > 0 && handleGetRequest(item, 'remove')}
                                                className={`${styles.cartBtn} ${item.amount === 0 ? styles.cartBtnDisabled : ''}`}
                                            >
                                                <FaMinus />
                                            </span>
                                            <span className={styles.cartItemCount}>{item.amount}</span>
                                            <span
                                                onClick={() => handleGetRequest(item, 'add')}
                                                className={styles.cartBtn}
                                            >
                                                <FaPlus />
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Comment section */}
                        {totalCount > 0 && !showKeyboard && (
                            <div className={styles.commentSection}>
                                <div className={styles.commentBtn} onClick={openComment}>
                                    <MdEdit className={styles.commentIcon} />
                                    <span>{orderComment ? 'Изменить комментарий' : 'Добавить комментарий'}</span>
                                </div>
                                {orderComment && (
                                    <div className={styles.commentPreview}>
                                        <span>{orderComment}</span>
                                        <IoClose className={styles.commentDelete} onClick={() => setOrderComment('')} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comment keyboard overlay */}
                        {showKeyboard && (
                            <div className={styles.commentKeyboard}>
                                <div className={styles.commentKbTitle}>Комментарий к заказу</div>
                                <textarea
                                    className={styles.commentInput}
                                    value={orderComment}
                                    placeholder="Введите комментарий..."
                                    disabled
                                />
                                <Keyboard
                                    className={styles.keyboard}
                                    layout={kbLayouts}
                                    layoutName={layoutName}
                                    onChange={onKbChange}
                                    onKeyPress={onKbKeyPress}
                                    display={kbDisplay}
                                    buttonTheme={[{ class: 'hg-narrow', buttons: '{lock} {backspace}' }]}
                                />
                                <div className={styles.commentButtons}>
                                    <div className={styles.commentCancel} onClick={cancelComment}>Отмена</div>
                                    <div className={styles.commentOk} onClick={() => setShowKeyboard(false)}>OK</div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        {totalCount > 0 && !showKeyboard && (
                            <div className={styles.footer}>
                                <div className={styles.total}>
                                    <span className={styles.totalLabel}>Итого</span>
                                    <span className={styles.totalPrice}>{totalPrice} &#8381;</span>
                                </div>
                                <div className={styles.proceedBtn} onClick={() => { setOpen(false); onProceed?.(); }}>
                                    Далее
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default Index
